import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/auth-crypto.ts';

export type UserRole = 'refugee' | 'employer' | 'mentor' | 'administrator';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  hostCountry: string | null;
  isDemo: boolean | null;
}

export interface AuthRequest extends Request {
  currentUser?: AuthenticatedUser;
}

const OWNER_ADMIN_EMAIL = 'acherijoseph@gmail.com';

async function resolveUserFromToken(token: string): Promise<AuthenticatedUser | null> {
  // 1. Check signed session token for email/password & demo sessions
  const sessionPayload = verifySessionToken(token);
  if (sessionPayload) {
    const found = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        hostCountry: users.hostCountry,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(eq(users.id, sessionPayload.userId))
      .limit(1);

    if (found[0]) {
      return {
        ...found[0],
        role: found[0].role as UserRole,
      };
    }
    return null;
  }

  // 2. Otherwise verify Firebase ID token (Google Sign-In)
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const displayName = decoded.name || email.split('@')[0] || 'Platform Member';
    const defaultRole: UserRole =
      email === OWNER_ADMIN_EMAIL.toLowerCase() ? 'administrator' : 'refugee';

    const existing = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        hostCountry: users.hostCountry,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(eq(users.uid, decoded.uid))
      .limit(1);

    if (existing[0]) {
      return {
        ...existing[0],
        role: existing[0].role as UserRole,
      };
    }

    // Check by email in case user previously registered via email/password
    if (email) {
      const byEmail = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          name: users.name,
          role: users.role,
          hostCountry: users.hostCountry,
          isDemo: users.isDemo,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (byEmail[0]) {
        return {
          ...byEmail[0],
          role: byEmail[0].role as UserRole,
        };
      }
    }

    const upserted = await db
      .insert(users)
      .values({
        uid: decoded.uid,
        email: email || `${decoded.uid}@firebase.local`,
        name: displayName,
        role: defaultRole,
        avatarUrl: decoded.picture || '',
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || `${decoded.uid}@firebase.local`,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        hostCountry: users.hostCountry,
        isDemo: users.isDemo,
      });

    return {
      ...upserted[0],
      role: upserted[0].role as UserRole,
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing.' });
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      try {
        const user = await resolveUserFromToken(token);
        if (user) req.currentUser = user;
      } catch {
        // Ignore invalid optional auth
      }
    }
  }
  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.currentUser.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
};
