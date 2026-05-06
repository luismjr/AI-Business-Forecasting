type Props = {
  totalRevenue: number;
  avgDailyRevenue: number;
  totalUnits: number;
  dayCount: number;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function StatCards({
  totalRevenue,
  avgDailyRevenue,
  totalUnits,
  dayCount,
}: Props) {
  const items = [
    {
      label: "7-day revenue",
      value: formatMoney(totalRevenue),
      hint: `${dayCount} days in range`,
    },
    {
      label: "Avg. daily revenue",
      value: formatMoney(avgDailyRevenue),
      hint: "Mean over included days",
    },
    {
      label: "Units sold",
      value: totalUnits.toLocaleString(),
      hint: "Sum in window",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-slate-800/80 shadow-glow rounded-2xl border bg-slate-900/40 p-5 ring-1 ring-white/5 backdrop-blur-sm transition hover:ring-emerald-500/20"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {item.label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white">
            {item.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
