// Client authentication: PHONE + PASSWORD only. No email anywhere.
// Users are stored in Firestore (doc id = normalized phone). Passwords are
// salted + PBKDF2-hashed. Session persists in localStorage.

import { getUserByPhone, createUser, updateUserPassword } from "@/lib/services/usersService";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { normalizePhone, isValidPhone } from "@/lib/utils";
import type { UserDoc } from "@/lib/types";

const SESSION_KEY = "sunkissed_client_session";

// Translates raw Firebase/Firestore errors into a clear Hebrew message so the
// real cause (e.g. database not created / rules not published) is visible to
// the user instead of a generic "something went wrong".
function describeFirebaseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("permission-denied") || /insufficient permissions/i.test(msg)) {
    return "אין הרשאת גישה למסד הנתונים. ודאו ש-Firestore נוצר ושכללי האבטחה (firestore.rules) פורסמו.";
  }
  if (code.includes("unavailable") || /offline|network/i.test(msg)) {
    return "לא ניתן להתחבר למסד הנתונים. בדקו חיבור אינטרנט ושמסד ה-Firestore קיים.";
  }
  if (code.includes("not-found") || /database.*not.*exist/i.test(msg)) {
    return "מסד הנתונים לא נמצא. צרו את Firestore בקונסולת Firebase ופרסמו את הכללים.";
  }
  return msg || "אירעה שגיאה. נסו שוב.";
}

export interface ClientSession {
  phone: string;
  displayName: string;
}

export async function registerClient(
  phone: string,
  password: string,
  displayName: string
): Promise<ClientSession> {
  if (!isValidPhone(phone)) throw new Error("מספר טלפון לא תקין");
  if (password.length < 4) throw new Error("הסיסמה חייבת להכיל לפחות 4 תווים");
  const id = normalizePhone(phone);

  let existing: UserDoc | null;
  try {
    existing = await getUserByPhone(id);
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
  if (existing) throw new Error("מספר הטלפון כבר רשום במערכת");

  const passwordHash = await hashPassword(password);
  const user: UserDoc = {
    phone: id,
    displayName: displayName.trim() || id,
    passwordHash,
    createdAt: Date.now(),
    membershipType: "oneTime",
  };
  try {
    await createUser(user);
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }

  const session: ClientSession = { phone: id, displayName: user.displayName };
  persistSession(session);
  return session;
}

export async function loginClient(phone: string, password: string): Promise<ClientSession> {
  if (!isValidPhone(phone)) throw new Error("מספר טלפון לא תקין");
  let user: UserDoc | null;
  try {
    user = await getUserByPhone(phone);
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
  if (!user) throw new Error("מספר הטלפון אינו רשום במערכת");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("סיסמה שגויה");

  const session: ClientSession = { phone: user.phone, displayName: user.displayName };
  persistSession(session);
  return session;
}

export function persistSession(session: ClientSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClientSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

// Admin-only: set a new password for a customer (e.g. when they forgot theirs).
// Returns nothing; throws a clear Hebrew error if it fails.
export async function adminResetPassword(phone: string, newPassword: string): Promise<void> {
  if (!isValidPhone(phone)) throw new Error("מספר טלפון לא תקין");
  if (newPassword.length < 4) throw new Error("הסיסמה החדשה חייבת להכיל לפחות 4 תווים");
  const id = normalizePhone(phone);

  let user: UserDoc | null;
  try {
    user = await getUserByPhone(id);
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
  if (!user) throw new Error("הלקוח אינו רשום במערכת");

  const passwordHash = await hashPassword(newPassword);
  try {
    await updateUserPassword(id, passwordHash);
  } catch (err) {
    throw new Error(describeFirebaseError(err));
  }
}
