"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type ClientSession, getSession, clearSession,
  loginClient as doLogin, registerClient as doRegister,
} from "@/lib/auth/clientAuth";

interface ClientAuthValue {
  session: ClientSession | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<ClientAuthValue | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    const s = await doLogin(phone, password);
    setSession(s);
  };
  const register = async (phone: string, password: string, name: string) => {
    const s = await doRegister(phone, password, name);
    setSession(s);
  };
  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useClientAuth(): ClientAuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}
