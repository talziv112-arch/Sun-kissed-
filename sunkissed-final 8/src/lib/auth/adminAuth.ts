import { ADMIN_CONFIG, verifyAdminCredentials } from "@/lib/adminConfig";

export interface AdminSession {
  username: string;
  loggedInAt: number;
}

export function adminLogin(username: string, password: string): AdminSession {
  if (!verifyAdminCredentials(username, password)) {
    throw new Error("שם משתמש או סיסמה שגויים");
  }
  const session: AdminSession = { username: username.trim(), loggedInAt: Date.now() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_CONFIG.sessionKey, JSON.stringify(session));
  }
  return session;
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_CONFIG.sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function adminLogout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_CONFIG.sessionKey);
}
