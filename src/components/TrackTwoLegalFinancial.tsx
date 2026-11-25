import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckSquare,
  CreditCard,
  Download,
  ExternalLink,
  Landmark,
  Scale,
  ShieldAlert,
  Square,
  Wallet,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { CountryGuidance, FundingRequestItem } from '../types';

interface TrackTwoProps {
  onToast: (msg: string, isError?: boolean) => void;
}

type FocusSection = 'all' | 'work-auth' | 'employer-compliance' | 'banking-payments';

const PAYMENT_ONBOARDING_PLAYBOOKS: Record<
  string,
  {
    payrollRail: string;
    kycChecklist: string[];
    contractingSetup: string;
    digitalPaymentTips: string[];
  }
> = {
  DE: {
    payrollRail: 'SEPA Credit Transfer (DE IBAN) + ELSTER Tax ID (Steuer-ID)',
    kycChecklist: [
      'Valid Aufenthaltstitel or Ankunftsnachweis / Fiktionsbescheinigung',
      'Municipal registration certificate (Meldebescheinigung / Anmeldung)',
      '11-digit German Tax Identification Number (Steuer-ID)',
    ],
    contractingSetup:
      'For freelance or remote contracting, register with the local Finanzamt (Steuernummer) and confirm whether your residence permit authorizes self-employment (Selbstständige Tätigkeit).',
    digitalPaymentTips: [
      'Every legal resident in Germany has a statutory right to a Basiskonto with a full SEPA IBAN.',
      'Digital multi-currency accounts and payroll processors typically require eID/video KYC plus German address confirmation.',
      'Provide your IBAN and statutory health insurance membership letter to HR before your first payroll cutoff.',
    ],
  },
  GB: {
    payrollRail: 'UK Faster Payments / BACS (8-digit Account + 6-digit Sort Code)',
    kycChecklist: [
      'Home Office eVisa / Share Code & biometric identity record',
      'National Insurance (NI) Number for PAYE tax deductions',
      'Proof of address (council tax, tenancy letter, or Jobcentre/support agency letter)',
    ],
    contractingSetup:
      'For independent contracting in the UK, register for Self Assessment with HMRC to obtain a Unique Taxpayer Reference (UTR) and issue compliant invoices.',
    digitalPaymentTips: [
      'High-street banks offer fee-free Basic Bank Accounts if standard utility bills are unavailable.',
      'Regulated UK digital payment institutions allow rapid Faster Payments salary deposits once eVisa KYC clears.',
      'Generate a fresh Right to Work Share Code from GOV.UK when onboarding with new employers or contracting platforms.',
    ],
  },
  CA: {
    payrollRail: 'EFT Direct Deposit (Transit, Institution & Account Number) + Interac',
    kycChecklist: [
      'Social Insurance Number (SIN) issued by Service Canada',
      'Confirmation of Permanent Residence, PR Card, or Open Work Permit',
      'Two pieces of accepted ID or newcomer bank verification',
    ],
    contractingSetup:
      'Independent contractors use their SIN for T4A reporting and register for a GST/HST number once taxable revenues exceed CAD 30,000 over four consecutive quarters.',
    digitalPaymentTips: [
      'Federally regulated Canadian banks must provide access to basic personal accounts under the Access to Basic Banking Services Regulations.',
      'Download a digital "Direct Deposit / Void Cheque" PDF from your banking portal for employer payroll onboarding.',
      'Major newcomer packages waive monthly chequing fees for 12–24 months and support international remittances.',
    ],
  },
  NL: {
    payrollRail: 'SEPA Credit Transfer (NL IBAN) + DigiD / BSN Payroll Link',
    kycChecklist: [
      'Burgerservicenummer (BSN) from municipal BRP registration',
      'IND residence card stating "Arbeid vrij toegestaan"',
      'Activated DigiD for government tax and social security portals',
    ],
    contractingSetup:
      'For freelance work (ZZP), register with the Chamber of Commerce (Kamer van Koophandel / KvK) and obtain a Dutch BTW-id (VAT number) for compliant invoicing.',
    digitalPaymentTips: [
      'Status holders can open a Basisbetaalrekening using their BSN and IND residence document.',
      'iDEAL and SEPA Direct Debit work immediately once your Dutch IBAN is active.',
      'Verify Loonheffingskorting (wage tax credit) elections with only one primary employer at a time.',
    ],
  },
  SE: {
    payrollRail: 'Swedish Clearing + Account Number / Bankgiro + BankID',
    kycChecklist: [
      'Personnummer or Coordination Number (Samordningsnummer) from Skatteverket',
      'Valid UT-kort or LMA card with AT-UND work exemption',
      'Skatteverket national ID card (for Mobile BankID activation)',
    ],
    contractingSetup:
      'Independent contractors apply for F-skatt (F-tax) registration through Verksamt.se / Skatteverket before invoicing Swedish or EU clients.',
    digitalPaymentTips: [
      'Under EEA rules, legal residents can request a basic payment account with debit card and salary transfer.',
      'Once you hold a Personnummer and Skatteverket ID, ask your bank to activate Mobile BankID for digital signing and Swish.',
      'Employers report monthly income directly to Skatteverket using your coordination or personal number.',
    ],
  },
  US: {
    payrollRail: 'ACH Direct Deposit (ABA Routing + Account Number) + SSN / W-4',
    kycChecklist: [
      'Unrestricted Social Security Number (SSN) + Form I-94 or EAD (Form I-766)',
      'State ID, Driver’s License, or I-94 resettlement documentation',
      'Resettlement agency or lease address verification letter',
    ],
    contractingSetup:
      'Contractors complete IRS Form W-9 using their SSN or an IRS Employer Identification Number (EIN) to receive Form 1099-NEC payments.',
    digitalPaymentTips: [
      'Look for Bank On certified checking accounts that accept Form I-94 alongside resettlement agency address letters.',
      'Provide your ABA routing and checking account numbers via employer payroll portals for ACH direct deposit.',
      'Digital payment platforms require matching legal name, SSN/ITIN, and residential address during KYC onboarding.',
    ],
  },
};

