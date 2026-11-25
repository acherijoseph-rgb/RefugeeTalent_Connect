import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, GraduationCap, Search, Upload, Wallet } from 'lucide-react';
import { apiFetch, uploadDocumentFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { CourseItem, FundingRequestItem } from '../types';

interface FundingCoursesProps {
  onToast: (msg: string, isError?: boolean) => void;
}

export function FundingCoursesTab({ onToast }: FundingCoursesProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [requests, setRequests] = useState<FundingRequestItem[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  // Form State
  const [requestType, setRequestType] = useState('Bridging Course');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [amountRequested, setAmountRequested] = useState('650');
  const [currency, setCurrency] = useState('EUR');
  const [justification, setJustification] = useState('');
  const [supportingDoc, setSupportingDoc] = useState<{ id: number; fileName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [cRes, fRes] = await Promise.all([
        apiFetch<{ courses: CourseItem[] }>('/api/courses'),
        apiFetch<{ requests: FundingRequestItem[] }>('/api/funding-requests'),
      ]);
      setCourses(cRes.courses);
      setRequests(fRes.requests);
    } catch (err: any) {
      onToast(err.message || 'Failed to load courses and support requests.', true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyCourse = (course: CourseItem) => {
    setRequestType('Bridging Course');
    setSelectedCourseId(String(course.id));
    setTitle(`Enrollment & Stipend: ${course.title}`);
    setAmountRequested('750');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const doc = await uploadDocumentFile(file, 'funding_support');
      setSupportingDoc({ id: doc.id, fileName: doc.fileName });
      onToast(`Uploaded supporting document "${doc.fileName}".`);
    } catch (err: any) {
      onToast(err.message || 'Upload failed.', true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/funding-requests', {
        method: 'POST',
        body: JSON.stringify({
          requestType,
          courseId: selectedCourseId ? Number(selectedCourseId) : null,
          title,
          amountRequested: Number(amountRequested),
          currency,
          justification,
          supportingDocId: supportingDoc?.id,
        }),
      });
      onToast('Funding application submitted for review.');
      setTitle('');
      setJustification('');
      setSelectedCourseId('');
      setSupportingDoc(null);
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to submit funding application.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!courseSearch.trim()) return true;
    const q = courseSearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.provider.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.targetSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Bridging Courses & Financial Assistance
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Apply for accredited bridging programs, certification fee waivers, and training stipends
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recommended Bridging Courses */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Search bridging courses by title, provider, or skill..."
              className="flex-1 text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-blue-700">
                      {course.category} · {course.format}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">{course.title}</h2>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                      <span>{course.provider}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {course.duration}
                      </span>
                    </div>
                  </div>
                  {user?.role === 'refugee' && (
                    <button
                      type="button"
                      onClick={() => handleApplyCourse(course)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                    >
                      Apply for Course
                    </button>
                  )}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{course.description}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">
                    Skills: {course.targetSkills.join(' · ')}
                  </span>
                  {course.stipendAvailable && (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Stipend Eligible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funding Application Form + Status Tracker */}
        <div className="lg:col-span-5 space-y-6">
          {user?.role === 'refugee' && (
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-700" />
                <span>Apply for Course or Financial Support</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Support Category
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Bridging Course">Bridging Course Tuition</option>
                  <option value="Certification Fee Support">Certification / Exam Fee Support</option>
                  <option value="Training Stipend">Monthly Training Stipend</option>
                  <option value="Financial Access Support">Document / Relocation Micro-Grant</option>
                </select>
              </div>

              {requestType === 'Bridging Course' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Linked Bridging Course (Optional)
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select a listed bridging course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Eurocode Accreditation Exam & Study Stipend"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requested Amount
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={amountRequested}
                    onChange={(e) => setAmountRequested(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Career & Financial Justification
                </label>
                <textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain how this course or certification unlocks local employment..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-slate-600 truncate">
                  {supportingDoc ? supportingDoc.fileName : 'Optional supporting document'}
                </span>
                <label className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-semibold text-slate-700 cursor-pointer inline-flex items-center gap-1 shrink-0">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Funding Application'}
              </button>
            </form>
          )}

          {/* Funding Tracker */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>Funding & Course Applications</span>
            </h2>
            {requests.length === 0 ? (
              <p className="text-xs text-slate-500">No applications submitted yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <div key={r.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {r.title}
                          {r.isDemo && <span className="ml-1.5 font-normal text-slate-500">(Demo)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">{r.requestType}</div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800 tabular-nums shrink-0">
                        {r.currency} {r.amountRequested}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span
                        className={
                          r.status === 'Approved'
                            ? 'text-emerald-700 font-semibold'
                            : r.status === 'Rejected'
                              ? 'text-red-700 font-semibold'
                              : 'text-blue-700 font-semibold'
                        }
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.adminNotes && (
                      <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-700 mt-1">
                        {r.adminNotes}
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
  );
}
