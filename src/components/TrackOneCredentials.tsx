import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile, uploadDocumentFile } from '../lib/api';
import type { AssessmentAttempt, CredentialRecord, SkillsAssessment } from '../types';

interface TrackOneProps {
  onToast: (msg: string, isError?: boolean) => void;
}

export function TrackOneCredentials({ onToast }: TrackOneProps) {
  const [subTab, setSubTab] = useState<'credentials' | 'assessments'>('credentials');
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [assessments, setAssessments] = useState<SkillsAssessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Credential Form State
  const [qualificationTitle, setQualificationTitle] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [countryOfQualification, setCountryOfQualification] = useState('');
  const [graduationYear, setGraduationYear] = useState('2019');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [notes, setNotes] = useState('');
  const [certDoc, setCertDoc] = useState<{ id: number; fileName: string } | null>(null);
  const [transcriptDoc, setTranscriptDoc] = useState<{ id: number; fileName: string } | null>(null);
  const [supportingDoc, setSupportingDoc] = useState<{ id: number; fileName: string } | null>(null);
  const [submittingCred, setSubmittingCred] = useState(false);

  // Assessment Runner State
  const [activeAssessment, setActiveAssessment] = useState<SkillsAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [practicalSummary, setPracticalSummary] = useState('');
  const [practicalUrl, setPracticalUrl] = useState('');
  const [practicalDoc, setPracticalDoc] = useState<{ id: number; fileName: string } | null>(null);
  const [grading, setGrading] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    attempt: AssessmentAttempt;
    assessmentTitle: string;
    passingScore: number;
    questionReview: {
      questionId: string;
      prompt: string;
      domain: string;
      isCorrect: boolean;
      explanation: string;
    }[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [credRes, assessRes, attemptRes] = await Promise.all([
        apiFetch<{ credentials: CredentialRecord[] }>('/api/credentials'),
        apiFetch<{ assessments: SkillsAssessment[] }>('/api/assessments'),
        apiFetch<{ attempts: AssessmentAttempt[] }>('/api/assessments/attempts/mine'),
      ]);
      setCredentials(credRes.credentials);
      setAssessments(assessRes.assessments);
      setAttempts(attemptRes.attempts);
    } catch (err: any) {
      onToast(err.message || 'Unable to load Track One records.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (
    file: File | undefined,
    category: string,
    setter: (doc: { id: number; fileName: string }) => void
  ) => {
    if (!file) return;
    try {
      const uploaded = await uploadDocumentFile(file, category);
      setter({ id: uploaded.id, fileName: uploaded.fileName });
      onToast(`Uploaded "${uploaded.fileName}" securely.`);
    } catch (err: any) {
      onToast(err.message || 'File upload failed.', true);
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCred(true);
    try {
      await apiFetch('/api/credentials', {
        method: 'POST',
        body: JSON.stringify({
          qualificationTitle,
          institutionName,
          countryOfQualification,
          graduationYear: Number(graduationYear),
          fieldOfStudy,
          certificateDocId: certDoc?.id,
          transcriptDocId: transcriptDoc?.id,
          supportingDocId: supportingDoc?.id,
          notes,
        }),
      });
      onToast('Credential verification application submitted.');
      setQualificationTitle('');
      setInstitutionName('');
      setCountryOfQualification('');
      setFieldOfStudy('');
      setNotes('');
      setCertDoc(null);
      setTranscriptDoc(null);
      setSupportingDoc(null);
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to submit credential.', true);
    } finally {
      setSubmittingCred(false);
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssessment) return;
    setGrading(true);
    try {
      const res = await apiFetch<typeof latestResult>(
        `/api/assessments/${activeAssessment.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            answers,
            practicalEvidenceSummary: practicalSummary,
            practicalEvidenceUrl: practicalUrl,
            practicalEvidenceDocId: practicalDoc?.id,
          }),
        }
      );
      setLatestResult(res);
      setActiveAssessment(null);
      setAnswers({});
      setPracticalSummary('');
      setPracticalUrl('');
      setPracticalDoc(null);
      onToast(`Assessment scored: ${res?.attempt.scorePercent}%`);
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Failed to score assessment.', true);
    } finally {
      setGrading(false);
    }
  };

  const statusColor = (status: CredentialRecord['status']) => {
    switch (status) {
      case 'Verified by authorized reviewer':
        return 'text-emerald-700 font-semibold';
      case 'Under review':
        return 'text-blue-700 font-semibold';
      case 'Additional documents required':
        return 'text-amber-700 font-semibold';
      case 'Not verified':
        return 'text-red-700 font-semibold';
      default:
        return 'text-slate-700 font-semibold';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Track One: Credential Recognition & Skills Validation
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Submit academic qualifications for authorized review and validate technical skills
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubTab('credentials')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'credentials'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Qualification Credentials
          </button>
          <button
            type="button"
            onClick={() => setSubTab('assessments')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'assessments'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Skills Assessments
          </button>
        </div>
      </div>

      {/* Verification Safeguard Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 leading-relaxed">
          <span className="font-bold">Official Recognition Safeguard:</span> Uploaded certificates
          and transcripts are stored confidentially and accessible only to you and authorized
          reviewers. Uploading a file does not imply official academic recognition until confirmed by
          an authorized reviewer or credentialing institution.
        </div>
      </div>

      {subTab === 'credentials' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submission Form */}
          <form
            onSubmit={handleCredentialSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 self-start"
          >
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700" />
              <span>Submit Qualification for Verification</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qualification Title
              </label>
              <input
                type="text"
                required
                value={qualificationTitle}
                onChange={(e) => setQualificationTitle(e.target.value)}
                placeholder="e.g. Bachelor of Science in Civil Engineering"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Institution Name
              </label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. University of Aleppo"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Country of Qualification
                </label>
                <input
                  type="text"
                  required
                  value={countryOfQualification}
                  onChange={(e) => setCountryOfQualification(e.target.value)}
                  placeholder="e.g. Syria"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year
                </label>
                <input
                  type="number"
                  required
                  min={1950}
                  max={2030}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Field of Study
              </label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="e.g. Structural Engineering / Medicine / Computer Science"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* File Uploads */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700">
                Document Uploads (PDF, PNG, JPG, DOCX · Max 5MB)
              </div>

              {[
                {
                  label: 'Academic Certificate / Diploma',
                  cat: 'certificate',
                  doc: certDoc,
                  setter: setCertDoc,
                },
                {
                  label: 'Academic Transcript',
                  cat: 'transcript',
                  doc: transcriptDoc,
                  setter: setTranscriptDoc,
                },
                {
                  label: 'Supporting Documents (Syllabus / Missing-Doc Affidavit)',
                  cat: 'supporting',
                  doc: supportingDoc,
                  setter: setSupportingDoc,
                },
              ].map((u) => (
                <div
                  key={u.cat}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800">{u.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {u.doc ? `Uploaded: ${u.doc.fileName}` : 'Optional file attachment'}
                    </div>
                  </div>
                  <label className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-600 text-xs font-semibold text-slate-700 rounded-md cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5 text-blue-700" />
                    <span>{u.doc ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], u.cat, u.setter)}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Context or Missing Documentation Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain any partial transcripts or alternative verification context..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={submittingCred}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submittingCred ? 'Submitting...' : 'Submit Verification Application'}
            </button>
          </form>

          {/* Applications Tracker */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Verification Progress & Records
              </h2>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {credentials.length} applications
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 py-8 text-center">Loading credentials...</p>
            ) : credentials.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-300 rounded-lg">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No qualifications submitted yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Use the form on the left to submit your academic degree or professional certificate.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-4 border border-slate-200 rounded-lg space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {cred.qualificationTitle}
                          {cred.isDemo && (
                            <span className="ml-2 text-[11px] font-medium text-slate-500">
                              (Sample Demo)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {cred.institutionName} · {cred.countryOfQualification} · Class of{' '}
                          <span className="font-mono tabular-nums">{cred.graduationYear}</span>
                        </div>
                      </div>
                      <div className={`text-xs ${statusColor(cred.status)} shrink-0`}>
                        {cred.status}
                      </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {['Submitted', 'Under review', 'Reviewer Check', 'Outcome'].map((step, i) => {
                        const active =
                          i === 0 ||
                          (i === 1 && cred.status !== 'Submitted') ||
                          (i >= 2 &&
                            ['Verified by authorized reviewer', 'Not verified', 'Additional documents required'].includes(
                              cred.status
                            ));
                        return (
                          <div key={step} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                active
                                  ? cred.status === 'Verified by authorized reviewer'
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-700'
                                  : 'bg-slate-200'
                              }`}
                            />
                            <div className="text-[10px] text-slate-500">{step}</div>
                          </div>
                        );
                      })}
                    </div>

                    {cred.reviewerNotes && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                        <span className="font-semibold">Reviewer Note:</span> {cred.reviewerNotes}
                        {cred.authorizedInstitutionRef && (
                          <span className="block font-mono text-[11px] text-emerald-700 mt-0.5">
                            Authorized Ref: {cred.authorizedInstitutionRef}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {cred.certificateDocId && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadAuthorizedFile(
                              `/api/documents/${cred.certificateDocId}/download`,
                              'certificate'
                            ).catch((e) => onToast(e.message, true))
                          }
                          className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Certificate</span>
                        </button>
                      )}
                      {cred.transcriptDocId && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadAuthorizedFile(
                              `/api/documents/${cred.transcriptDocId}/download`,
                              'transcript'
                            ).catch((e) => onToast(e.message, true))
                          }
                          className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Transcript</span>
                        </button>
                      )}
                      {cred.supportingDocId && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadAuthorizedFile(
                              `/api/documents/${cred.supportingDocId}/download`,
                              'supporting-doc'
                            ).catch((e) => onToast(e.message, true))
                          }
                          className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Supporting Doc</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Assessment Runner */}
          {activeAssessment ? (
            <form
              onSubmit={handleAssessmentSubmit}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-semibold text-blue-700">
                    {activeAssessment.category} · {activeAssessment.difficulty}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {activeAssessment.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">{activeAssessment.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAssessment(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-6">
                {activeAssessment.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-2.5 pb-4 border-b border-slate-100 last:border-b-0">
                    <div className="text-xs font-semibold text-emerald-700">
                      Question {idx + 1} · {q.domain}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const selected = answers[q.id] === optIdx;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                            className={`text-left p-3 text-xs rounded-lg border transition-colors ${
                              selected
                                ? 'border-blue-700 bg-blue-50 text-blue-950 font-semibold'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Practical Skills Evidence Submission */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Practical Skills Evidence (Optional Portfolio Proof)
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Describe Practical Project or Case Evidence
                  </label>
                  <textarea
                    rows={2}
                    value={practicalSummary}
                    onChange={(e) => setPracticalSummary(e.target.value)}
                    placeholder="Summarize a real project, architecture decision, or clinical/engineering deliverable..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Repository / Portfolio URL
                    </label>
                    <input
                      type="url"
                      value={practicalUrl}
                      onChange={(e) => setPracticalUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-blue-600 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-blue-700" />
                      <span>
                        {practicalDoc ? practicalDoc.fileName : 'Attach Practical Work Sample'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e.target.files?.[0], 'evidence', setPracticalDoc)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={grading}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
              >
                {grading ? 'Scoring Assessment...' : 'Submit & Calculate Score'}
              </button>
            </form>
          ) : (
            <>
              {/* Latest Scored Feedback */}
              {latestResult && (
                <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">
                        Automatic Scoring Result
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {latestResult.assessmentTitle} —{' '}
                        <span className="font-mono tabular-nums">
                          {latestResult.attempt.scorePercent}%
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {latestResult.attempt.passed
                          ? `Competency benchmark achieved (passing threshold ${latestResult.passingScore}%).`
                          : `Below passing threshold (${latestResult.passingScore}%). Recommended to review bridging courses.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadAuthorizedFile(
                          `/api/assessments/attempts/${latestResult.attempt.id}/report`,
                          `skills-report-${latestResult.attempt.id}.txt`
                        ).catch((e) => onToast(e.message, true))
                      }
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Assessment Report</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    {latestResult.questionReview.map((qr) => (
                      <div key={qr.questionId} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{qr.domain}</span>
                          {qr.isCorrect ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="text-red-700 font-semibold inline-flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Review
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600">{qr.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Assessments Catalog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-blue-700">
                        {a.category} · {a.difficulty} · {a.durationMinutes} min
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{a.description}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {a.questions.length} questions · Pass {a.passingScore}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAssessment(a);
                          setAnswers({});
                          setLatestResult(null);
                        }}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                      >
                        Start Assessment
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed Assessment History + Report Downloads */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                  <span>Completed Assessments & Downloadable Reports</span>
                </h2>
                {attempts.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">
                    Complete any skills assessment above to generate a verified score breakdown and
                    downloadable competency report.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-2.5 pr-4 font-semibold">Assessment</th>
                          <th className="py-2.5 pr-4 font-semibold">Category</th>
                          <th className="py-2.5 pr-4 font-semibold text-right">Score</th>
                          <th className="py-2.5 pr-4 font-semibold">Status</th>
                          <th className="py-2.5 text-right font-semibold">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {att.assessmentTitle}
                              {att.isDemo && (
                                <span className="ml-2 text-xs text-slate-500">(Sample Demo)</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-xs text-slate-600">
                              {att.assessmentCategory}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono font-bold tabular-nums text-slate-900">
                              {att.scorePercent}%
                            </td>
                            <td className="py-3 pr-4 text-xs">
                              <span
                                className={
                                  att.passed
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-amber-700 font-semibold'
                                }
                              >
                                {att.passed ? 'Benchmark Met' : 'Bridging Suggested'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadAuthorizedFile(
                                    `/api/assessments/attempts/${att.id}/report`,
                                    `skills-report-${att.id}.txt`
                                  ).catch((e) => onToast(e.message, true))
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Report</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
