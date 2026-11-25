import React, { useState } from 'react';
import { X, Lock, Mail, User, Globe, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { UserRole } from '../types';

interface AuthModalProps {
  initialMode: 'login' | 'register' | 'reset';
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Login / Register fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('refugee');
  const [hostCountry, setHostCountry] = useState('Germany');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [organization, setOrganization] = useState('');

  // Reset password fields
  const [resetCode, setResetCode] = useState('');
  const [resetPreviewCode, setResetPreviewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onSuccess('Signed in successfully.');
        onClose();
      } else if (mode === 'register') {
        await registerWithEmail({
          name,
          email,
          password,
          role,
          hostCountry,
          countryOfOrigin,
          companyName: role === 'employer' ? companyName : undefined,
          organization: role === 'mentor' ? organization : undefined,
        });
        onSuccess('Account created. Welcome to RefugeeTalent Connect.');
        onClose();
      } else if (mode === 'reset') {
        if (resetStep === 'request') {
          const res = await apiFetch<{ message: string; resetCodePreview?: string }>(
            '/api/auth/forgot-password',
            {
              method: 'POST',
              body: JSON.stringify({ email }),
            }
          );
          setInfo(res.message);
          if (res.resetCodePreview) {
            setResetPreviewCode(res.resetCodePreview);
            setResetCode(res.resetCodePreview);
          }
          setResetStep('confirm');
        } else {
          const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, code: resetCode, newPassword }),
          });
          setInfo(res.message);
          setMode('login');
          setResetStep('request');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      onSuccess('Signed in with Google.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (demoRole: UserRole) => {
    setError('');
    setBusy(true);
    try {
      await loginAsDemo(demoRole);
      onSuccess(`Signed into Sample Demonstration (${demoRole}) workspace.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to load demonstration account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900">
              {mode === 'login' && 'Sign In to RefugeeTalent Connect'}
              {mode === 'register' && 'Create Your Platform Account'}
              {mode === 'reset' && 'Reset Account Password'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Your Skills. Your Future. Your Opportunity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setInfo('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setInfo('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError('');
                setInfo('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'reset'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reset Password
            </button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'refugee', label: 'Refugee Job Seeker', desc: 'Credentials, courses & jobs' },
                      { id: 'employer', label: 'Hiring Partner', desc: 'Post jobs & match talent' },
                      { id: 'mentor', label: 'Career Mentor', desc: 'Guide displaced talent' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRole(opt.id as UserRole)}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          role === opt.id
                            ? 'border-blue-700 bg-blue-50/70 text-blue-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Nadia Mansour"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Host Country
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <select
                        value={hostCountry}
                        onChange={(e) => setHostCountry(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      >
                        <option value="Germany">Germany</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Netherlands">Netherlands</option>
                        <option value="Sweden">Sweden</option>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                  </div>
                </div>

                {role === 'refugee' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Country of Origin / Qualification (Optional)
                    </label>
                    <input
                      type="text"
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      placeholder="e.g. Syria, Ukraine, Afghanistan, Sudan"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {role === 'employer' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company / Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. BrightGrid Energy GmbH"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {role === 'mentor' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Organization
                    </label>
                    <input
                      type="text"
                      required
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Siemens / University Hospital"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.org"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {mode === 'register' && <span className="font-normal text-slate-500">(minimum 8 characters)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={mode === 'register' ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && resetStep === 'confirm' && (
              <div className="space-y-3">
                {resetPreviewCode && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                    Verification code generated for testing:{' '}
                    <span className="font-mono font-bold">{resetPreviewCode}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>
                {busy
                  ? 'Processing...'
                  : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                      ? 'Create Account'
                      : resetStep === 'request'
                        ? 'Send Reset Code'
                        : 'Confirm New Password'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {mode !== 'reset' && (
            <div className="space-y-4">
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-xs text-slate-500">or continue with</span>
                <div className="grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogle}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* Clearly Labeled Sample Demonstration Accounts */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Sample Demonstration Accounts (Pre-seeded Demo Data)
              </span>
              <span className="text-[11px] font-medium text-emerald-700">
                1-Click Role Preview
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { role: 'refugee' as UserRole, label: 'Refugee', sub: 'Layla Al-Mansoor' },
                { role: 'employer' as UserRole, label: 'Employer', sub: 'NordicGrid GmbH' },
                { role: 'mentor' as UserRole, label: 'Mentor', sub: 'Dr. Henrik Weber' },
                { role: 'administrator' as UserRole, label: 'Admin', sub: 'Dr. Amara Okafor' },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemo(d.role)}
                  className="p-2.5 text-left border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors"
                >
                  <div className="text-xs font-bold text-slate-900">{d.label}</div>
                  <div className="text-[11px] text-slate-500 truncate">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