export function TrackTwoLegalFinancial({ onToast }: TrackTwoProps) {
  const { user } = useAuth();
  const [countries, setCountries] = useState<CountryGuidance[]>([]);
  const [selectedCode, setSelectedCode] = useState('DE');
  const [focus, setFocus] = useState<FocusSection>('all');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [readinessNotes, setReadinessNotes] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [savingReadiness, setSavingReadiness] = useState(false);

  // Payment onboarding checklist (stored locally in state & persisted inside readiness notes/progress)
  const [paymentStepsChecked, setPaymentStepsChecked] = useState<string[]>([]);

  // Financial Access Request State
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState('350');
  const [finCurrency, setFinCurrency] = useState('EUR');
  const [finJustification, setFinJustification] = useState('');
  const [finRequests, setFinRequests] = useState<FundingRequestItem[]>([]);
  const [submittingFin, setSubmittingFin] = useState(false);

  useEffect(() => {
    apiFetch<{ countries: CountryGuidance[] }>('/api/guidance')
      .then((res) => {
        setCountries(res.countries);
        const userHost = res.countries.find(
          (c) => c.countryName.toLowerCase() === (user?.hostCountry || '').toLowerCase()
        );
        if (userHost) setSelectedCode(userHost.countryCode);
      })
      .catch((err) => onToast(err.message || 'Failed to load country guidance.', true));

    apiFetch<{ requests: FundingRequestItem[] }>('/api/funding-requests')
      .then((res) => setFinRequests(res.requests))
      .catch(() => null);
  }, [user?.hostCountry]);

  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    setReadinessLoading(true);
    apiFetch<{ progress: { completedItemIds: string[]; notes: string; updatedAt?: string | null } }>(
      `/api/guidance/readiness/${selectedCode}`
    )
      .then((res) => {
        if (cancelled) return;
        const allIds = res.progress.completedItemIds || [];
        setCompletedIds(allIds.filter((id) => !id.startsWith('pay-')));
        setPaymentStepsChecked(allIds.filter((id) => id.startsWith('pay-')));
        setReadinessNotes(res.progress.notes || '');
        setLastSavedAt(res.progress.updatedAt || null);
      })
      .catch(() => {
        if (!cancelled) {
          setCompletedIds([]);
          setPaymentStepsChecked([]);
          setReadinessNotes('');
          setLastSavedAt(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  const activeCountry = countries.find((c) => c.countryCode === selectedCode) || countries[0];
  const paymentPlaybook =
    PAYMENT_ONBOARDING_PLAYBOOKS[selectedCode] || PAYMENT_ONBOARDING_PLAYBOOKS.DE;

  const persistCombinedProgress = async (
    nextWorkIds: string[],
    nextPayIds: string[],
    notesValue: string
  ) => {
    const res = await apiFetch<{
      progress: { completedItemIds: string[]; notes: string; updatedAt?: string | null };
    }>(`/api/guidance/readiness/${selectedCode}`, {
      method: 'PUT',
      body: JSON.stringify({
        completedItemIds: [...nextWorkIds, ...nextPayIds],
        notes: notesValue,
      }),
    });
    if (res.progress?.updatedAt) {
      setLastSavedAt(res.progress.updatedAt);
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    const prev = completedIds;
    const next = prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId];
    setCompletedIds(next);
    setSavingReadiness(true);
    try {
      await persistCombinedProgress(next, paymentStepsChecked, readinessNotes);
      onToast('Work authorization step saved.');
    } catch (err: any) {
      setCompletedIds(prev);
      onToast(err.message || 'Could not save checklist item.', true);
    } finally {
      setSavingReadiness(false);
    }
  };

  const handleResetWorkChecklist = async () => {
    const prev = completedIds;
    setCompletedIds([]);
    setSavingReadiness(true);
    try {
      await persistCombinedProgress([], paymentStepsChecked, readinessNotes);
      onToast(`Reset ${activeCountry?.countryName || selectedCode} work authorization checklist.`);
    } catch (err: any) {
      setCompletedIds(prev);
      onToast(err.message || 'Could not reset checklist.', true);
    } finally {
      setSavingReadiness(false);
    }
  };

  const togglePaymentStep = async (stepId: string) => {
    const prev = paymentStepsChecked;
    const next = prev.includes(stepId)
      ? prev.filter((id) => id !== stepId)
      : [...prev, stepId];
    setPaymentStepsChecked(next);
    setSavingReadiness(true);
    try {
      await persistCombinedProgress(completedIds, next, readinessNotes);
      onToast('Payment onboarding progress saved.');
    } catch (err: any) {
      setPaymentStepsChecked(prev);
      onToast(err.message || 'Could not save payment onboarding step.', true);
    } finally {
      setSavingReadiness(false);
    }
  };

  const saveNotes = async () => {
    setSavingReadiness(true);
    try {
      await persistCombinedProgress(completedIds, paymentStepsChecked, readinessNotes);
      onToast('Readiness notes saved.');
    } catch (err: any) {
      onToast(err.message || 'Could not save notes.', true);
    } finally {
      setSavingReadiness(false);
    }
  };

  const downloadComplianceBrief = () => {
    if (!activeCountry) return;
    const text = [
      `REFUGEETALENT CONNECT — EMPLOYER COMPLIANCE & ONBOARDING BRIEF (${activeCountry.countryName})`,
      '========================================================================',
      '',
      '1. WORK AUTHORIZATION OVERVIEW',
      activeCountry.workAuthOverview,
      '',
      '2. EMPLOYER COMPLIANCE SUMMARY',
      activeCountry.employerComplianceSummary,
      '',
      '3. STANDARD ONBOARDING REQUIREMENTS',
      ...activeCountry.onboardingRequirements.map((r) => `  - ${r}`),
      '',
      '4. PAYROLL & DIGITAL PAYMENT RAILS',
      `  Primary Rail: ${paymentPlaybook.payrollRail}`,
      `  Contracting / Freelance Setup: ${paymentPlaybook.contractingSetup}`,
      '',
      '5. OFFICIAL GOVERNMENT RESOURCES',
      ...activeCountry.officialResources.map((r) => `  - ${r.label}: ${r.url}`),
      '',
      'ADVISORY DISCLAIMER',
      'This document provides informational guidance and referrals only. It does not',
      'constitute legal advice or an automatic work-eligibility determination.',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employer-compliance-brief-${activeCountry.countryCode}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast(`Downloaded ${activeCountry.countryName} Employer Compliance Brief.`);
  };

  const submitFinancialSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFin(true);
    try {
      await apiFetch('/api/funding-requests', {
        method: 'POST',
        body: JSON.stringify({
          requestType: 'Financial Access Support',
          title: finTitle,
          amountRequested: Number(finAmount),
          currency: finCurrency,
          justification: finJustification,
        }),
      });
      onToast('Financial assistance request submitted.');
      setFinTitle('');
      setFinJustification('');
      const updated = await apiFetch<{ requests: FundingRequestItem[] }>('/api/funding-requests');
      setFinRequests(updated.requests);
    } catch (err: any) {
      onToast(err.message || 'Unable to submit request.', true);
    } finally {
      setSubmittingFin(false);
    }
  };

  const totalChecklist = activeCountry?.workAuthChecklist?.length || 1;
  const completedWorkCount = (activeCountry?.workAuthChecklist || []).filter((item) =>
    completedIds.includes(item.id)
  ).length;
  const readinessPct = Math.round((completedWorkCount / totalChecklist) * 100);
  const paymentPct = Math.round(
    (paymentStepsChecked.length / paymentPlaybook.kycChecklist.length) * 100
  );

  const showWorkAuth = focus === 'all' || focus === 'work-auth';
  const showEmployerCompliance = focus === 'all' || focus === 'employer-compliance';
  const showBankingPayments = focus === 'all' || focus === 'banking-payments';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-700">
            SDGs 8, 10 & 16 · Administrative & Economic Inclusion
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            Track Two: Legal, Regulatory & Financial Access
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Navigate work authorization requirements, employer compliance, banking resources, and
            digital payment onboarding
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="country-select"
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            Host Country:
          </label>
          <select
            id="country-select"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {countries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.countryName} ({c.countryCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Focus Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {[
          { id: 'all', label: 'All Guidance' },
          { id: 'work-auth', label: 'Work Authorization' },
          { id: 'employer-compliance', label: 'Employer Compliance' },
          { id: 'banking-payments', label: 'Banking & Digital Payments' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFocus(tab.id as FocusSection)}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              focus === tab.id
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mandatory Non-Legal-Advice Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <span className="font-bold">Informational Guidance & Referrals Only:</span>{' '}
          RefugeeTalent Connect provides informational guidance and referrals to official resources
          and support services—not legal advice, automatic work-eligibility decisions, or guaranteed
          banking approval. Always confirm individual eligibility with authorized agencies or legal
          counsel.
        </div>
      </div>

      {activeCountry && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Work Authorization + Employer Compliance */}
          {(showWorkAuth || showEmployerCompliance) && (
            <div
              className={`${
                showBankingPayments ? 'lg:col-span-7' : 'lg:col-span-12'
              } space-y-6`}
            >
              {/* A. Work Authorization Guidance & Document Checklists */}
              {showWorkAuth && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <Scale className="w-4 h-4" />
                        <span>A. Work Authorization · {activeCountry.countryName}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        Work Authorization Guidance & Document Checklist
                      </h2>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums">
                        {readinessPct}%
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {completedWorkCount} of {totalChecklist} steps
                      </div>
                    </div>
                  </div>

                  {/* Visual Completion Bar & Save Indicator */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${readinessPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {savingReadiness
                          ? 'Saving progress...'
                          : lastSavedAt
                            ? `Saved to profile · ${new Date(lastSavedAt).toLocaleString()}`
                            : 'Select steps below to save your progress'}
                      </span>
                      {completedWorkCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetWorkChecklist}
                          className="text-slate-600 hover:text-red-700 font-semibold"
                        >
                          Reset Steps
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activeCountry.workAuthOverview}
                  </p>

                  {/* Interactive Document Checklist */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700">
                      Interactive Document Preparation Checklist
                    </div>
                    {readinessLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-14 bg-slate-100 rounded-lg" />
                        <div className="h-14 bg-slate-100 rounded-lg" />
                      </div>
                    ) : (
                      activeCountry.workAuthChecklist.map((item) => {
                        const checked = completedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3 ${
                              checked
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    checked ? 'text-emerald-950' : 'text-slate-900'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold shrink-0 ${
                                    checked ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {checked ? 'Completed' : 'Pending'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">{item.detail}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Personal Readiness Notes */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700">
                      Personal Document Notes ({activeCountry.countryCode})
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={readinessNotes}
                        onChange={(e) => setReadinessNotes(e.target.value)}
                        placeholder="e.g. Appointment booked for Tax ID on 14 Dec..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        disabled={savingReadiness}
                        onClick={saveNotes}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                      >
                        {savingReadiness ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>

                  {/* Official Government Resources */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700">
                      Official Government & Credential Agencies
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {activeCountry.officialResources.map((res) => (
                        <a
                          key={res.url}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 transition-colors"
                        >
                          <div>
                            <div className="text-xs font-bold text-blue-800">{res.label}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{res.description}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-blue-700 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* B. Employer Compliance Information, Brief Export & Legal Referrals */}
              {showEmployerCompliance && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        <span>B. Employer Compliance & Support · {activeCountry.countryName}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        Hiring Compliance & Onboarding Playbook
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={downloadComplianceBrief}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-600 text-xs font-semibold text-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-700" />
                      <span>Download Compliance Brief</span>
                    </button>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activeCountry.employerComplianceSummary}
                  </p>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      Standard Employer Onboarding Requirements
                    </div>
                    <ul className="space-y-1.5">
                      {activeCountry.onboardingRequirements.map((req) => (
                        <li key={req} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="text-emerald-700 font-bold">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700">
                      Referrals to Legal & Inclusion Support Services
                    </div>
                    {activeCountry.legalAidReferrals.map((ref) => (
                      <a
                        key={ref.url}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 rounded-lg flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-emerald-800">{ref.label}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{ref.description}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-emerald-700 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column: Banking Access, Digital Payment Onboarding & Financial Support */}
          {showBankingPayments && (
            <div
              className={`${
                showWorkAuth || showEmployerCompliance ? 'lg:col-span-5' : 'lg:col-span-12'
              } space-y-6`}
            >
              {/* C1. Banking & Financial Access Resources */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>C. Banking & Financial Access Resources</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bank Accounts & Basic Financial Services
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {activeCountry.bankingAccessInfo}
                </p>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">Account Opening Guidance:</span>{' '}
                  {activeCountry.paymentServicesNotes}
                </div>
              </div>

              {/* C2. Digital Payment & Payment-Onboarding Guidance */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>D. Digital Payment & Payment-Onboarding</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      Payroll & Contracting Payment Readiness
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-blue-700 font-mono tabular-nums">
                      {paymentPct}%
                    </div>
                    <div className="text-[11px] text-slate-500">Payment Ready</div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-950">
                  <span className="font-bold">Primary Payment Rail:</span>{' '}
                  {paymentPlaybook.payrollRail}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Payment-Onboarding KYC & Tax Checklist
                  </div>
                  {paymentPlaybook.kycChecklist.map((label, idx) => {
                    const stepId = `pay-${selectedCode}-${idx}`;
                    const checked = paymentStepsChecked.includes(stepId);
                    return (
                      <button
                        key={stepId}
                        type="button"
                        onClick={() => togglePaymentStep(stepId)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-2.5 text-xs ${
                          checked
                            ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-700'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-800">
                    Contracting & Freelance Invoicing Readiness
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {paymentPlaybook.contractingSetup}
                  </p>
                </div>

                <ul className="space-y-1.5 pt-2 border-t border-slate-100">
                  {paymentPlaybook.digitalPaymentTips.map((tip) => (
                    <li key={tip} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="text-blue-700 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {user?.role === 'refugee' && (
                <form
                  onSubmit={submitFinancialSupport}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Wallet className="w-4 h-4 text-blue-700" />
                    <span>Request Financial Access or Onboarding Support</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Support Purpose
                    </label>
                    <input
                      type="text"
                      required
                      value={finTitle}
                      onChange={(e) => setFinTitle(e.target.value)}
                      placeholder="e.g. Document Translation & Notarization Fee Support"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={finAmount}
                        onChange={(e) => setFinAmount(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={finCurrency}
                        onChange={(e) => setFinCurrency(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="USD">USD</option>
                        <option value="CAD">CAD</option>
                        <option value="SEK">SEK</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Justification & Context
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={finJustification}
                      onChange={(e) => setFinJustification(e.target.value)}
                      placeholder="Explain how this support helps your work authorization, banking, or onboarding..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFin}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
                  >
                    {submittingFin ? 'Submitting...' : 'Submit Financial Support Request'}
                  </button>
                </form>
              )}

              {/* Submitted Support Requests */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Your Support Requests</h3>
                {finRequests.length === 0 ? (
                  <p className="text-xs text-slate-500">No financial requests submitted yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {finRequests.map((req) => (
                      <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{req.title}</span>
                          <span className="text-xs font-mono font-semibold text-blue-700 tabular-nums shrink-0">
                            {req.currency} {req.amountRequested}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{req.requestType}</span>
                          <span className="font-semibold text-emerald-700">{req.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
