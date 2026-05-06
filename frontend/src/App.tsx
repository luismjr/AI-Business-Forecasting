import { useState } from "react";
import { StorePicker } from "@/components/dashboard/StorePicker";
import { StatCards } from "@/components/dashboard/StatCards";
import { ForecastHero } from "@/components/dashboard/ForecastHero";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { UnitsMiniChart } from "@/components/dashboard/UnitsMiniChart";
import { useStoreDashboard } from "@/hooks/useStoreDashboard";
import { describeForecastModel } from "@/lib/forecastLabels";
import { WhatIfPage } from "@/pages/WhatIfPage";

type Page = "dashboard" | "whatif";

function aggregateMetrics(days: { revenue: number; units_sold: number }[]) {
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalUnits = days.reduce((s, d) => s + d.units_sold, 0);
  const n = days.length || 1;
  const avgDailyRevenue = totalRevenue / n;
  return { totalRevenue, avgDailyRevenue, totalUnits, dayCount: days.length };
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const {
    stores,
    storeId,
    setStoreId,
    metrics,
    forecast,
    loading,
    error,
  } = useStoreDashboard();

  const days = metrics?.days ?? [];
  const { totalRevenue, avgDailyRevenue, totalUnits, dayCount } =
    aggregateMetrics(days);

  const tomorrow = forecast?.predictions?.[0];
  const tomorrowRev =
    tomorrow != null ? tomorrow.revenue : null;
  const modelCopy = describeForecastModel(forecast ?? null);

  const navBtn = (target: Page, label: string) => (
    <button
      onClick={() => setPage(target)}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
        page === target
          ? "bg-emerald-950/60 text-emerald-400 ring-1 ring-emerald-500/20"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Global nav */}
      <nav className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-surface-950/80 px-6 py-3 backdrop-blur">
        <span className="mr-4 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-500/80">
          AI Forecasting
        </span>
        {navBtn("dashboard", "Store Performance")}
        {navBtn("whatif", "What-If Report")}
      </nav>

    {page === "whatif" ? (
      <WhatIfPage />
    ) : (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 border-b border-white/5 pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/90">
            AI Business Forecasting
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Store performance
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Last seven days of revenue and units for the selected store, plus
            tomorrow&apos;s revenue from the Ridge regression forecaster (or a
            rolling-average fallback when history is short).
          </p>
        </div>
        <StorePicker
          stores={stores}
          value={storeId}
          onChange={setStoreId}
          disabled={loading && stores.length === 0}
        />
      </header>

      {error && (
        <div
          role="alert"
          className="mb-8 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-2xl bg-slate-800/50" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-800/50" />
            <div className="h-28 rounded-2xl bg-slate-800/50" />
            <div className="h-28 rounded-2xl bg-slate-800/50" />
          </div>
          <div className="h-80 rounded-2xl bg-slate-800/50" />
        </div>
      )}

      {!loading && storeId && metrics && (
        <div className="space-y-8">
          <ForecastHero
            tomorrowRevenue={tomorrowRev}
            predictionDate={tomorrow?.date ?? null}
            modelTitle={modelCopy.title}
            modelDetail={modelCopy.detail}
            trainingRows={modelCopy.trainingRows}
            technicalLabel={
              forecast
                ? `${forecast.model} · ${forecast.model_version}`
                : "—"
            }
            asOfDate={forecast?.as_of_date ?? null}
          />

          <StatCards
            totalRevenue={totalRevenue}
            avgDailyRevenue={avgDailyRevenue}
            totalUnits={totalUnits}
            dayCount={dayCount}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart days={days} />
            </div>
            <div className="lg:col-span-1">
              <UnitsMiniChart days={days} />
            </div>
          </div>

          <footer className="border-t border-white/5 pt-8 text-center text-xs text-slate-600">
            Range{" "}
            <span className="font-mono text-slate-500">
              {metrics.from} → {metrics.to}
            </span>
            {" · "}
            Store <span className="font-mono text-slate-500">{storeId}</span>
          </footer>
        </div>
      )}

      {!loading && stores.length === 0 && !error && (
        <p className="text-center text-slate-500">
          No stores returned from the API.
        </p>
      )}
    </div>
    )}
    </>
  );
}
