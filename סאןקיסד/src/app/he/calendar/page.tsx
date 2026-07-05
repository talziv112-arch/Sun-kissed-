"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAppointmentsInRange, createAppointment,
  cancelAppointment, getOccupiedCells, SlotConflictError,
} from "@/lib/services/appointmentsService";
import { getSettings, DEFAULT_SETTINGS, dayHours } from "@/lib/services/settingsService";
import { listServices } from "@/lib/services/servicesService";
import { listBlockedForDate, addBlock, removeBlock, listAllBlocked } from "@/lib/services/blockedDatesService";
import type { AppointmentDoc, BusinessSettings, ServiceDoc, BlockedDateDoc } from "@/lib/types";
import {
  toDateKey, fromDateKey, formatDateHe, formatCurrency, WEEKDAYS_HE, MONTHS_HE,
  buildTimeGrid, occupiedCells, timeToMinutes, closeToMinutes, isPastSlot, isValidPhone, normalizePhone,
} from "@/lib/utils";

type Mode = "day" | "week" | "month";

export default function CalendarPage() {
  const [mode, setMode] = useState<Mode>("day");
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [appts, setAppts] = useState<AppointmentDoc[]>([]);
  const [blocked, setBlocked] = useState<BlockedDateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState<string>("");

  const cursorKey = toDateKey(cursor);

  const rangeKeys = useMemo(() => {
    if (mode === "day") return [cursorKey];
    if (mode === "week") {
      const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return toDateKey(d); });
    }
    // month
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => toDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)));
  }, [mode, cursor, cursorKey]);

  const load = useCallback(async () => {
    setLoading(true);
    const [st, svc] = await Promise.all([getSettings(), listServices()]);
    setSettings(st); setServices(svc);
    const start = rangeKeys[0], end = rangeKeys[rangeKeys.length - 1];
    const [list, blk] = await Promise.all([
      listAppointmentsInRange(start, end),
      mode === "day" ? listBlockedForDate(cursorKey) : listAllBlocked(),
    ]);
    setAppts(list.filter((a) => a.status !== "cancelled"));
    setBlocked(blk);
    setLoading(false);
  }, [rangeKeys, mode, cursorKey]);

  useEffect(() => { load(); }, [load]);

  function shift(delta: number) {
    const d = new Date(cursor);
    if (mode === "day") d.setDate(d.getDate() + delta);
    else if (mode === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }

  async function blockWholeDay(date: string) {
    if (!confirm("לחסום את כל היום להזמנות?")) return;
    await addBlock({ date, reason: "חסום ידנית" });
    await load();
  }

  async function unblock(id: string) { await removeBlock(id); await load(); }

  async function handleCancel(a: AppointmentDoc) {
    if (!confirm("לבטל את התור?")) return;
    await cancelAppointment(a.id, settings.slotGranularity, settings.bufferMinutes);
    await load();
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-bronze-800">יומן</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-sand-100 p-1 text-sm font-medium">
            {(["day","week","month"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 transition ${mode === m ? "bg-white text-bronze-800 shadow" : "text-bronze-500"}`}>
                {m === "day" ? "יום" : m === "week" ? "שבוע" : "חודש"}
              </button>
            ))}
          </div>
          <button onClick={() => { setCreateDate(cursorKey); setShowCreate(true); }}
            className="rounded-full bg-amber-deep px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-bronze-600">
            + תור ידני
          </button>
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-full border border-sand-200 px-4 py-2 text-bronze-700 hover:bg-sand-100">‹ הקודם</button>
        <span className="font-semibold text-bronze-800">
          {mode === "month"
            ? `${MONTHS_HE[cursor.getMonth()]} ${cursor.getFullYear()}`
            : mode === "week"
              ? `שבוע של ${formatDateHe(rangeKeys[0])}`
              : formatDateHe(cursorKey)}
        </span>
        <button onClick={() => shift(1)} className="rounded-full border border-sand-200 px-4 py-2 text-bronze-700 hover:bg-sand-100">הבא ›</button>
      </div>

      {loading ? (
        <p className="text-bronze-500">טוען…</p>
      ) : mode === "day" ? (
        <DayView
          dateKey={cursorKey} appts={appts} blocked={blocked} settings={settings}
          onBlockDay={blockWholeDay} onUnblock={unblock} onCancel={handleCancel}
        />
      ) : mode === "week" ? (
        <WeekView rangeKeys={rangeKeys} appts={appts} onPick={(k) => { setCursor(fromDateKey(k)); setMode("day"); }} />
      ) : (
        <MonthView cursor={cursor} appts={appts} blocked={blocked} onPick={(k) => { setCursor(fromDateKey(k)); setMode("day"); }} />
      )}

      {showCreate && (
        <CreateModal
          services={services} settings={settings} defaultDate={createDate}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function DayView({ dateKey, appts, blocked, settings, onBlockDay, onUnblock, onCancel }: {
  dateKey: string; appts: AppointmentDoc[]; blocked: BlockedDateDoc[]; settings: BusinessSettings;
  onBlockDay: (d: string) => void; onUnblock: (id: string) => void; onCancel: (a: AppointmentDoc) => void;
}) {
  const dayAppts = appts.filter((a) => a.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayBlocks = blocked.filter((b) => b.date === dateKey);
  const wholeDay = dayBlocks.find((b) => !b.startTime);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {wholeDay ? (
          <button onClick={() => onUnblock(wholeDay.id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600">
            היום חסום — לחצו לביטול החסימה
          </button>
        ) : (
          <button onClick={() => onBlockDay(dateKey)} className="rounded-full border border-sand-300 px-4 py-1.5 text-sm font-medium text-bronze-700 hover:bg-sand-100">
            חסימת יום שלם
          </button>
        )}
      </div>

      {dayAppts.length === 0 ? (
        <p className="rounded-2xl border border-sand-200 bg-white/60 p-8 text-center text-bronze-400">אין תורים ביום זה.</p>
      ) : (
        <div className="space-y-2">
          {dayAppts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-card">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-amber-deep" dir="ltr">{a.startTime}</span>
                <div>
                  <p className="font-semibold text-bronze-800">{a.serviceName}</p>
                  <p className="text-sm text-bronze-500" dir="ltr">{a.userPhone} · {a.userName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-bronze-700">{formatCurrency(a.price)}</span>
                <button onClick={() => onCancel(a)} className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">ביטול</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekView({ rangeKeys, appts, onPick }: { rangeKeys: string[]; appts: AppointmentDoc[]; onPick: (k: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {rangeKeys.map((k) => {
        const d = fromDateKey(k);
        const list = appts.filter((a) => a.date === k);
        return (
          <button key={k} onClick={() => onPick(k)} className="rounded-2xl border border-sand-200 bg-white/70 p-3 text-right transition hover:border-amber-deep">
            <p className="text-xs text-bronze-500">{WEEKDAYS_HE[d.getDay()]}</p>
            <p className="text-lg font-bold text-bronze-800">{d.getDate()}</p>
            <div className="mt-2 space-y-1">
              {list.slice(0, 3).map((a) => (
                <p key={a.id} className="truncate rounded bg-sand-100 px-2 py-0.5 text-xs text-bronze-700" dir="ltr">{a.startTime} {a.serviceName}</p>
              ))}
              {list.length > 3 && <p className="text-xs text-bronze-400">+{list.length - 3} נוספים</p>}
              {list.length === 0 && <p className="text-xs text-bronze-300">—</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ cursor, appts, blocked, onPick }: { cursor: Date; appts: AppointmentDoc[]; blocked: BlockedDateDoc[]; onPick: (k: string) => void }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateKey(new Date(year, month, d)));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-bronze-500">
        {WEEKDAYS_HE.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((k, i) => {
          if (!k) return <div key={i} />;
          const d = fromDateKey(k);
          const count = appts.filter((a) => a.date === k).length;
          const isBlocked = blocked.some((b) => b.date === k && !b.startTime);
          return (
            <button key={k} onClick={() => onPick(k)}
              className={`aspect-square rounded-xl border p-1.5 text-right transition hover:border-amber-deep ${isBlocked ? "border-red-200 bg-red-50" : "border-sand-200 bg-white/70"}`}>
              <span className="text-sm font-semibold text-bronze-800">{d.getDate()}</span>
              {count > 0 && <span className="mt-1 block rounded-full bg-amber-deep px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateModal({ services, settings, defaultDate, onClose, onCreated }: {
  services: ServiceDoc[]; settings: BusinessSettings; defaultDate: string;
  onClose: () => void; onCreated: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId);
  const sched = dayHours(settings, fromDateKey(date).getDay());
  // Admin can book even on otherwise-closed days; fall back to a full day grid then.
  const gridOpen = sched.enabled ? sched.openTime : "09:00";
  const gridClose = sched.enabled ? sched.closeTime : "20:00";
  const grid = buildTimeGrid(gridOpen, gridClose, settings.slotGranularity);

  useEffect(() => { (async () => setOccupied(await getOccupiedCells(date)))(); }, [date]);

  function available(t: string): boolean {
    if (!service) return false;
    const cells = occupiedCells(t, service.durationMinutes + settings.bufferMinutes, settings.slotGranularity);
    if (timeToMinutes(t) + service.durationMinutes > closeToMinutes(gridClose)) return false;
    if (isPastSlot(date, t)) return false;
    return !cells.some((c) => occupied.has(c));
  }

  async function submit() {
    if (!service || !time) return;
    if (!isValidPhone(phone)) { setError("מספר טלפון לא תקין"); return; }
    setBusy(true); setError("");
    try {
      await createAppointment({
        userPhone: normalizePhone(phone),
        userName: name.trim() || normalizePhone(phone),
        serviceId: service.id, serviceName: service.name, price: service.price,
        date, startTime: time, durationMinutes: service.durationMinutes,
        granularity: settings.slotGranularity, bufferMinutes: settings.bufferMinutes,
        source: "admin",
      });
      onCreated();
    } catch (err) {
      setError(err instanceof SlotConflictError ? err.message : "שגיאה ביצירת התור");
      setOccupied(await getOccupiedCells(date));
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-bronze-800">תור ידני חדש</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-bronze-600">טיפול</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded-xl border border-sand-200 px-3 py-2.5">
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMinutes} ד׳ · {formatCurrency(s.price)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-bronze-600">טלפון לקוח</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1 w-full rounded-xl border border-sand-200 px-3 py-2.5" placeholder="05X-XXXXXXX" />
            </label>
            <label className="block">
              <span className="text-sm text-bronze-600">שם לקוח</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-sand-200 px-3 py-2.5" placeholder="שם" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-bronze-600">תאריך</span>
            <input type="date" value={date} onChange={(e) => { setTime(""); setDate(e.target.value); }} className="mt-1 w-full rounded-xl border border-sand-200 px-3 py-2.5" />
          </label>
          <div>
            <span className="text-sm text-bronze-600">שעה</span>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {grid.map((t) => {
                const ok = available(t);
                return (
                  <button key={t} dir="ltr" disabled={!ok} onClick={() => setTime(t)}
                    className={`rounded-lg border py-1.5 text-xs font-semibold ${time === t ? "border-amber-deep bg-amber-deep text-white" : ok ? "border-sand-200 bg-white text-bronze-700" : "cursor-not-allowed border-sand-100 bg-sand-100 text-bronze-300 line-through"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={submit} disabled={busy || !time} className="flex-1 rounded-full bg-amber-deep py-3 font-semibold text-white shadow-glow disabled:opacity-50">
            {busy ? "שומר…" : "יצירת תור"}
          </button>
          <button onClick={onClose} className="rounded-full border border-sand-300 px-6 py-3 font-medium text-bronze-700">ביטול</button>
        </div>
      </div>
    </div>
  );
}
