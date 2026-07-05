// Admin configuration.
//
// SECURITY NOTE: Hardcoded admin credentials live in client-shipped code and
// are therefore readable by anyone who inspects the bundle. They are placed
// here per the explicit project requirement to allow immediate dashboard
// access on first deploy. For real production hardening, move admin auth to
// Firebase Authentication custom claims + Firestore rules and remove these.

export const ADMIN_CONFIG = {
  username: "0512330484",
  password: "talziv123",
  loginRoute: "/he/login",
  dashboardRoute: "/he/dashboard",
  sessionKey: "sunkissed_admin_session",
} as const;

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username.trim() === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password;
}
