"use client";

import { useEffect, useState } from "react";
import {
  listServices, createService, updateService, deleteService,
} from "@/lib/services/servicesService";
import type { ServiceDoc } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const EMPTY = { name: "", durationMinutes: 30, price: 0, description: "", active: true };

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceDoc | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() { setServices(await listServices()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(s: ServiceDoc) {
    setEditing(s);
    setForm({ name: s.name, durationMinutes: s.durationMinutes, price: s.price, description: s.description ?? "", active: s.active });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    if (editing) {
      await updateService(editing.id, { ...form });
    } else {
      await createService({ ...form });
    }
    setShowForm(false);
    setBusy(false);
    await load();
  }

  async function remove(s: ServiceDoc) {
    if (!confirm(`למחוק את "${s.name}"?`)) return;
    await deleteService(s.id);
    await load();
  }

  async function toggleActive(s: ServiceDoc) {
    await updateService(s.id, { active: !s.active });
    await load();
  }

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-bronze-800">שירותים</h1>
        <button onClick={openNew} className="rounded-full bg-amber-deep px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-bronze-600">+ שירות חדש</button>
      </header>

      {loading ? (
        <p className="text-bronze-500">טוען…</p>
      ) : services.length === 0 ? (
        <p className="rounded-2xl border border-sand-200 bg-white/60 p-8 text-center text-bronze-400">אין שירותים. הוסיפו את הראשון.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <div key={s.id} className={`rounded-2xl border bg-white/80 p-4 shadow-card ${s.active ? "border-sand-200" : "border-sand-100 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-bronze-800">{s.name}</h3>
                  <p className="text-sm text-bronze-500">{s.durationMinutes} דקות</p>
                  {s.description && <p className="mt-1 text-xs text-bronze-400">{s.description}</p>}
                </div>
                <span className="font-bold text-amber-deep">{formatCurrency(s.price)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => openEdit(s)} className="rounded-full border border-sand-300 px-4 py-1.5 text-sm text-bronze-700 hover:bg-sand-100">עריכה</button>
                <button onClick={() => toggleActive(s)} className="rounded-full border border-sand-300 px-4 py-1.5 text-sm text-bronze-700 hover:bg-sand-100">
                  {s.active ? "השבתה" : "הפעלה"}
                </button>
                <button onClick={() => remove(s)} className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50">מחיקה</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-bronze-800">{editing ? "עריכת שירות" : "שירות חדש"}</h2>
            <div className="mt-4 space-y-3">
              <Labeled label="שם השירות">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-sand-200 px-3 py-2.5" placeholder="לדוגמה: שיזוף מהיר" />
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="משך (דקות)">
                  <input type="number" min={5} step={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} dir="ltr" className="w-full rounded-xl border border-sand-200 px-3 py-2.5" />
                </Labeled>
                <Labeled label="מחיר (₪)">
                  <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} dir="ltr" className="w-full rounded-xl border border-sand-200 px-3 py-2.5" />
                </Labeled>
              </div>
              <Labeled label="תיאור (אופציונלי)">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-sand-200 px-3 py-2.5" />
              </Labeled>
              <label className="flex items-center gap-2 text-sm text-bronze-700">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                שירות פעיל (מוצג ללקוחות)
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={save} disabled={busy} className="flex-1 rounded-full bg-amber-deep py-3 font-semibold text-white shadow-glow disabled:opacity-50">{busy ? "שומר…" : "שמירה"}</button>
              <button onClick={() => setShowForm(false)} className="rounded-full border border-sand-300 px-6 py-3 font-medium text-bronze-700">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-sm text-bronze-600">{label}</span>{children}</label>);
}
