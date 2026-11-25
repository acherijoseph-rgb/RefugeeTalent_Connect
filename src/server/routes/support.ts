import { Router } from 'express';
import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { courses, fundingRequests, notifications, users } from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

const VALID_FUNDING_STATUSES = [
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Approved',
  'Rejected',
] as const;

router.get('/courses', async (req, res: Response) => {
  try {
    const category = String(req.query.category || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();

    const rows = await db.select().from(courses).orderBy(courses.id);
    const filtered = rows.filter((c) => {
      if (category && category !== 'all' && !c.category.toLowerCase().includes(category)) {
        return false;
      }
      if (q) {
        const hay = [c.title, c.provider, c.category, c.description, ...c.targetSkills]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({ courses: filtered });
  } catch (error) {
    console.error('List courses error:', error);
    res.status(500).json({ error: 'Failed to load bridging courses.' });
  }
});

router.post('/courses', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, provider, category, duration, format, description, targetSkills, stipendAvailable } =
      req.body || {};

    if (!title || !provider || !category || !duration || !description) {
      return res.status(400).json({ error: 'Course title, provider, category, duration, and description are required.' });
    }

    const inserted = await db
      .insert(courses)
      .values({
        title: String(title).trim(),
        provider: String(provider).trim(),
        category: String(category).trim(),
        duration: String(duration).trim(),
        format: String(format || 'Online').trim(),
        description: String(description).trim(),
        targetSkills: Array.isArray(targetSkills) ? targetSkills.map(String) : [],
        stipendAvailable: stipendAvailable !== false,
        isDemo: false,
      })
      .returning();

    res.status(201).json({ course: inserted[0] });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course.' });
  }
});

router.get('/funding-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.currentUser!;

    if (user.role === 'administrator') {
      const rows = await db
        .select({
          id: fundingRequests.id,
          userId: fundingRequests.userId,
          applicantName: users.name,
          applicantEmail: users.email,
          requestType: fundingRequests.requestType,
          courseId: fundingRequests.courseId,
          title: fundingRequests.title,
          amountRequested: fundingRequests.amountRequested,
          currency: fundingRequests.currency,
          justification: fundingRequests.justification,
          supportingDocId: fundingRequests.supportingDocId,
          status: fundingRequests.status,
          adminNotes: fundingRequests.adminNotes,
          isDemo: fundingRequests.isDemo,
          createdAt: fundingRequests.createdAt,
          updatedAt: fundingRequests.updatedAt,
        })
        .from(fundingRequests)
        .innerJoin(users, eq(fundingRequests.userId, users.id))
        .orderBy(desc(fundingRequests.createdAt));

      return res.json({ requests: rows });
    }

    const rows = await db
      .select()
      .from(fundingRequests)
      .where(eq(fundingRequests.userId, user.id))
      .orderBy(desc(fundingRequests.createdAt));

    res.json({ requests: rows });
  } catch (error) {
    console.error('List funding requests error:', error);
    res.status(500).json({ error: 'Failed to load financial support requests.' });
  }
});

router.post('/funding-requests', requireAuth, requireRole('refugee', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      requestType,
      courseId,
      title,
      amountRequested,
      currency,
      justification,
      supportingDocId,
    } = req.body || {};

    if (!requestType || !title || !justification) {
      return res.status(400).json({
        error: 'Request type, title, and justification are required.',
      });
    }

    const inserted = await db
      .insert(fundingRequests)
      .values({
        userId: req.currentUser!.id,
        requestType: String(requestType).trim(),
        courseId: courseId ? Number(courseId) : null,
        title: String(title).trim(),
        amountRequested: Math.max(0, Number(amountRequested) || 0),
        currency: String(currency || 'EUR').toUpperCase().slice(0, 5),
        justification: String(justification).trim(),
        supportingDocId: supportingDocId ? Number(supportingDocId) : null,
        status: 'Submitted',
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      userId: req.currentUser!.id,
      title: 'Support Application Received',
      message: `Your ${inserted[0].requestType} request "${inserted[0].title}" has been queued for review.`,
      category: 'funding',
      linkSection: 'funding',
    });

    res.status(201).json({ request: inserted[0] });
  } catch (error) {
    console.error('Create funding request error:', error);
    res.status(500).json({ error: 'Failed to submit support application.' });
  }
});

router.patch('/funding-requests/:id', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, adminNotes } = req.body || {};

    if (!VALID_FUNDING_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid funding application status.' });
    }

    const updated = await db
      .update(fundingRequests)
      .set({
        status,
        adminNotes: String(adminNotes || '').trim(),
        updatedAt: new Date(),
      })
      .where(eq(fundingRequests.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Funding request not found.' });
    }

    await db.insert(notifications).values({
      userId: updated[0].userId,
      title: `Funding Update: ${status}`,
      message: `Your request "${updated[0].title}" is now marked "${status}". ${
        updated[0].adminNotes ? `Note: ${updated[0].adminNotes}` : ''
      }`,
      category: 'funding',
      linkSection: 'funding',
    });

    res.json({ request: updated[0] });
  } catch (error) {
    console.error('Review funding request error:', error);
    res.status(500).json({ error: 'Failed to update funding request.' });
  }
});

export default router;
