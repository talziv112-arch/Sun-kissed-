"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import { useClientAuth } from "@/contexts/ClientAuthContext";

export default function Navbar() {
  const { session, logout } = useClientAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-sand-50/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" aria-label="Sunkissed" className="flex items-center">
          <Logo height={34} priority />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <>
              <Link
                href="/my-appointments"
                className="rounded-full px-3 py-2 text-sm font-medium text-bronze-700 transition hover:bg-sand-100"
              >
                התורים שלי
              </Link>
              <Link
                href="/booking"
                className="rounded-full bg-amber-deep px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-bronze-600"
              >
                הזמנת תור
              </Link>
              <button
                onClick={() => { logout(); router.push("/"); }}
                className="rounded-full px-3 py-2 text-sm font-medium text-bronze-600 transition hover:bg-sand-100"
              >
                התנתקות
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-medium text-bronze-700 transition hover:bg-sand-100"
              >
                כניסה
              </Link>
              <Link
                href="/booking"
                className="rounded-full bg-amber-deep px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-bronze-600"
              >
                הזמנת תור
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
