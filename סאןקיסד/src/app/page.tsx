import Link from "next/link";
import Navbar from "@/components/client/Navbar";
import Logo from "@/components/client/Logo";
import ContactFooter from "@/components/client/ContactFooter";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="sun-glow pointer-events-none absolute inset-x-0 -top-24 mx-auto h-[520px] max-w-3xl" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-20 pt-14 text-center sm:pt-20">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-bronze-600">
            סטודיו שיזוף פרימיום
          </span>

          <Logo height={120} priority className="mx-auto" />

          <h1 className="mt-10 max-w-2xl text-2xl font-bold leading-snug text-bronze-800 sm:text-4xl">
            שיזוף מושלם, בלי לחכות.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-bronze-600 sm:text-lg">
            בחרו טיפול, בחרו שעה, וקבלו אישור מיידי. ניהול תורים חכם שמתאים את עצמו אליכם —
            פשוט, מהיר ובלי טלפונים.
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/booking"
              className="w-full rounded-full bg-amber-deep px-8 py-4 text-center text-base font-semibold text-white shadow-glow transition hover:bg-bronze-600 sm:w-auto"
            >
              הזמנת תור
            </Link>
            <Link
              href="/login"
              className="w-full rounded-full border border-sand-300 bg-white/70 px-8 py-4 text-center text-base font-semibold text-bronze-700 transition hover:bg-white sm:w-auto"
            >
              כניסה לחשבון
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "זמינות בזמן אמת", d: "רואים בדיוק אילו שעות פנויות, ללא כפל הזמנות." },
            { t: "אישור מיידי", d: "התור נשמר ברגע האישור, עם תזכורת מסודרת." },
            { t: "ניהול עצמאי", d: "צפייה, ביטול ושינוי תורים מתי שנוח לכם." },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-sand-200 bg-white/70 p-6 shadow-card"
            >
              <h3 className="text-lg font-bold text-bronze-800">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bronze-600">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <ContactFooter />
      <div className="pb-8 text-center">
        <Link href="/he/login" className="text-xs text-bronze-400 underline-offset-2 hover:underline">
          כניסת מנהל
        </Link>
      </div>
    </main>
  );
}
