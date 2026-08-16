import {
  collection, doc, getDoc, getDocs, query, where, runTransaction, updateDoc, documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppointmentDoc } from "@/lib/types";
import { occupiedCells, addMinutesToTime, normalizePhone, formatDateHe } from "@/lib/utils";
import { notifyNewAppointment, notifyCancelledAppointment, notifyRescheduledAppointment } from "@/lib/services/telegramService";

const COL = "appointments";
const LOCK_COL = "slotLocks";

export class SlotConflictError extends Error {
  constructor() {
    super("המשבצת שנבחרה כבר נתפסה. אנא בחרו שעה אחרת.");
    this.name = "SlotConflictError";
  }
}

function genId(): string {
  return `apt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CreateInput {
  userPhone: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:MM
  durationMinutes: number;
  granularity: number;   // slot grid size in minutes
  bufferMinutes?: number;
  source: "client" | "admin";
  notes?: string;
}

/**
 * Atomically reserves a slot. We compute every grid cell the appointment (plus
 * buffer) occupies and create a lock document per cell inside a single
 * Firestore transaction. If any lock already exists, the transaction aborts —
 * this is the authoritative double-booking guard. The appointment document is
 * written in the same transaction so locks and appointments never diverge.
 */
export async function createAppointment(input: CreateInput): Promise<AppointmentDoc> {
  const phone = normalizePhone(input.userPhone);
  const totalDuration = input.durationMinutes + (input.bufferMinutes ?? 0);
  const cells = occupiedCells(input.startTime, totalDuration, input.granularity);
  const endTime = addMinutesToTime(input.startTime, input.durationMinutes);
  const apptId = genId();

  const appointment: AppointmentDoc = {
    id: apptId,
    userPhone: phone,
    userName: input.userName,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    price: input.price,
    date: input.date,
    startTime: input.startTime,
    endTime,
    durationMinutes: input.durationMinutes,
    status: "booked",
    source: input.source,
    notes: input.notes ?? "",
    createdAt: Date.now(),
  };

  await runTransaction(db, async (tx) => {
    const lockRefs = cells.map((c) => doc(db, LOCK_COL, `${input.date}_${c}`));
    // 1) Read phase — all reads must precede writes in a transaction.
    const lockSnaps = await Promise.all(lockRefs.map((ref) => tx.get(ref)));
    for (const snap of lockSnaps) {
      if (snap.exists()) throw new SlotConflictError();
    }
    // 2) Write phase — create locks + the appointment atomically.
    lockRefs.forEach((ref) => {
      tx.set(ref, { id: ref.id, appointmentId: apptId, createdAt: Date.now() });
    });
    tx.set(doc(db, COL, apptId), appointment);
  });

  // Notify admin on Telegram
  await notifyNewAppointment(
    appointment.userPhone,
    appointment.userName,
    appointment.serviceName,
    formatDateHe(appointment.date),
    appointment.startTime
  );

  return appointment;
}

/** Releases the slot locks for an appointment and marks it cancelled. */
export async function cancelAppointment(
  apptId: string,
  granularity: number,
  bufferMinutes = 0
): Promise<void> {
  // Read appointment first so we can notify (queries outside transaction)
  const apptRef = doc(db, COL, apptId);
  const snap = await getDoc(apptRef);
  const appt = snap.exists() ? (snap.data() as AppointmentDoc) : null;

  await runTransaction(db, async (tx) => {
    const txSnap = await tx.get(apptRef);
    if (!txSnap.exists()) return;
    const txAppt = txSnap.data() as AppointmentDoc;
    const cells = occupiedCells(
      txAppt.startTime,
      txAppt.durationMinutes + bufferMinutes,
      granularity
    );
    cells.forEach((c) => tx.delete(doc(db, LOCK_COL, `${txAppt.date}_${c}`)));
    tx.update(apptRef, { status: "cancelled" });
  });

  // Notify admin on Telegram
  if (appt) {
    await notifyCancelledAppointment(
      appt.userName,
      appt.serviceName,
      formatDateHe(appt.date),
      appt.startTime
    );
  }
}

export async function rescheduleAppointment(
  apptId: string,
  newDate: string,
  newStart: string,
  granularity: number,
  bufferMinutes = 0
): Promise<void> {
  // Read appointment first for notification
  const apptRef = doc(db, COL, apptId);
  const preTxSnap = await getDoc(apptRef);
  const oldAppt = preTxSnap.exists() ? (preTxSnap.data() as AppointmentDoc) : null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef);
    if (!snap.exists()) throw new Error("התור לא נמצא");
    const appt = snap.data() as AppointmentDoc;

    const oldCells = occupiedCells(appt.startTime, appt.durationMinutes + bufferMinutes, granularity);
    const newCells = occupiedCells(newStart, appt.durationMinutes + bufferMinutes, granularity);
    const newRefs = newCells.map((c) => doc(db, LOCK_COL, `${newDate}_${c}`));

    // Read all new locks first.
    const newSnaps = await Promise.all(newRefs.map((ref) => tx.get(ref)));
    newSnaps.forEach((s) => {
      // Allow re-taking a cell that belongs to this very appointment.
      if (s.exists() && (s.data() as { appointmentId?: string }).appointmentId !== apptId) {
        throw new SlotConflictError();
      }
    });

    // Release old locks, then set new ones.
    oldCells.forEach((c) => tx.delete(doc(db, LOCK_COL, `${appt.date}_${c}`)));
    newRefs.forEach((ref) => tx.set(ref, { id: ref.id, appointmentId: apptId, createdAt: Date.now() }));
    tx.update(apptRef, {
      date: newDate,
      startTime: newStart,
      endTime: addMinutesToTime(newStart, appt.durationMinutes),
    });
  });

  // Notify admin on Telegram
  if (oldAppt) {
    await notifyRescheduledAppointment(
      oldAppt.userName,
      oldAppt.serviceName,
      formatDateHe(oldAppt.date),
      oldAppt.startTime,
      formatDateHe(newDate),
      newStart
    );
  }
}

export async function getAppointment(id: string): Promise<AppointmentDoc | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? (snap.data() as AppointmentDoc) : null;
}

export async function listAppointmentsByDate(date: string): Promise<AppointmentDoc[]> {
  const q = query(collection(db, COL), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as AppointmentDoc)
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function listAppointmentsInRange(startDate: string, endDate: string): Promise<AppointmentDoc[]> {
  const q = query(
    collection(db, COL),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as AppointmentDoc)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function listAppointmentsByPhone(phone: string): Promise<AppointmentDoc[]> {
  const id = normalizePhone(phone);
  const q = query(collection(db, COL), where("userPhone", "==", id));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as AppointmentDoc)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

export async function markCompleted(apptId: string): Promise<void> {
  await updateDoc(doc(db, COL, apptId), { status: "completed" });
}

/** Returns the set of occupied start cells for a date (for the slot picker). */
export async function getOccupiedCells(date: string): Promise<Set<string>> {
  // Range query on the document id (`YYYY-MM-DD_HH:MM`) restricted to this date.
  const q = query(
    collection(db, LOCK_COL),
    where(documentId(), ">=", `${date}_`),
    where(documentId(), "<=", `${date}_\uf8ff`)
  );
  const snap = await getDocs(q);
  const set = new Set<string>();
  snap.docs.forEach((d) => {
    const id = d.id; // YYYY-MM-DD_HH:MM
    set.add(id.slice(date.length + 1));
  });
  return set;
}
