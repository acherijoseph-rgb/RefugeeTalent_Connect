import { Router } from 'express';
import type { Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  credentials,
  employerProfiles,
  jobApplications,
  jobs,
  mentorProfiles,
  mentorshipRequests,
  notifications,
  portfolios,
  users,
} from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

// --- MENTORSHIP ---

router.get('/mentors', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.q || '').trim().toLowerCase();
    const country = String(req.query.country || '').trim().toLowerCase();
    const industry = String(req.query.industry || '').trim().toLowerCase();

    const rows = await db
      .select({
        profileId: mentorProfiles.id,
        userId: mentorProfiles.userId,
        name: users.name,
        avatarUrl: users.avatarUrl,
        organization: mentorProfiles.organization,
        jobTitle: mentorProfiles.jobTitle,
        industry: mentorProfiles.industry,
        country: mentorProfiles.country,
        expertiseAreas: mentorProfiles.expertiseAreas,
        languages: mentorProfiles.languages,
        availability: mentorProfiles.availability,
        bio: mentorProfiles.bio,
        isAcceptingMentees: mentorProfiles.isAcceptingMentees,
        isDemo: mentorProfiles.isDemo,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .orderBy(desc(mentorProfiles.id));

    const filtered = rows.filter((m) => {
      if (country && !m.country.toLowerCase().includes(country)) return false;
      if (industry && !m.industry.toLowerCase().includes(industry)) return false;
      if (search) {
        const hay = [
          m.name,
          m.organization,
          m.jobTitle,
          m.industry,
          m.bio,
          ...m.expertiseAreas,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({ mentors: filtered });
  } catch (error) {
    console.error('List mentors error:', error);
    res.status(500).json({ error: 'Failed to load mentors.' });
  }
});

router.post('/mentors/profile', requireAuth, requireRole('mentor', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      organization,
      jobTitle,
      industry,
      country,
      expertiseAreas,
      languages,
      availability,
      bio,
      isAcceptingMentees,
    } = req.body || {};

    if (!organization || !jobTitle || !industry || !country || !bio) {
      return res.status(400).json({
        error: 'Organization, job title, industry, country, and mentor bio are required.',
      });
    }

    const upserted = await db
      .insert(mentorProfiles)
      .values({
        userId: req.currentUser!.id,
        organization: String(organization).trim(),
        jobTitle: String(jobTitle).trim(),
        industry: String(industry).trim(),
        country: String(country).trim(),
        expertiseAreas: Array.isArray(expertiseAreas) ? expertiseAreas.map(String) : [],
        languages: Array.isArray(languages) ? languages.map(String) : ['English'],
        availability: String(availability || '2 hours / week').trim(),
        bio: String(bio).trim(),
        isAcceptingMentees: isAcceptingMentees !== false,
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: mentorProfiles.userId,
        set: {
          organization: String(organization).trim(),
          jobTitle: String(jobTitle).trim(),
          industry: String(industry).trim(),
          country: String(country).trim(),
          expertiseAreas: Array.isArray(expertiseAreas) ? expertiseAreas.map(String) : [],
          languages: Array.isArray(languages) ? languages.map(String) : ['English'],
          availability: String(availability || '2 hours / week').trim(),
          bio: String(bio).trim(),
          isAcceptingMentees: isAcceptingMentees !== false,
        },
      })
      .returning();

    res.json({ profile: upserted[0] });
  } catch (error) {
    console.error('Save mentor profile error:', error);
    res.status(500).json({ error: 'Failed to save mentor profile.' });
  }
});

router.get('/mentorship-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.currentUser!;
    const allUsers = await db.select({ id: users.id, name: users.name, headline: users.headline, hostCountry: users.hostCountry }).from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    let rows;
    if (user.role === 'administrator') {
      rows = await db.select().from(mentorshipRequests).orderBy(desc(mentorshipRequests.createdAt));
    } else if (user.role === 'mentor') {
      rows = await db
        .select()
        .from(mentorshipRequests)
        .where(eq(mentorshipRequests.mentorUserId, user.id))
        .orderBy(desc(mentorshipRequests.createdAt));
    } else {
      rows = await db
        .select()
        .from(mentorshipRequests)
        .where(eq(mentorshipRequests.refugeeId, user.id))
        .orderBy(desc(mentorshipRequests.createdAt));
    }

    const enriched = rows.map((r) => ({
      ...r,
      refugeeName: userMap.get(r.refugeeId)?.name || 'Applicant',
      refugeeHeadline: userMap.get(r.refugeeId)?.headline || '',
      refugeeCountry: userMap.get(r.refugeeId)?.hostCountry || '',
      mentorName: userMap.get(r.mentorUserId)?.name || 'Mentor',
    }));

    res.json({ requests: enriched });
  } catch (error) {
    console.error('List mentorship requests error:', error);
    res.status(500).json({ error: 'Failed to load mentorship requests.' });
  }
});

