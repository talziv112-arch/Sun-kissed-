"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ADMIN_CONFIG } from "@/lib/adminConfig";
import Logo from "@/components/client/Logo";

export default function AdminLoginPage() {
  const { login, session } = useAdminAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace(ADMIN_CONFIG.dashboardRoute);
  }, [session, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      login(username, password);
      router.replace(ADMIN_CONFIG.dashboardRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהתחברות");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-sand-200 bg-white/90 p-8 shadow-card">
        <div className="mb-6 flex justify-center"><Logo height={40} priority /></div>
        <h1 className="text-center text-xl font-bold text-bronze-800">כניסת מנהל</h1>
        <p className="mt-1 text-center text-sm text-bronze-500">אזור ניהול העסק</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bronze-700">שם משתמש</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-bronze-800"
              placeholder="שם משתמש"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bronze-700">סיסמה</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-bronze-800"
              placeholder="••••••"
              required
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-amber-deep py-3.5 font-semibold text-white shadow-glow transition hover:bg-bronze-600 disabled:opacity-60"
          >
            {busy ? "מתחבר…" : "כניסה לדאשבורד"}
          </button>
        </form>
      </div>
    </div>
  );
}
