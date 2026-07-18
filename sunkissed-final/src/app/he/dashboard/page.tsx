"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/admin/StatCard";
import RevenueChart from "@/components/admin/RevenueChart";
import { listAppointmentsByDate, listAppointmentsInRange } from "@/lib/services/appointmentsService";
import type { AppointmentDoc } from "@/lib/types";
import { toDateKey, formatCurrency, formatDateHe, WEEKDAYS_HE } from "@/lib/utils";

export default function DashboardPage() {
  const [today, setToday] = useState<AppointmentDoc[]>([]);
  const [week, setWeek] = useState<AppointmentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = toDateKey(new Date());

  useEffect(() => {
    (async () => {
      const start = new Date(); start.setDate(start.getDate() - 6);
      const [t, w] = await Promise.all([
        listAppointmentsByDate(todayKey),
        listAppointmentsInRange(toDateKey(start), todayKey),
      ]);
      setToday(t);
      setWeek(w.filter((a) => a.status !== "cancelled"));
      setLoading(false);
    })();
  }, [todayKey]);

  const todayRevenue = today.reduce((s, a) => s + a.price, 0);
  const weekRevenue = week.reduce((s, a) => s + a.price, 0);

  // Build last-7-days revenue series
  const series: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    const rev = week.filter((a) => a.date === key).reduce((s, a) => s + a.price, 0);
    series.push({ label: WEEKDAYS_HE[d.getDay()].slice(0, 3), value: rev });
  }

  if (loading) return <p className="text-bronze-500">טוען…</p>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-bronze-800">סקירה כללית</h1>
        <p className="text-sm text-bronze-500">{formatDateHe(todayKey)}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="הכנסות היום" value={formatCurrency(todayRevenue)} sub={`${today.length} תורים`} />
        <StatCard label="הכנסות השבוע" value={formatCurrency(weekRevenue)} sub="7 ימים אחרונים" />
        <StatCard label="תורים השבוע" value={String(week.length)} />
        <StatCard label="ממוצע לתור" value={formatCurrency(week.length ? Math.round(weekRevenue / week.length) : 0)} />
      </div>

      <section className="mt-6 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-bronze-800">הכנסות — 7 ימים אחרונים</h2>
        <RevenueChart data={series} />
      </section>

      <section className="mt-6 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-bronze-800">התורים של היום</h2>
        {today.length === 0 ? (
          <p className="py-6 text-center text-bronze-400">אין תורים מתוכננים להיום.</p>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[520px] text-right text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-bronze-500">
                  <th className="px-3 py-2 font-medium">שעה</th>
                  <th className="px-3 py-2 font-medium">טלפון</th>
                  <th className="px-3 py-2 font-medium">טיפול</th>
                  <th className="px-3 py-2 font-medium">מחיר</th>
                  <th className="px-3 py-2 font-medium">מקור</th>
                </tr>
              </thead>
              <tbody>
                {today.map((a) => (
                  <tr key={a.id} className="border-b border-sand-100">
                    <td className="px-3 py-3 font-semibold text-bronze-800" dir="ltr">{a.startTime}</td>
                    <td className="px-3 py-3 text-bronze-700" dir="ltr">{a.userPhone}</td>
                    <td className="px-3 py-3 text-bronze-700">{a.serviceName}</td>
                    <td className="px-3 py-3 text-amber-deep">{formatCurrency(a.price)}</td>
                    <td className="px-3 py-3 text-bronze-400">{a.source === "admin" ? "ידני" : "אונליין"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
