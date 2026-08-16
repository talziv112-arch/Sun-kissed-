"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/client/Navbar";
import { useClientAuth } from "@/contexts/ClientAuthContext";

type Mode = "login" | "register";

export default function ClientLoginPage() {
  const { login, register } = useClientAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(phone, password);
      } else {
        await register(phone, password, name);
      }
      router.push("/booking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col px-5 py-12">
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-7 shadow-card">
          <h1 className="text-2xl font-bold text-bronze-800">
            {mode === "login" ? "כניסה לחשבון" : "פתיחת חשבון"}
          </h1>
          <p className="mt-1 text-sm text-bronze-500">
            הזדהות באמצעות מספר טלפון וסיסמה בלבד.
          </p>

          {/* mode toggle */}
          <div className="mt-5 grid grid-cols-2 rounded-full bg-sand-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`rounded-full py-2 transition ${mode === "login" ? "bg-white text-bronze-800 shadow" : "text-bronze-500"}`}
            >
              כניסה
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`rounded-full py-2 transition ${mode === "register" ? "bg-white text-bronze-800 shadow" : "text-bronze-500"}`}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label="שם מלא">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="ישראל ישראלי"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="מספר טלפון">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="05X-XXXXXXX"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                required
              />
            </Field>
            <Field label="סיסמה">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </Field>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-amber-deep py-3.5 text-base font-semibold text-white shadow-glow transition hover:bg-bronze-600 disabled:opacity-60"
            >
              {busy ? "רגע..." : mode === "login" ? "כניסה" : "יצירת חשבון"}
            </button>

            {mode === "login" && (
              <p className="pt-1 text-center text-xs text-bronze-400">
                שכחת סיסמה? פנה אלינו ונאפס לך אותה.
              </p>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #EBD9BF;
          background: #fff;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          color: #3A2A1A;
        }
        .input::placeholder { color: #B0742F88; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-bronze-700">{label}</span>
      {children}
    </label>
  );
}
