export default function StatCard({
  label, value, sub,
}: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-card">
      <p className="text-sm text-bronze-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-bronze-800">{value}</p>
      {sub && <p className="mt-1 text-xs text-bronze-400">{sub}</p>}
    </div>
  );
}
