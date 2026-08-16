// Admin configuration — supports multiple admin credentials.

export interface AdminCredentials {
  username: string;
  password: string;
  name: string;
}

export const ADMIN_CREDENTIALS: AdminCredentials[] = [
  {
    username: "0512330484",
    password: "talziv123",
    name: "מנהל ראשי",
  },
  {
    username: "0542196443",
    password: "Liza2002",
    name: "מנהלת",
  },
];

export const ADMIN_CONFIG = {
  loginRoute: "/he/login",
  dashboardRoute: "/he/dashboard",
  sessionKey: "sunkissed_admin_session",
} as const;

export function verifyAdminCredentials(username: string, password: string): boolean {
  return ADMIN_CREDENTIALS.some(
    (admin) => admin.username.trim() === username.trim() && admin.password === password
  );
}

export function getAdminName(username: string): string {
  const admin = ADMIN_CREDENTIALS.find((a) => a.username.trim() === username.trim());
  return admin?.name || "Admin";
}