router.post('/mentorship-requests', requireAuth, requireRole('refugee', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { mentorUserId, topic, goals, message } = req.body || {};
    if (!mentorUserId || !topic || !goals || !message) {
      return res.status(400).json({
        error: 'Mentor, topic, mentorship goals, and introduction message are required.',
      });
    }

    const inserted = await db
      .insert(mentorshipRequests)
      .values({
        refugeeId: req.currentUser!.id,
        mentorUserId: Number(mentorUserId),
        topic: String(topic).trim(),
        goals: String(goals).trim(),
        message: String(message).trim(),
        status: 'Pending',
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      userId: Number(mentorUserId),
      title: 'New Mentorship Request',
      message: `${req.currentUser!.name} requested mentorship on "${String(topic).trim()}".`,
      category: 'mentorship',
      linkSection: 'track3',
    });

    res.status(201).json({ request: inserted[0] });
  } catch (error) {
    console.error('Create mentorship request error:', error);
    res.status(500).json({ error: 'Failed to submit mentorship request.' });
  }
});

router.patch('/mentorship-requests/:id', requireAuth, requireRole('mentor', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, mentorResponse } = req.body || {};

    if (!['Pending', 'Accepted', 'Declined', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid mentorship status.' });
    }

    const existing = await db
      .select()
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.id, id))
      .limit(1);

    if (!existing[0]) {
      return res.status(404).json({ error: 'Mentorship request not found.' });
    }
    if (
      req.currentUser!.role !== 'administrator' &&
      existing[0].mentorUserId !== req.currentUser!.id
    ) {
      return res.status(403).json({ error: 'Only the assigned mentor or administrator can respond.' });
    }

    const updated = await db
      .update(mentorshipRequests)
      .set({
        status,
        mentorResponse: String(mentorResponse || '').trim(),
        updatedAt: new Date(),
      })
      .where(eq(mentorshipRequests.id, id))
      .returning();

    await db.insert(notifications).values({
      userId: existing[0].refugeeId,
      title: `Mentorship Request ${status}`,
      message: `${req.currentUser!.name} marked your mentorship request "${existing[0].topic}" as ${status}.`,
      category: 'mentorship',
      linkSection: 'track3',
    });

    res.json({ request: updated[0] });
  } catch (error) {
    console.error('Respond mentorship request error:', error);
    res.status(500).json({ error: 'Failed to update mentorship request.' });
  }
});

// --- JOBS & APPLICATIONS ---

router.get('/jobs', async (req, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim();
    const industry = String(req.query.industry || '').trim().toLowerCase();
    const country = String(req.query.country || '').trim().toLowerCase();
    const remoteOnly = req.query.remote === 'true';

    const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));

    const filtered = rows.filter((j) => {
      if (type && type !== 'All' && j.opportunityType !== type) return false;
      if (industry && industry !== 'all' && !j.industry.toLowerCase().includes(industry)) return false;
      if (country && country !== 'all' && !j.country.toLowerCase().includes(country) && !j.location.toLowerCase().includes(country)) return false;
      if (remoteOnly && !j.isRemote) return false;
      if (q) {
        const hay = [
          j.title,
          j.companyName,
          j.industry,
          j.location,
          j.description,
          ...j.requiredSkills,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({ jobs: filtered });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ error: 'Failed to load opportunities.' });
  }
});

router.post('/jobs', requireAuth, requireRole('employer', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      companyName,
      opportunityType,
      industry,
      location,
      country,
      isRemote,
      salaryRange,
      requiredSkills,
      description,
    } = req.body || {};

    if (!title || !opportunityType || !industry || !location || !country || !description) {
      return res.status(400).json({
        error: 'Job title, opportunity type, industry, location, country, and description are required.',
      });
    }

    let resolvedCompany = String(companyName || '').trim();
    if (!resolvedCompany) {
      const emp = await db
        .select({ companyName: employerProfiles.companyName })
        .from(employerProfiles)
        .where(eq(employerProfiles.userId, req.currentUser!.id))
        .limit(1);
      resolvedCompany = emp[0]?.companyName || req.currentUser!.name;
    }

    const inserted = await db
      .insert(jobs)
      .values({
        employerUserId: req.currentUser!.id,
        companyName: resolvedCompany,
        title: String(title).trim(),
        opportunityType: String(opportunityType).trim(),
        industry: String(industry).trim(),
        location: String(location).trim(),
        country: String(country).trim(),
        isRemote: Boolean(isRemote),
        salaryRange: String(salaryRange || 'Competitive').trim(),
        requiredSkills: Array.isArray(requiredSkills)
          ? requiredSkills.map((s) => String(s).trim()).filter(Boolean)
          : [],
        description: String(description).trim(),
        status: 'Open',
        isDemo: false,
      })
      .returning();

    res.status(201).json({ job: inserted[0] });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to publish opportunity.' });
  }
});

