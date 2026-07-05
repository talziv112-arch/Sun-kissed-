"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/client/Navbar";
import ContactFooter from "@/components/client/ContactFooter";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { listServices } from "@/lib/services/servicesService";
import { getSettings, DEFAULT_SETTINGS, dayHours } from "@/lib/services/settingsService";
import { listBlockedForDate } from "@/lib/services/blockedDatesService";
import {
  createAppointment, getOccupiedCells, listAppointmentsByDate,
  listAppointmentsByPhone, SlotConflictError,
} from "@/lib/services/appointmentsService";
import { getUserByPhone } from "@/lib/services/usersService";
import { addToWaitingList } from "@/lib/services/waitingListService";
import { resolveMembership, whatsappPurchaseLink } from "@/lib/membership";
import type { ServiceDoc, BusinessSettings, BlockedDateDoc, UserDoc, AppointmentDoc } from "@/lib/types";
import {
  buildTimeGrid, occupiedCells, timeToMinutes, closeToMinutes, isPastSlot, toDateKey,
  fromDateKey, formatDateHe, formatCurrency, WEEKDAYS_HE,
} from "@/lib/utils";

export default function BookingPage() {
  const { session, loading } = useClientAuth();
  const router = useRouter();

  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [selectedService, setSelectedService] = useState<ServiceDoc | null>(null);
  const [dateKey, setDateKey] = useState<string>(toDateKey(new Date()));
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<BlockedDateDoc[]>([]);
  const [dayCount, setDayCount] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserDoc | null>(null);
  const [myAppts, setMyAppts] = useState<AppointmentDoc[]>([]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [svc, st] = await Promise.all([listServices(true), getSettings()]);
        setServices(svc);
        setSettings(st);
        if (svc.length) setSelectedService(svc[0]);
      } catch {
        setError("שגיאה בטעינת השירותים. רעננו את העמוד.");
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // Load the signed-in customer's membership + their appointments (for punch counting)
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [u, appts] = await Promise.all([
          getUserByPhone(session.phone),
          listAppointmentsByPhone(session.phone),
        ]);
        setUser(u);
        setMyAppts(appts);
      } catch {
        /* non-fatal: fall back to one-time pricing */
      }
    })();
  }, [session, done]);

  const membership = useMemo(() => resolveMembership(user, myAppts), [user, myAppts]);
  const waLink = whatsappPurchaseLink(settings.whatsappNumber, session?.displayName);

  // Load slot availability whenever the date changes
  useEffect(() => {
    (async () => {
      setLoadingSlots(true);
      setSelectedTime(null);
      try {
        const [occ, blk, appts] = await Promise.all([
          getOccupiedCells(dateKey),
          listBlockedForDate(dateKey),
          listAppointmentsByDate(dateKey),
        ]);
        setOccupied(occ);
        setBlocked(blk);
        setDayCount(appts.length);
      } catch {
        setError("שגיאה בטעינת הזמינות.");
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [dateKey]);

  const next14Days = useMemo(() => {
    const days: { key: string; date: Date; selectable: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = toDateKey(d);
      const selectable = dayHours(settings, d.getDay()).enabled;
      days.push({ key, date: d, selectable });
    }
    return days;
  }, [settings]);

  const wholeDayBlocked = blocked.some((b) => !b.startTime);

  // Hours for the specific day being viewed (each weekday can differ).
  const todaySchedule = useMemo(
    () => dayHours(settings, fromDateKey(dateKey).getDay()),
    [settings, dateKey]
  );

  const grid = useMemo(
    () =>
      todaySchedule.enabled
        ? buildTimeGrid(todaySchedule.openTime, todaySchedule.closeTime, settings.slotGranularity)
        : [],
    [todaySchedule, settings.slotGranularity]
  );

  function isStartAvailable(time: string): boolean {
    if (!selectedService) return false;
    if (!todaySchedule.enabled) return false;
    if (wholeDayBlocked) return false;
    if (dayCount >= settings.maxDailyCapacity) return false;

    const total = selectedService.durationMinutes + settings.bufferMinutes;
    const cells = occupiedCells(time, total, settings.slotGranularity);
    const closeMin = closeToMinutes(todaySchedule.closeTime);

    // must finish before closing
    if (timeToMinutes(time) + selectedService.durationMinutes > closeMin) return false;
    // no past slots
    if (isPastSlot(dateKey, time)) return false;
    // no occupied cells
    for (const c of cells) {
      if (occupied.has(c)) return false;
      if (timeToMinutes(c) >= closeMin) return false;
    }
    // not inside a blocked time range
    for (const b of blocked) {
      if (!b.startTime || !b.endTime) continue;
      const bs = timeToMinutes(b.startTime);
      const be = timeToMinutes(b.endTime);
      for (const c of cells) {
        const cm = timeToMinutes(c);
        if (cm >= bs && cm < be) return false;
      }
    }
    return true;
  }

  async function confirm() {
    if (!session || !selectedService || !selectedTime) return;
    setConfirming(true);
    setError("");
    try {
      await createAppointment({
        userPhone: session.phone,
        userName: session.displayName,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: membership.hidePrice ? 0 : selectedService.price,
        date: dateKey,
        startTime: selectedTime,
        durationMinutes: selectedService.durationMinutes,
        granularity: settings.slotGranularity,
        bufferMinutes: settings.bufferMinutes,
        source: "client",
      });
      setDone(true);
    } catch (err) {
      if (err instanceof SlotConflictError) {
        setError(err.message);
        // refresh availability
        const occ = await getOccupiedCells(dateKey);
        setOccupied(occ);
        setSelectedTime(null);
      } else {
        setError("אירעה שגיאה בעת הקביעה. נסו שוב.");
      }
    } finally {
      setConfirming(false);
    }
  }

  async function joinWaitingList() {
    if (!session || !selectedService) return;
    try {
      await addToWaitingList({
        userPhone: session.phone,
        userName: session.displayName,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        preferredDate: dateKey,
      });
      setError("");
      alert("נוספתם לרשימת ההמתנה. נעדכן אתכם כשתתפנה משבצת.");
    } catch {
      setError("שגיאה בהצטרפות לרשימת ההמתנה.");
    }
  }

  // ---- gating ----
  if (loading || loadingData) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-3xl px-5 py-16 text-center text-bronze-500">טוען…</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-bronze-800">צריך להתחבר כדי להזמין תור</h1>
          <p className="mt-2 text-bronze-500">הכניסה היא באמצעות טלפון וסיסמה בלבד.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-full bg-amber-deep px-8 py-3.5 font-semibold text-white shadow-glow transition hover:bg-bronze-600"
          >
            כניסה / הרשמה
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h1 className="mt-5 text-2xl font-bold text-bronze-800">התור נקבע בהצלחה!</h1>
          <p className="mt-2 text-bronze-600">
            {selectedService?.name} · {formatDateHe(dateKey)} · {selectedTime}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/my-appointments" className="rounded-full bg-amber-deep px-8 py-3.5 font-semibold text-white shadow-glow transition hover:bg-bronze-600">
              לצפייה בתורים שלי
            </Link>
            <button
              onClick={() => { setDone(false); setSelectedTime(null); }}
              className="rounded-full border border-sand-300 bg-white px-8 py-3.5 font-semibold text-bronze-700 transition hover:bg-sand-100"
            >
              קביעת תור נוסף
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-bronze-800">הזמנת תור</h1>
        </div>

        {/* Membership status banner */}
        <div className={`mt-4 rounded-2xl border p-4 ${
          membership.hidePrice
            ? "border-green-200 bg-green-50"
            : membership.needsPurchase
              ? "border-sand-200 bg-white/70"
              : "border-sand-200 bg-white/70"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-bronze-800">
                שלום {session.displayName} · {membership.label}
              </p>
              {membership.detail && (
                <p className="mt-0.5 text-xs text-bronze-500">{membership.detail}</p>
              )}
            </div>
            {membership.needsPurchase && waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                רכישת מנוי / כרטיסייה
              </a>
            )}
          </div>
        </div>

        {services.length === 0 ? (
          <p className="mt-6 rounded-xl bg-sand-100 px-4 py-6 text-center text-bronze-600">
            אין שירותים זמינים כרגע. אנא נסו שוב מאוחר יותר.
          </p>
        ) : (
          <>
            {/* Step 1: service */}
            <Section step="1" title="בחירת טיפול">
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => {
                  const active = selectedService?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedService(s); setSelectedTime(null); }}
                      className={`rounded-2xl border p-4 text-right transition ${
                        active
                          ? "border-amber-deep bg-white shadow-card"
                          : "border-sand-200 bg-white/60 hover:border-sand-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-bronze-800">{s.name}</span>
                        {membership.hidePrice ? (
                          <span className="text-sm font-semibold text-green-600">כלול</span>
                        ) : (
                          <span className="font-semibold text-amber-deep">{formatCurrency(s.price)}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-bronze-500">{s.durationMinutes} דקות</p>
                      {s.description && <p className="mt-1 text-xs text-bronze-400">{s.description}</p>}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Step 2: date */}
            <Section step="2" title="בחירת יום">
              <div className="thin-scroll flex gap-2 overflow-x-auto pb-2">
                {next14Days.map(({ key, date, selectable }) => {
                  const active = key === dateKey;
                  return (
                    <button
                      key={key}
                      disabled={!selectable}
                      onClick={() => setDateKey(key)}
                      className={`flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                        active
                          ? "border-amber-deep bg-amber-deep text-white"
                          : selectable
                            ? "border-sand-200 bg-white/70 text-bronze-700 hover:border-sand-300"
                            : "cursor-not-allowed border-sand-100 bg-sand-100 text-bronze-300"
                      }`}
                    >
                      <span className="text-xs">{WEEKDAYS_HE[date.getDay()]}</span>
                      <span className="text-lg font-bold">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-bronze-500">{formatDateHe(dateKey)}</p>
            </Section>

            {/* Step 3: time */}
            <Section step="3" title="בחירת שעה">
              {loadingSlots ? (
                <p className="text-bronze-500">טוען זמינות…</p>
              ) : wholeDayBlocked ? (
                <p className="rounded-xl bg-sand-100 px-4 py-4 text-bronze-600">
                  היום הזה סגור להזמנות.
                </p>
              ) : dayCount >= settings.maxDailyCapacity ? (
                <div className="rounded-xl bg-sand-100 px-4 py-4 text-bronze-600">
                  <p>הגענו לתפוסה המלאה ליום זה.</p>
                  <button onClick={joinWaitingList} className="mt-3 rounded-full bg-bronze-600 px-5 py-2 text-sm font-semibold text-white">
                    הצטרפות לרשימת המתנה
                  </button>
                </div>
              ) : grid.length === 0 || grid.every((t) => !isStartAvailable(t)) ? (
                <p className="rounded-xl bg-sand-100 px-4 py-4 text-bronze-600">
                  אין שעות פנויות ביום זה. נסו לבחור יום אחר.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {grid.map((time) => {
                    const ok = isStartAvailable(time);
                    const active = selectedTime === time;
                    return (
                      <button
                        key={time}
                        disabled={!ok}
                        onClick={() => setSelectedTime(time)}
                        dir="ltr"
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                          active
                            ? "border-amber-deep bg-amber-deep text-white"
                            : ok
                              ? "border-sand-200 bg-white text-bronze-700 hover:border-amber-deep"
                              : "cursor-not-allowed border-sand-100 bg-sand-100 text-bronze-300 line-through"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
            )}

            {/* Summary + confirm */}
            <div className="sticky bottom-4 mt-8">
              <div className="rounded-2xl border border-sand-200 bg-white/95 p-4 shadow-card backdrop-blur">
                <div className="flex items-center justify-between text-sm text-bronze-600">
                  <span>
                    {selectedService?.name}
                    {selectedTime ? ` · ${selectedTime}` : ""}
                  </span>
                  {membership.hidePrice ? (
                    <span className="font-bold text-green-600">
                      {membership.type === "punchCard" && membership.punchRemaining !== undefined
                        ? `כרטיסייה · נותרו ${membership.punchRemaining}`
                        : "כלול במנוי"}
                    </span>
                  ) : (
                    <span className="font-bold text-amber-deep">
                      {selectedService ? formatCurrency(selectedService.price) : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={confirm}
                  disabled={!selectedTime || confirming}
                  className="mt-3 w-full rounded-full bg-amber-deep py-3.5 text-base font-semibold text-white shadow-glow transition hover:bg-bronze-600 disabled:opacity-50"
                >
                  {confirming ? "קובע תור…" : "אישור וקביעת התור"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ContactFooter />
    </main>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-bronze-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-deep text-sm text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
