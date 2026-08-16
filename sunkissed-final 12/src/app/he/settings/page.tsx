"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/services/settingsService";
import type { BusinessSettings, DaySchedule } from "@/lib/types";
import { WEEKDAYS_HE } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { (async () => { setSettings(await getSettings()); setLoading(false); })(); }, []);

  // Ensure we always have a 7-entry schedule to edit.
  const schedules: DaySchedule[] = settings.daySchedules && settings.daySchedules.length === 7
    ? settings.daySchedules
    : DEFAULT_SETTINGS.daySchedules!;

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setSettings((s) => {
      const base = (s.daySchedules && s.daySchedules.length === 7)
        ? s.daySchedules
        : DEFAULT_SETTINGS.daySchedules!;
      const next = base.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...s, daySchedules: next };
    });
  }

  async function handleSave() {
    setBusy(true); setSaved(false); setError("");
    const toSave: BusinessSettings = { ...settings, daySchedules: schedules };
    try {
      await saveSettings(toSave);
      // Keep the values the user just entered on screen (do NOT overwrite from an
      // immediate re-read — a named/Enterprise Firestore can lag read-after-write
      // and return stale data, which looks like a "revert").
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Verify persistence in the background after the write has propagated.
      setTimeout(async () => {
        try {
          const fresh = await getSettings();
          const persisted = Array.isArray(fresh.daySchedules)
            && fresh.daySchedules.some((d, i) =>
              d.openTime !== DEFAULT_SETTINGS.daySchedules![i].openTime ||
              d.closeTime !== DEFAULT_SETTINGS.daySchedules![i].closeTime ||
              d.enabled !== DEFAULT_SETTINGS.daySchedules![i].enabled);
          const triedNonDefault = toSave.daySchedules!.some((d, i) =>
            d.openTime !== DEFAULT_SETTINGS.daySchedules![i].openTime ||
            d.closeTime !== DEFAULT_SETTINGS.daySchedules![i].closeTime ||
            d.enabled !== DEFAULT_SETTINGS.daySchedules![i].enabled);
          if (triedNonDefault && !persisted) {
            setError("השמירה לא נשמרה במסד הנתונים (ככל הנראה כללי האבטחה חוסמים כתיבה). פרסמו מחדש את הכללים ב-Firestore.");
          }
        } catch { /* ignore verification errors */ }
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? `שמירה נכשלה: ${err.message}`
          : "שמירת ההגדרות נכשלה. ודאו שכללי האבטחה ב-Firestore פורסמו."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-bronze-500">טוען…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-2xl font-bold text-bronze-800">הגדרות עסק</h1>

      <div className="space-y-5">
        <Card title="שעות פעילות לכל יום">
          <p className="mb-4 text-sm text-bronze-500">
            לכל יום אפשר לקבוע אם הוא פתוח, ובאילו שעות. יום שאינו פעיל לא יוצג ללקוחות.
            לחסימת תאריך בודד (חג / חופשה) השתמשו ביומן ← "חסימת יום שלם".
          </p>
          <div className="space-y-2">
            {schedules.map((d, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 transition ${d.enabled ? "border-sand-200 bg-white" : "border-sand-100 bg-sand-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-bronze-800">יום {WEEKDAYS_HE[i]}</span>
                  <button
                    type="button"
                    onClick={() => updateDay(i, { enabled: !d.enabled })}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      d.enabled ? "bg-amber-deep text-white shadow-glow" : "border border-sand-300 bg-white text-bronze-500"
                    }`}
                  >
                    {d.enabled ? "פתוח" : "סגור"}
                  </button>
                </div>
                {d.enabled && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-bronze-500">פתיחה</span>
                      <input
                        type="time"
                        value={d.openTime}
                        onChange={(e) => updateDay(i, { openTime: e.target.value })}
                        dir="ltr"
                        className="input"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-bronze-500">סגירה</span>
                      <input
                        type="time"
                        value={d.closeTime}
                        onChange={(e) => updateDay(i, { closeTime: e.target.value })}
                        dir="ltr"
                        className="input"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="כללי הזמנה">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="מרווח משבצות (דקות)">
              <input type="number" min={5} step={5} value={settings.slotGranularity} onChange={(e) => setSettings({ ...settings, slotGranularity: Number(e.target.value) })} dir="ltr" className="input" />
            </Field>
            <Field label="זמן חיץ בין תורים (דקות)">
              <input type="number" min={0} step={5} value={settings.bufferMinutes} onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })} dir="ltr" className="input" />
            </Field>
            <Field label="תפוסה יומית מרבית">
              <input type="number" min={1} value={settings.maxDailyCapacity} onChange={(e) => setSettings({ ...settings, maxDailyCapacity: Number(e.target.value) })} dir="ltr" className="input" />
            </Field>
          </div>
        </Card>

        <Card title="פרטי קשר ורכישה">
          <div className="space-y-4">
            <Field label="מספר וואטסאפ (לרכישת מנוי/כרטיסייה ויצירת קשר)">
              <input
                value={settings.whatsappNumber ?? ""}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                dir="ltr" placeholder="05X-XXXXXXX" className="input"
              />
            </Field>
            <Field label="אינסטגרם (שם משתמש או קישור מלא)">
              <input
                value={settings.instagram ?? ""}
                onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                dir="ltr" placeholder="@sunkissed או https://instagram.com/..." className="input"
              />
            </Field>
            <Field label="מספר כניסות ברירת מחדל לכרטיסייה">
              <input
                type="number" min={1}
                value={settings.punchCardDefault ?? 12}
                onChange={(e) => setSettings({ ...settings, punchCardDefault: Number(e.target.value) })}
                dir="ltr" className="input"
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={busy} className="rounded-full bg-amber-deep px-8 py-3 font-semibold text-white shadow-glow disabled:opacity-50">
            {busy ? "שומר…" : "שמירת הגדרות"}
          </button>
          {saved && <span className="text-sm font-medium text-green-600">✓ ההגדרות נשמרו</span>}
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
        )}
      </div>

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid #EBD9BF;background:#fff;padding:0.6rem 0.9rem;color:#3A2A1A}`}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-card">
      <h2 className="mb-4 text-lg font-bold text-bronze-800">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1.5 block text-sm font-medium text-bronze-700">{label}</span>{children}</label>);
}
