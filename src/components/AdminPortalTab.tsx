import React, { useEffect, useState } from 'react';
import {
  Award,
  Building2,
  ClipboardCheck,
  Download,
  Globe,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile } from '../lib/api';
import type {
  CountryGuidance,
  CredentialRecord,
  FundingRequestItem,
  JobItem,
  MentorshipRequestItem,
  UserRole,
} from '../types';

interface AdminPortalProps {
  onToast: (msg: string, isError?: boolean) => void;
}

interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  hostCountry: string;
  isDemo: boolean;
  createdAt: string;
}

interface AdminEmployerRow {
  id: number;
  userId: number;
  contactName: string;
  contactEmail: string;
  companyName: string;
  industry: string;
  country: string;
  verifiedPartner: boolean;
  isDemo: boolean;
}

export function AdminPortalTab({ onToast }: AdminPortalProps) {
  const [section, setSection] = useState<
    'credentials' | 'funding' | 'users' | 'operations' | 'guidance'
  >('credentials');

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [funding, setFunding] = useState<FundingRequestItem[]>([]);
  const [employers, setEmployers] = useState<AdminEmployerRow[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [mentorships, setMentorships] = useState<MentorshipRequestItem[]>([]);
  const [countries, setCountries] = useState<CountryGuidance[]>([]);

  // Credential review inline state
  const [credReviewNote, setCredReviewNote] = useState<Record<number, string>>({});
  const [credInstRef, setCredInstRef] = useState<Record<number, string>>({});

  // Funding review inline state
  const [fundNote, setFundNote] = useState<Record<number, string>>({});

  // New assessment form
  const [aTitle, setATitle] = useState('');
  const [aCategory, setACategory] = useState('Engineering');
  const [aDesc, setADesc] = useState('');
  const [aPrompt, setAPrompt] = useState('');
  const [aOpt1, setAOpt1] = useState('');
  const [aOpt2, setAOpt2] = useState('');
  const [aOpt3, setAOpt3] = useState('');
  const [aCorrect, setACorrect] = useState('0');

  // Guidance editor state
  const [editCountryCode, setEditCountryCode] = useState('DE');
  const [editOverview, setEditOverview] = useState('');
  const [editBanking, setEditBanking] = useState('');

  const loadAll = async () => {
    try {
      const [uRes, cRes, fRes, eRes, jRes, mRes, gRes] = await Promise.all([
        apiFetch<{ users: AdminUserRow[] }>('/api/admin/users'),
        apiFetch<{ credentials: CredentialRecord[] }>('/api/credentials'),
        apiFetch<{ requests: FundingRequestItem[] }>('/api/funding-requests'),
        apiFetch<{ employers: AdminEmployerRow[] }>('/api/admin/employers'),
        apiFetch<{ jobs: JobItem[] }>('/api/jobs'),
        apiFetch<{ requests: MentorshipRequestItem[] }>('/api/mentorship-requests'),
        apiFetch<{ countries: CountryGuidance[] }>('/api/guidance'),
      ]);
      setUsers(uRes.users);
      setCredentials(cRes.credentials);
      setFunding(fRes.requests);
      setEmployers(eRes.employers);
      setJobs(jRes.jobs);
      setMentorships(mRes.requests);
      setCountries(gRes.countries);
      const firstCountry = gRes.countries.find((c) => c.countryCode === editCountryCode) || gRes.countries[0];
      if (firstCountry) {
        setEditCountryCode(firstCountry.countryCode);
        setEditOverview(firstCountry.workAuthOverview);
        setEditBanking(firstCountry.bankingAccessInfo);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to load administrator portal data.', true);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCredentialStatus = async (
    credId: number,
    status: CredentialRecord['status']
  ) => {
    try {
      await apiFetch(`/api/credentials/${credId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reviewerNotes: credReviewNote[credId] || '',
          authorizedInstitutionRef: credInstRef[credId] || '',
        }),
      });
      onToast(`Credential #${credId} updated to "${status}".`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Could not update credential status.', true);
    }
  };

  const handleFundingStatus = async (
    reqId: number,
    status: FundingRequestItem['status']
  ) => {
    try {
      await apiFetch(`/api/funding-requests/${reqId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNotes: fundNote[reqId] || '',
        }),
      });
      onToast(`Funding request #${reqId} marked "${status}".`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to update funding request.', true);
    }
  };

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      onToast('User role updated.');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to update user role.', true);
    }
  };

  const handleToggleEmployerVerify = async (empId: number, nextState: boolean) => {
    try {
      await apiFetch(`/api/admin/employers/${empId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verifiedPartner: nextState }),
      });
      onToast(nextState ? 'Employer marked as Verified Partner.' : 'Employer verification removed.');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to update employer.', true);
    }
  };

  const handleToggleJobStatus = async (jobId: number, status: 'Open' | 'Closed') => {
    try {
      await apiFetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onToast(`Job #${jobId} set to ${status}.`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to update job.', true);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/assessments', {
        method: 'POST',
        body: JSON.stringify({
          title: aTitle,
          category: aCategory,
          description: aDesc,
          passingScore: 70,
          questions: [
            {
              id: `custom-${Date.now()}`,
              domain: aCategory,
              prompt: aPrompt,
              options: [aOpt1, aOpt2, aOpt3].filter(Boolean),
              correctIndex: Number(aCorrect),
              explanation: 'Evaluated against administrator-configured technical criteria.',
            },
          ],
        }),
      });
      onToast('New skills assessment published.');
      setATitle('');
      setADesc('');
      setAPrompt('');
      setAOpt1('');
      setAOpt2('');
      setAOpt3('');
    } catch (err: any) {
      onToast(err.message || 'Failed to create assessment.', true);
    }
  };

  const handleSaveGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = countries.find((c) => c.countryCode === editCountryCode);
    if (!target) return;
    try {
      await apiFetch(`/api/guidance/${target.countryCode}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...target,
          workAuthOverview: editOverview,
          bankingAccessInfo: editBanking,
        }),
      });
      onToast(`Updated country guidance for ${target.countryName}.`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to update guidance.', true);
    }
  };

  const credCounts = {
    submitted: credentials.filter((c) => c.status === 'Submitted').length,
    underReview: credentials.filter((c) => c.status === 'Under review').length,
    verified: credentials.filter((c) => c.status === 'Verified by authorized reviewer').length,
    needsDocs: credentials.filter((c) => c.status === 'Additional documents required').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Administrator Governance Portal
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Verify qualifications, approve funding grants, manage roles, and export platform reports
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadAuthorizedFile('/api/admin/report', 'refugeetalent-platform-report.txt').catch(
              (e) => onToast(e.message, true)
            )
          }
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start"
        >
          <Download className="w-4 h-4" />
          <span>Generate Platform Report</span>
        </button>
      </div>

      {/* Admin Visual Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-500">Registered Accounts</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {users.length}
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-500">Credentials Awaiting / Verified</div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums mt-1">
            {credCounts.submitted + credCounts.underReview} / {credCounts.verified}
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-500">Funding Applications</div>
          <div className="text-2xl font-extrabold text-blue-700 font-mono tabular-nums mt-1">
            {funding.length}
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-500">Active Jobs & Mentorships</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {jobs.length} / {mentorships.length}
          </div>
        </div>
      </div>

      {/* Admin Section Switcher */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {[
          { id: 'credentials', label: 'Credential Reviews' },
          { id: 'funding', label: 'Funding Reviews' },
          { id: 'users', label: 'Users & Employers' },
          { id: 'operations', label: 'Jobs, Mentors & Assessments' },
          { id: 'guidance', label: 'Country Guidance' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id as typeof section)}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              section === tab.id
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CREDENTIALS REVIEW */}
      {section === 'credentials' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700" />
            <span>Authorized Credential Verification Queue</span>
          </h2>
          <div className="space-y-4">
            {credentials.map((c) => (
              <div key={c.id} className="p-4 border border-slate-200 rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {c.qualificationTitle} — {c.applicantName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {c.institutionName} ({c.countryOfQualification}, {c.graduationYear}) ·{' '}
                      {c.applicantEmail}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 shrink-0">{c.status}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {c.certificateDocId && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadAuthorizedFile(
                          `/api/documents/${c.certificateDocId}/download`,
                          `cert-${c.id}`
                        ).catch((e) => onToast(e.message, true))
                      }
                      className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Certificate
                    </button>
                  )}
                  {c.transcriptDocId && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadAuthorizedFile(
                          `/api/documents/${c.transcriptDocId}/download`,
                          `transcript-${c.id}`
                        ).catch((e) => onToast(e.message, true))
                      }
                      className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Transcript
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Reviewer notes..."
                    value={credReviewNote[c.id] ?? c.reviewerNotes ?? ''}
                    onChange={(e) =>
                      setCredReviewNote({ ...credReviewNote, [c.id]: e.target.value })
                    }
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Authorized institution ref (required to verify)"
                    value={credInstRef[c.id] ?? c.authorizedInstitutionRef ?? ''}
                    onChange={(e) =>
                      setCredInstRef({ ...credInstRef, [c.id]: e.target.value })
                    }
                    className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      'Under review',
                      'Additional documents required',
                      'Verified by authorized reviewer',
                      'Not verified',
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleCredentialStatus(c.id, st)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                        st === 'Verified by authorized reviewer'
                          ? 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUNDING REVIEW */}
      {section === 'funding' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span>Financial Assistance & Course Funding Decisions</span>
          </h2>
          <div className="space-y-4">
            {funding.map((f) => (
              <div key={f.id} className="p-4 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {f.title} — {f.applicantName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {f.requestType} ·{' '}
                      <span className="font-mono font-bold">
                        {f.currency} {f.amountRequested}
                      </span>{' '}
                      · {f.applicantEmail}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700">{f.status}</span>
                </div>
                <p className="text-xs text-slate-700">{f.justification}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Admin decision note..."
                    value={fundNote[f.id] ?? f.adminNotes ?? ''}
                    onChange={(e) => setFundNote({ ...fundNote, [f.id]: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFundingStatus(f.id, 'Approved')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleFundingStatus(f.id, 'Additional Information Required')
                      }
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-md"
                    >
                      Request Info
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFundingStatus(f.id, 'Rejected')}
                      className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-md"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS & EMPLOYERS */}
      {section === 'users' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              <span>User Accounts & Role Management</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Host Country</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">{u.name}</td>
                      <td className="py-2.5 pr-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{u.hostCountry || '—'}</td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {u.isDemo ? 'Sample Demo' : 'Live Account'}
                      </td>
                      <td className="py-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="refugee">refugee</option>
                          <option value="employer">employer</option>
                          <option value="mentor">mentor</option>
                          <option value="administrator">administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Employer Partner Accounts</span>
            </h2>
            <div className="divide-y divide-slate-100">
              {employers.map((emp) => (
                <div key={emp.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{emp.companyName}</div>
                    <div className="text-xs text-slate-600">
                      {emp.industry} · {emp.country} · Contact: {emp.contactEmail}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEmployerVerify(emp.id, !emp.verifiedPartner)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                      emp.verifiedPartner
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {emp.verifiedPartner ? 'Verified Partner' : 'Approve Partner'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS: JOBS, MENTORSHIPS & NEW ASSESSMENT */}
      {section === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAssessment}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3 self-start"
          >
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              <span>Add Skills Assessment</span>
            </h2>
            <input
              type="text"
              required
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
              placeholder="Assessment Title"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={aCategory}
              onChange={(e) => setACategory(e.target.value)}
              placeholder="Category (e.g. Engineering, Healthcare)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <textarea
              rows={2}
              required
              value={aDesc}
              onChange={(e) => setADesc(e.target.value)}
              placeholder="Assessment description..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={aPrompt}
              onChange={(e) => setAPrompt(e.target.value)}
              placeholder="Competency Question 1 Prompt"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={aOpt1}
              onChange={(e) => setAOpt1(e.target.value)}
              placeholder="Option A"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={aOpt2}
              onChange={(e) => setAOpt2(e.target.value)}
              placeholder="Option B"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={aOpt3}
              onChange={(e) => setAOpt3(e.target.value)}
              placeholder="Option C"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <select
              value={aCorrect}
              onChange={(e) => setACorrect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="0">Correct Answer: Option A</option>
              <option value="1">Correct Answer: Option B</option>
              <option value="2">Correct Answer: Option C</option>
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Publish Assessment
            </button>
          </form>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Manage Job Listings</h3>
              <div className="divide-y divide-slate-100">
                {jobs.map((j) => (
                  <div key={j.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{j.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {j.companyName} · {j.location}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleJobStatus(j.id, j.status === 'Open' ? 'Closed' : 'Open')
                      }
                      className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {j.status === 'Open' ? 'Close Listing' : 'Reopen'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Mentorship Connections</h3>
              <div className="divide-y divide-slate-100">
                {mentorships.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{m.refugeeName}</span> →{' '}
                      <span className="font-semibold text-blue-700">{m.mentorName}</span>
                      <div className="text-[11px] text-slate-500">{m.topic}</div>
                    </div>
                    <span className="font-semibold text-emerald-700">{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUNTRY GUIDANCE EDITOR */}
      {section === 'guidance' && (
        <form
          onSubmit={handleSaveGuidance}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-700" />
              <span>Manage Country-Specific Legal & Banking Guidance</span>
            </h2>
            <select
              value={editCountryCode}
              onChange={(e) => {
                const code = e.target.value;
                setEditCountryCode(code);
                const found = countries.find((c) => c.countryCode === code);
                if (found) {
                  setEditOverview(found.workAuthOverview);
                  setEditBanking(found.bankingAccessInfo);
                }
              }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {countries.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.countryName} ({c.countryCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Authorization Overview
            </label>
            <textarea
              rows={4}
              value={editOverview}
              onChange={(e) => setEditOverview(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Banking & Payment Access Guidance
            </label>
            <textarea
              rows={3}
              value={editBanking}
              onChange={(e) => setEditBanking(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Save Guidance Resource</span>
          </button>
        </form>
      )}
    </div>
  );
}
