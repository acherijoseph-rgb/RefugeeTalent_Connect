import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { documents, jobApplications, jobs, users } from '../../db/schema.ts';
import { requireAuth } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file selected for upload.' });
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload PDF, PNG, JPG, WEBP, DOC, DOCX, or TXT files.',
      });
    }

    const category = String(req.body?.category || 'supporting').trim();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

    const inserted = await db
      .insert(documents)
      .values({
        ownerUserId: req.currentUser!.id,
        fileName: safeName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        category,
        contentBase64: file.buffer.toString('base64'),
      })
      .returning({
        id: documents.id,
        fileName: documents.fileName,
        mimeType: documents.mimeType,
        sizeBytes: documents.sizeBytes,
        category: documents.category,
        createdAt: documents.createdAt,
      });

    res.status(201).json({ document: inserted[0] });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to store uploaded document.' });
  }
});

router.get('/:id/download', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ error: 'Invalid document ID.' });
    }

    const found = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId))
      .limit(1);

    const doc = found[0];
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const user = req.currentUser!;
    let authorized = doc.ownerUserId === user.id || user.role === 'administrator';

    // Confidential protection: employers may ONLY download CVs (never identity/credential docs)
    // if the candidate consented to employer matching or applied to their job.
    if (!authorized && user.role === 'employer' && doc.category === 'cv') {
      const owner = await db
        .select({ consent: users.consentForEmployerMatching })
        .from(users)
        .where(eq(users.id, doc.ownerUserId))
        .limit(1);

      if (owner[0]?.consent) {
        authorized = true;
      } else {
        const applied = await db
          .select({ appId: jobApplications.id })
          .from(jobApplications)
          .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
          .where(
            and(
              eq(jobApplications.refugeeId, doc.ownerUserId),
              eq(jobs.employerUserId, user.id)
            )
          )
          .limit(1);
        if (applied.length > 0) authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({
        error: 'Confidentiality guard: you do not have permission to access this document.',
      });
    }

    const buf = Buffer.from(doc.contentBase64, 'base64');
    const safeFileName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buf);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to retrieve document.' });
  }
});

export default router;
