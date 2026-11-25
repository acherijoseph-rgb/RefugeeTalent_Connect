import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  MentorAvailabilityResponse,
  MentorProfileItem,
  MentorWeeklySlotItem,
  MentorshipSessionItem,
} from '../types';

interface MentorshipCalendarPanelProps {
  mentors: MentorProfileItem[];
  selectedMentorForBooking: MentorProfileItem | null;
  onSelectMentorForBooking: (mentor: MentorProfileItem | null) => void;
  onToast: (msg: string, isError?: boolean) => void;
  onRefreshMentors: () => Promise<void>;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMEZONE_OPTIONS = [
  'Europe/Berlin',
  'Europe/London',
  'Europe/Amsterdam',
  'America/Toronto',
  'UTC',
];
const SESSION_FORMATS = ['Video Call', 'Portfolio Review', 'Mock Interview'];
const TOPIC_PRESETS = [
  'CV & Portfolio Localization',
  'Technical Mock Interview',
  'Credential Recognition Guidance',
  'Host-Country Industry Networking',
];

function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMonthHeading(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function convertSlotToLocalLabel(
  dateStr: string,
  timeStr: string,
  sourceTz: string
): string | null {
  try {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!localTz || localTz === sourceTz) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: sourceTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(approxUtc);

    const getNum = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    const tzWallAsUtc = Date.UTC(
      getNum('year'),
      getNum('month') - 1,
      getNum('day'),
      getNum('hour') === 24 ? 0 : getNum('hour'),
      getNum('minute')
    );
    const offsetMs = tzWallAsUtc - approxUtc.getTime();
    const actualInstant = new Date(approxUtc.getTime() - offsetMs);

    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: localTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(actualInstant);
    return `${formatted} ${localTz}`;
  } catch {
    return null;
  }
}

function buildGoogleCalendarUrl(session: MentorshipSessionItem): string {
  const compactDate = session.sessionDate.replace(/-/g, '');
  const compactStart = `${session.startTime.replace(':', '')}00`;
  const compactEnd = `${session.endTime.replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `1-on-1 Mentorship: ${session.topic}`,
    dates: `${compactDate}T${compactStart}/${compactDate}T${compactEnd}`,
    ctz: session.timezone || 'UTC',
    details: [
      `Mentor: ${session.mentorName}`,
      `Mentee: ${session.menteeName}`,
      `Format: ${session.sessionFormat}`,
      session.notes ? `Notes: ${session.notes}` : '',
      session.meetingLink ? `Meeting Link: ${session.meetingLink}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: session.meetingLink || 'RefugeeTalent Connect Video Session',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function MentorshipCalendarPanel({
  mentors,
  selectedMentorForBooking,
  onSelectMentorForBooking,
  onToast,
  onRefreshMentors,
}: MentorshipCalendarPanelProps) {
  const { user } = useAuth();
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'administrator';

  const verifiedMentors = useMemo(
    () => mentors.filter((m) => m.verifiedMentor && m.isAcceptingMentees),
    [mentors]
  );

  // Active mentor in calendar view
  const activeMentor = useMemo(() => {
    if (selectedMentorForBooking) return selectedMentorForBooking;
    return verifiedMentors[0] || mentors[0] || null;
  }, [selectedMentorForBooking, verifiedMentors, mentors]);

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthStr);
  const [availabilityData, setAvailabilityData] = useState<MentorAvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  // Booking form fields
  const [topicPreset, setTopicPreset] = useState<string>(TOPIC_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [sessionFormat, setSessionFormat] = useState<string>('Video Call');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<MentorshipSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  // Mentor availability editor state (when logged in as mentor/admin with mentor profile)
  const myMentorProfile = useMemo(
    () => mentors.find((m) => m.userId === user?.id) || null,
    [mentors, user?.id]
  );
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [editTimezone, setEditTimezone] = useState('Europe/Berlin');
  const [editDuration, setEditDuration] = useState(30);
  const [editAccepting, setEditAccepting] = useState(true);
  const [editWeeklySlots, setEditWeeklySlots] = useState<MentorWeeklySlotItem[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (myMentorProfile) {
      setEditTimezone(myMentorProfile.timezone || 'Europe/Berlin');
      setEditDuration(myMentorProfile.sessionDurationMinutes || 30);
      setEditAccepting(myMentorProfile.isAcceptingMentees);
      setEditWeeklySlots(myMentorProfile.weeklyAvailability || []);
    }
  }, [myMentorProfile]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await apiFetch<{ sessions: MentorshipSessionItem[] }>('/api/mentorship-sessions');
      setSessions(res.sessions);
    } catch (err: any) {
      onToast(err.message || 'Unable to load scheduled sessions.', true);
    } finally {
      setSessionsLoading(false);
    }
  }, [onToast]);

  const loadAvailability = useCallback(async () => {
    if (!activeMentor) {
      setAvailabilityData(null);
      return;
    }
    setLoadingAvailability(true);
    try {
      const res = await apiFetch<MentorAvailabilityResponse>(
        `/api/mentors/${activeMentor.userId}/availability?month=${encodeURIComponent(currentMonth)}`
      );
      setAvailabilityData(res);

      // Auto-select earliest date with an available slot in this month
      const availableDates = Object.keys(res.days)
        .sort()
        .filter((d) => res.days[d].some((s) => s.available));

      setSelectedDate((prev) => {
        if (prev && res.days[prev] && res.days[prev].length > 0) return prev;
        return availableDates[0] || null;
      });
      setSelectedSlotStart(null);
    } catch (err: any) {
      onToast(err.message || 'Unable to load mentor calendar availability.', true);
    } finally {
      setLoadingAvailability(false);
    }
  }, [activeMentor, currentMonth, onToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Build calendar grid cells (Monday-first)
  const calendarCells = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstDayOfMonth.getUTCDay() + 6) % 7;

    const cells: { dateStr: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: day });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateStr: null, dayNum: null });
    }
    return cells;
  }, [currentMonth]);

  // Dates where current user has confirmed sessions
  const userBookedDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.status === 'Confirmed') {
        map.set(s.sessionDate, (map.get(s.sessionDate) || 0) + 1);
      }
    }
    return map;
  }, [sessions]);

  const activeDaySlots = useMemo(() => {
    if (!selectedDate || !availabilityData) return [];
    return availabilityData.days[selectedDate] || [];
  }, [selectedDate, availabilityData]);

  const selectedSlotObj = useMemo(
    () => activeDaySlots.find((s) => s.startTime === selectedSlotStart) || null,
    [activeDaySlots, selectedSlotStart]
  );

  const handleSelectSlot = (startTime: string, format: string) => {
    setSelectedSlotStart(startTime);
    setSessionFormat(format || 'Video Call');
  };

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentor || !selectedDate || !selectedSlotStart) return;
    const topic = topicPreset === '__custom__' ? customTopic.trim() : topicPreset;
    if (!topic) {
      onToast('Please enter a session topic.', true);
      return;
    }

    setBookingSubmitting(true);
    try {
      await apiFetch('/api/mentorship-sessions', {
        method: 'POST',
        body: JSON.stringify({
          mentorUserId: activeMentor.userId,
          sessionDate: selectedDate,
          startTime: selectedSlotStart,
          topic,
          sessionFormat,
          notes: sessionNotes,
        }),
      });
      onToast(
        `1-on-1 session booked with ${activeMentor.name} on ${selectedDate} at ${selectedSlotStart}.`
      );
      setSelectedSlotStart(null);
      setSessionNotes('');
      setCustomTopic('');
      await Promise.all([loadAvailability(), loadSessions()]);
    } catch (err: any) {
      onToast(err.message || 'Could not complete session booking.', true);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleSessionStatus = async (
    sessionId: number,
    status: 'Completed' | 'Cancelled'
  ) => {
    try {
      await apiFetch(`/api/mentorship-sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setConfirmCancelId(null);
      onToast(
        status === 'Cancelled'
          ? 'Session cancelled and slot released.'
          : 'Session marked as completed.'
      );
      await Promise.all([loadSessions(), loadAvailability()]);
    } catch (err: any) {
      onToast(err.message || 'Failed to update session.', true);
    }
  };

  const handleSaveAvailabilitySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      await apiFetch('/api/mentors/availability', {
        method: 'PUT',
        body: JSON.stringify({
          timezone: editTimezone,
          sessionDurationMinutes: editDuration,
          isAcceptingMentees: editAccepting,
          weeklyAvailability: editWeeklySlots,
        }),
      });
      onToast('Mentor calendar availability updated.');
      setShowAvailabilityEditor(false);
      await Promise.all([onRefreshMentors(), loadAvailability()]);
    } catch (err: any) {
      onToast(err.message || 'Unable to save availability schedule.', true);
    } finally {
      setSavingSchedule(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredSessions = useMemo(() => {
    if (sessionFilter === 'upcoming') {
      return sessions.filter((s) => s.status === 'Confirmed' && s.sessionDate >= todayStr);
    }
    if (sessionFilter === 'past') {
      return sessions.filter(
        (s) => s.status === 'Completed' || (s.status === 'Confirmed' && s.sessionDate < todayStr)
      );
    }
    return sessions.filter((s) => s.status === 'Cancelled');
  }, [sessions, sessionFilter, todayStr]);

  return (
    <div className="space-y-6">
      {/* Header + Mentor Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <Calendar className="w-4 h-4" />
            <span>Mentorship Booking Calendar</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Schedule a 1-on-1 Session with a Verified Mentor
          </h2>
          <p className="text-xs text-slate-600">
            Select a verified mentor below to browse real-time open slots, book your session, and sync to Google Calendar or Outlook/Apple Calendar (.ics).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <select
            aria-label="Select verified mentor"
            value={activeMentor?.userId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const found = mentors.find((m) => m.userId === id) || null;
              onSelectMentorForBooking(found);
            }}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {mentors.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({m.verifiedMentor ? 'Verified' : 'Pending Verification'}) · {m.timezone}
              </option>
            ))}
          </select>

          {(isMentor || isAdmin) && myMentorProfile && (
            <button
              type="button"
              onClick={() => setShowAvailabilityEditor((v) => !v)}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5 text-blue-700" />
              <span>{showAvailabilityEditor ? 'Close Schedule Editor' : 'Manage My Availability'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mentor Weekly Availability Schedule Editor (for Mentors / Admins) */}
      {showAvailabilityEditor && (isMentor || isAdmin) && myMentorProfile && (
        <form
          onSubmit={handleSaveAvailabilitySchedule}
          className="bg-white border border-blue-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                My Weekly Mentor Availability Schedule
              </h3>
              <p className="text-xs text-slate-500">
                Verification status:{' '}
                <span className={myMentorProfile.verifiedMentor ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {myMentorProfile.verifiedMentor ? 'Verified Mentor' : 'Pending Administrator Verification'}
                </span>
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editAccepting}
                onChange={(e) => setEditAccepting(e.target.checked)}
                className="rounded text-blue-700"
              />
              <span>Accepting 1-on-1 Bookings</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Timezone
              </label>
              <select
                value={editTimezone}
                onChange={(e) => setEditTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Duration
              </label>
              <select
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Recurring Weekly Time Windows
              </span>
              <button
                type="button"
                onClick={() =>
                  setEditWeeklySlots((prev) => [
                    ...prev,
                    {
                      id: `slot-${Date.now()}`,
                      dayOfWeek: 2,
                      startTime: '10:00',
                      endTime: '12:00',
                      format: 'Video Call',
                    },
                  ])
                }
                className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Availability Window</span>
              </button>
            </div>

            {editWeeklySlots.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No weekly windows configured yet. Add a window to publish bookable calendar slots.
              </p>
            ) : (
              <div className="space-y-2">
                {editWeeklySlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditWeeklySlots((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, dayOfWeek: val } : s))
                        );
                      }}
                      className="sm:col-span-3 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      {WEEKDAY_NAMES.map((name, dow) => (
                        <option key={name} value={dow}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditWeeklySlots((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, startTime: val } : s))
                        );
                      }}
                      className="sm:col-span-3 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditWeeklySlots((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, endTime: val } : s))
                        );
                      }}
                      className="sm:col-span-3 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                    />
                    <select
                      value={slot.format}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditWeeklySlots((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, format: val } : s))
                        );
                      }}
                      className="sm:col-span-2 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      {SESSION_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setEditWeeklySlots((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove availability window"
                      className="sm:col-span-1 p-1.5 text-slate-500 hover:text-red-700 justify-self-end"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAvailabilityEditor(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSchedule}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
            >
              {savingSchedule ? 'Saving...' : 'Save Calendar Availability'}
            </button>
          </div>
        </form>
      )}

      {/* Main Split: Monthly Calendar Grid + Slot Picker / Booking Form */}
      {activeMentor ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Grid */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            {/* Active Mentor Info Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{activeMentor.name}</span>
                  {activeMentor.verifiedMentor ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Mentor</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700">
                      Pending Verification
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {activeMentor.jobTitle} · {activeMentor.organization} ·{' '}
                  <span className="font-mono tabular-nums">
                    {activeMentor.sessionDurationMinutes} min
                  </span>{' '}
                  · {activeMentor.timezone}
                </div>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => shiftMonth(m, -1))}
                  aria-label="Previous month"
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 text-xs font-bold text-slate-900 min-w-[120px] text-center tabular-nums">
                  {formatMonthHeading(currentMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => shiftMonth(m, 1))}
                  aria-label="Next month"
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(getCurrentMonthStr())}
                  className="ml-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 whitespace-nowrap"
                >
                  Today
                </button>
              </div>
            </div>

            {!activeMentor.verifiedMentor && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                Calendar 1-on-1 booking is enabled exclusively for platform-verified mentors. Select a verified mentor from the dropdown above or send a mentorship introduction request.
              </div>
            )}

            {/* Calendar Table Grid */}
            <div>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {CALENDAR_HEADERS.map((h) => (
                  <div
                    key={h}
                    className="text-center text-[11px] font-semibold text-slate-500 py-1"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {loadingAvailability ? (
                <div className="grid grid-cols-7 gap-1.5 animate-pulse">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarCells.map((cell, idx) => {
                    if (!cell.dateStr || !cell.dayNum) {
                      return <div key={`empty-${idx}`} className="h-14 rounded-lg bg-slate-50/40" />;
                    }
                    const daySlots = availabilityData?.days[cell.dateStr] || [];
                    const openCount = daySlots.filter((s) => s.available).length;
                    const userBookedCount = userBookedDates.get(cell.dateStr) || 0;
                    const isSelected = selectedDate === cell.dateStr;
                    const isToday = cell.dateStr === (availabilityData?.today || todayStr);
                    const hasAnySlots = daySlots.length > 0;
                    const isPast = cell.dateStr < (availabilityData?.today || todayStr);

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        disabled={!hasAnySlots && userBookedCount === 0}
                        aria-disabled={!hasAnySlots && userBookedCount === 0}
                        onClick={() => {
                          setSelectedDate(cell.dateStr);
                          setSelectedSlotStart(null);
                        }}
                        className={`h-14 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          isSelected
                            ? 'border-blue-700 bg-blue-50 ring-1 ring-blue-700'
                            : openCount > 0
                              ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-500'
                              : userBookedCount > 0
                                ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
                                : 'border-slate-100 bg-white text-slate-400 cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs font-mono tabular-nums font-bold ${
                              isSelected
                                ? 'text-blue-800'
                                : isToday
                                  ? 'text-blue-700 underline'
                                  : isPast
                                    ? 'text-slate-400'
                                    : openCount > 0
                                      ? 'text-slate-900'
                                      : 'text-slate-500'
                            }`}
                          >
                            {cell.dayNum}
                          </span>
                          {userBookedCount > 0 && (
                            <span
                              title="You have a booked session on this date"
                              className="w-1.5 h-1.5 rounded-sm bg-blue-700 shrink-0"
                            />
                          )}
                        </div>

                        {openCount > 0 ? (
                          <span className="text-[10px] font-mono tabular-nums font-semibold text-emerald-700 truncate">
                            {openCount} open
                          </span>
                        ) : hasAnySlots ? (
                          <span className="text-[10px] text-slate-400 truncate">Full</span>
                        ) : userBookedCount > 0 ? (
                          <span className="text-[10px] font-medium text-blue-700 truncate">
                            Booked
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clean Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-400" />
                <span>Mentor available slots</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-700" />
                <span>Your booked session</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
                <span>Unavailable</span>
              </span>
            </div>
          </div>

          {/* Right Column: Day Slots + Booking Confirmation */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-semibold text-slate-500">Selected Date</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {selectedDate ? formatDateHeading(selectedDate) : 'Select an available date'}
              </div>
              {activeMentor && (
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    Mentor timezone: {activeMentor.timezone} ·{' '}
                    <span className="font-mono tabular-nums">
                      {activeMentor.sessionDurationMinutes} min
                    </span>{' '}
                    1-on-1
                  </span>
                </div>
              )}
            </div>

            {!selectedDate || activeDaySlots.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  No open availability slots on this date
                </p>
                <p className="text-xs text-slate-500">
                  Choose a highlighted green date on the calendar to view open 1-on-1 times.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  Available Time Slots ({activeDaySlots.filter((s) => s.available).length} open)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-0.5">
                  {activeDaySlots.map((slot) => {
                    const isChosen = selectedSlotStart === slot.startTime;
                    const localEquiv =
                      selectedDate && activeMentor
                        ? convertSlotToLocalLabel(
                            selectedDate,
                            slot.startTime,
                            activeMentor.timezone
                          )
                        : null;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available || activeMentor.userId === user?.id}
                        onClick={() => handleSelectSlot(slot.startTime, slot.format)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 ${
                          !slot.available
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isChosen
                              ? 'bg-blue-700 border-blue-700 text-white'
                              : 'bg-white border-slate-200 hover:border-blue-600 text-slate-900'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono tabular-nums font-bold">
                            {slot.startTime} – {slot.endTime}
                          </div>
                          <div
                            className={`text-[11px] ${
                              isChosen ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {slot.format}
                            {localEquiv ? ` · ${localEquiv}` : ''}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                            !slot.available
                              ? 'text-slate-400'
                              : isChosen
                                ? 'text-white'
                                : 'text-emerald-700'
                          }`}
                        >
                          {!slot.available ? 'Booked' : isChosen ? 'Selected' : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Booking Confirmation Form */}
            {selectedSlotObj &&
              selectedDate &&
              activeMentor.verifiedMentor &&
              activeMentor.userId !== user?.id && (
                <form
                  onSubmit={handleBookSession}
                  className="pt-4 border-t border-slate-200 space-y-3"
                >
                  <div className="text-xs font-bold text-slate-900">
                    Confirm 1-on-1 Session Details
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Session Topic
                    </label>
                    <select
                      value={topicPreset}
                      onChange={(e) => setTopicPreset(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {TOPIC_PRESETS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__custom__">Custom Topic...</option>
                    </select>
                  </div>

                  {topicPreset === '__custom__' && (
                    <input
                      type="text"
                      required
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Enter your mentorship session focus"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Session Format
                    </label>
                    <select
                      value={sessionFormat}
                      onChange={(e) => setSessionFormat(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {SESSION_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preparation Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="Share your target role, portfolio link, or specific questions..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {bookingSubmitting
                        ? 'Confirming Booking...'
                        : `Confirm 1-on-1 (${selectedSlotObj.startTime})`}
                    </span>
                  </button>
                </form>
              )}

            {activeMentor.userId === user?.id && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                Previewing your own published availability calendar. Use{' '}
                <span className="font-semibold text-slate-900">Manage My Availability</span> above to edit weekly time windows.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
          No mentors available yet.
        </div>
      )}

      {/* Scheduled 1-on-1 Sessions & Calendar Sync */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              My Scheduled 1-on-1 Sessions & Calendar Sync
            </h3>
            <p className="text-xs text-slate-500">
              Export confirmed sessions directly to Google Calendar or download .ics calendar invites
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Completed / Past' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSessionFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sessionFilter === tab.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {sessionsLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No {sessionFilter} mentorship sessions found. Use the calendar above to book a 1-on-1 session with a verified mentor.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSessions.map((s) => {
              const isUserMentor = s.mentorUserId === user?.id;
              return (
                <div
                  key={s.id}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {s.sessionDate} · {s.startTime}–{s.endTime}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">
                        {s.timezone} ({s.durationMinutes} min)
                      </span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={`font-semibold ${
                          s.status === 'Confirmed'
                            ? 'text-emerald-700'
                            : s.status === 'Completed'
                              ? 'text-blue-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">{s.topic}</div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span>
                        {isUserMentor ? (
                          <>
                            Mentee: <span className="font-semibold text-slate-800">{s.menteeName}</span>
                          </>
                        ) : (
                          <>
                            Mentor: <span className="font-semibold text-slate-800">{s.mentorName}</span>
                            {s.mentorOrganization ? ` (${s.mentorOrganization})` : ''}
                          </>
                        )}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-blue-700" />
                        <span>{s.sessionFormat}</span>
                      </span>
                    </div>

                    {s.notes && <p className="text-xs text-slate-500">{s.notes}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {s.status === 'Confirmed' && (
                      <>
                        <a
                          href={buildGoogleCalendarUrl(s)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>Add to Google Calendar</span>
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            downloadAuthorizedFile(
                              `/api/mentorship-sessions/${s.id}/ics`,
                              `mentorship-session-${s.id}.ics`
                            ).catch((e) => onToast(e.message, true))
                          }
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .ics</span>
                        </button>

                        {(isUserMentor || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleSessionStatus(s.id, 'Completed')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                          >
                            Mark Completed
                          </button>
                        )}

                        {confirmCancelId === s.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSessionStatus(s.id, 'Cancelled')}
                              className="px-2.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                            >
                              Confirm Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(null)}
                              className="px-2.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg whitespace-nowrap"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(s.id)}
                            className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
