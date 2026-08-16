import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BusinessSettings, DaySchedule } from "@/lib/types";

const COL = "settings";
const DOC_ID = "business";

// Default per-day schedule: Sun–Fri open 09:00–20:00, Saturday closed.
function defaultDaySchedules(): DaySchedule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    enabled: d !== 6, // Saturday (6) closed by default
    openTime: "09:00",
    closeTime: "20:00",
  }));
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  openTime: "09:00",
  closeTime: "20:00",
  slotGranularity: 15,
  bufferMinutes: 0,
  maxDailyCapacity: 40,
  workingDays: [0, 1, 2, 3, 4, 5],
  daySchedules: defaultDaySchedules(),
  whatsappNumber: "",
  instagram: "",
  punchCardDefault: 12,
  updatedAt: 0,
};

export async function getSettings(): Promise<BusinessSettings> {
  const snap = await getDoc(doc(db, COL, DOC_ID));
  const raw = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
  // Prefer the robust JSON-string copy of the schedule if present (this round-trips
  // identically on every Firestore edition, unlike nested arrays-of-objects).
  if (typeof raw.daySchedulesJson === "string") {
    try {
      const parsed = JSON.parse(raw.daySchedulesJson);
      if (Array.isArray(parsed)) raw.daySchedules = parsed;
    } catch { /* fall back to whatever daySchedules holds */ }
  }
  const merged = { ...DEFAULT_SETTINGS, ...(raw as Partial<BusinessSettings>) };
  return sanitizeSettings(merged);
}

const validTime = (t: unknown, fallback: string) =>
  typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t) ? t : fallback;

const validNum = (n: unknown, fallback: number, min: number) => {
  const v = Number(n);
  return Number.isFinite(v) && v >= min ? v : fallback;
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// A close time of "00:00"/"24:00" means end of day.
const closeToMin = (t: string) => (t === "00:00" || t === "24:00" ? 24 * 60 : toMin(t));

// Guards against blank / non-numeric / nonsensical values, and ALWAYS produces
// a valid 7-entry daySchedules array (deriving it from the legacy fields when an
// older saved document doesn't have per-day data yet).
function sanitizeSettings(s: BusinessSettings): BusinessSettings {
  const slotGranularity = validNum(s.slotGranularity, DEFAULT_SETTINGS.slotGranularity, 5);
  const bufferMinutes = validNum(s.bufferMinutes, DEFAULT_SETTINGS.bufferMinutes, 0);
  const maxDailyCapacity = validNum(s.maxDailyCapacity, DEFAULT_SETTINGS.maxDailyCapacity, 1);

  const legacyWorking = Array.isArray(s.workingDays)
    ? s.workingDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : DEFAULT_SETTINGS.workingDays;
  const legacyOpen = validTime(s.openTime, DEFAULT_SETTINGS.openTime);
  const legacyClose = validTime(s.closeTime, DEFAULT_SETTINGS.closeTime);

  const sanitizeDay = (d: Partial<DaySchedule> | undefined, dow: number): DaySchedule => {
    if (d && typeof d === "object") {
      const open = validTime(d.openTime, legacyOpen);
      let close = validTime(d.closeTime, legacyClose);
      // Only fix a genuinely unusable range (open at/after close), and even then
      // just extend close to end-of-day rather than discarding the user's open time.
      if (toMin(open) >= closeToMin(close)) close = "00:00";
      return { enabled: Boolean(d.enabled), openTime: open, closeTime: close };
    }
    // No per-day data: derive from legacy global fields.
    let open = legacyOpen, close = legacyClose;
    if (toMin(open) >= closeToMin(close)) { open = "09:00"; close = "20:00"; }
    return { enabled: legacyWorking.includes(dow), openTime: open, closeTime: close };
  };

  const src = Array.isArray(s.daySchedules) && s.daySchedules.length === 7 ? s.daySchedules : undefined;
  const daySchedules = [0, 1, 2, 3, 4, 5, 6].map((dow) => sanitizeDay(src?.[dow], dow));

  // Keep legacy fields roughly in sync (used only as fallback by old code paths).
  const workingDays = daySchedules
    .map((d, i) => (d.enabled ? i : -1))
    .filter((i) => i >= 0);

  return {
    openTime: legacyOpen,
    closeTime: legacyClose,
    slotGranularity,
    bufferMinutes,
    maxDailyCapacity,
    workingDays: workingDays.length ? workingDays : DEFAULT_SETTINGS.workingDays,
    daySchedules,
    whatsappNumber: typeof s.whatsappNumber === "string" ? s.whatsappNumber.trim() : "",
    instagram: typeof s.instagram === "string" ? s.instagram.trim() : "",
    punchCardDefault: validNum(s.punchCardDefault, 12, 1),
    updatedAt: s.updatedAt ?? 0,
  };
}

// Returns the effective open/close + enabled flag for a given weekday (0=Sun..6=Sat).
export function dayHours(settings: BusinessSettings, dayOfWeek: number): DaySchedule {
  const ds = settings.daySchedules?.[dayOfWeek];
  if (ds) return ds;
  return {
    enabled: settings.workingDays.includes(dayOfWeek),
    openTime: settings.openTime,
    closeTime: settings.closeTime,
  };
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  const clean = sanitizeSettings(settings);
  await setDoc(doc(db, COL, DOC_ID), {
    ...clean,
    // Robust copy: a plain string always round-trips, regardless of Firestore edition.
    daySchedulesJson: JSON.stringify(clean.daySchedules ?? []),
    updatedAt: Date.now(),
  });
}