router.patch('/jobs/:id', requireAuth, requireRole('employer', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    if (!['Open', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid job status.' });
    }

    const existing = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    if (
      req.currentUser!.role !== 'administrator' &&
      existing[0].employerUserId !== req.currentUser!.id
    ) {
      return res.status(403).json({ error: 'Not authorized to modify this listing.' });
    }

    const updated = await db
      .update(jobs)
      .set({ status })
      .where(eq(jobs.id, id))
      .returning();

    res.json({ job: updated[0] });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job status.' });
  }
});

router.get('/job-applications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.currentUser!;
    const allJobs = await db.select().from(jobs);
    const jobMap = new Map(allJobs.map((j) => [j.id, j]));

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        headline: users.headline,
        hostCountry: users.hostCountry,
        skills: users.skills,
        experienceYears: users.experienceYears,
      })
      .from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    let rows;
    if (user.role === 'administrator') {
      rows = await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
    } else if (user.role === 'employer') {
      const myJobIds = new Set(allJobs.filter((j) => j.employerUserId === user.id).map((j) => j.id));
      const allApps = await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
      rows = allApps.filter((a) => myJobIds.has(a.jobId));
    } else {
      rows = await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.refugeeId, user.id))
        .orderBy(desc(jobApplications.createdAt));
    }

    const enriched = rows.map((app) => {
      const job = jobMap.get(app.jobId);
      const applicant = userMap.get(app.refugeeId);
      return {
        ...app,
        jobTitle: job?.title || 'Role',
        companyName: job?.companyName || 'Partner Employer',
        opportunityType: job?.opportunityType || '',
        applicantName: applicant?.name || 'Candidate',
        applicantHeadline: applicant?.headline || '',
        applicantLocation: applicant?.hostCountry || '',
        applicantSkills: applicant?.skills || [],
        applicantExperienceYears: applicant?.experienceYears || 0,
      };
    });

    res.json({ applications: enriched });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ error: 'Failed to load job applications.' });
  }
});

