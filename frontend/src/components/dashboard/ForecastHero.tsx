type Props = {
  tomorrowRevenue: number | null;
  predictionDate: string | null;
  modelTitle: string;
  modelDetail: string;
  /** Ridge training set size when available. */
  trainingRows: number | undefined;
  technicalLabel: string;
  asOfDate: string | null;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ForecastHero({
  tomorrowRevenue,
  predictionDate,
  modelTitle,
  modelDetail,
  trainingRows,
  technicalLabel,
  asOfDate,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-950 p-6 ring-1 ring-emerald-500/10 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
          Predicted revenue · tomorrow
        </p>
        <p className="mt-3 font-mono text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {tomorrowRevenue != null ? (
            formatMoney(tomorrowRevenue)
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </p>
        {predictionDate && (
          <p className="mt-2 font-mono text-sm text-slate-400">
            Target date: {predictionDate}
          </p>
        )}

        <div className="mt-6 rounded-xl border border-white/5 bg-black/20 p-4 text-sm">
          <p className="font-medium text-emerald-100/95">{modelTitle}</p>
          <p className="mt-2 leading-relaxed text-slate-400">{modelDetail}</p>
          {trainingRows != null && trainingRows > 0 && (
            <p className="mt-3 font-mono text-xs text-slate-500">
              Training days (supervised rows):{" "}
              <span className="text-slate-300">{trainingRows}</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5 pt-4 text-xs text-slate-500">
          <span>
            API:{" "}
            <span className="font-mono text-slate-400">{technicalLabel}</span>
          </span>
          {asOfDate && (
            <span>
              Last observed day:{" "}
              <span className="font-mono text-slate-400">{asOfDate}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
