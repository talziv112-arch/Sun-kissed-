// Shared helpers: phone normalization, date/time math, currency, formatting.

export function normalizePhone(raw: string): string {
  // Keep digits only; strip leading country code variations to a local form.
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}

export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return /^0\d{8,9}$/.test(d);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export const WEEKDAYS_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

export const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateHe(key: string): string {
  const d = fromDateKey(key);
  return `יום ${WEEKDAYS_HE[d.getDay()]}, ${d.getDate()} ב${MONTHS_HE[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// A CLOSING time of "00:00" (or "24:00") means midnight = END of the day (1440
// minutes), not the start. Always use this for close-time comparisons so a
// schedule like 06:00–00:00 is understood correctly.
export function closeToMinutes(t: string): number {
  if (t === "00:00" || t === "24:00") return 24 * 60;
  return timeToMinutes(t);
}

// Build the grid of start-time slots between open/close given a granularity.
export function buildTimeGrid(open: string, close: string, granularity: number): string[] {
  const start = timeToMinutes(open);
  const end = closeToMinutes(close);
  const step = Number.isFinite(granularity) && granularity >= 5 ? granularity : 15;
  const out: string[] = [];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return out;
  for (let t = start; t < end; t += step) out.push(minutesToTime(t));
  return out;
}

// For an appointment starting at `start` lasting `duration`, return all grid
// cell keys it occupies (aligned to `granularity`). Used for slot locking.
export function occupiedCells(start: string, duration: number, granularity: number): string[] {
  const startMin = timeToMinutes(start);
  const cells: string[] = [];
  for (let t = startMin; t < startMin + duration; t += granularity) {
    cells.push(minutesToTime(t));
  }
  return cells;
}

export function isPastSlot(dateKey: string, time: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const slot = new Date(y, m - 1, d, h, min);
  return slot.getTime() <= Date.now();
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}
