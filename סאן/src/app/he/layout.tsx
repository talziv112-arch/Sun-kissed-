import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AdminShell from "@/components/admin/AdminShell";

export default function HeAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
