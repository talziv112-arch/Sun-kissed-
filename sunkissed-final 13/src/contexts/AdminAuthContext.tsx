"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AdminSession {
  username: string;
  name: string;
  loggedInAt: number;
}

interface AdminAuthValue {
  session: AdminSession | null;
  loading: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
}

const Ctx = createContext<AdminAuthValue | undefined>(undefined);
const SESSION_KEY = "sunkissed_admin_session";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse session:", e);
    }
    setLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    // Admin 1
    if (username === "0512330484" && password === "talziv123") {
      const s: AdminSession = {
        username: "0512330484",
        name: "מנהל ראשי",
        loggedInAt: Date.now(),
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }
      setSession(s);
      return;
    }

    // Admin 2
    if (username === "0542196443" && password === "Liza2002") {
      const s: AdminSession = {
        username: "0542196443",
        name: "ליזה",
        loggedInAt: Date.now(),
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }
      setSession(s);
      return;
    }

    throw new Error("שם משתמש או סיסמה שגויים");
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ session, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
