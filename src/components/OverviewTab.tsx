import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Scale,
  Users,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { CourseItem, JobItem, NotificationItem } from '../types';

interface DashboardSummary {
  profileCompletion: number;
  tracks: {
    credentials: { total: number; verified: number; latestStatus: string };
    assessments: { completed: number; passed: number; bestScore: number };
    legalReadiness: { countryCode: string; completedItems: number; status: string };
    financialSupport: { total: number; approved: number; latestStatus: string };
    mentorship: { total: number; accepted: number; latestStatus: string };
    jobApplications: { total: number; interviewingOrOffered: number; latestStatus: string };
  };
  notifications: NotificationItem[];
  recommendedJobs: JobItem[];
  recommendedCourses: CourseItem[];
}

interface OverviewTabProps {
  onNavigate: (tab: string) => void;
}

export function OverviewTab({ onNavigate }: OverviewTabProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<DashboardSummary>('/api/impact/dashboard-summary')
      .then(setSummary)
      .catch((err) => setError(err.message || 'Unable to load dashboard summary.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        {error || 'Dashboard summary unavailable.'}
      </div>
    );
  }

  const t = summary.tracks;

  // Readiness progress bars for custom SVG chart
  const chartMetrics = [
    { label: 'Profile', value: summary.profileCompletion, color: '#1d4ed8' },
    {
      label: 'Credentials',
      value: t.credentials.total === 0 ? 15 : t.credentials.verified > 0 ? 100 : 60,
      color: '#059669',
    },
    { label: 'Skills Score', value: t.assessments.bestScore || 0, color: '#1d4ed8' },
    {
      label: 'Legal Ready',
      value: Math.min(100, t.legalReadiness.completedItems * 25),
      color: '#059669',
    },
    {
      label: 'Support',
      value: t.financialSupport.approved > 0 ? 100 : t.financialSupport.total > 0 ? 55 : 10,
      color: '#0284c7',
    },
    {
      label: 'Network',
      value: t.mentorship.accepted > 0 ? 100 : t.mentorship.total > 0 ? 50 : 15,
      color: '#059669',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-blue-700">
            {user?.role === 'refugee' && 'Refugee Career Pathway'}
            {user?.role === 'employer' && 'Hiring Partner Workspace'}
            {user?.role === 'mentor' && 'Volunteer Mentor Workspace'}
            {user?.role === 'administrator' && 'Platform Governance & Verification Console'}
            {user?.isDemo && ' · Sample Demonstration Account'}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {user?.headline ||
              `Host country guidance active for ${user?.hostCountry || 'Germany'}. Track your credentials, assessments, legal readiness, and opportunities below.`}
          </p>
        </div>

        {/* Profile Completion */}
        <div className="w-full lg:w-72 shrink-0 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Profile Completion</span>
            <span className="font-mono text-blue-700 tabular-nums">
              {summary.profileCompletion}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 rounded-full transition-all"
              style={{ width: `${summary.profileCompletion}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="mt-2.5 text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Update Profile & Consent</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role-specific quick actions for Employer / Mentor / Admin */}
      {user?.role !== 'refugee' && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-blue-950">
              {user?.role === 'employer' && 'Employer Matching & Active Job Pipeline'}
              {user?.role === 'mentor' && 'Mentee Requests Awaiting Your Guidance'}
              {user?.role === 'administrator' && 'Authorized Credential & Grant Review Queue'}
            </h2>
            <p className="text-xs text-blue-900/80 mt-0.5">
              {user?.role === 'employer' &&
                'Browse consenting refugee candidates, publish opportunities, and review incoming applications.'}
              {user?.role === 'mentor' &&
                'Review incoming mentorship requests and manage your active availability.'}
              {user?.role === 'administrator' &&
                'Review submitted qualifications, approve training stipends, and export live SDG reports.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onNavigate(
                user?.role === 'administrator'
                  ? 'admin'
                  : 'track3'
              )
            }
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
          >
            {user?.role === 'administrator' ? 'Open Admin Portal' : 'Open Role Workspace'}
          </button>
        </div>
      )}

      {/* 6 Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate(user?.role === 'administrator' ? 'admin' : 'track1')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Credential Verification</span>
            <Award className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {t.credentials.verified} / {t.credentials.total} Verified
          </div>
          <div className="text-xs text-slate-600 truncate">
            Latest: <span className="font-semibold text-slate-800">{t.credentials.latestStatus}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('track1')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Skills Assessments</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {t.assessments.completed} Completed
          </div>
          <div className="text-xs text-slate-600">
            Best Score:{' '}
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">
              {t.assessments.bestScore}%
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('track2')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Legal Readiness</span>
            <Scale className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {t.legalReadiness.status}
          </div>
          <div className="text-xs text-slate-600 font-mono tabular-nums">
            {t.legalReadiness.completedItems} checklist items verified ({t.legalReadiness.countryCode})
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('funding')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Financial & Course Support</span>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {t.financialSupport.approved} / {t.financialSupport.total} Approved
          </div>
          <div className="text-xs text-slate-600 truncate">
            Status: <span className="font-semibold text-slate-800">{t.financialSupport.latestStatus}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('mentorship')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Mentorship Status</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {t.mentorship.accepted} Active
          </div>
          <div className="text-xs text-slate-600 truncate">
            Latest: <span className="font-semibold text-slate-800">{t.mentorship.latestStatus}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('track3')}
          className="text-left p-5 bg-white border border-slate-200 hover:border-blue-600 rounded-xl transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Job Applications</span>
            <Briefcase className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {t.jobApplications.total} Submitted
          </div>
          <div className="text-xs text-slate-600 truncate">
            Latest: <span className="font-semibold text-slate-800">{t.jobApplications.latestStatus}</span>
          </div>
        </button>
      </div>

      {/* Chart + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Readiness Visualization */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Career Integration Readiness Overview
              </h2>
              <p className="text-xs text-slate-500">
                Live milestone progress across all RefugeeTalent Connect tracks
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">0 – 100%</span>
          </div>

          <div className="space-y-3 pt-2">
            {chartMetrics.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {item.value}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-700" />
              <span>Recent Notifications</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {summary.notifications.length} items
            </span>
          </div>

          {summary.notifications.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No notifications yet. Activity updates will appear here.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.notifications.map((n) => (
                <div key={n.id} className="py-3 first:pt-0 last:pb-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{n.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Opportunities & Bridging Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recommended Opportunities</h2>
            <button
              type="button"
              onClick={() => onNavigate('track3')}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              View All Jobs
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {summary.recommendedJobs.map((job) => (
              <div key={job.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{job.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {job.companyName} · {job.location} · {job.opportunityType}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('track3')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-md whitespace-nowrap shrink-0"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recommended Bridging Courses</h2>
            <button
              type="button"
              onClick={() => onNavigate('funding')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Browse Courses
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {summary.recommendedCourses.map((course) => (
              <div key={course.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{course.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {course.provider} · {course.duration}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Stipend Eligible</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
