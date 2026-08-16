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
  // Normalize username (remove spaces, hyphens from phone numbers)
  const normalizedInput = username.trim().replace(/[\s-]/g, "");
  
  return ADMIN_CREDENTIALS.some((admin) => {
    const normalizedAdmin = admin.username.trim().replace(/[\s-]/g, "");
    return normalizedAdmin === normalizedInput && admin.password === password;
  });
}

export function getAdminName(username: string): string {
  const normalizedInput = username.trim().replace(/[\s-]/g, "");
  const admin = ADMIN_CREDENTIALS.find((a) => {
    const normalizedAdmin = a.username.trim().replace(/[\s-]/g, "");
    return normalizedAdmin === normalizedInput;
  });
  return admin?.name || "Admin";
}
