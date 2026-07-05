"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/client/Navbar";
import ContactFooter from "@/components/client/ContactFooter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import {
  listAppointmentsByPhone, cancelAppointment, rescheduleAppointment,
  getOccupiedCells, SlotConflictError,
} from "@/lib/services/appointmentsService";
import { getSettings, DEFAULT_SETTINGS, dayHours } from "@/lib/services/settingsService";
import { listBlockedForDate } from "@/lib/services/blockedDatesService";
import type { AppointmentDoc, BusinessSettings } from "@/lib/types";
import {
  formatDateHe, formatCurrency, buildTimeGrid, occupiedCells, timeToMinutes, closeToMinutes,
  isPastSlot, toDateKey, fromDateKey, WEEKDAYS_HE,
} from "@/lib/utils";

export default function MyAppointmentsPage() {
  const { session, loading } = useClientAuth();
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoadingData(true);
    const [list, st] = await Promise.all([
      listAppointmentsByPhone(session.phone),
      getSettings(),
    ]);
    setAppts(list);
    setSettings(st);
    setLoadingData(false);
  }, [session]);

  useEffect(() => { if (session) load(); }, [session, load]);

  function isUpcoming(a: AppointmentDoc) {
    return a.status === "booked" && !isPastSlot(a.date, a.startTime);
  }

  async function handleCancel(a: AppointmentDoc) {
    if (!confirm("לבטל את התור?")) return;
    setBusyId(a.id);
    try {
      await cancelAppointment(a.id, settings.slotGranularity, settings.bufferMinutes);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading || (session && loadingData)) {
    return (
      <main className="min-h-screen"><Navbar />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center text-bronze-500">טוען…</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen"><Navbar />
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-bronze-800">צריך להתחבר</h1>
          <Link href="/login" className="mt-6 inline-block rounded-full bg-amber-deep px-8 py-3.5 font-semibold text-white shadow-glow">כניסה</Link>
        </div>
      </main>
    );
  }

  const upcoming = appts.filter(isUpcoming);
  const past = appts.filter((a) => !isUpcoming(a));

  return (
    <main className="min-h-screen"><Navbar />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-2xl font-bold text-bronze-800">התורים שלי</h1>
        <p className="mt-1 text-sm text-bronze-500">שלום {session.displayName}</p>

        <h2 className="mt-8 mb-3 text-lg font-bold text-bronze-700">תורים קרובים</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-sand-200 bg-white/60 p-6 text-center text-bronze-500">
            אין תורים קרובים.
            <div><Link href="/booking" className="mt-3 inline-block rounded-full bg-amber-deep px-6 py-2.5 text-sm font-semibold text-white">הזמנת תור</Link></div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-bronze-800">{a.serviceName}</p>
                    <p className="mt-1 text-sm text-bronze-600">{formatDateHe(a.date)}</p>
                    <p className="text-sm text-bronze-600" dir="ltr">{a.startTime}–{a.endTime}</p>
                  </div>
                  <span className="font-semibold text-amber-deep">{formatCurrency(a.price)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setRescheduleId(rescheduleId === a.id ? null : a.id)}
                    className="rounded-full border border-sand-300 px-4 py-1.5 text-sm font-medium text-bronze-700 hover:bg-sand-100"
                  >
                    {rescheduleId === a.id ? "סגירה" : "שינוי מועד"}
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => handleCancel(a)}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    ביטול
                  </button>
                </div>
                {rescheduleId === a.id && (
                  <Reschedule appt={a} settings={settings} onDone={async () => { setRescheduleId(null); await load(); }} />
                )}
              </div>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-10 mb-3 text-lg font-bold text-bronze-700">היסטוריה</h2>
            <div className="space-y-2">
              {past.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-sand-100 bg-white/40 px-4 py-3 text-sm">
                  <div className="text-bronze-600">
                    <span className="font-medium">{a.serviceName}</span>
                    <span className="mx-2 text-bronze-400">·</span>
                    <span>{formatDateHe(a.date)}</span>
                  </div>
                  <span className={a.status === "cancelled" ? "text-red-500" : "text-bronze-400"}>
                    {a.status === "cancelled" ? "בוטל" : a.status === "completed" ? "הושלם" : "עבר"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ContactFooter />
    </main>
  );
}

function Reschedule({ appt, settings, onDone }: { appt: AppointmentDoc; settings: BusinessSettings; onDone: () => void }) {
  const [dateKey, setDateKey] = useState(appt.date);
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [occ] = await Promise.all([getOccupiedCells(dateKey), listBlockedForDate(dateKey)]);
      setOccupied(occ);
    })();
  }, [dateKey]);

  const reschedSchedule = dayHours(settings, fromDateKey(dateKey).getDay());
  const grid = reschedSchedule.enabled
    ? buildTimeGrid(reschedSchedule.openTime, reschedSchedule.closeTime, settings.slotGranularity)
    : [];
  const days: { key: string; d: Date }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    if (dayHours(settings, d.getDay()).enabled) days.push({ key: toDateKey(d), d });
  }

  function available(time: string): boolean {
    if (!reschedSchedule.enabled) return false;
    const total = appt.durationMinutes + settings.bufferMinutes;
    const cells = occupiedCells(time, total, settings.slotGranularity);
    if (timeToMinutes(time) + appt.durationMinutes > closeToMinutes(reschedSchedule.closeTime)) return false;
    if (isPastSlot(dateKey, time)) return false;
    for (const c of cells) {
      // a cell currently held by THIS appointment is still free for it
      const heldByThis = dateKey === appt.date && occupiedCells(appt.startTime, total, settings.slotGranularity).includes(c);
      if (occupied.has(c) && !heldByThis) return false;
    }
    return true;
  }

  async function submit(time: string) {
    setBusy(true); setError("");
    try {
      await rescheduleAppointment(appt.id, dateKey, time, settings.slotGranularity, settings.bufferMinutes);
      onDone();
    } catch (err) {
      setError(err instanceof SlotConflictError ? err.message : "שגיאה בשינוי המועד.");
      const occ = await getOccupiedCells(dateKey); setOccupied(occ);
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 rounded-xl bg-sand-50 p-3">
      <div className="thin-scroll flex gap-2 overflow-x-auto pb-2">
        {days.map(({ key, d }) => (
          <button key={key} onClick={() => setDateKey(key)}
            className={`flex min-w-[58px] flex-col items-center rounded-xl border px-2 py-1.5 text-xs ${key === dateKey ? "border-amber-deep bg-amber-deep text-white" : "border-sand-200 bg-white text-bronze-700"}`}>
            <span>{WEEKDAYS_HE[d.getDay()]}</span>
            <span className="text-base font-bold">{d.getDate()}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {grid.map((t) => {
          const ok = available(t);
          return (
            <button key={t} dir="ltr" disabled={!ok || busy} onClick={() => submit(t)}
              className={`rounded-lg border py-1.5 text-xs font-semibold ${ok ? "border-sand-200 bg-white text-bronze-700 hover:border-amber-deep" : "cursor-not-allowed border-sand-100 bg-sand-100 text-bronze-300 line-through"}`}>
              {t}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
