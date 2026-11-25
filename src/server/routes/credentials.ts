import { Router } from 'express';
import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { credentials, notifications, users } from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

const VALID_STATUSES = [
  'Submitted',
  'Under review',
  'Additional documents required',
  'Verified by authorized reviewer',
  'Not verified',
] as const;

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.currentUser!;

    if (currentUser.role === 'administrator') {
      const rows = await db
        .select({
          id: credentials.id,
          userId: credentials.userId,
          applicantName: users.name,
          applicantEmail: users.email,
          qualificationTitle: credentials.qualificationTitle,
          institutionName: credentials.institutionName,
          countryOfQualification: credentials.countryOfQualification,
          graduationYear: credentials.graduationYear,
          fieldOfStudy: credentials.fieldOfStudy,
          certificateDocId: credentials.certificateDocId,
          transcriptDocId: credentials.transcriptDocId,
          supportingDocId: credentials.supportingDocId,
          notes: credentials.notes,
          status: credentials.status,
          reviewerNotes: credentials.reviewerNotes,
          authorizedInstitutionRef: credentials.authorizedInstitutionRef,
          isDemo: credentials.isDemo,
          createdAt: credentials.createdAt,
          updatedAt: credentials.updatedAt,
        })
        .from(credentials)
        .innerJoin(users, eq(credentials.userId, users.id))
        .orderBy(desc(credentials.createdAt));

      return res.json({ credentials: rows });
    }

    if (currentUser.role !== 'refugee') {
      return res.status(403).json({
        error: 'Confidential credential records are restricted to the applicant and authorized reviewers.',
      });
    }

    const rows = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, currentUser.id))
      .orderBy(desc(credentials.createdAt));

    res.json({ credentials: rows });
  } catch (error) {
    console.error('List credentials error:', error);
    res.status(500).json({ error: 'Failed to load credentials.' });
  }
});

router.post('/', requireAuth, requireRole('refugee', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      qualificationTitle,
      institutionName,
      countryOfQualification,
      graduationYear,
      fieldOfStudy,
      certificateDocId,
      transcriptDocId,
      supportingDocId,
      notes,
    } = req.body || {};

    if (!qualificationTitle || !institutionName || !countryOfQualification || !graduationYear) {
      return res.status(400).json({
        error: 'Qualification title, institution name, country, and graduation year are required.',
      });
    }

    const yearNum = Number(graduationYear);
    if (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2030) {
      return res.status(400).json({ error: 'Please enter a valid graduation year.' });
    }

    // Never allow self-verification: every application starts as Submitted
    const inserted = await db
      .insert(credentials)
      .values({
        userId: req.currentUser!.id,
        qualificationTitle: String(qualificationTitle).trim(),
        institutionName: String(institutionName).trim(),
        countryOfQualification: String(countryOfQualification).trim(),
        graduationYear: yearNum,
        fieldOfStudy: String(fieldOfStudy || '').trim(),
        certificateDocId: certificateDocId ? Number(certificateDocId) : null,
        transcriptDocId: transcriptDocId ? Number(transcriptDocId) : null,
        supportingDocId: supportingDocId ? Number(supportingDocId) : null,
        notes: String(notes || '').trim(),
        status: 'Submitted',
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      userId: req.currentUser!.id,
      title: 'Credential Application Submitted',
      message: `"${inserted[0].qualificationTitle}" has been submitted for authorized reviewer assessment. Official recognition requires confirmation from an authorized reviewer or institution.`,
      category: 'credential',
      linkSection: 'track1',
    });

    res.status(201).json({ credential: inserted[0] });
  } catch (error) {
    console.error('Create credential error:', error);
    res.status(500).json({ error: 'Failed to submit credential application.' });
  }
});

router.patch('/:id/status', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, reviewerNotes, authorizedInstitutionRef } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }

    if (status === 'Verified by authorized reviewer' && !String(authorizedInstitutionRef || '').trim()) {
      return res.status(400).json({
        error: 'An authorized institution or registry reference is required before marking a qualification as Verified by authorized reviewer.',
      });
    }

    const updated = await db
      .update(credentials)
      .set({
        status,
        reviewerId: req.currentUser!.id,
        reviewerNotes: String(reviewerNotes || '').trim(),
        authorizedInstitutionRef: String(authorizedInstitutionRef || '').trim(),
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Credential record not found.' });
    }

    await db.insert(notifications).values({
      userId: updated[0].userId,
      title: `Credential Status Updated: ${status}`,
      message: `Your qualification "${updated[0].qualificationTitle}" was updated to "${status}". ${
        updated[0].reviewerNotes ? `Reviewer note: ${updated[0].reviewerNotes}` : ''
      }`,
      category: 'credential',
      linkSection: 'track1',
    });

    res.json({ credential: updated[0] });
  } catch (error) {
    console.error('Update credential status error:', error);
    res.status(500).json({ error: 'Failed to update credential verification status.' });
  }
});

export default router;
