import crypto from 'crypto';
import { Router } from 'express';
import type { Response } from 'express';
import { and, count, eq, gt } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  employerProfiles,
  mentorProfiles,
  notifications,
  passwordResetTokens,
  portfolios,
  users,
} from '../../db/schema.ts';
import {
  hashPassword,
  sha256Hex,
  signSessionToken,
  verifyPassword,
} from '../../lib/auth-crypto.ts';
import { requireAuth } from '../../middleware/auth.ts';
import type { AuthRequest, UserRole } from '../../middleware/auth.ts';

const router = Router();
const OWNER_ADMIN_EMAIL = 'acherijoseph@gmail.com';
const PUBLIC_ROLES: UserRole[] = ['refugee', 'employer', 'mentor'];

function sanitizeUser(u: typeof users.$inferSelect) {
  const { passwordHash: _omit, ...safe } = u;
  return safe;
}

router.post('/register', async (req, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const requestedRole = String(req.body?.role || 'refugee') as UserRole;
    const hostCountry = String(req.body?.hostCountry || 'Germany').trim() || 'Germany';
    const countryOfOrigin = String(req.body?.countryOfOrigin || '').trim();
    const companyName = String(req.body?.companyName || '').trim();
    const organization = String(req.body?.organization || '').trim();

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name (at least 2 characters).' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    let role: UserRole = PUBLIC_ROLES.includes(requestedRole) ? requestedRole : 'refugee';
    if (email === OWNER_ADMIN_EMAIL.toLowerCase()) {
      role = 'administrator';
    } else if (requestedRole === 'administrator') {
      // Allow administrator registration only if no non-demo administrator exists yet
      const realAdmins = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, 'administrator'), eq(users.isDemo, false)));
      if (Number(realAdmins[0]?.value ?? 0) === 0) {
        role = 'administrator';
      } else {
        return res.status(403).json({
          error: 'Administrator accounts can only be assigned by an existing administrator.',
        });
      }
    }

    const uid = `local-${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
        role,
        passwordHash,
        hostCountry,
        countryOfOrigin,
        isDemo: false,
      })
      .returning();

    const createdUser = inserted[0];

    if (role === 'refugee') {
      await db.insert(portfolios).values({
        userId: createdUser.id,
        summary: '',
        workExperience: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      });
    } else if (role === 'employer') {
      await db.insert(employerProfiles).values({
        userId: createdUser.id,
        companyName: companyName || `${name} Organization`,
        industry: 'Technology & Engineering',
        country: hostCountry,
        verifiedPartner: false,
        isDemo: false,
      });
    } else if (role === 'mentor') {
      await db.insert(mentorProfiles).values({
        userId: createdUser.id,
        organization: organization || 'Independent Volunteer Mentor',
        jobTitle: 'Senior Industry Advisor',
        industry: 'Technology & Engineering',
        country: hostCountry,
        expertiseAreas: ['Career Guidance', 'Interview Prep'],
        languages: ['English'],
        bio: 'Supporting skilled displaced professionals with career navigation and local industry insights.',
        isAcceptingMentees: true,
        isDemo: false,
      });
    }

    await db.insert(notifications).values({
      userId: createdUser.id,
      title: 'Welcome to RefugeeTalent Connect',
      message: 'Complete your profile and explore credential recognition, legal guidance, and mentorship opportunities.',
      category: 'general',
      linkSection: 'overview',
    });

    const token = signSessionToken({
      userId: createdUser.id,
      uid: createdUser.uid,
      role: createdUser.role,
    });

    res.status(201).json({
      token,
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Unable to complete registration right now.' });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = found[0];
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signSessionToken({
      userId: user.id,
      uid: user.uid,
      role: user.role,
    });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

router.post('/demo-login', async (req, res: Response) => {
  try {
    const role = String(req.body?.role || 'refugee') as UserRole;
    const demoUidMap: Record<UserRole, string> = {
      refugee: 'demo-refugee-layla',
      employer: 'demo-employer-nordic',
      mentor: 'demo-mentor-henrik',
      administrator: 'demo-admin-amara',
    };

    const targetUid = demoUidMap[role];
    if (!targetUid) {
      return res.status(400).json({ error: 'Invalid demonstration role.' });
    }

    const found = await db
      .select()
      .from(users)
      .where(and(eq(users.uid, targetUid), eq(users.isDemo, true)))
      .limit(1);

    if (!found[0]) {
      return res.status(404).json({ error: 'Demonstration account not available.' });
    }

    const user = found[0];
    const token = signSessionToken({
      userId: user.id,
      uid: user.uid,
      role: user.role,
    });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Unable to sign into demonstration account.' });
  }
});

router.post('/forgot-password', async (req, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Please enter your account email.' });
    }

    const found = await db
      .select({ id: users.id, isDemo: users.isDemo, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!found[0] || found[0].isDemo) {
      return res.json({
        message: 'If a registered account exists for this email, a password reset code has been generated.',
      });
    }

    const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await db.insert(passwordResetTokens).values({
      userId: found[0].id,
      tokenHash: sha256Hex(rawCode),
      expiresAt,
      used: false,
    });

    // Return preview reset token in response when email delivery isn't configured in sandbox
    res.json({
      message: 'Password reset code generated. Enter the verification code below to choose a new password.',
      resetCodePreview: rawCode,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to start password reset.' });
  }
});

router.post('/reset-password', async (req, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !code || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Email, reset code, and a new password (min 8 characters) are required.',
      });
    }

    const foundUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!foundUser[0]) {
      return res.status(400).json({ error: 'Invalid reset request.' });
    }

    const tokenRows = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, foundUser[0].id),
          eq(passwordResetTokens.tokenHash, sha256Hex(code)),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRows[0]) {
      return res.status(400).json({ error: 'Reset code is invalid or expired.' });
    }

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(users.id, foundUser[0].id));

    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenRows[0].id));

    res.json({ message: 'Your password has been updated. You may now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset password.' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRow = await db
      .select()
      .from(users)
      .where(eq(users.id, req.currentUser!.id))
      .limit(1);

    if (!userRow[0]) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const unread = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, req.currentUser!.id), eq(notifications.isRead, false)));

    res.json({
      user: sanitizeUser(userRow[0]),
      unreadNotifications: Number(unread[0]?.value ?? 0),
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const {
      name,
      headline,
      bio,
      countryOfOrigin,
      hostCountry,
      location,
      phone,
      linkedinUrl,
      skills,
      experienceYears,
      consentForEmployerMatching,
    } = req.body || {};

    const cleanSkills = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 30)
      : undefined;

    const updated = await db
      .update(users)
      .set({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(headline !== undefined ? { headline: String(headline).trim() } : {}),
        ...(bio !== undefined ? { bio: String(bio).trim() } : {}),
        ...(countryOfOrigin !== undefined ? { countryOfOrigin: String(countryOfOrigin).trim() } : {}),
        ...(hostCountry !== undefined ? { hostCountry: String(hostCountry).trim() } : {}),
        ...(location !== undefined ? { location: String(location).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(linkedinUrl !== undefined ? { linkedinUrl: String(linkedinUrl).trim() } : {}),
        ...(cleanSkills !== undefined ? { skills: cleanSkills } : {}),
        ...(experienceYears !== undefined ? { experienceYears: Math.max(0, Number(experienceYears) || 0) } : {}),
        ...(consentForEmployerMatching !== undefined
          ? { consentForEmployerMatching: Boolean(consentForEmployerMatching) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({ user: sanitizeUser(updated[0]) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
