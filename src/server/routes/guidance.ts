import { Router } from 'express';
import type { Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { countryGuidance, legalReadinessProgress } from '../../db/schema.ts';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import type { AuthRequest } from '../../middleware/auth.ts';

const router = Router();

router.get('/', async (_req, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(countryGuidance)
      .orderBy(asc(countryGuidance.countryName));
    res.json({ countries: rows });
  } catch (error) {
    console.error('List country guidance error:', error);
    res.status(500).json({ error: 'Failed to load country guidance.' });
  }
});

router.put('/:countryCode', requireAuth, requireRole('administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const countryCode = String(req.params.countryCode || '').toUpperCase().slice(0, 4);
    const {
      countryName,
      workAuthOverview,
      workAuthChecklist,
      officialResources,
      employerComplianceSummary,
      onboardingRequirements,
      legalAidReferrals,
      bankingAccessInfo,
      paymentServicesNotes,
      disclaimer,
    } = req.body || {};

    if (!countryCode || !countryName || !workAuthOverview) {
      return res.status(400).json({
        error: 'Country code, country name, and work authorization overview are required.',
      });
    }

    const upserted = await db
      .insert(countryGuidance)
      .values({
        countryCode,
        countryName: String(countryName).trim(),
        workAuthOverview: String(workAuthOverview).trim(),
        workAuthChecklist: Array.isArray(workAuthChecklist) ? workAuthChecklist : [],
        officialResources: Array.isArray(officialResources) ? officialResources : [],
        employerComplianceSummary: String(employerComplianceSummary || '').trim(),
        onboardingRequirements: Array.isArray(onboardingRequirements) ? onboardingRequirements : [],
        legalAidReferrals: Array.isArray(legalAidReferrals) ? legalAidReferrals : [],
        bankingAccessInfo: String(bankingAccessInfo || '').trim(),
        paymentServicesNotes: String(paymentServicesNotes || '').trim(),
        disclaimer:
          String(disclaimer || '').trim() ||
          'Informational guidance only: RefugeeTalent Connect does not provide definitive legal decisions or guarantee banking eligibility.',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: countryGuidance.countryCode,
        set: {
          countryName: String(countryName).trim(),
          workAuthOverview: String(workAuthOverview).trim(),
          ...(workAuthChecklist ? { workAuthChecklist } : {}),
          ...(officialResources ? { officialResources } : {}),
          ...(employerComplianceSummary !== undefined
            ? { employerComplianceSummary: String(employerComplianceSummary).trim() }
            : {}),
          ...(onboardingRequirements ? { onboardingRequirements } : {}),
          ...(legalAidReferrals ? { legalAidReferrals } : {}),
          ...(bankingAccessInfo !== undefined
            ? { bankingAccessInfo: String(bankingAccessInfo).trim() }
            : {}),
          ...(paymentServicesNotes !== undefined
            ? { paymentServicesNotes: String(paymentServicesNotes).trim() }
            : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ country: upserted[0] });
  } catch (error) {
    console.error('Upsert guidance error:', error);
    res.status(500).json({ error: 'Failed to save country guidance.' });
  }
});

router.get('/readiness/:countryCode', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const countryCode = String(req.params.countryCode || 'DE').toUpperCase();
    const rows = await db
      .select()
      .from(legalReadinessProgress)
      .where(
        and(
          eq(legalReadinessProgress.userId, req.currentUser!.id),
          eq(legalReadinessProgress.countryCode, countryCode)
        )
      )
      .limit(1);

    res.json({
      progress: rows[0] || {
        countryCode,
        completedItemIds: [],
        notes: '',
      },
    });
  } catch (error) {
    console.error('Get legal readiness error:', error);
    res.status(500).json({ error: 'Failed to load documentation readiness.' });
  }
});

router.put('/readiness/:countryCode', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const countryCode = String(req.params.countryCode || 'DE').toUpperCase();
    const completedItemIds = Array.isArray(req.body?.completedItemIds)
      ? req.body.completedItemIds.map((x: unknown) => String(x))
      : [];
    const notes = String(req.body?.notes || '').trim();

    const existing = await db
      .select({ id: legalReadinessProgress.id })
      .from(legalReadinessProgress)
      .where(
        and(
          eq(legalReadinessProgress.userId, req.currentUser!.id),
          eq(legalReadinessProgress.countryCode, countryCode)
        )
      )
      .limit(1);

    let saved;
    if (existing[0]) {
      const updated = await db
        .update(legalReadinessProgress)
        .set({
          completedItemIds,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(legalReadinessProgress.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(legalReadinessProgress)
        .values({
          userId: req.currentUser!.id,
          countryCode,
          completedItemIds,
          notes,
        })
        .returning();
      saved = inserted[0];
    }

    res.json({ progress: saved });
  } catch (error) {
    console.error('Save legal readiness error:', error);
    res.status(500).json({ error: 'Failed to save documentation readiness.' });
  }
});

export default router;
