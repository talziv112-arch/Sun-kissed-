"use client";

// Lightweight dependency-free SVG bar chart (RTL-aware ordering).
export default function RevenueChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 560, H = 220, pad = 30, barGap = 14;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label="הכנסות שבועיות">
        {/* baseline */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#EBD9BF" strokeWidth="1" />
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          // RTL: first item on the right
          const x = W - pad - barW - i * (barW + barGap);
          const y = H - pad - h;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={h} rx="6" fill="#C9732B" opacity="0.9" />
              <text x={x + barW / 2} y={H - pad + 16} textAnchor="middle" fontSize="11" fill="#925C1E">
                {d.label}
              </text>
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#6E4416">
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
