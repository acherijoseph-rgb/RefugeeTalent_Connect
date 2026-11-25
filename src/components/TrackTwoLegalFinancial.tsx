import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckSquare,
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

export function TrackTwoLegalFinancial({ onToast }: TrackTwoProps) {
  const { user } = useAuth();
  const [countries, setCountries] = useState<CountryGuidance[]>([]);
  const [selectedCode, setSelectedCode] = useState('DE');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [readinessNotes, setReadinessNotes] = useState('');
  const [savingReadiness, setSavingReadiness] = useState(false);

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
    apiFetch<{ progress: { completedItemIds: string[]; notes: string } }>(
      `/api/guidance/readiness/${selectedCode}`
    )
      .then((res) => {
        setCompletedIds(res.progress.completedItemIds || []);
        setReadinessNotes(res.progress.notes || '');
      })
      .catch(() => null);
  }, [selectedCode]);

  const activeCountry = countries.find((c) => c.countryCode === selectedCode) || countries[0];

  const toggleChecklistItem = async (itemId: string) => {
    const next = completedIds.includes(itemId)
      ? completedIds.filter((id) => id !== itemId)
      : [...completedIds, itemId];
    setCompletedIds(next);
    try {
      await apiFetch(`/api/guidance/readiness/${selectedCode}`, {
        method: 'PUT',
        body: JSON.stringify({ completedItemIds: next, notes: readinessNotes }),
      });
      onToast('Documentation readiness updated.');
    } catch (err: any) {
      onToast(err.message || 'Could not save checklist item.', true);
    }
  };

  const saveNotes = async () => {
    setSavingReadiness(true);
    try {
      await apiFetch(`/api/guidance/readiness/${selectedCode}`, {
        method: 'PUT',
        body: JSON.stringify({ completedItemIds: completedIds, notes: readinessNotes }),
      });
      onToast('Readiness notes saved.');
    } catch (err: any) {
      onToast(err.message || 'Could not save notes.', true);
    } finally {
      setSavingReadiness(false);
    }
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
  const readinessPct = Math.round((completedIds.length / totalChecklist) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Track Two: Legal, Regulatory & Financial Access
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Country-specific work authorization guidance, compliance checklists, and banking access
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="country-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
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

      {/* Legal & Financial Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <span className="font-bold">Important Advisory Notice:</span>{' '}
          {activeCountry?.disclaimer ||
            'Informational guidance only: RefugeeTalent Connect does not provide definitive legal decisions, immigration rulings, or guarantee banking eligibility.'}
        </div>
      </div>

      {activeCountry && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* A. Work Authorization & Checklist */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" />
                    <span>A. Work Authorization · {activeCountry.countryName}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Employment Rights & Documentation Readiness
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums">
                    {readinessPct}%
                  </div>
                  <div className="text-[11px] text-slate-500">Readiness</div>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                {activeCountry.workAuthOverview}
              </p>

              {/* Interactive Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-700">
                  Track Your Documentation Readiness
                </div>
                {activeCountry.workAuthChecklist.map((item) => {
                  const checked = completedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
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
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{item.detail}</div>
                      </div>
                    </button>
                  );
                })}
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
                    placeholder="e.g. Appointment booked for Steuer-ID on 14 Dec..."
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
                  Official Government & Credential Portals
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

            {/* B. Regulatory & Employer Compliance */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>B. Employer Regulatory Compliance & Onboarding</span>
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
                  Legal Assistance Referrals
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
          </div>

          {/* C. Financial & Banking Access */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <Landmark className="w-4 h-4" />
                <span>C. Banking & Payment Services Access</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Payroll Accounts & Basic Financial Services
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {activeCountry.bankingAccessInfo}
              </p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">Practical Tip:</span>{' '}
                {activeCountry.paymentServicesNotes}
              </div>
            </div>

            {user?.role === 'refugee' && (
              <form
                onSubmit={submitFinancialSupport}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Wallet className="w-4 h-4 text-blue-700" />
                  <span>Request Financial Access or Relocation Support</span>
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
                    placeholder="Explain how this financial assistance supports your onboarding or credential fees..."
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
        </div>
      )}
    </div>
  );
}
