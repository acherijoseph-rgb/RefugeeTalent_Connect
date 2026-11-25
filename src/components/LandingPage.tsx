import React, { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Compass,
  Globe2,
  Scale,
  ShieldCheck,
  Users,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ImpactResponse } from '../types';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onExploreImpact: () => void;
}

export function LandingPage({ onOpenAuth, onExploreImpact }: LandingPageProps) {
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [credImgError, setCredImgError] = useState(false);
  const [mentorImgError, setMentorImgError] = useState(false);

  useEffect(() => {
    apiFetch<ImpactResponse>('/api/impact')
      .then(setImpact)
      .catch(() => null);
  }, []);

  const m = impact?.metrics;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <a
            href="#top"
            className="text-lg font-extrabold tracking-tight text-blue-900 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-700 text-white inline-flex items-center justify-center text-sm font-bold">
              R
            </span>
            <span>RefugeeTalent Connect</span>
          </a>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#solutions"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Solutions
            </a>
            <a
              href="#sdg-impact"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              SDG Impact
            </a>
            <a
              href="#stories"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Stories
            </a>
            <a
              href="#partners"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Partners
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-10 lg:pt-16 lg:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-semibold text-emerald-700">
                Your Skills. Your Future. Your Opportunity.
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.08] text-balance">
                Unlocking Displaced Talent
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Skilled refugees arrive with university degrees, engineering licenses, clinical
                expertise, and years of leadership—yet face unrecognized qualifications, legal
                complexity, and closed networks. RefugeeTalent Connect bridges credential
                verification, country-specific legal & financial readiness, and inclusive hiring
                in one trusted platform.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-6 py-3 text-sm font-semibold text-blue-900 bg-white border border-slate-300 hover:border-blue-700 hover:bg-blue-50/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Login
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Protected Document Privacy</span>
                <span aria-hidden="true">·</span>
                <span>Authorized Reviewer Verification</span>
                <span aria-hidden="true">·</span>
                <span>UN SDG 4, 8, 10, 16 & 17 Aligned</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_talent_hub_1795593654997.jpg"
                    alt="Diverse skilled professionals collaborating around engineering plans and laptops"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-white to-emerald-50 text-center">
                    <Globe2 className="w-12 h-12 text-blue-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-800">
                      Global Displaced Talent Inclusion Workspace
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-Column Live Platform Statistics Strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-slate-200 py-8">
            <div className="pr-4">
              <div className="text-3xl font-extrabold text-blue-900 font-mono tabular-nums">
                {m ? m.registeredRefugees : '—'}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                Registered Refugee Professionals
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Live platform records (incl. demo profiles)
              </div>
            </div>
            <div className="pr-4">
              <div className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                {m ? `${m.credentialsVerified} / ${m.credentialsSubmitted}` : '—'}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                Credentials Verified / Submitted
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Reviewed only by authorized reviewers
              </div>
            </div>
            <div className="pr-4">
              <div className="text-3xl font-extrabold text-blue-900 font-mono tabular-nums">
                {m ? m.assessmentsCompleted : '—'}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                Skills Assessments Completed
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Scored technical & practical reports
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                {m ? `${m.mentorshipConnections + m.successfulPlacements}` : '—'}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                Mentorships & Verified Placements
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Across {m ? m.guidanceCountries : 6} host-country pathways
              </div>
            </div>
          </div>
        </section>

        {/* Three Core Solution Areas */}
        <section id="solutions" className="bg-slate-50 border-b border-slate-200 py-16">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-blue-700">Integrated Inclusion Architecture</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 text-balance">
                Three Practical Tracks From Qualification to Meaningful Employment
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Track 1 Feature Card */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                <div className="h-60 bg-slate-100 border-b border-slate-200">
                  {!credImgError ? (
                    <img
                      src="/src/assets/images/track_credentials_1795593656042.jpg"
                      alt="University diplomas and engineering transcripts prepared for verification"
                      referrerPolicy="no-referrer"
                      onError={() => setCredImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                      <Award className="w-10 h-10 text-blue-700" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-blue-700">
                      01. Track One · SDG 4 & SDG 16
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Credential Recognition & Skills Validation
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Upload academic degrees, transcripts, and supporting documentation into
                      confidential storage. Track transparent review stages from submission through
                      authorized institutional confirmation, and complete technical skills
                      assessments with downloadable competency reports.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Strict confidentiality · No self-verified claims</span>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className="font-semibold text-blue-700 hover:underline whitespace-nowrap"
                    >
                      Submit Credentials
                    </button>
                  </div>
                </div>
              </div>

              {/* Track 2 Card */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">
                      02. Track Two · SDGs 8, 10 & 16
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Legal, Regulatory & Financial Access
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Remove administrative barriers so qualified candidates can legally work,
                      receive payments, and participate in employment or contracting with confidence.
                      Navigate work authorization checklists, employer compliance guides, banking
                      resources, and digital payment onboarding across six host countries.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    {[
                      'Work authorization guidance & document checklists',
                      'Employer compliance & onboarding support',
                      'Banking access & digital payment-onboarding guidance',
                      'Referrals to legal & financial support services',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span>Informational guidance & referrals only</span>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="font-semibold text-emerald-700 hover:underline whitespace-nowrap"
                  >
                    Check Readiness
                  </button>
                </div>
              </div>

              {/* Track 3 Full Width Split */}
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="text-xs font-semibold text-blue-700">
                      03. Track Three · SDG 8 & SDG 17
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      Local Experience, Mentorship & Employer Matching
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
                      Build a structured professional portfolio, connect 1-on-1 with experienced
                      industry mentors, and apply to full-time roles, fellowships, internships, and
                      remote positions. Employers browse only consenting candidate profiles—never
                      private identity documents.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <Users className="w-4 h-4 text-blue-700 mb-1.5" />
                        <div className="text-xs font-bold text-slate-900">1-to-1 Mentorship</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          CV localization & interview coaching
                        </div>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <Briefcase className="w-4 h-4 text-emerald-700 mb-1.5" />
                        <div className="text-xs font-bold text-slate-900">Skill-Based Matching</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Consent-gated talent discovery
                        </div>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <GraduationCap className="w-4 h-4 text-blue-700 mb-1.5" />
                        <div className="text-xs font-bold text-slate-900">Bridging Stipends</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Accreditation & exam fee grants
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Full role-based workspace for Refugees, Employers, Mentors & Admins</span>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="font-semibold text-blue-700 hover:underline whitespace-nowrap"
                    >
                      Explore Opportunities
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-5 min-h-[260px] bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200">
                  {!mentorImgError ? (
                    <img
                      src="/src/assets/images/track_mentorship_1795593657007.jpg"
                      alt="Mentor and professional reviewing portfolio in sunlit modern office"
                      referrerPolicy="no-referrer"
                      onError={() => setMentorImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                      <Compass className="w-10 h-10 text-emerald-700" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SDG Impact Section */}
        <section id="sdg-impact" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-emerald-700">
                  Measurable Sustainable Development Alignment
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 text-balance">
                  Live Database Accountability Across Five UN SDGs
                </h2>
              </div>
              <button
                type="button"
                onClick={onExploreImpact}
                className="px-4 py-2 text-sm font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
              >
                Open Full SDG Analytics
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {(impact?.sdgMapping || [
                { sdgNumber: 4, title: 'Quality Education', focus: 'Credential & Bridging Access', indicators: [] },
                { sdgNumber: 8, title: 'Decent Work', focus: 'Skilled Employment Pathways', indicators: [] },
                { sdgNumber: 10, title: 'Reduced Inequalities', focus: 'Financial & Mobility Inclusion', indicators: [] },
                { sdgNumber: 16, title: 'Strong Institutions', focus: 'Verified Credentials & Rights', indicators: [] },
                { sdgNumber: 17, title: 'Partnerships', focus: 'Employers & Global Mentors', indicators: [] },
              ]).map((sdg) => (
                <div
                  key={sdg.sdgNumber}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="text-xs font-mono font-bold text-blue-800">
                      SDG {sdg.sdgNumber}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{sdg.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sdg.focus}</p>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    {sdg.indicators.map((ind) => (
                      <div key={ind.label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate pr-2">{ind.label}</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {ind.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Testimonials + Partners */}
        <section id="stories" className="py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Sample Demonstration Journeys (Illustrative Profiles)
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 text-balance">
                How Displaced Specialists Rebuild Regulated Careers
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <article className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/src/assets/images/avatar_sample_refugee_1795593656678.jpg"
                    alt="Layla Al-Mansoor sample structural engineer portrait"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Layla Al-Mansoor</h3>
                    <div className="text-xs text-slate-600">
                      Structural Engineer · Syria to Berlin · Sample Demo Story
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  “Before using the platform, my 7 years of bridge engineering work went unnoticed
                  because my Damascus University transcripts lacked German ZAB context. Through a
                  Eurocode bridging stipend and weekly portfolio reviews with Dr. Weber, I reached
                  final technical interviews in Berlin.”
                </p>
              </article>

              <article className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/src/assets/images/avatar_sample_mentor_1795593657105.jpg"
                    alt="Dr. Henrik Weber sample mentor portrait"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Dr. Henrik Weber</h3>
                    <div className="text-xs text-slate-600">
                      Principal Infrastructure Architect · Volunteer Mentor · Sample Demo Story
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  “Employers need verified technical signals, not guesswork. Reviewing structured
                  skills assessment reports alongside local Eurocode mentoring lets our hiring
                  teams onboard displaced senior engineers within weeks instead of years.”
                </p>
              </article>
            </div>

            {/* Partner & Employer Network */}
            <div id="partners" className="pt-8 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Ecosystem Partners & Inclusive Employers
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Illustrative multi-stakeholder coalition spanning accreditation, training, and hiring
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="text-sm font-semibold text-blue-700 hover:underline whitespace-nowrap"
                >
                  Join as Hiring Partner
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  'NordicGrid CleanTech',
                  'TU Continuing Bridge',
                  'ReDI Digital Track',
                  'AlpineGrid Partners',
                  'EuroSkills Verification',
                  'Global Mobility Legal',
                ].map((partner) => (
                  <div
                    key={partner}
                    className="p-3.5 bg-white border border-slate-200 rounded-lg text-center text-xs font-semibold text-slate-700"
                  >
                    {partner}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-slate-900 text-slate-300 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="text-base font-bold text-white">RefugeeTalent Connect</div>
            <p className="text-xs text-slate-400 max-w-md">
              Your Skills. Your Future. Your Opportunity. Built with strict confidential document
              isolation—identity and credential files are never exposed to external employers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a href="mailto:connect@refugeetalent.org" className="hover:text-white transition-colors">
              connect@refugeetalent.org
            </a>
            <button
              type="button"
              onClick={onExploreImpact}
              className="hover:text-white transition-colors"
            >
              SDG Impact Ledger
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hover:text-white transition-colors"
            >
              Privacy & Portal Access
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
