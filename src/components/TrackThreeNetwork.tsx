import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile, uploadDocumentFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MentorshipCalendarPanel } from './MentorshipCalendarPanel';
import type {
  JobApplicationItem,
  JobItem,
  MentorProfileItem,
  MentorshipRequestItem,
  PortfolioData,
} from '../types';

interface TrackThreeProps {
  onToast: (msg: string, isError?: boolean) => void;
  initialSubTab?: 'jobs' | 'mentorship' | 'portfolio' | 'matching';
}

interface MatchingCandidate {
  id: number;
  name: string;
  headline: string;
  summary: string;
  location: string;
  hostCountry: string;
  skills: string[];
  experienceYears: number;
  languages: string[];
  cvDocId: number | null;
  verifiedQualificationCount: number;
  verifiedQualificationTitles: string[];
  matchScore: number;
  isDemo?: boolean;
}

export function TrackThreeNetwork({ onToast, initialSubTab }: TrackThreeProps) {
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'administrator';

  const [subTab, setSubTab] = useState<'jobs' | 'mentorship' | 'portfolio' | 'matching'>(
    initialSubTab || (isEmployer ? 'matching' : isMentor ? 'mentorship' : 'jobs')
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Jobs State
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applications, setApplications] = useState<JobApplicationItem[]>([]);
  const [jobQuery, setJobQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [applyingJob, setApplyingJob] = useState<JobItem | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [cvDocIdForApp, setCvDocIdForApp] = useState<number | null>(null);

  // Employer Job Publish State
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobType, setNewJobType] = useState('Full-time Job');
  const [newJobIndustry, setNewJobIndustry] = useState('Engineering & CleanTech');
  const [newJobLocation, setNewJobLocation] = useState('');
  const [newJobCountry, setNewJobCountry] = useState('Germany');
  const [newJobRemote, setNewJobRemote] = useState(false);
  const [newJobSalary, setNewJobSalary] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');

  // Mentorship State
  const [mentors, setMentors] = useState<MentorProfileItem[]>([]);
  const [mentorshipReqs, setMentorshipReqs] = useState<MentorshipRequestItem[]>([]);
  const [mentorSearch, setMentorSearch] = useState('');
  const [verifiedMentorsOnly, setVerifiedMentorsOnly] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfileItem | null>(null);
  const [bookingMentor, setBookingMentor] = useState<MentorProfileItem | null>(null);
  const [mTopic, setMTopic] = useState('');
  const [mGoals, setMGoals] = useState('');
  const [mMessage, setMMessage] = useState('');

  // Mentor profile edit state
  const [mpOrg, setMpOrg] = useState('');
  const [mpTitle, setMpTitle] = useState('');
  const [mpIndustry, setMpIndustry] = useState('Engineering & Technology');
  const [mpCountry, setMpCountry] = useState(user?.hostCountry || 'Germany');
  const [mpExpertise, setMpExpertise] = useState('CV Review, Technical Interviews');
  const [mpBio, setMpBio] = useState('');

  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    summary: '',
    cvDocId: null,
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');

  // Employer Matching State
  const [candidates, setCandidates] = useState<MatchingCandidate[]>([]);
  const [candidateSkillFilter, setCandidateSkillFilter] = useState('');

  const loadJobs = async () => {
    const params = new URLSearchParams();
    if (jobQuery) params.set('q', jobQuery);
    if (jobTypeFilter !== 'All') params.set('type', jobTypeFilter);
    if (remoteOnly) params.set('remote', 'true');
    const res = await apiFetch<{ jobs: JobItem[] }>(`/api/jobs?${params.toString()}`);
    setJobs(res.jobs);
  };

  const loadAll = async () => {
    try {
      await loadJobs();
      const [appsRes, mentRes, reqRes] = await Promise.all([
        apiFetch<{ applications: JobApplicationItem[] }>('/api/job-applications'),
        apiFetch<{ mentors: MentorProfileItem[] }>('/api/mentors'),
        apiFetch<{ requests: MentorshipRequestItem[] }>('/api/mentorship-requests'),
      ]);
      setApplications(appsRes.applications);
      setMentors(mentRes.mentors);
      setMentorshipReqs(reqRes.requests);

      if (user?.role === 'refugee' || isAdmin) {
        const portRes = await apiFetch<{ portfolio: PortfolioData }>('/api/portfolio');
        setPortfolio(portRes.portfolio);
        setSkillsInput((portRes.portfolio.skills || []).join(', '));
        setLanguagesInput((portRes.portfolio.languages || []).join(', '));
        if (portRes.portfolio.cvDocId) setCvDocIdForApp(portRes.portfolio.cvDocId);
      }

      if (isEmployer || isAdmin) {
        const candRes = await apiFetch<{ candidates: MatchingCandidate[] }>(
          '/api/candidates/matching'
        );
        setCandidates(candRes.candidates);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to load network data.', true);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.role]);

  useEffect(() => {
    loadJobs().catch(() => null);
  }, [jobQuery, jobTypeFilter, remoteOnly]);

  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    try {
      await apiFetch('/api/job-applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: applyingJob.id,
          coverLetter,
          cvDocId: cvDocIdForApp,
        }),
      });
      onToast(`Application submitted for "${applyingJob.title}".`);
      setApplyingJob(null);
      setCoverLetter('');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Application failed.', true);
    }
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: newJobTitle,
          opportunityType: newJobType,
          industry: newJobIndustry,
          location: newJobLocation,
          country: newJobCountry,
          isRemote: newJobRemote,
          salaryRange: newJobSalary || 'Competitive',
          requiredSkills: newJobSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          description: newJobDesc,
        }),
      });
      onToast('Opportunity published.');
      setNewJobTitle('');
      setNewJobLocation('');
      setNewJobSalary('');
      setNewJobSkills('');
      setNewJobDesc('');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to publish job.', true);
    }
  };

  const handleUpdateApplicationStatus = async (
    appId: number,
    status: JobApplicationItem['status']
  ) => {
    try {
      await apiFetch(`/api/job-applications/${appId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onToast(`Application marked ${status}.`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to update application.', true);
    }
  };

  const handleRequestMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;
    try {
      await apiFetch('/api/mentorship-requests', {
        method: 'POST',
        body: JSON.stringify({
          mentorUserId: selectedMentor.userId,
          topic: mTopic,
          goals: mGoals,
          message: mMessage,
        }),
      });
      onToast(`Mentorship request sent to ${selectedMentor.name}.`);
      setSelectedMentor(null);
      setMTopic('');
      setMGoals('');
      setMMessage('');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to send mentorship request.', true);
    }
  };

  const handleMentorAction = async (
    reqId: number,
    status: 'Accepted' | 'Declined' | 'Completed',
    responseText: string
  ) => {
    try {
      await apiFetch(`/api/mentorship-requests/${reqId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, mentorResponse: responseText }),
      });
      onToast(`Mentorship request ${status.toLowerCase()}.`);
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to respond to request.', true);
    }
  };

  const handleSaveMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/mentors/profile', {
        method: 'POST',
        body: JSON.stringify({
          organization: mpOrg,
          jobTitle: mpTitle,
          industry: mpIndustry,
          country: mpCountry,
          expertiseAreas: mpExpertise.split(',').map((s) => s.trim()).filter(Boolean),
          languages: ['English'],
          bio: mpBio,
        }),
      });
      onToast('Mentor profile published to directory.');
      await loadAll();
    } catch (err: any) {
      onToast(err.message || 'Unable to save mentor profile.', true);
    }
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: PortfolioData = {
        ...portfolio,
        skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
        languages: languagesInput.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await apiFetch<{ portfolio: PortfolioData }>('/api/portfolio', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setPortfolio(res.portfolio);
      onToast('Professional portfolio saved.');
    } catch (err: any) {
      onToast(err.message || 'Failed to save portfolio.', true);
    }
  };

  const handleCvUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const doc = await uploadDocumentFile(file, 'cv');
      setPortfolio((p) => ({ ...p, cvDocId: doc.id }));
      setCvDocIdForApp(doc.id);
      onToast(`CV "${doc.fileName}" uploaded.`);
    } catch (err: any) {
      onToast(err.message || 'CV upload failed.', true);
    }
  };

  const filteredMentors = mentors.filter((m) => {
    if (verifiedMentorsOnly && !m.verifiedMentor) return false;
    if (!mentorSearch.trim()) return true;
    const q = mentorSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.organization.toLowerCase().includes(q) ||
      m.industry.toLowerCase().includes(q) ||
      m.country.toLowerCase().includes(q) ||
      m.expertiseAreas.some((a) => a.toLowerCase().includes(q))
    );
  });

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSkillFilter.trim()) return true;
    const q = candidateSkillFilter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.headline || '').toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Track Three: Local Experience, Mentorship & Employment
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Connect with industry mentors, build your portfolio, and discover inclusive roles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubTab('jobs')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'jobs'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jobs & Opportunities
          </button>
          <button
            type="button"
            onClick={() => setSubTab('mentorship')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'mentorship'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mentorship
          </button>
          {(user?.role === 'refugee' || isAdmin) && (
            <button
              type="button"
              onClick={() => setSubTab('portfolio')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'portfolio'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Portfolio
            </button>
          )}
          {(isEmployer || isAdmin) && (
            <button
              type="button"
              onClick={() => setSubTab('matching')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'matching'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Employer Matching
            </button>
          )}
        </div>
      </div>

      {/* JOBS & OPPORTUNITIES TAB */}
      {subTab === 'jobs' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
                placeholder="Search by role, skills (e.g. TypeScript, Eurocode), or company..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Opportunity Types</option>
              <option value="Full-time Job">Full-time Jobs</option>
              <option value="Internship">Internships</option>
              <option value="Fellowship">Fellowships</option>
              <option value="Remote Opportunity">Remote Opportunities</option>
            </select>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded text-blue-700"
              />
              <span>Remote Friendly</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Listings */}
            <div className="lg:col-span-7 space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-blue-700">
                        {job.opportunityType} · {job.industry}
                        {job.isDemo && ' · Sample Demo'}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{job.title}</h3>
                      <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{job.companyName}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-emerald-700">{job.salaryRange}</span>
                      </div>
                    </div>

                    {user?.role === 'refugee' && job.status === 'Open' && (
                      <button
                        type="button"
                        onClick={() => setApplyingJob(job)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">{job.description}</p>
                  <div className="text-xs text-slate-500 pt-1">
                    Key Skills: {job.requiredSkills.join(' · ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Apply Drawer OR Employer Publish Form + Applications Tracker */}
            <div className="lg:col-span-5 space-y-6">
              {applyingJob && (
                <form
                  onSubmit={handleApplyJob}
                  className="bg-white border border-blue-300 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Apply: {applyingJob.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setApplyingJob(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tailored Cover Note
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Highlight relevant qualifications, technical experience, and readiness..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">
                      {cvDocIdForApp ? `Portfolio CV #${cvDocIdForApp} attached` : 'Optional CV upload'}
                    </span>
                    <label className="px-3 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      Upload CV
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleCvUpload(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Submit Application
                  </button>
                </form>
              )}

              {(isEmployer || isAdmin) && (
                <form
                  onSubmit={handlePublishJob}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-700" />
                    <span>Publish Job / Fellowship Opportunity</span>
                  </h3>
                  <input
                    type="text"
                    required
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="Role Title (e.g. Junior Civil Engineer)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newJobType}
                      onChange={(e) => setNewJobType(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Full-time Job">Full-time Job</option>
                      <option value="Internship">Internship</option>
                      <option value="Fellowship">Fellowship</option>
                      <option value="Remote Opportunity">Remote Opportunity</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={newJobIndustry}
                      onChange={(e) => setNewJobIndustry(e.target.value)}
                      placeholder="Industry"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newJobLocation}
                      onChange={(e) => setNewJobLocation(e.target.value)}
                      placeholder="City / Location"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      required
                      value={newJobCountry}
                      onChange={(e) => setNewJobCountry(e.target.value)}
                      placeholder="Country"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <input
                      type="text"
                      value={newJobSalary}
                      onChange={(e) => setNewJobSalary(e.target.value)}
                      placeholder="Compensation / Stipend"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <label className="text-xs font-semibold text-slate-700 inline-flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        checked={newJobRemote}
                        onChange={(e) => setNewJobRemote(e.target.checked)}
                      />
                      Remote Option
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newJobSkills}
                    onChange={(e) => setNewJobSkills(e.target.value)}
                    placeholder="Required skills (comma-separated)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <textarea
                    rows={3}
                    required
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    placeholder="Role responsibilities and onboarding support..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Publish Opportunity
                  </button>
                </form>
              )}

              {/* Applications Tracker */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {isEmployer || isAdmin ? 'Incoming Candidate Applications' : 'My Job Applications'}
                </h3>
                {applications.length === 0 ? (
                  <p className="text-xs text-slate-500">No applications recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <div key={app.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {isEmployer || isAdmin ? app.applicantName : app.jobTitle}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {isEmployer || isAdmin
                                ? `${app.jobTitle} · ${app.applicantLocation || 'Host Country'}`
                                : `${app.companyName} · ${app.opportunityType}`}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-emerald-700">
                            {app.status}
                          </span>
                        </div>
                        {(isEmployer || isAdmin) && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleUpdateApplicationStatus(
                                  app.id,
                                  e.target.value as JobApplicationItem['status']
                                )
                              }
                              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                            >
                              {['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Placed', 'Declined'].map(
                                (st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                )
                              )}
                            </select>
                            {app.cvDocId && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadAuthorizedFile(
                                    `/api/documents/${app.cvDocId}/download`,
                                    `cv-${app.applicantName}.pdf`
                                  ).catch((e) => onToast(e.message, true))
                                }
                                className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> CV
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENTORSHIP TAB */}
      {subTab === 'mentorship' && (
        <div className="space-y-6">
          <div id="mentorship-calendar">
            <MentorshipCalendarPanel
              mentors={mentors}
              selectedMentorForBooking={bookingMentor}
              onSelectMentorForBooking={setBookingMentor}
              onToast={onToast}
              onRefreshMentors={loadAll}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={mentorSearch}
                    onChange={(e) => setMentorSearch(e.target.value)}
                    placeholder="Filter mentors by expertise, industry, or country..."
                    className="flex-1 text-sm focus:outline-none"
                  />
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0">
                  <input
                    type="checkbox"
                    checked={verifiedMentorsOnly}
                    onChange={(e) => setVerifiedMentorsOnly(e.target.checked)}
                    className="rounded text-blue-700"
                  />
                  <span>Verified Mentors Only</span>
                </label>
              </div>

              <div className="space-y-4">
                {filteredMentors.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                    No mentors match the current filter.
                  </div>
                ) : (
                  filteredMentors.map((m) => (
                    <div key={m.profileId} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatarUrl || '/src/assets/images/avatar_sample_mentor_1795593657105.jpg'}
                            alt={m.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{m.name}</span>
                              {m.verifiedMentor && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Verified Mentor</span>
                                </span>
                              )}
                              {m.isDemo && (
                                <span className="text-xs font-normal text-slate-500">
                                  · Sample Demo
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600">
                              {m.jobTitle} · {m.organization}
                            </div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              {m.country} · {m.availability} · {m.timezone} · Languages: {m.languages.join(', ')}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {m.verifiedMentor && m.isAcceptingMentees && m.userId !== user?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookingMentor(m);
                                document
                                  .getElementById('mentorship-calendar')
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Book 1-on-1</span>
                            </button>
                          )}
                          {user?.role === 'refugee' && (
                            <button
                              type="button"
                              onClick={() => setSelectedMentor(m)}
                              className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                            >
                              Send Request
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">{m.bio}</p>
                      <div className="text-xs text-slate-500">
                        Expertise: {m.expertiseAreas.join(' · ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
            {selectedMentor && (
              <form
                onSubmit={handleRequestMentorship}
                className="bg-white border border-blue-300 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Request Mentorship: {selectedMentor.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedMentor(null)}
                    className="text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={mTopic}
                  onChange={(e) => setMTopic(e.target.value)}
                  placeholder="Topic (e.g. Portfolio Localization & Interview Prep)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={mGoals}
                  onChange={(e) => setMGoals(e.target.value)}
                  placeholder="Specific 4-week goals"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <textarea
                  rows={3}
                  required
                  value={mMessage}
                  onChange={(e) => setMMessage(e.target.value)}
                  placeholder="Brief background introduction..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Mentorship Request</span>
                </button>
              </form>
            )}

            {isMentor && (
              <form
                onSubmit={handleSaveMentorProfile}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <h3 className="text-sm font-bold text-slate-900">Update Your Mentor Listing</h3>
                <input
                  type="text"
                  required
                  value={mpOrg}
                  onChange={(e) => setMpOrg(e.target.value)}
                  placeholder="Organization"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={mpTitle}
                  onChange={(e) => setMpTitle(e.target.value)}
                  placeholder="Job Title"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={mpIndustry}
                    onChange={(e) => setMpIndustry(e.target.value)}
                    placeholder="Industry"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={mpCountry}
                    onChange={(e) => setMpCountry(e.target.value)}
                    placeholder="Country"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  value={mpExpertise}
                  onChange={(e) => setMpExpertise(e.target.value)}
                  placeholder="Expertise areas (comma-separated)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <textarea
                  rows={3}
                  required
                  value={mpBio}
                  onChange={(e) => setMpBio(e.target.value)}
                  placeholder="How you can support mentees..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
                >
                  Save Mentor Profile
                </button>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700" />
                <span>{isMentor ? 'Incoming Mentee Requests' : 'Mentorship Requests'}</span>
              </h3>
              {mentorshipReqs.length === 0 ? (
                <p className="text-xs text-slate-500">No mentorship requests yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mentorshipReqs.map((mr) => (
                    <div key={mr.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{mr.topic}</div>
                          <div className="text-[11px] text-slate-500">
                            {isMentor ? `From ${mr.refugeeName}` : `Mentor: ${mr.mentorName}`}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">{mr.status}</span>
                      </div>
                      <p className="text-xs text-slate-600">{mr.message}</p>
                      {mr.mentorResponse && (
                        <div className="p-2 bg-slate-50 rounded text-xs text-slate-700">
                          <span className="font-semibold">Response:</span> {mr.mentorResponse}
                        </div>
                      )}
                      {(isMentor || isAdmin) && mr.status === 'Pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleMentorAction(
                                mr.id,
                                'Accepted',
                                'Happy to mentor you—let us schedule an introductory session.'
                              )
                            }
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMentorAction(
                                mr.id,
                                'Declined',
                                'Currently at full capacity this month.'
                              )
                            }
                            className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* PORTFOLIO TAB */}
      {subTab === 'portfolio' && (
        <form onSubmit={handleSavePortfolio} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Professional Portfolio Builder</h2>
                <p className="text-xs text-slate-600">
                  Showcase work experience, education, skills, and project samples to consenting employers
                </p>
              </div>
              <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-2 shrink-0">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{portfolio.cvDocId ? 'Replace CV File' : 'Upload CV (PDF/DOCX)'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleCvUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Executive Professional Summary
              </label>
              <textarea
                rows={3}
                value={portfolio.summary}
                onChange={(e) => setPortfolio({ ...portfolio, summary: e.target.value })}
                placeholder="Summarize your domain expertise, years of experience, and target roles..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="TypeScript, AutoCAD, Clinical Triage, IFRS"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Languages (comma-separated)
                </label>
                <input
                  type="text"
                  value={languagesInput}
                  onChange={(e) => setLanguagesInput(e.target.value)}
                  placeholder="Arabic (Native), English (C1), German (B1)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Work Experience */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Work Experience</h3>
                <button
                  type="button"
                  onClick={() =>
                    setPortfolio({
                      ...portfolio,
                      workExperience: [
                        ...portfolio.workExperience,
                        {
                          id: `w-${Date.now()}`,
                          role: '',
                          organization: '',
                          country: '',
                          period: '',
                          summary: '',
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Role
                </button>
              </div>
              {portfolio.workExperience.map((exp, idx) => (
                <div key={exp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Role / Title"
                      value={exp.role}
                      onChange={(e) => {
                        const copy = [...portfolio.workExperience];
                        copy[idx] = { ...exp, role: e.target.value };
                        setPortfolio({ ...portfolio, workExperience: copy });
                      }}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Organization"
                      value={exp.organization}
                      onChange={(e) => {
                        const copy = [...portfolio.workExperience];
                        copy[idx] = { ...exp, organization: e.target.value };
                        setPortfolio({ ...portfolio, workExperience: copy });
                      }}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Period (e.g. 2019–2023)"
                        value={exp.period}
                        onChange={(e) => {
                          const copy = [...portfolio.workExperience];
                          copy[idx] = { ...exp, period: e.target.value };
                          setPortfolio({ ...portfolio, workExperience: copy });
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPortfolio({
                            ...portfolio,
                            workExperience: portfolio.workExperience.filter((x) => x.id !== exp.id),
                          })
                        }
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        aria-label="Remove experience"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Key responsibilities & measurable impact..."
                    value={exp.summary}
                    onChange={(e) => {
                      const copy = [...portfolio.workExperience];
                      copy[idx] = { ...exp, summary: e.target.value };
                      setPortfolio({ ...portfolio, workExperience: copy });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Project Samples */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Project Samples</h3>
                <button
                  type="button"
                  onClick={() =>
                    setPortfolio({
                      ...portfolio,
                      projects: [
                        ...portfolio.projects,
                        {
                          id: `p-${Date.now()}`,
                          title: '',
                          description: '',
                          link: '',
                          skills: [],
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>
              {portfolio.projects.map((proj, idx) => (
                <div key={proj.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Project Title"
                      value={proj.title}
                      onChange={(e) => {
                        const copy = [...portfolio.projects];
                        copy[idx] = { ...proj, title: e.target.value };
                        setPortfolio({ ...portfolio, projects: copy });
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPortfolio({
                          ...portfolio,
                          projects: portfolio.projects.filter((x) => x.id !== proj.id),
                        })
                      }
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Technical outcome or portfolio description..."
                    value={proj.description}
                    onChange={(e) => {
                      const copy = [...portfolio.projects];
                      copy[idx] = { ...proj, description: e.target.value };
                      setPortfolio({ ...portfolio, projects: copy });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg"
            >
              Save Professional Portfolio
            </button>
          </div>

          {/* Live Generated Portfolio Preview */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4 self-start">
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Generated Employer-Facing Preview</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
              <div className="text-xs text-slate-600">
                {user?.headline || 'Skilled Professional'} · {user?.hostCountry}
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {portfolio.summary || 'Add an executive summary to showcase your background.'}
            </p>
            {skillsInput && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                <span className="font-semibold">Core Skills:</span> {skillsInput}
              </div>
            )}
            {portfolio.cvDocId && (
              <button
                type="button"
                onClick={() =>
                  downloadAuthorizedFile(`/api/documents/${portfolio.cvDocId}/download`, 'my-cv.pdf').catch(
                    (e) => onToast(e.message, true)
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Uploaded CV
              </button>
            )}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-950">
              Confidentiality Check: Employers never see your identity documents, asylum status,
              or legal/financial support requests.
            </div>
          </div>
        </form>
      )}

      {/* EMPLOYER MATCHING TAB */}
      {subTab === 'matching' && (isEmployer || isAdmin) && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <span className="font-bold">Privacy-Preserving Talent Discovery:</span> Only candidates
              who explicitly opted into Employer Matching appear below. Sensitive identity documents
              and private contact records remain strictly protected.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={candidateSkillFilter}
              onChange={(e) => setCandidateSkillFilter(e.target.value)}
              placeholder="Filter consenting candidates by skill (e.g. TypeScript, Eurocode, PostgreSQL)..."
              className="flex-1 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCandidates.map((cand) => (
              <div key={cand.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {cand.name}
                      {cand.isDemo && <span className="ml-2 text-xs font-normal text-slate-500">(Sample Demo)</span>}
                    </h3>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {cand.headline || 'Skilled Candidate'} · {cand.location}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-blue-700 font-mono tabular-nums">
                      {cand.matchScore}%
                    </div>
                    <div className="text-[10px] text-slate-500">Skill Match</div>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{cand.summary}</p>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Skills:</span>{' '}
                  {cand.skills.join(' · ')}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      {cand.verifiedQualificationCount} Authorized Verified Credential(s)
                    </span>
                  </span>
                  {cand.cvDocId && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadAuthorizedFile(
                          `/api/documents/${cand.cvDocId}/download`,
                          `candidate-${cand.id}-cv.pdf`
                        ).catch((e) => onToast(e.message, true))
                      }
                      className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download CV
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
