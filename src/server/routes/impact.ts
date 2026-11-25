import { Router } from 'express';
import type { Response } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  assessmentAttempts,
  countryGuidance,
  courses,
  credentials,
  fundingRequests,
  jobApplications,
  jobs,
  legalReadinessProgress,
  mentorshipRequests,
  notifications,
  portfolios,
  users,
} from '../../db/schema.ts';
import { requireAuth } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

router.get('/', async (_req, res: Response) => {
  try {
    const [
      registeredRefugees,
      liveRefugees,
      credentialsSubmitted,
      credentialsVerified,
      assessmentsCompleted,
      bridgingCourseApplicants,
      financialAssistanceRequests,
      mentorshipConnections,
      jobApplicationsTotal,
      successfulPlacements,
      openJobs,
      guidanceCountries,
    ] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.role, 'refugee')),
      db.select({ value: count() }).from(users).where(and(eq(users.role, 'refugee'), eq(users.isDemo, false))),
      db.select({ value: count() }).from(credentials),
      db.select({ value: count() }).from(credentials).where(eq(credentials.status, 'Verified by authorized reviewer')),
      db.select({ value: count() }).from(assessmentAttempts),
      db.select({ value: count() }).from(fundingRequests).where(eq(fundingRequests.requestType, 'Bridging Course')),
      db.select({ value: count() }).from(fundingRequests),
      db.select({ value: count() }).from(mentorshipRequests),
      db.select({ value: count() }).from(jobApplications),
      db.select({ value: count() }).from(jobApplications).where(eq(jobApplications.status, 'Placed')),
      db.select({ value: count() }).from(jobs).where(eq(jobs.status, 'Open')),
      db.select({ value: count() }).from(countryGuidance),
    ]);

    const metrics = {
      registeredRefugees: Number(registeredRefugees[0]?.value ?? 0),
      liveRefugees: Number(liveRefugees[0]?.value ?? 0),
      credentialsSubmitted: Number(credentialsSubmitted[0]?.value ?? 0),
      credentialsVerified: Number(credentialsVerified[0]?.value ?? 0),
      assessmentsCompleted: Number(assessmentsCompleted[0]?.value ?? 0),
      bridgingCourseApplicants: Number(bridgingCourseApplicants[0]?.value ?? 0),
      financialAssistanceRequests: Number(financialAssistanceRequests[0]?.value ?? 0),
      mentorshipConnections: Number(mentorshipConnections[0]?.value ?? 0),
      jobApplicationsTotal: Number(jobApplicationsTotal[0]?.value ?? 0),
      successfulPlacements: Number(successfulPlacements[0]?.value ?? 0),
      openJobs: Number(openJobs[0]?.value ?? 0),
      guidanceCountries: Number(guidanceCountries[0]?.value ?? 0),
    };

    const sdgMapping = [
      {
        sdgNumber: 4,
        title: 'Quality Education',
        focus: 'Bridging Courses, Academic Credential Recognition & Skills Validation',
        indicators: [
          { label: 'Credentials Submitted', value: metrics.credentialsSubmitted },
          { label: 'Skills Assessments Completed', value: metrics.assessmentsCompleted },
          { label: 'People Accessing Bridging Courses', value: metrics.bridgingCourseApplicants },
        ],
      },
      {
        sdgNumber: 8,
        title: 'Decent Work & Economic Growth',
        focus: 'Skilled Employment Placements & Fair Opportunity Access',
        indicators: [
          { label: 'Job Applications Submitted', value: metrics.jobApplicationsTotal },
          { label: 'Successful Employment Placements', value: metrics.successfulPlacements },
          { label: 'Active Employer Opportunities', value: metrics.openJobs },
        ],
      },
      {
        sdgNumber: 10,
        title: 'Reduced Inequalities',
        focus: 'Equitable Career Mobility & Financial Inclusion Support',
        indicators: [
          { label: 'Registered Refugee Professionals', value: metrics.registeredRefugees },
          { label: 'Financial Assistance Requests', value: metrics.financialAssistanceRequests },
        ],
      },
      {
        sdgNumber: 16,
        title: 'Peace, Justice & Strong Institutions',
        focus: 'Transparent Credential Verification & Work Authorization Guidance',
        indicators: [
          { label: 'Credentials Verified by Authorized Reviewers', value: metrics.credentialsVerified },
          { label: 'Host-Country Regulatory Guides', value: metrics.guidanceCountries },
        ],
      },
      {
        sdgNumber: 17,
        title: 'Partnerships for the Goals',
        focus: 'Cross-Sector Mentorship & Employer Collaboration',
        indicators: [
          { label: 'Mentorship Connections', value: metrics.mentorshipConnections },
          { label: 'Verified Live Refugee Profiles', value: metrics.liveRefugees },
        ],
      },
    ];

    res.json({ metrics, sdgMapping });
  } catch (error) {
    console.error('SDG impact error:', error);
    res.status(500).json({ error: 'Failed to load SDG impact analytics.' });
  }
});

