// Membership logic: figures out a customer's effective status, counts punch-card
// entries that were actually used, decides whether to show prices, and builds
// the WhatsApp purchase link. Kept dependency-free and pure for easy reuse.

import type { UserDoc, AppointmentDoc, MembershipType } from "@/lib/types";
import { isPastSlot } from "@/lib/utils";

export interface MembershipStatus {
  type: MembershipType;            // resolved type (subscription treated as oneTime if expired)
  rawType: MembershipType;         // what the admin set
  active: boolean;                 // subscription not expired / card has entries left
  hidePrice: boolean;              // paid-in-advance customers don't see prices
  label: string;                   // short Hebrew label for the UI
  detail?: string;                 // extra line (e.g. "נותרו 4 כניסות" / "בתוקף עד …")
  needsPurchase: boolean;          // show a "buy" CTA (no/expired/empty plan)
  punchUsed?: number;
  punchRemaining?: number;
}

// Count entries that were actually USED on a punch card: non-cancelled
// appointments whose date+time has already passed, on/after the card's issue date.
export function countUsedPunches(user: UserDoc, appts: AppointmentDoc[]): number {
  const issued = user.punchIssuedDate;
  return appts.filter((a) => {
    if (a.status === "cancelled") return false;
    if (issued && a.date < issued) return false;
    return isPastSlot(a.date, a.startTime); // already happened = used
  }).length;
}

export function resolveMembership(
  user: UserDoc | null,
  appts: AppointmentDoc[]
): MembershipStatus {
  const rawType: MembershipType = user?.membershipType ?? "oneTime";

  if (user && rawType === "subscription") {
    const expiry = user.subscriptionExpiry;
    const active = !!expiry && expiry >= todayKey();
    if (active) {
      return {
        type: "subscription", rawType, active: true, hidePrice: true,
        label: "מנוי חודשי פעיל",
        detail: expiry ? `בתוקף עד ${formatHe(expiry)}` : undefined,
        needsPurchase: false,
      };
    }
    // expired → behaves like one-time, prompt to renew
    return {
      type: "oneTime", rawType, active: false, hidePrice: false,
      label: "המנוי פג תוקף",
      detail: expiry ? `פג בתאריך ${formatHe(expiry)}` : undefined,
      needsPurchase: true,
    };
  }

  if (user && rawType === "punchCard") {
    const total = Math.max(0, Number(user.punchTotal) || 0);
    const used = countUsedPunches(user, appts);
    const remaining = Math.max(0, total - used);
    const active = remaining > 0;
    return {
      type: "punchCard", rawType, active, hidePrice: true,
      label: "כרטיסייה",
      detail: active ? `נותרו ${remaining} כניסות מתוך ${total}` : "הכרטיסייה נוצלה במלואה",
      needsPurchase: !active,
      punchUsed: used,
      punchRemaining: remaining,
    };
  }

  // one-time (or no membership)
  return {
    type: "oneTime", rawType: "oneTime", active: true, hidePrice: false,
    label: "כניסה חד-פעמית", needsPurchase: true,
  };
}

// Builds a wa.me link with a prefilled Hebrew message.
export function whatsappPurchaseLink(rawNumber: string | undefined, customerName?: string): string | null {
  const digits = (rawNumber || "").replace(/\D/g, "");
  if (!digits) return null;
  // Convert a local Israeli number (05…) to international (9725…) for wa.me.
  const intl = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  const msg = encodeURIComponent(
    `היי, אני ${customerName || ""} ואשמח לרכוש מנוי / כרטיסייה ל-Sunkissed`.trim()
  );
  return `https://wa.me/${intl}?text=${msg}`;
}

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatHe(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}
