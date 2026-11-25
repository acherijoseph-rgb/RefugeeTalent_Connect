import { Router } from 'express';
import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  assessmentAttempts,
  notifications,
  skillsAssessments,
  users,
} from '../../db/schema.ts';
import type { AssessmentQuestion } from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(skillsAssessments)
      .where(eq(skillsAssessments.isActive, true))
      .orderBy(skillsAssessments.id);

    const isAdmin = req.currentUser!.role === 'administrator';

    const sanitized = rows.map((a) => ({
      ...a,
      questions: a.questions.map((q) =>
        isAdmin
          ? q
          : {
              id: q.id,
              prompt: q.prompt,
              options: q.options,
              domain: q.domain,
            }
      ),
    }));

    res.json({ assessments: sanitized });
  } catch (error) {
    console.error('List assessments error:', error);
    res.status(500).json({ error: 'Failed to load skills assessments.' });
  }
});

router.post('/', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, difficulty, durationMinutes, description, passingScore, questions } =
      req.body || {};

    if (!title || !category || !description || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'Title, category, description, and at least one competency question are required.',
      });
    }

    const parsedQuestions: AssessmentQuestion[] = questions.map((q, idx) => ({
      id: String(q.id || `q-${idx + 1}`),
      prompt: String(q.prompt || '').trim(),
      options: Array.isArray(q.options) ? q.options.map((o: unknown) => String(o).trim()) : [],
      correctIndex: Number(q.correctIndex) || 0,
      domain: String(q.domain || category).trim(),
      explanation: String(q.explanation || 'Evaluated against domain competency criteria.').trim(),
    }));

    const inserted = await db
      .insert(skillsAssessments)
      .values({
        title: String(title).trim(),
        category: String(category).trim(),
        difficulty: String(difficulty || 'Intermediate').trim(),
        durationMinutes: Math.max(5, Number(durationMinutes) || 20),
        description: String(description).trim(),
        passingScore: Math.min(100, Math.max(50, Number(passingScore) || 70)),
        questions: parsedQuestions,
        isActive: true,
      })
      .returning();

    res.status(201).json({ assessment: inserted[0] });
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Failed to create skills assessment.' });
  }
});

router.get('/attempts/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: assessmentAttempts.id,
        assessmentId: assessmentAttempts.assessmentId,
        assessmentTitle: skillsAssessments.title,
        assessmentCategory: skillsAssessments.category,
        scorePercent: assessmentAttempts.scorePercent,
        passed: assessmentAttempts.passed,
        competencyBreakdown: assessmentAttempts.competencyBreakdown,
        practicalEvidenceSummary: assessmentAttempts.practicalEvidenceSummary,
        practicalEvidenceUrl: assessmentAttempts.practicalEvidenceUrl,
        practicalEvidenceDocId: assessmentAttempts.practicalEvidenceDocId,
        isDemo: assessmentAttempts.isDemo,
        completedAt: assessmentAttempts.completedAt,
      })
      .from(assessmentAttempts)
      .innerJoin(skillsAssessments, eq(assessmentAttempts.assessmentId, skillsAssessments.id))
      .where(eq(assessmentAttempts.userId, req.currentUser!.id))
      .orderBy(desc(assessmentAttempts.completedAt));

    res.json({ attempts: rows });
  } catch (error) {
    console.error('Fetch my attempts error:', error);
    res.status(500).json({ error: 'Failed to load assessment history.' });
  }
});

