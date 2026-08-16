"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAdminAuth();
  const isLogin = pathname === "/he/login";

  useEffect(() => {
    if (!loading && !session && !isLogin) {
      router.replace("/he/login");
    }
  }, [loading, session, isLogin, router]);

  // Login screen renders bare (no sidebar, no guard).
  if (isLogin) return <>{children}</>;

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-bronze-500">
        טוען…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row-reverse">
      <AdminSidebar />
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
