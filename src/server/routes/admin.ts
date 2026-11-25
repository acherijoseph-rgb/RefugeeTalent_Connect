import { Router } from 'express';
import type { Response } from 'express';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  assessmentAttempts,
  courses,
  credentials,
  employerProfiles,
  fundingRequests,
  jobApplications,
  jobs,
  mentorProfiles,
  mentorshipRequests,
  notifications,
  users,
} from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest, UserRole } from '../../middleware/auth.ts';

const router = Router();

router.get('/users', requireAuth, requireRole('administrator'), async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        hostCountry: users.hostCountry,
        countryOfOrigin: users.countryOfOrigin,
        experienceYears: users.experienceYears,
        consentForEmployerMatching: users.consentForEmployerMatching,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json({ users: rows });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to load user accounts.' });
  }
});

router.patch('/users/:id/role', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    const role = String(req.body?.role || '') as UserRole;
    if (!['refugee', 'employer', 'mentor', 'administrator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updated[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

router.get('/employers', requireAuth, requireRole('administrator'), async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: employerProfiles.id,
        userId: employerProfiles.userId,
        contactName: users.name,
        contactEmail: users.email,
        companyName: employerProfiles.companyName,
        industry: employerProfiles.industry,
        country: employerProfiles.country,
        website: employerProfiles.website,
        description: employerProfiles.description,
        verifiedPartner: employerProfiles.verifiedPartner,
        isDemo: employerProfiles.isDemo,
      })
      .from(employerProfiles)
      .innerJoin(users, eq(employerProfiles.userId, users.id))
      .orderBy(desc(employerProfiles.id));

    res.json({ employers: rows });
  } catch (error) {
    console.error('Admin list employers error:', error);
    res.status(500).json({ error: 'Failed to load employer accounts.' });
  }
});

router.patch('/employers/:id/verify', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const verifiedPartner = Boolean(req.body?.verifiedPartner);

    const updated = await db
      .update(employerProfiles)
      .set({ verifiedPartner })
      .where(eq(employerProfiles.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Employer profile not found.' });
    }

    res.json({ employer: updated[0] });
  } catch (error) {
    console.error('Verify employer error:', error);
    res.status(500).json({ error: 'Failed to update employer verification status.' });
  }
});

router.get('/mentors', requireAuth, requireRole('administrator'), async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: mentorProfiles.id,
        userId: mentorProfiles.userId,
        name: users.name,
        email: users.email,
        organization: mentorProfiles.organization,
        jobTitle: mentorProfiles.jobTitle,
        industry: mentorProfiles.industry,
        country: mentorProfiles.country,
        timezone: mentorProfiles.timezone,
        verifiedMentor: mentorProfiles.verifiedMentor,
        isAcceptingMentees: mentorProfiles.isAcceptingMentees,
        isDemo: mentorProfiles.isDemo,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .orderBy(desc(mentorProfiles.id));

    res.json({ mentors: rows });
  } catch (error) {
    console.error('Admin list mentors error:', error);
    res.status(500).json({ error: 'Failed to load mentor accounts.' });
  }
});

router.patch('/mentors/:id/verify', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const verifiedMentor = Boolean(req.body?.verifiedMentor);

    const updated = await db
      .update(mentorProfiles)
      .set({ verifiedMentor })
      .where(eq(mentorProfiles.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Mentor profile not found.' });
    }

    res.json({ mentor: updated[0] });
  } catch (error) {
    console.error('Verify mentor error:', error);
    res.status(500).json({ error: 'Failed to update mentor verification status.' });
  }
});

router.get('/report', requireAuth, requireRole('administrator'), async (_req: AuthRequest, res: Response) => {
  try {
    const [
      userCount,
      refugeeCount,
      credCount,
      verifiedCredCount,
      attemptCount,
      courseCount,
      fundingCount,
      mentorshipCount,
      jobCount,
      appCount,
      placedCount,
    ] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(users).where(eq(users.role, 'refugee')),
      db.select({ value: count() }).from(credentials),
      db.select({ value: count() }).from(credentials).where(eq(credentials.status, 'Verified by authorized reviewer')),
      db.select({ value: count() }).from(assessmentAttempts),
      db.select({ value: count() }).from(courses),
      db.select({ value: count() }).from(fundingRequests),
      db.select({ value: count() }).from(mentorshipRequests),
      db.select({ value: count() }).from(jobs),
      db.select({ value: count() }).from(jobApplications),
      db.select({ value: count() }).from(jobApplications).where(eq(jobApplications.status, 'Placed')),
    ]);

    const lines = [
      'REFUGEETALENT CONNECT — PLATFORM GOVERNANCE & SDG IMPACT REPORT',
      `Generated: ${new Date().toISOString()}`,
      '==================================================================',
      `Total Registered Accounts: ${Number(userCount[0]?.value ?? 0)}`,
      `Registered Refugee Professionals: ${Number(refugeeCount[0]?.value ?? 0)}`,
      `Credentials Submitted: ${Number(credCount[0]?.value ?? 0)}`,
      `Credentials Verified by Authorized Reviewers: ${Number(verifiedCredCount[0]?.value ?? 0)}`,
      `Skills Assessments Completed: ${Number(attemptCount[0]?.value ?? 0)}`,
      `Active Bridging Courses: ${Number(courseCount[0]?.value ?? 0)}`,
      `Financial Assistance Requests: ${Number(fundingCount[0]?.value ?? 0)}`,
      `Mentorship Connections / Requests: ${Number(mentorshipCount[0]?.value ?? 0)}`,
      `Published Opportunities: ${Number(jobCount[0]?.value ?? 0)}`,
      `Total Job Applications: ${Number(appCount[0]?.value ?? 0)}`,
      `Successful Employment Placements: ${Number(placedCount[0]?.value ?? 0)}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="refugeetalent-platform-report.txt"');
    res.send(lines);
  } catch (error) {
    console.error('Admin report error:', error);
    res.status(500).json({ error: 'Failed to generate platform report.' });
  }
});

// Notifications for authenticated user
router.get('/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.currentUser!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(25);

    res.json({ notifications: rows });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

router.patch('/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.post('/notifications/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.currentUser!.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications read.' });
  }
});

export default router;
