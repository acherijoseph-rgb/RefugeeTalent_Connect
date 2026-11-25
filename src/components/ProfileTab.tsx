import React, { useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ProfileTabProps {
  onToast: (msg: string, isError?: boolean) => void;
}

export function ProfileTab({ onToast }: ProfileTabProps) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(user?.countryOfOrigin || '');
  const [hostCountry, setHostCountry] = useState(user?.hostCountry || 'Germany');
  const [location, setLocation] = useState(user?.location || '');
  const [experienceYears, setExperienceYears] = useState(String(user?.experienceYears || 0));
  const [skillsText, setSkillsText] = useState((user?.skills || []).join(', '));
  const [consent, setConsent] = useState(Boolean(user?.consentForEmployerMatching));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          headline,
          bio,
          countryOfOrigin,
          hostCountry,
          location,
          experienceYears: Number(experienceYears),
          skills: skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          consentForEmployerMatching: consent,
        }),
      });
      await refreshProfile();
      onToast('Profile and privacy preferences updated.');
    } catch (err: any) {
      onToast(err.message || 'Failed to update profile.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Profile & Privacy Settings</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage your professional identity, host country, and employer-matching consent
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Role & Email
            </label>
            <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate">
              {user?.role} · {user?.email}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Professional Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Civil Engineer · 7 Years Structural Design"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Country of Origin
            </label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Host Country</label>
            <select
              value={hostCountry}
              onChange={(e) => setHostCountry(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Germany">Germany</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Sweden">Sweden</option>
              <option value="United States">United States</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              City / Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Berlin, Germany"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Core Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="TypeScript, PostgreSQL, AutoCAD, Project Management"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Professional Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        {user?.role === 'refugee' && (
          <label className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 rounded text-emerald-700"
            />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Consent to Appear in Employer Skill-Matching Directory</span>
              </div>
              <p className="mt-1 text-emerald-900/80">
                When enabled, verified hiring partners can view your professional headline, skills,
                portfolio summary, and uploaded CV. Confidential identity documents, transcripts, and
                legal/financial requests remain strictly private.
              </p>
            </div>
          </label>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Protected by role-based access control</span>
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
