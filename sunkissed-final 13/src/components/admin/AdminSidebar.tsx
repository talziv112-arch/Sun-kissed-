"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import Logo from "@/components/client/Logo";

const NAV = [
  { href: "/he/dashboard", label: "סקירה כללית", icon: "▣" },
  { href: "/he/calendar", label: "יומן", icon: "▦" },
  { href: "/he/customers", label: "לקוחות", icon: "☺" },
  { href: "/he/services", label: "שירותים", icon: "✶" },
  { href: "/he/settings", label: "הגדרות", icon: "⚙" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, session } = useAdminAuth();

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-sand-200 bg-white/70 md:h-screen md:w-60 md:sticky md:top-0">
      <div className="flex items-center justify-between border-b border-sand-200 px-4 py-5">
        <Logo height={30} />
        <button
          onClick={() => { logout(); router.push("/he/login"); }}
          className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-200"
          title="התנתקות"
        >
          🚪
        </button>
      </div>
      
      {session && (
        <div className="border-b border-sand-200 px-4 py-3 text-xs text-bronze-500">
          <p className="font-medium text-bronze-700">מחובר כ:</p>
          <p className="text-bronze-600">{session.name || session.username}</p>
        </div>
      )}

      <nav className="flex flex-row gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active ? "bg-amber-deep text-white shadow-glow" : "text-bronze-700 hover:bg-sand-100"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => { logout(); router.push("/he/login"); }}
        className="m-3 mt-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
      >
        🚪 התנתקות
      </button>
    </aside>
  );
}
