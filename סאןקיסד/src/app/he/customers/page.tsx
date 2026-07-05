"use client";

import { useEffect, useState } from "react";
import { searchUsersByPhone, listUsers, updateUserNotes, updateUserMembership } from "@/lib/services/usersService";
import { adminResetPassword } from "@/lib/auth/clientAuth";
import { listAppointmentsByPhone } from "@/lib/services/appointmentsService";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/services/settingsService";
import { resolveMembership } from "@/lib/membership";
import type { UserDoc, AppointmentDoc, MembershipType, BusinessSettings } from "@/lib/types";
import { formatCurrency, formatDateHe, toDateKey } from "@/lib/utils";

export default function CustomersPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<UserDoc | null>(null);
  const [history, setHistory] = useState<AppointmentDoc[]>([]);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);

  // membership editor state
  const [mType, setMType] = useState<MembershipType>("oneTime");
  const [mExpiry, setMExpiry] = useState("");
  const [mPunchTotal, setMPunchTotal] = useState(12);
  const [savingMembership, setSavingMembership] = useState(false);
  const [membershipSaved, setMembershipSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => { (async () => {
    const [u, st] = await Promise.all([listUsers(), getSettings()]);
    setUsers(u); setSettings(st); setLoading(false);
  })(); }, []);

  async function runSearch() {
    setLoading(true);
    setUsers(await searchUsersByPhone(searchTerm));
    setLoading(false);
  }

  async function openCustomer(u: UserDoc) {
    setSelected(u);
    setNotes(u.notes ?? "");
    setMType(u.membershipType ?? "oneTime");
    setMExpiry(u.subscriptionExpiry ?? "");
    setMPunchTotal(u.punchTotal ?? settings.punchCardDefault ?? 12);
    setMembershipSaved(false);
    setNewPassword("");
    setResetMsg("");
    setHistory(await listAppointmentsByPhone(u.phone));
  }

  async function saveNotes() {
    if (!selected) return;
    setSavingNotes(true);
    await updateUserNotes(selected.phone, notes);
    setSelected({ ...selected, notes });
    setUsers((prev) => prev.map((x) => (x.phone === selected.phone ? { ...x, notes } : x)));
    setSavingNotes(false);
  }

  async function saveMembership() {
    if (!selected) return;
    setSavingMembership(true);
    setMembershipSaved(false);
    const patch = {
      membershipType: mType,
      subscriptionExpiry: mType === "subscription" ? mExpiry : undefined,
      punchTotal: mType === "punchCard" ? mPunchTotal : undefined,
      // (Re)issue the card today when switching to / saving a punch card, so past
      // entries don't get counted against the new card.
      punchIssuedDate: mType === "punchCard"
        ? (selected.membershipType === "punchCard" && selected.punchIssuedDate
            ? selected.punchIssuedDate
            : toDateKey(new Date()))
        : undefined,
    };
    await updateUserMembership(selected.phone, patch);
    const updated = { ...selected, ...patch } as UserDoc;
    setSelected(updated);
    setUsers((prev) => prev.map((x) => (x.phone === selected.phone ? updated : x)));
    setSavingMembership(false);
    setMembershipSaved(true);
    setTimeout(() => setMembershipSaved(false), 2500);
  }

  function reissueCard() {
    if (!selected) return;
    setSelected({ ...selected, punchIssuedDate: toDateKey(new Date()) });
    // saved on next "save membership"
  }

  function typeLabel(t?: MembershipType): string {
    return t === "subscription" ? "מנוי" : t === "punchCard" ? "כרטיסייה" : "ללא מנוי";
  }

  // Build a ready-to-send WhatsApp reminder for a specific appointment.
  function reminderLink(a: AppointmentDoc): string {
    const digits = (selected?.phone ?? "").replace(/\D/g, "");
    const intl = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
    const name = selected?.displayName ?? "";
    const msg = `היי ${name}, תזכורת לתור שלך ב-Sunkissed ☀️\n${a.serviceName} בתאריך ${formatDateHe(a.date)} בשעה ${a.startTime}.\nנתראה!`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  }

  async function handleResetPassword() {
    if (!selected) return;
    setResetMsg("");
    setResetting(true);
    try {
      await adminResetPassword(selected.phone, newPassword);
      setResetMsg(`✓ הסיסמה אופסה. מסרו ללקוח את הסיסמה: ${newPassword}`);
      setNewPassword("");
    } catch (err) {
      setResetMsg(err instanceof Error ? err.message : "איפוס הסיסמה נכשל");
    } finally {
      setResetting(false);
    }
  }

  const membership = resolveMembership(selected, history);
  const totalSpent = history.filter((a) => a.status !== "cancelled").reduce((s, a) => s + a.price, 0);
  const completedCount = history.filter((a) => a.status !== "cancelled").length;

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-bronze-800">לקוחות</h1>

      <div className="mb-5 flex gap-2">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          dir="ltr"
          placeholder="חיפוש לפי מספר טלפון…"
          className="flex-1 rounded-xl border border-sand-200 bg-white px-4 py-3 text-bronze-800"
        />
        <button onClick={runSearch} className="rounded-xl bg-amber-deep px-6 py-3 font-semibold text-white shadow-glow hover:bg-bronze-600">חיפוש</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-sand-200 bg-white/80 shadow-card">
          {loading ? (
            <p className="p-6 text-center text-bronze-400">טוען…</p>
          ) : users.length === 0 ? (
            <p className="p-6 text-center text-bronze-400">לא נמצאו לקוחות.</p>
          ) : (
            <ul className="thin-scroll max-h-[70vh] divide-y divide-sand-100 overflow-y-auto">
              {users.map((u) => (
                <li key={u.phone}>
                  <button onClick={() => openCustomer(u)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-sand-50 ${selected?.phone === u.phone ? "bg-sand-100" : ""}`}>
                    <div>
                      <p className="font-semibold text-bronze-800">{u.displayName}</p>
                      <p className="text-sm text-bronze-500" dir="ltr">{u.phone}</p>
                    </div>
                    <span className="text-bronze-300">‹</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-card">
          {!selected ? (
            <p className="py-16 text-center text-bronze-400">בחרו לקוח לצפייה בכרטיס.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-bronze-800">{selected.displayName}</h2>
                  <p className="text-bronze-500" dir="ltr">{selected.phone}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-bronze-500">סה״כ הוצאות</p>
                  <p className="text-lg font-bold text-amber-deep">{formatCurrency(totalSpent)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-sand-50 p-3">
                  <p className="text-2xl font-bold text-bronze-800">{completedCount}</p>
                  <p className="text-xs text-bronze-500">תורים</p>
                </div>
                <div className="rounded-xl bg-sand-50 p-3">
                  <p className="text-2xl font-bold text-bronze-800">{history.filter((a) => a.status === "cancelled").length}</p>
                  <p className="text-xs text-bronze-500">ביטולים</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-sand-200 bg-sand-50 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-bronze-700">סוג מנוי</label>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${membership.hidePrice ? "bg-green-100 text-green-700" : "bg-sand-200 text-bronze-600"}`}>
                    {membership.label}{membership.detail ? ` · ${membership.detail}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs text-bronze-400">מצב שמור כעת (התווית למעלה). בחרו סוג ולחצו «שמירת מנוי».</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    { v: "oneTime", t: "ללא מנוי" },
                    { v: "subscription", t: "מנוי" },
                    { v: "punchCard", t: "כרטיסייה" },
                  ] as { v: MembershipType; t: string }[]).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setMType(opt.v)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        mType === opt.v ? "border-amber-deep bg-amber-deep text-white" : "border-sand-200 bg-white text-bronze-700"
                      }`}
                    >
                      {opt.t}
                    </button>
                  ))}
                </div>

                {mType === "subscription" && (
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs text-bronze-500">תאריך תפוגת המנוי</span>
                    <input type="date" value={mExpiry} onChange={(e) => setMExpiry(e.target.value)} dir="ltr"
                      className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-bronze-800" />
                  </label>
                )}

                {mType === "punchCard" && (
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-bronze-500">מספר כניסות בכרטיסייה</span>
                      <input type="number" min={1} value={mPunchTotal} onChange={(e) => setMPunchTotal(Number(e.target.value))} dir="ltr"
                        className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-bronze-800" />
                    </label>
                    {selected.membershipType === "punchCard" && (
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-bronze-600">
                        <span>
                          נוצלו {membership.punchUsed ?? 0} · נותרו {membership.punchRemaining ?? 0}
                          {selected.punchIssuedDate ? ` · הונפקה ${formatDateHe(selected.punchIssuedDate)}` : ""}
                        </span>
                        <button onClick={reissueCard} className="rounded-full border border-sand-300 px-3 py-1 font-medium text-bronze-700 hover:bg-sand-100">
                          חידוש כרטיסייה
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={saveMembership} disabled={savingMembership}
                    className="rounded-full bg-bronze-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {savingMembership ? "שומר…" : "שמירת מנוי"}
                  </button>
                  {membershipSaved ? (
                    <span className="text-sm font-medium text-green-600">✓ נשמר: {typeLabel(selected.membershipType)}</span>
                  ) : (
                    mType !== (selected.membershipType ?? "oneTime") && (
                      <span className="text-sm font-medium text-amber-deep">שינוי לא שמור — לחצו «שמירת מנוי»</span>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-bronze-700">הערות פנימיות</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-bronze-800"
                  placeholder="העדפות, רגישויות, מידע חשוב…" />
                <button onClick={saveNotes} disabled={savingNotes}
                  className="mt-2 rounded-full bg-bronze-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {savingNotes ? "שומר…" : "שמירת הערות"}
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-sand-200 bg-sand-50 p-4">
                <label className="text-sm font-bold text-bronze-700">איפוס סיסמה ללקוח</label>
                <p className="mt-1 text-xs text-bronze-500">
                  אם הלקוח שכח את הסיסמה — הקלידו סיסמה זמנית חדשה ומסרו לו אותה.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                    placeholder="סיסמה חדשה (לפחות 4 תווים)"
                    className="flex-1 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-bronze-800"
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting || newPassword.length < 4}
                    className="rounded-full bg-bronze-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {resetting ? "מאפס…" : "איפוס"}
                  </button>
                </div>
                {resetMsg && (
                  <p className={`mt-2 text-sm font-medium ${resetMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                    {resetMsg}
                  </p>
                )}
              </div>

              <h3 className="mt-6 mb-2 text-sm font-bold text-bronze-700">היסטוריית תורים</h3>
              {history.length === 0 ? (
                <p className="text-sm text-bronze-400">אין היסטוריה.</p>
              ) : (
                <div className="thin-scroll max-h-72 space-y-2 overflow-y-auto">
                  {history.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-sand-100 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-bronze-700">{a.serviceName}</span>
                        <span className="mx-2 text-bronze-300">·</span>
                        <span className="text-bronze-500">{formatDateHe(a.date)} {a.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status !== "cancelled" && (
                          <a
                            href={reminderLink(a)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="שליחת תזכורת בוואטסאפ"
                            className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.13c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23s-3.69 8.42-8.1 8.42zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
                            </svg>
                            תזכורת
                          </a>
                        )}
                        <span className={a.status === "cancelled" ? "text-red-500" : "text-amber-deep"}>
                          {a.status === "cancelled" ? "בוטל" : formatCurrency(a.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
