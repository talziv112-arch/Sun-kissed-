import type { Timestamp } from "firebase/firestore";

export type MembershipType = "oneTime" | "subscription" | "punchCard";

export interface UserDoc {
  phone: string;          // normalized, also the document id
  displayName: string;
  passwordHash: string;   // salt:hash (PBKDF2)
  notes?: string;         // admin-only notes
  createdAt: number;      // epoch ms
  membershipType?: MembershipType;  // default "oneTime"
  subscriptionExpiry?: string;      // YYYY-MM-DD (subscription only)
  punchTotal?: number;              // total entries on the current card (punchCard only)
  punchIssuedDate?: string;         // YYYY-MM-DD the card was issued (entries before this don't count)
}

export interface ServiceDoc {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;          // ILS
  description?: string;
  active: boolean;
  createdAt: number;
}

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export interface AppointmentDoc {
  id: string;
  userPhone: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM (24h)
  endTime: string;        // HH:MM (24h)
  durationMinutes: number;
  status: AppointmentStatus;
  source: "client" | "admin";
  notes?: string;
  createdAt: number;
}

export interface DaySchedule {
  enabled: boolean;       // is the business open this weekday at all
  openTime: string;       // HH:MM
  closeTime: string;      // HH:MM
}

export interface BusinessSettings {
  openTime: string;       // legacy global open (kept as fallback)
  closeTime: string;      // legacy global close (kept as fallback)
  slotGranularity: number;// minutes (booking grid)
  bufferMinutes: number;  // buffer after each appointment
  maxDailyCapacity: number;
  workingDays: number[];  // legacy: 0=Sunday ... 6=Saturday (kept as fallback)
  daySchedules?: DaySchedule[]; // preferred: index 0=Sunday ... 6=Saturday, length 7
  whatsappNumber?: string;      // for "purchase subscription/punch-card" link
  instagram?: string;           // instagram username or full URL (contact footer)
  punchCardDefault?: number;    // default number of entries when issuing a card
  updatedAt: number;
}

export interface BlockedDateDoc {
  id: string;             // YYYY-MM-DD or YYYY-MM-DD_HH:MM
  date: string;           // YYYY-MM-DD
  startTime?: string;     // optional time range (whole day if absent)
  endTime?: string;
  reason?: string;
  createdAt: number;
}

export interface WaitingListDoc {
  id: string;
  userPhone: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  preferredDate: string;  // YYYY-MM-DD
  status: "waiting" | "notified" | "resolved";
  createdAt: number;
}

export interface SlotLockDoc {
  id: string;             // YYYY-MM-DD_HH:MM
  appointmentId: string;
  createdAt: Timestamp | number;
}
