import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchWhatIfOptions, runWhatIf } from "@/api/client";
import type {
  WhatIfCategoryRow,
  WhatIfOptions,
  WhatIfRequest,
  WhatIfResponse,
  WhatIfSide,
} from "@/api/types";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtUnits = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtUSD = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// ── Shared select / input class ───────────────────────────────────────────────
const selectCls =
  "w-full appearance-none rounded-xl border border-slate-700/80 bg-surface-850 px-4 py-2.5 font-mono text-sm text-emerald-100 outline-none ring-1 ring-white/5 transition hover:border-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-40";

const inputCls =
  "w-full rounded-xl border border-slate-700/80 bg-surface-850 px-4 py-2.5 font-mono text-sm text-emerald-100 outline-none ring-1 ring-white/5 transition hover:border-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-40";

// ── Sub-components ────────────────────────────────────────────────────────────
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-medium text-slate-500">{children}</p>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/5" />
      <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}

function DeltaBadge({ value, pct }: { value: number; pct: number }) {
  const up = pct > 0.05;
  const dn = pct < -0.05;
  const cls = up
    ? "bg-emerald-950/60 text-emerald-400 ring-emerald-500/20"
    : dn
      ? "bg-rose-950/60 text-rose-400 ring-rose-500/20"
      : "bg-slate-800/60 text-slate-400 ring-white/5";
  const arrow = up ? "▲" : dn ? "▼" : "—";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      {arrow} {fmtPct(pct)}
      {value !== 0 && (
        <span className="opacity-70">({value >= 0 ? "+" : ""}{fmtUnits(value)} units)</span>
      )}
    </span>
  );
}

function CompareRow({
  label,
  baseline,
  scenario,
}: {
  label: string;
  baseline: React.ReactNode;
  scenario: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t border-white/5 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-300">{baseline}</span>
      <span className="font-mono font-semibold text-white">{scenario}</span>
    </div>
  );
}

function CompareSection({ b, s }: { b: WhatIfSide; s: WhatIfSide }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 ring-1 ring-white/5">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">Field</span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Baseline (hist.)</span>
        <span className="text-xs font-medium uppercase tracking-wider text-emerald-500/80">Your scenario</span>
      </div>
      <CompareRow label="Total units sold"     baseline={fmtUnits(b.total_units_sold)}      scenario={fmtUnits(s.total_units_sold)} />
      <CompareRow label="Total revenue"       baseline={fmtUSD(b.total_revenue)}            scenario={fmtUSD(s.total_revenue)} />
      <CompareRow label="Price"               baseline={fmtUSD(b.avg_price)}                scenario={fmtUSD(s.avg_price)} />
      <CompareRow label="Discount"            baseline={`${b.avg_discount}%`}               scenario={`${s.avg_discount}%`} />
      <CompareRow label="Competitor price"    baseline={fmtUSD(b.avg_competitor_pricing)}   scenario={fmtUSD(s.avg_competitor_pricing)} />
      <CompareRow label="Weather"             baseline={b.weather}                          scenario={s.weather} />
      <CompareRow label="Season"              baseline={b.seasonality}                      scenario={s.seasonality} />
      <CompareRow label="Holiday / promo"     baseline={b.holiday ? "Yes" : "No"}           scenario={s.holiday ? "Yes" : "No"} />
    </div>
  );
}

