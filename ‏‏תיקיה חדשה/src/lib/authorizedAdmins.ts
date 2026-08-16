// List of phone numbers authorized to access admin dashboard.
// Add new admins here.

export const AUTHORIZED_ADMIN_PHONES = [
  "0512330484", // Primary admin
  "0542196443", // Secondary admin
];

export function isAuthorizedAdmin(phone: string): boolean {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  return AUTHORIZED_ADMIN_PHONES.some((adm) => adm.replace(/\D/g, "").slice(-10) === normalized);
}