router.post('/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = Number(req.params.id);
    const { answers, practicalEvidenceSummary, practicalEvidenceUrl, practicalEvidenceDocId } =
      req.body || {};

    const found = await db
      .select()
      .from(skillsAssessments)
      .where(eq(skillsAssessments.id, assessmentId))
      .limit(1);

    const assessment = found[0];
    if (!assessment) {
      return res.status(404).json({ error: 'Skills assessment not found.' });
    }

    const answerMap: Record<string, number> =
      answers && typeof answers === 'object' ? answers : {};

    let correctCount = 0;
    const domainTotals: Record<string, { total: number; correct: number }> = {};

    const questionReview = assessment.questions.map((q) => {
      const selectedIndex =
        typeof answerMap[q.id] === 'number' ? answerMap[q.id] : -1;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount += 1;

      if (!domainTotals[q.domain]) {
        domainTotals[q.domain] = { total: 0, correct: 0 };
      }
      domainTotals[q.domain].total += 1;
      if (isCorrect) domainTotals[q.domain].correct += 1;

      return {
        questionId: q.id,
        prompt: q.prompt,
        domain: q.domain,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = assessment.questions.length || 1;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercent >= assessment.passingScore;

    const competencyBreakdown: Record<string, number> = {};
    for (const [domain, stats] of Object.entries(domainTotals)) {
      competencyBreakdown[domain] = Math.round((stats.correct / stats.total) * 100);
    }

    const inserted = await db
      .insert(assessmentAttempts)
      .values({
        assessmentId,
        userId: req.currentUser!.id,
        answers: answerMap,
        scorePercent,
        passed,
        competencyBreakdown,
        practicalEvidenceSummary: String(practicalEvidenceSummary || '').trim(),
        practicalEvidenceUrl: String(practicalEvidenceUrl || '').trim(),
        practicalEvidenceDocId: practicalEvidenceDocId ? Number(practicalEvidenceDocId) : null,
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      userId: req.currentUser!.id,
      title: `Skills Assessment Completed: ${scorePercent}%`,
      message: `You scored ${scorePercent}% on "${assessment.title}" (${passed ? 'Competency Standard Met' : 'Additional Review Recommended'}).`,
      category: 'assessment',
      linkSection: 'track1',
    });

    res.status(201).json({
      attempt: inserted[0],
      assessmentTitle: assessment.title,
      passingScore: assessment.passingScore,
      questionReview,
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ error: 'Failed to score assessment.' });
  }
});

router.get('/attempts/:id/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = Number(req.params.id);
    const rows = await db
      .select({
        attempt: assessmentAttempts,
        assessmentTitle: skillsAssessments.title,
        assessmentCategory: skillsAssessments.category,
        passingScore: skillsAssessments.passingScore,
        candidateName: users.name,
        candidateEmail: users.email,
      })
      .from(assessmentAttempts)
      .innerJoin(skillsAssessments, eq(assessmentAttempts.assessmentId, skillsAssessments.id))
      .innerJoin(users, eq(assessmentAttempts.userId, users.id))
      .where(eq(assessmentAttempts.id, attemptId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Assessment report not found.' });
    }

    if (
      row.attempt.userId !== req.currentUser!.id &&
      req.currentUser!.role !== 'administrator'
    ) {
      return res.status(403).json({ error: 'Not authorized to download this report.' });
    }

    const breakdownLines = Object.entries(row.attempt.competencyBreakdown)
      .map(([domain, score]) => `  - ${domain}: ${score}%`)
      .join('\n');

    const reportText = [
      'REFUGEETALENT CONNECT — SKILLS ASSESSMENT REPORT',
      '============================================================',
      `Report ID: RTC-SKL-${row.attempt.id}`,
      `Candidate: ${row.candidateName}`,
      `Assessment: ${row.assessmentTitle} (${row.assessmentCategory})`,
      `Completed At: ${new Date(row.attempt.completedAt).toISOString()}`,
      `Record Type: ${row.attempt.isDemo ? 'Sample Demonstration Record' : 'Live Platform Assessment'}`,
      '',
      `Overall Score: ${row.attempt.scorePercent}% (Passing Benchmark: ${row.passingScore}%)`,
      `Result Status: ${row.attempt.passed ? 'Competency Benchmark Achieved' : 'Below Passing Benchmark — Bridging Recommended'}`,
      '',
      'Competency Domain Breakdown:',
      breakdownLines,
      '',
      'Practical Skills Evidence Submitted:',
      row.attempt.practicalEvidenceSummary || 'No narrative evidence submitted.',
      row.attempt.practicalEvidenceUrl ? `Reference URL: ${row.attempt.practicalEvidenceUrl}` : '',
      '',
      'Notice: This assessment reflects platform technical competency scoring and',
      'submitted practical evidence. It does not substitute for statutory national',
      'licensing where regulated by law.',
    ]
      .filter(Boolean)
      .join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="skills-report-${row.attempt.id}.txt"`
    );
    res.send(reportText);
  } catch (error) {
    console.error('Assessment report error:', error);
    res.status(500).json({ error: 'Failed to generate skills assessment report.' });
  }
});

export default router;