router.get('/dashboard-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.currentUser!.id;

    const [
      userRows,
      myCreds,
      myAttempts,
      myFunding,
      myMentorships,
      myApps,
      myPortfolio,
      myReadiness,
      recentNotifications,
      recommendedJobs,
      recommendedCourses,
    ] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)).limit(1),
      db.select().from(credentials).where(eq(credentials.userId, userId)).orderBy(desc(credentials.createdAt)),
      db.select().from(assessmentAttempts).where(eq(assessmentAttempts.userId, userId)).orderBy(desc(assessmentAttempts.completedAt)),
      db.select().from(fundingRequests).where(eq(fundingRequests.userId, userId)).orderBy(desc(fundingRequests.createdAt)),
      db.select().from(mentorshipRequests).where(eq(mentorshipRequests.refugeeId, userId)).orderBy(desc(mentorshipRequests.createdAt)),
      db.select().from(jobApplications).where(eq(jobApplications.refugeeId, userId)).orderBy(desc(jobApplications.createdAt)),
      db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1),
      db.select().from(legalReadinessProgress).where(eq(legalReadinessProgress.userId, userId)).limit(1),
      db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(6),
      db.select().from(jobs).where(eq(jobs.status, 'Open')).orderBy(desc(jobs.createdAt)).limit(4),
      db.select().from(courses).orderBy(courses.id).limit(3),
    ]);

    const u = userRows[0];
    const port = myPortfolio[0];

    // Calculate profile completion deterministically from populated profile & portfolio fields
    const checks = [
      Boolean(u?.name),
      Boolean(u?.headline),
      Boolean(u?.bio),
      Boolean(u?.hostCountry),
      Boolean(u?.skills && u.skills.length > 0),
      Boolean(port?.workExperience && port.workExperience.length > 0),
      Boolean(port?.education && port.education.length > 0),
      Boolean(myCreds.length > 0),
    ];
    const profileCompletion = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    const verifiedCreds = myCreds.filter((c) => c.status === 'Verified by authorized reviewer').length;
    const passedAssessments = myAttempts.filter((a) => a.passed).length;
    const completedLegalSteps = myReadiness[0]?.completedItemIds?.length || 0;

    res.json({
      profileCompletion,
      tracks: {
        credentials: {
          total: myCreds.length,
          verified: verifiedCreds,
          latestStatus: myCreds[0]?.status || 'Not submitted yet',
        },
        assessments: {
          completed: myAttempts.length,
          passed: passedAssessments,
          bestScore: myAttempts.reduce((max, a) => Math.max(max, a.scorePercent), 0),
        },
        legalReadiness: {
          countryCode: myReadiness[0]?.countryCode || 'DE',
          completedItems: completedLegalSteps,
          status: completedLegalSteps >= 3 ? 'Document Ready' : completedLegalSteps > 0 ? 'In Progress' : 'Not Started',
        },
        financialSupport: {
          total: myFunding.length,
          approved: myFunding.filter((f) => f.status === 'Approved').length,
          latestStatus: myFunding[0]?.status || 'No active requests',
        },
        mentorship: {
          total: myMentorships.length,
          accepted: myMentorships.filter((m) => m.status === 'Accepted').length,
          latestStatus: myMentorships[0]?.status || 'Browse mentors',
        },
        jobApplications: {
          total: myApps.length,
          interviewingOrOffered: myApps.filter((a) => ['Interviewing', 'Offered', 'Placed'].includes(a.status)).length,
          latestStatus: myApps[0]?.status || 'Explore open roles',
        },
      },
      notifications: recentNotifications,
      recommendedJobs,
      recommendedCourses,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary.' });
  }
});

export default router;