router.post('/job-applications', requireAuth, requireRole('refugee', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, coverLetter, cvDocId } = req.body || {};
    if (!jobId || !coverLetter) {
      return res.status(400).json({ error: 'Job ID and cover letter are required.' });
    }

    const jobRows = await db.select().from(jobs).where(eq(jobs.id, Number(jobId))).limit(1);
    if (!jobRows[0] || jobRows[0].status !== 'Open') {
      return res.status(400).json({ error: 'This opportunity is no longer accepting applications.' });
    }

    const existing = await db
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.jobId, Number(jobId)),
          eq(jobApplications.refugeeId, req.currentUser!.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already applied for this opportunity.' });
    }

    const inserted = await db
      .insert(jobApplications)
      .values({
        jobId: Number(jobId),
        refugeeId: req.currentUser!.id,
        coverLetter: String(coverLetter).trim(),
        cvDocId: cvDocId ? Number(cvDocId) : null,
        status: 'Applied',
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      userId: jobRows[0].employerUserId,
      title: 'New Candidate Application',
      message: `${req.currentUser!.name} applied for "${jobRows[0].title}".`,
      category: 'jobs',
      linkSection: 'track3',
    });

    res.status(201).json({ application: inserted[0] });
  } catch (error) {
    console.error('Apply job error:', error);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

router.patch('/job-applications/:id', requireAuth, requireRole('employer', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, employerNotes } = req.body || {};

    if (!['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Placed', 'Declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const appRows = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id))
      .limit(1);

    if (!appRows[0]) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const jobRows = await db.select().from(jobs).where(eq(jobs.id, appRows[0].jobId)).limit(1);
    if (
      req.currentUser!.role !== 'administrator' &&
      jobRows[0]?.employerUserId !== req.currentUser!.id
    ) {
      return res.status(403).json({ error: 'Not authorized to review this application.' });
    }

    const updated = await db
      .update(jobApplications)
      .set({
        status,
        employerNotes: String(employerNotes || '').trim(),
        updatedAt: new Date(),
      })
      .where(eq(jobApplications.id, id))
      .returning();

    await db.insert(notifications).values({
      userId: appRows[0].refugeeId,
      title: `Application Update: ${status}`,
      message: `Your application for "${jobRows[0]?.title || 'Role'}" was updated to ${status}.`,
      category: 'jobs',
      linkSection: 'track3',
    });

    res.json({ application: updated[0] });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

// --- PORTFOLIO & CONSENTING CANDIDATE MATCHING ---

router.get('/portfolio', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, req.currentUser!.id))
      .limit(1);

    res.json({
      portfolio: rows[0] || {
        userId: req.currentUser!.id,
        summary: '',
        cvDocId: null,
        workExperience: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      },
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to load professional portfolio.' });
  }
});

router.put('/portfolio', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { summary, cvDocId, workExperience, education, skills, projects, languages } =
      req.body || {};

    const cleanSkills = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const upserted = await db
      .insert(portfolios)
      .values({
        userId: req.currentUser!.id,
        summary: String(summary || '').trim(),
        cvDocId: cvDocId ? Number(cvDocId) : null,
        workExperience: Array.isArray(workExperience) ? workExperience : [],
        education: Array.isArray(education) ? education : [],
        skills: cleanSkills,
        projects: Array.isArray(projects) ? projects : [],
        languages: Array.isArray(languages) ? languages.map(String) : [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: portfolios.userId,
        set: {
          summary: String(summary || '').trim(),
          ...(cvDocId !== undefined ? { cvDocId: cvDocId ? Number(cvDocId) : null } : {}),
          workExperience: Array.isArray(workExperience) ? workExperience : [],
          education: Array.isArray(education) ? education : [],
          skills: cleanSkills,
          projects: Array.isArray(projects) ? projects : [],
          languages: Array.isArray(languages) ? languages.map(String) : [],
          updatedAt: new Date(),
        },
      })
      .returning();

    // Keep user.skills synced for matching
    if (cleanSkills.length > 0) {
      await db
        .update(users)
        .set({ skills: cleanSkills, updatedAt: new Date() })
        .where(eq(users.id, req.currentUser!.id));
    }

    res.json({ portfolio: upserted[0] });
  } catch (error) {
    console.error('Save portfolio error:', error);
    res.status(500).json({ error: 'Failed to save portfolio.' });
  }
});

router.get('/candidates/matching', requireAuth, requireRole('employer', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const skillFilter = String(req.query.skill || '').trim().toLowerCase();

    // Confidentiality guarantee: ONLY consenting refugee professionals, and NEVER expose email, phone, identity documents, or legal/financial requests
    const consentingUsers = await db
      .select({
        id: users.id,
        name: users.name,
        headline: users.headline,
        bio: users.bio,
        hostCountry: users.hostCountry,
        location: users.location,
        skills: users.skills,
        experienceYears: users.experienceYears,
        avatarUrl: users.avatarUrl,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(and(eq(users.role, 'refugee'), eq(users.consentForEmployerMatching, true)));

    const allPortfolios = await db.select().from(portfolios);
    const portfolioMap = new Map(allPortfolios.map((p) => [p.userId, p]));

    const verifiedCreds = await db
      .select({
        userId: credentials.userId,
        qualificationTitle: credentials.qualificationTitle,
      })
      .from(credentials)
      .where(eq(credentials.status, 'Verified by authorized reviewer'));

    const employerJobs = await db
      .select({ requiredSkills: jobs.requiredSkills })
      .from(jobs)
      .where(eq(jobs.employerUserId, req.currentUser!.id));

    const targetSkills = new Set(
      employerJobs.flatMap((j) => j.requiredSkills.map((s) => s.toLowerCase()))
    );

    const candidates = consentingUsers
      .map((c) => {
        const port = portfolioMap.get(c.id);
        const combinedSkills = Array.from(
          new Set([...(c.skills || []), ...(port?.skills || [])])
        );
        const matchedSkills = combinedSkills.filter((s) =>
          targetSkills.has(s.toLowerCase())
        );
        const matchScore =
          targetSkills.size > 0
            ? Math.min(98, Math.max(45, Math.round((matchedSkills.length / Math.max(1, Math.min(4, targetSkills.size))) * 100)))
            : Math.min(95, 60 + combinedSkills.length * 5);

        const verifiedTitles = verifiedCreds
          .filter((vc) => vc.userId === c.id)
          .map((vc) => vc.qualificationTitle);

        return {
          id: c.id,
          name: c.name,
          headline: c.headline,
          summary: port?.summary || c.bio,
          location: c.location || c.hostCountry,
          hostCountry: c.hostCountry,
          skills: combinedSkills,
          experienceYears: c.experienceYears || 0,
          languages: port?.languages || [],
          projects: port?.projects || [],
          cvDocId: port?.cvDocId || null,
          verifiedQualificationCount: verifiedTitles.length,
          verifiedQualificationTitles: verifiedTitles,
          matchScore,
          isDemo: c.isDemo,
        };
      })
      .filter((c) => {
        if (!skillFilter) return true;
        return c.skills.some((s) => s.toLowerCase().includes(skillFilter)) ||
          c.name.toLowerCase().includes(skillFilter) ||
          (c.headline || '').toLowerCase().includes(skillFilter);
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ candidates });
  } catch (error) {
    console.error('Matching candidates error:', error);
    res.status(500).json({ error: 'Failed to load consenting candidates.' });
  }
});

export default router;
