import React, { useEffect, useState } from 'react';
import { BarChart3, Globe2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ImpactResponse } from '../types';

export function SdgImpactTab() {
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadImpact = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<ImpactResponse>('/api/impact');
      setImpact(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load live SDG impact analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpact();
  }, []);

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Querying live PostgreSQL impact ledger...</div>;
  }

  if (error || !impact) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        {error || 'Impact analytics unavailable.'}
      </div>
    );
  }

  const m = impact.metrics;

  const indicators = [
    { label: 'Registered Refugee Professionals', value: m.registeredRefugees, sdg: 'SDG 10' },
    { label: 'Credentials Submitted', value: m.credentialsSubmitted, sdg: 'SDG 4' },
    { label: 'Credentials Verified', value: m.credentialsVerified, sdg: 'SDG 16' },
    { label: 'Skills Assessments Completed', value: m.assessmentsCompleted, sdg: 'SDG 4' },
    { label: 'Bridging Course Applicants', value: m.bridgingCourseApplicants, sdg: 'SDG 4' },
    { label: 'Financial Assistance Requests', value: m.financialAssistanceRequests, sdg: 'SDG 10' },
    { label: 'Mentorship Connections', value: m.mentorshipConnections, sdg: 'SDG 17' },
    { label: 'Job Applications', value: m.jobApplicationsTotal, sdg: 'SDG 8' },
    { label: 'Successful Employment Placements', value: m.successfulPlacements, sdg: 'SDG 8' },
  ];

  const maxVal = Math.max(1, ...indicators.map((i) => i.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            SDG Impact & Live Database Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time indicators computed directly from PostgreSQL records across SDGs 4, 8, 10, 16, and 17
          </p>
        </div>
        <button
          type="button"
          onClick={loadImpact}
          className="px-4 py-2 bg-white border border-slate-300 hover:border-blue-600 text-xs font-semibold text-slate-700 rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
          <span>Refresh Live Counts</span>
        </button>
      </div>

      {/* 9 Required KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((ind) => (
          <div
            key={ind.label}
            className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="text-xs font-mono font-semibold text-blue-700">{ind.sdg}</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{ind.label}</div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {ind.value}
            </div>
          </div>
        ))}
      </div>

      {/* SVG Distribution Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-700" />
            <span>Platform Funnel & Inclusion Volume</span>
          </h2>
          <span className="text-xs text-slate-500">Live PostgreSQL Aggregate</span>
        </div>

        <div className="space-y-3 pt-2">
          {indicators.map((ind, idx) => {
            const widthPct = Math.max(4, Math.round((ind.value / maxVal) * 100));
            const isGreen = idx % 2 === 1;
            return (
              <div key={ind.label} className="grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-5 sm:col-span-4 font-medium text-slate-700 truncate">
                  {ind.label}
                </div>
                <div className="col-span-5 sm:col-span-7 h-5 bg-slate-100 rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${
                      isGreen ? 'bg-emerald-600' : 'bg-blue-700'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {ind.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 SDG Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {impact.sdgMapping.map((sdg) => (
          <div key={sdg.sdgNumber} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-800">
                UN SDG {sdg.sdgNumber}
              </span>
              <Globe2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{sdg.title}</h3>
              <p className="text-xs text-slate-600 mt-0.5">{sdg.focus}</p>
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {sdg.indicators.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
