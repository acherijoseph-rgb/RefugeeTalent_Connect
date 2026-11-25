import crypto from 'crypto';
import { Router } from 'express';
import type { Response } from 'express';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  credentials,
  employerProfiles,
  jobApplications,
  jobs,
  mentorProfiles,
  mentorshipRequests,
  mentorshipSessions,
  notifications,
  portfolios,
  users,
} from '../../db/schema.ts';
import type { MentorWeeklySlot } from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

// --- MENTORSHIP ---

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function expandSlotsForDay(
  weeklyAvailability: MentorWeeklySlot[],
  dayOfWeek: number,
  durationMinutes: number
): { startTime: string; endTime: string; format: string }[] {
  const dur = [30, 45, 60].includes(durationMinutes) ? durationMinutes : 30;
  const blocks = weeklyAvailability.filter((w) => w.dayOfWeek === dayOfWeek);
  const slots: { startTime: string; endTime: string; format: string }[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    if (!/^\d{2}:\d{2}$/.test(block.startTime) || !/^\d{2}:\d{2}$/.test(block.endTime)) continue;
    let cursor = toMinutes(block.startTime);
    const limit = toMinutes(block.endTime);
    while (cursor + dur <= limit) {
      const start = fromMinutes(cursor);
      const end = fromMinutes(cursor + dur);
      if (!seen.has(start)) {
        seen.add(start);
        slots.push({
          startTime: start,
          endTime: end,
          format: block.format || 'Video Call',
        });
      }
      cursor += dur;
    }
  }

  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function escapeIcsText(input: string): string {
  return String(input || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

router.get('/mentors', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.q || '').trim().toLowerCase();
    const country = String(req.query.country || '').trim().toLowerCase();
    const industry = String(req.query.industry || '').trim().toLowerCase();
    const verifiedOnly = req.query.verified === 'true';

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
        verifiedMentor: mentorProfiles.verifiedMentor,
        timezone: mentorProfiles.timezone,
        sessionDurationMinutes: mentorProfiles.sessionDurationMinutes,
        weeklyAvailability: mentorProfiles.weeklyAvailability,
        isDemo: mentorProfiles.isDemo,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .orderBy(desc(mentorProfiles.verifiedMentor), desc(mentorProfiles.id));

    const filtered = rows.filter((m) => {
      if (verifiedOnly && !m.verifiedMentor) return false;
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

// --- MENTOR AVAILABILITY & 1-ON-1 CALENDAR SESSIONS ---

router.put('/mentors/availability', requireAuth, requireRole('mentor', 'administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const timezone = String(req.body?.timezone || 'Europe/Berlin').trim().slice(0, 64) || 'Europe/Berlin';
    const rawDuration = Number(req.body?.sessionDurationMinutes || 30);
    const sessionDurationMinutes = [30, 45, 60].includes(rawDuration) ? rawDuration : 30;
    const isAcceptingMentees = req.body?.isAcceptingMentees !== false;
    const rawSlots = Array.isArray(req.body?.weeklyAvailability) ? req.body.weeklyAvailability : [];

    const cleanedSlots: MentorWeeklySlot[] = [];
    for (const s of rawSlots.slice(0, 21)) {
      const dayOfWeek = Number(s?.dayOfWeek);
      const startTime = String(s?.startTime || '').trim();
      const endTime = String(s?.endTime || '').trim();
      const format = ['Video Call', 'Portfolio Review', 'Mock Interview'].includes(String(s?.format))
        ? String(s.format)
        : 'Video Call';
      if (
        Number.isInteger(dayOfWeek) &&
        dayOfWeek >= 0 &&
        dayOfWeek <= 6 &&
        /^\d{2}:\d{2}$/.test(startTime) &&
        /^\d{2}:\d{2}$/.test(endTime) &&
        toMinutes(startTime) < toMinutes(endTime)
      ) {
        cleanedSlots.push({
          id: String(s?.id || `slot-${dayOfWeek}-${startTime}`).slice(0, 48),
          dayOfWeek,
          startTime,
          endTime,
          format,
        });
      }
    }

    const totalMinutes = cleanedSlots.reduce(
      (sum, slot) => sum + (toMinutes(slot.endTime) - toMinutes(slot.startTime)),
      0
    );
    const hoursStr = totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1).replace(/\.0$/, '')} hours / week` : 'By appointment';

    const existing = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.currentUser!.id))
      .limit(1);

    if (!existing[0]) {
      return res.status(404).json({
        error: 'Publish your mentor profile first before configuring calendar availability.',
      });
    }

    const updated = await db
      .update(mentorProfiles)
      .set({
        timezone,
        sessionDurationMinutes,
        isAcceptingMentees,
        weeklyAvailability: cleanedSlots,
        availability: hoursStr,
      })
      .where(eq(mentorProfiles.id, existing[0].id))
      .returning();

    res.json({ profile: updated[0] });
  } catch (error) {
    console.error('Update mentor availability error:', error);
    res.status(500).json({ error: 'Failed to save mentor availability.' });
  }
});

router.get('/mentors/:mentorUserId/availability', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mentorUserId = Number(req.params.mentorUserId);
    const monthParam = String(req.query.month || '').trim();

    const rows = await db
      .select({
        profileId: mentorProfiles.id,
        userId: mentorProfiles.userId,
        name: users.name,
        timezone: mentorProfiles.timezone,
        sessionDurationMinutes: mentorProfiles.sessionDurationMinutes,
        weeklyAvailability: mentorProfiles.weeklyAvailability,
        verifiedMentor: mentorProfiles.verifiedMentor,
        isAcceptingMentees: mentorProfiles.isAcceptingMentees,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.userId, mentorUserId))
      .limit(1);

    const mentor = rows[0];
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yearMonth = /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const [year, month] = yearMonth.split('-').map(Number);

    const bookedRows = await db
      .select({
        sessionDate: mentorshipSessions.sessionDate,
        startTime: mentorshipSessions.startTime,
      })
      .from(mentorshipSessions)
      .where(
        and(
          eq(mentorshipSessions.mentorUserId, mentorUserId),
          ne(mentorshipSessions.status, 'Cancelled')
        )
      );

    const bookedSet = new Set(bookedRows.map((b) => `${b.sessionDate}|${b.startTime}`));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: Record<
      string,
      { startTime: string; endTime: string; format: string; available: boolean }[]
    > = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
      const rawSlots =
        mentor.verifiedMentor && mentor.isAcceptingMentees && dateStr >= todayStr
          ? expandSlotsForDay(mentor.weeklyAvailability || [], dow, mentor.sessionDurationMinutes)
          : [];

      if (rawSlots.length > 0) {
        days[dateStr] = rawSlots.map((slot) => ({
          ...slot,
          available: !bookedSet.has(`${dateStr}|${slot.startTime}`),
        }));
      }
    }

    res.json({
      mentor: {
        userId: mentor.userId,
        name: mentor.name,
        verifiedMentor: mentor.verifiedMentor,
        isAcceptingMentees: mentor.isAcceptingMentees,
        timezone: mentor.timezone,
        sessionDurationMinutes: mentor.sessionDurationMinutes,
      },
      month: yearMonth,
      today: todayStr,
      days,
    });
  } catch (error) {
    console.error('Get mentor calendar availability error:', error);
    res.status(500).json({ error: 'Failed to load mentor availability.' });
  }
});

router.get('/mentorship-sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.currentUser!;
    const allUsers = await db
      .select({ id: users.id, name: users.name, headline: users.headline })
      .from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const allProfiles = await db
      .select({
        userId: mentorProfiles.userId,
        jobTitle: mentorProfiles.jobTitle,
        organization: mentorProfiles.organization,
        verifiedMentor: mentorProfiles.verifiedMentor,
      })
      .from(mentorProfiles);
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    const allRows = await db
      .select()
      .from(mentorshipSessions)
      .orderBy(asc(mentorshipSessions.sessionDate), asc(mentorshipSessions.startTime));

    const visibleRows =
      user.role === 'administrator'
        ? allRows
        : allRows.filter((s) => s.menteeUserId === user.id || s.mentorUserId === user.id);

    const enriched = visibleRows.map((s) => {
      const mp = profileMap.get(s.mentorUserId);
      return {
        ...s,
        mentorName: userMap.get(s.mentorUserId)?.name || 'Mentor',
        mentorTitle: mp?.jobTitle || 'Industry Mentor',
        mentorOrganization: mp?.organization || '',
        mentorVerified: Boolean(mp?.verifiedMentor),
        menteeName: userMap.get(s.menteeUserId)?.name || 'Mentee',
        menteeHeadline: userMap.get(s.menteeUserId)?.headline || '',
      };
    });

    res.json({ sessions: enriched });
  } catch (error) {
    console.error('List mentorship sessions error:', error);
    res.status(500).json({ error: 'Failed to load scheduled sessions.' });
  }
});

router.post('/mentorship-sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mentorUserId = Number(req.body?.mentorUserId);
    const sessionDate = String(req.body?.sessionDate || '').trim();
    const startTime = String(req.body?.startTime || '').trim();
    const topic = String(req.body?.topic || '').trim().slice(0, 160);
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    const requestedFormat = String(req.body?.sessionFormat || '').trim();

    if (!mentorUserId || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !/^\d{2}:\d{2}$/.test(startTime) || !topic) {
      return res.status(400).json({
        error: 'Verified mentor, valid session date, time slot, and session topic are required.',
      });
    }

    if (mentorUserId === req.currentUser!.id) {
      return res.status(400).json({ error: 'You cannot book a mentorship session with yourself.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (sessionDate < todayStr) {
      return res.status(400).json({ error: 'Please select today or a future date.' });
    }

    const mentorRows = await db
      .select({
        profileId: mentorProfiles.id,
        userId: mentorProfiles.userId,
        name: users.name,
        verifiedMentor: mentorProfiles.verifiedMentor,
        isAcceptingMentees: mentorProfiles.isAcceptingMentees,
        timezone: mentorProfiles.timezone,
        sessionDurationMinutes: mentorProfiles.sessionDurationMinutes,
        weeklyAvailability: mentorProfiles.weeklyAvailability,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.userId, mentorUserId))
      .limit(1);

    const mentor = mentorRows[0];
    if (!mentor) {
      return res.status(404).json({ error: 'Selected mentor was not found.' });
    }
    if (!mentor.verifiedMentor) {
      return res.status(403).json({
        error: 'One-on-one session booking is only enabled for verified mentors.',
      });
    }
    if (!mentor.isAcceptingMentees) {
      return res.status(400).json({ error: 'This mentor is not currently accepting new sessions.' });
    }

    const dow = new Date(`${sessionDate}T00:00:00Z`).getUTCDay();
    const validSlots = expandSlotsForDay(
      mentor.weeklyAvailability || [],
      dow,
      mentor.sessionDurationMinutes
    );
    const matchedSlot = validSlots.find((s) => s.startTime === startTime);
    if (!matchedSlot) {
      return res.status(400).json({
        error: 'Selected time slot is outside this mentor’s published availability.',
      });
    }

    const mentorConflict = await db
      .select({ id: mentorshipSessions.id })
      .from(mentorshipSessions)
      .where(
        and(
          eq(mentorshipSessions.mentorUserId, mentorUserId),
          eq(mentorshipSessions.sessionDate, sessionDate),
          eq(mentorshipSessions.startTime, startTime),
          ne(mentorshipSessions.status, 'Cancelled')
        )
      )
      .limit(1);

    if (mentorConflict.length > 0) {
      return res.status(409).json({
        error: 'This time slot has already been booked. Please select another open slot.',
      });
    }

    const menteeConflict = await db
      .select({ id: mentorshipSessions.id })
      .from(mentorshipSessions)
      .where(
        and(
          eq(mentorshipSessions.menteeUserId, req.currentUser!.id),
          eq(mentorshipSessions.sessionDate, sessionDate),
          eq(mentorshipSessions.startTime, startTime),
          ne(mentorshipSessions.status, 'Cancelled')
        )
      )
      .limit(1);

    if (menteeConflict.length > 0) {
      return res.status(409).json({
        error: 'You already have a mentorship session scheduled at this date and time.',
      });
    }

    const sessionFormat = ['Video Call', 'Portfolio Review', 'Mock Interview'].includes(requestedFormat)
      ? requestedFormat
      : matchedSlot.format;

    const meetingLink = `https://meet.refugeetalent.example/session-${crypto.randomUUID().slice(0, 8)}`;

    const inserted = await db
      .insert(mentorshipSessions)
      .values({
        mentorUserId,
        menteeUserId: req.currentUser!.id,
        sessionDate,
        startTime: matchedSlot.startTime,
        endTime: matchedSlot.endTime,
        timezone: mentor.timezone,
        durationMinutes: mentor.sessionDurationMinutes,
        topic,
        sessionFormat,
        notes,
        meetingLink,
        status: 'Confirmed',
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values([
      {
        userId: mentorUserId,
        title: 'New 1-on-1 Session Booked',
        message: `${req.currentUser!.name} booked a ${mentor.sessionDurationMinutes}-min ${sessionFormat} on ${sessionDate} at ${matchedSlot.startTime} (${mentor.timezone}).`,
        category: 'mentorship',
        linkSection: 'mentorship',
      },
      {
        userId: req.currentUser!.id,
        title: '1-on-1 Mentorship Session Confirmed',
        message: `Your session with ${mentor.name} is confirmed for ${sessionDate} (${matchedSlot.startTime}–${matchedSlot.endTime} ${mentor.timezone}).`,
        category: 'mentorship',
        linkSection: 'mentorship',
      },
    ]);

    res.status(201).json({ session: inserted[0] });
  } catch (error) {
    console.error('Create mentorship session error:', error);
    res.status(500).json({ error: 'Failed to book mentorship session.' });
  }
});

router.patch('/mentorship-sessions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    if (!['Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid session status.' });
    }

    const rows = await db
      .select()
      .from(mentorshipSessions)
      .where(eq(mentorshipSessions.id, id))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const user = req.currentUser!;
    const isParticipant =
      existing.menteeUserId === user.id || existing.mentorUserId === user.id;
    if (user.role !== 'administrator' && !isParticipant) {
      return res.status(403).json({ error: 'Not authorized to modify this session.' });
    }
    if (
      status === 'Completed' &&
      user.role !== 'administrator' &&
      existing.mentorUserId !== user.id
    ) {
      return res.status(403).json({ error: 'Only the mentor or administrator can mark a session completed.' });
    }

    const updated = await db
      .update(mentorshipSessions)
      .set({ status, updatedAt: new Date() })
      .where(eq(mentorshipSessions.id, id))
      .returning();

    const notifyTarget =
      user.id === existing.menteeUserId ? existing.mentorUserId : existing.menteeUserId;
    await db.insert(notifications).values({
      userId: notifyTarget,
      title: `Mentorship Session ${status}`,
      message: `${user.name} marked the 1-on-1 session on ${existing.sessionDate} (${existing.startTime}) as ${status}.`,
      category: 'mentorship',
      linkSection: 'mentorship',
    });

    res.json({ session: updated[0] });
  } catch (error) {
    console.error('Update mentorship session error:', error);
    res.status(500).json({ error: 'Failed to update session.' });
  }
});

router.get('/mentorship-sessions/:id/ics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(mentorshipSessions)
      .where(eq(mentorshipSessions.id, id))
      .limit(1);
    const s = rows[0];
    if (!s) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const user = req.currentUser!;
    if (
      user.role !== 'administrator' &&
      s.menteeUserId !== user.id &&
      s.mentorUserId !== user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to download this calendar invite.' });
    }

    const participants = await db
      .select({ id: users.id, name: users.name })
      .from(users);
    const nameMap = new Map(participants.map((u) => [u.id, u.name]));
    const mentorName = nameMap.get(s.mentorUserId) || 'Verified Mentor';
    const menteeName = nameMap.get(s.menteeUserId) || 'Mentee';

    const compactDate = s.sessionDate.replace(/-/g, '');
    const compactStart = s.startTime.replace(':', '') + '00';
    const compactEnd = s.endTime.replace(':', '') + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const safeTz = s.timezone.replace(/[^A-Za-z0-9_/+ -]/g, '') || 'UTC';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RefugeeTalent Connect//Mentorship Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:rtc-mentorship-${s.id}@refugeetalent.connect`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${safeTz}:${compactDate}T${compactStart}`,
      `DTEND;TZID=${safeTz}:${compactDate}T${compactEnd}`,
      `SUMMARY:${escapeIcsText(`1-on-1 Mentorship: ${s.topic}`)}`,
      `DESCRIPTION:${escapeIcsText(`Mentor: ${mentorName}\nMentee: ${menteeName}\nFormat: ${s.sessionFormat}\nNotes: ${s.notes || 'None'}\nMeeting Link: ${s.meetingLink}`)}`,
      `LOCATION:${escapeIcsText(s.meetingLink || 'RefugeeTalent Connect Video Session')}`,
      `STATUS:${s.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mentorship-session-${s.id}.ics"`);
    res.send(ics);
  } catch (error) {
    console.error('Export session ICS error:', error);
    res.status(500).json({ error: 'Failed to generate calendar invite.' });
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
