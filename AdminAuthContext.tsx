"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type AdminSession, getAdminSession, adminLogin as doLogin, adminLogout as doLogout,
} from "@/lib/auth/adminAuth";

interface AdminAuthValue {
  session: AdminSession | null;
  loading: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
}

const Ctx = createContext<AdminAuthValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getAdminSession());
    setLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    const s = doLogin(username, password);
    setSession(s);
  };
  const logout = () => {
    doLogout();
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ session, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