function CategoryBreakdown({ rows }: { rows: WhatIfCategoryRow[] }) {
  const chartData = rows.map((r) => ({
    name: r.category,
    Baseline: r.baseline_revenue,
    Scenario: r.scenario_revenue,
  }));

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 ring-1 ring-white/5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">
        Category Breakdown
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 8 }}
          />
          <Bar dataKey="Baseline" fill="#334155" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Scenario" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            {["Category", "Baseline revenue", "Scenario revenue", "Revenue Δ", "Revenue Δ %"].map((h) => (
              <th
                key={h}
                className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const up = r.revenue_delta_pct > 0.05;
            const dn = r.revenue_delta_pct < -0.05;
            const pillCls = up
              ? "bg-emerald-950/60 text-emerald-400 ring-1 ring-emerald-500/20"
              : dn
                ? "bg-rose-950/60 text-rose-400 ring-1 ring-rose-500/20"
                : "bg-slate-800/60 text-slate-400 ring-1 ring-white/5";
            return (
              <tr key={r.category} className="border-t border-white/5">
                <td className="py-2.5 text-slate-300">{r.category}</td>
                <td className="py-2.5 font-mono text-slate-400">{fmtUSD(r.baseline_revenue)}</td>
                <td className="py-2.5 font-mono font-semibold text-white">{fmtUSD(r.scenario_revenue)}</td>
                <td className="py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillCls}`}>
                    {r.revenue_delta >= 0 ? "+" : ""}{fmtUSD(r.revenue_delta)}
                  </span>
                </td>
                <td className="py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillCls}`}>
                    {r.revenue_delta_pct >= 0 ? "▲" : "▼"} {Math.abs(r.revenue_delta_pct).toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function WhatIfPage() {
  const [options, setOptions] = useState<WhatIfOptions | null>(null);
  const [optErr, setOptErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    store_id: "All",
    category: "All",
    weather_condition: "",
    seasonality: "",
    holiday_promotion: 0,
    price: "",
    discount: "",
    competitor_pricing: "",
  });

  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    fetchWhatIfOptions()
      .then((o) => {
        setOptions(o);
        setForm((f) => ({
          ...f,
          weather_condition: o.weather_conditions[0] ?? "",
          seasonality: o.seasonalities[0] ?? "",
          price: String(o.avg_price),
          discount: String(o.avg_discount),
          competitor_pricing: String(o.avg_competitor_pricing),
        }));
      })
      .catch((e: Error) => setOptErr(e.message));
  }, []);

  function set(key: string, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setSubmitErr(null);
    setLoading(true);
    try {
      const payload: WhatIfRequest = {
        store_id: form.store_id,
        category: form.category,
        weather_condition: form.weather_condition,
        seasonality: form.seasonality,
        holiday_promotion: form.holiday_promotion,
        price: parseFloat(form.price),
        discount: parseFloat(form.discount),
        competitor_pricing: parseFloat(form.competitor_pricing),
      };
      const res = await runWhatIf(payload);
      setResult(res);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10 border-b border-white/5 pb-10">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/90">
          AI Business Forecasting
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What-If Report
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Configure a scenario and the Random Forest model predicts how sales
          and revenue shift versus the historical baseline.
        </p>
      </header>

      {optErr && (
        <div className="mb-8 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {optErr} — make sure the backend is running.
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
        {/* ── Input panel ── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 ring-1 ring-white/5">
            <p className="mb-5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Scenario Inputs
            </p>

            {/* Scope */}
            <div className="space-y-3">
              <div>
                <Label>Store</Label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.store_id}
                    onChange={(e) => set("store_id", e.target.value)}
                    disabled={!options}
                  >
                    {(options?.store_ids ?? ["All"]).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    disabled={!options}
                  >
                    {(options?.categories ?? ["All"]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                </div>
              </div>
            </div>

            <SectionDivider label="Conditions" />

            <div className="space-y-3">
              <div>
                <Label>Weather</Label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.weather_condition}
                    onChange={(e) => set("weather_condition", e.target.value)}
                    disabled={!options}
                  >
                    {(options?.weather_conditions ?? []).map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                </div>
              </div>
              <div>
                <Label>Season</Label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.seasonality}
                    onChange={(e) => set("seasonality", e.target.value)}
                    disabled={!options}
                  >
                    {(options?.seasonalities ?? []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
                </div>
              </div>
              <div>
                <Label>Holiday / Promotion</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set("holiday_promotion", form.holiday_promotion ? 0 : 1)}
                    className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors ${
                      form.holiday_promotion ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.holiday_promotion ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-400">
                    {form.holiday_promotion ? "Active" : "Off"}
                  </span>
                </div>
              </div>
            </div>

            <SectionDivider label="Pricing" />

            <div className="space-y-3">
              <div>
                <Label>Your Price ($)</Label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  disabled={!options}
                />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={inputCls}
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                  disabled={!options}
                />
              </div>
              <div>
                <Label>Competitor Price ($)</Label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={form.competitor_pricing}
                  onChange={(e) => set("competitor_pricing", e.target.value)}
                  disabled={!options}
                />
              </div>
            </div>

            {submitErr && (
              <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {submitErr}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !options}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Run Analysis"}
            </button>
          </div>
        </div>

        {/* ── Results panel ── */}
        <div>
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/20 py-24 text-center ring-1 ring-white/5">
              <p className="text-4xl">📊</p>
              <p className="mt-4 text-base font-semibold text-slate-300">No scenario run yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Configure inputs on the left and click <span className="text-emerald-400">Run Analysis</span>.
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 rounded-2xl bg-slate-800/50" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 rounded-2xl bg-slate-800/50" />
                <div className="h-24 rounded-2xl bg-slate-800/50" />
                <div className="h-24 rounded-2xl bg-slate-800/50" />
              </div>
              <div className="h-48 rounded-2xl bg-slate-800/50" />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {/* Meta */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span>Store: <span className="font-mono text-slate-300">{result.meta.store_id}</span></span>
                <span>Category: <span className="font-mono text-slate-300">{result.meta.category}</span></span>
                <span>Combinations analyzed: <span className="font-mono text-slate-300">{result.meta.combinations_analyzed}</span></span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Predicted Units",
                    value: fmtUnits(result.scenario.total_units_sold),
                    delta: result.delta.units_sold_pct,
                    raw: result.delta.units_sold,
                  },
                  {
                    label: "Total Predicted Revenue",
                    value: fmtUSD(result.scenario.total_revenue),
                    delta: result.delta.revenue_pct,
                    raw: result.delta.revenue,
                  },
                  {
                    label: "Baseline Revenue",
                    value: fmtUSD(result.baseline.total_revenue),
                    delta: 0,
                    raw: 0,
                    neutral: true,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 ring-1 ring-white/5"
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white">
                      {card.value}
                    </p>
                    {!card.neutral && (
                      <div className="mt-2">
                        <DeltaBadge value={card.raw} pct={card.delta} />
                      </div>
                    )}
                    {card.neutral && (
                      <p className="mt-2 text-xs text-slate-600">Historical total</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Comparison */}
              <CompareSection b={result.baseline} s={result.scenario} />

              {/* Category breakdown */}
              {result.category_breakdown.length > 1 && (
                <CategoryBreakdown rows={result.category_breakdown} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
