import React, { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { OverviewTab } from './components/OverviewTab';
import { TrackOneCredentials } from './components/TrackOneCredentials';
import { TrackTwoLegalFinancial } from './components/TrackTwoLegalFinancial';
import { TrackThreeNetwork } from './components/TrackThreeNetwork';
import { FundingCoursesTab } from './components/FundingCoursesTab';
import { SdgImpactTab } from './components/SdgImpactTab';
import { AdminPortalTab } from './components/AdminPortalTab';
import { ProfileTab } from './components/ProfileTab';
import type { NotificationItem } from './types';

type ActiveTab =
  | 'overview'
  | 'track1'
  | 'track2'
  | 'track3'
  | 'funding'
  | 'impact'
  | 'admin'
  | 'profile';

function MainApp() {
  const { user, loading, logout, unreadNotifications, setUnreadNotifications } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [publicImpactView, setPublicImpactView] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications popover
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Feedback toast
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 4500);
  };

  useEffect(() => {
    if (user) {
      setPublicImpactView(false);
      if (user.role === 'administrator' && activeTab === 'overview') {
        // Keep overview as entry, admin portal right in sidebar
      }
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/admin/notifications');
      setNotifications(res.notifications);
      setUnreadNotifications(res.notifications.filter((n) => !n.isRead).length);
    } catch {
      // Ignore notification fetch failure
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/admin/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-sm font-semibold">
        Loading RefugeeTalent Connect...
      </div>
    );
  }

  // Public Impact View (accessible from Landing Page without signing in)
  if (!user && publicImpactView) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPublicImpactView(false)}
            className="text-sm font-bold text-blue-800 hover:underline"
          >
            ← Back to RefugeeTalent Connect
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('register')}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
          >
            Get Started
          </button>
        </header>
        <div className="max-w-7xl mx-auto p-6">
          <SdgImpactTab />
        </div>
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onSuccess={(msg) => showToast(msg)}
          />
        )}
      </div>
    );
  }

  // Public Landing Page when unauthenticated
  if (!user) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onExploreImpact={() => setPublicImpactView(true)}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onSuccess={(msg) => showToast(msg)}
          />
        )}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold border ${
              toast.isError
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {toast.msg}
          </div>
        )}
      </>
    );
  }

  // Role-protected sidebar navigation items
  const allNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
  }[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['refugee', 'employer', 'mentor', 'administrator'],
    },
    {
      id: 'track1',
      label: 'Credentials & Skills',
      icon: Award,
      roles: ['refugee', 'administrator'],
    },
    {
      id: 'track2',
      label: 'Legal & Financial',
      icon: Scale,
      roles: ['refugee', 'employer', 'mentor', 'administrator'],
    },
    {
      id: 'track3',
      label:
        user.role === 'employer'
          ? 'Hiring & Matching'
          : user.role === 'mentor'
            ? 'Mentorship & Jobs'
            : 'Network & Jobs',
      icon: Briefcase,
      roles: ['refugee', 'employer', 'mentor', 'administrator'],
    },
    {
      id: 'funding',
      label: 'Courses & Stipends',
      icon: GraduationCap,
      roles: ['refugee', 'administrator'],
    },
    {
      id: 'impact',
      label: 'SDG Impact',
      icon: BarChart3,
      roles: ['refugee', 'employer', 'mentor', 'administrator'],
    },
    {
      id: 'admin',
      label: 'Admin Portal',
      icon: ShieldCheck,
      roles: ['administrator'],
    },
    {
      id: 'profile',
      label: 'Profile & Privacy',
      icon: Settings,
      roles: ['refugee', 'employer', 'mentor', 'administrator'],
    },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  const currentTabLabel = navItems.find((i) => i.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-700 text-white inline-flex items-center justify-center text-sm font-bold">
            R
          </span>
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-blue-950 truncate">
              RefugeeTalent Connect
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <div className="font-bold text-slate-900 truncate">{user.name}</div>
            <div className="text-slate-500 capitalize">
              {user.role} {user.isDemo ? '· Sample Demo' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col z-10 border-r border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-extrabold text-blue-950">RefugeeTalent Connect</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 truncate">
              <span className="font-semibold text-slate-900">Workspace</span>
              <span className="mx-2">/</span>
              <span>{currentTabLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              type="button"
              onClick={() => {
                const next = !notifOpen;
                setNotifOpen(next);
                if (next) loadNotifications();
              }}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 text-[10px] font-mono font-bold text-blue-700">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-3 z-30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No notifications yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2 text-xs space-y-0.5">
                        <div className="font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-600">{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-blue-600 rounded-lg text-xs font-semibold text-slate-800 whitespace-nowrap"
            >
              <span>{user.name}</span>
              <span className="text-slate-400">·</span>
              <span className="capitalize text-blue-700">{user.role}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab onNavigate={(tab) => setActiveTab(tab as ActiveTab)} />
          )}
          {activeTab === 'track1' && <TrackOneCredentials onToast={showToast} />}
          {activeTab === 'track2' && <TrackTwoLegalFinancial onToast={showToast} />}
          {activeTab === 'track3' && <TrackThreeNetwork onToast={showToast} />}
          {activeTab === 'funding' && <FundingCoursesTab onToast={showToast} />}
          {activeTab === 'impact' && <SdgImpactTab />}
          {activeTab === 'admin' && user.role === 'administrator' && (
            <AdminPortalTab onToast={showToast} />
          )}
          {activeTab === 'profile' && <ProfileTab onToast={showToast} />}
        </main>
      </div>

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs sm:text-sm font-semibold border flex items-center gap-2 ${
            toast.isError
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
