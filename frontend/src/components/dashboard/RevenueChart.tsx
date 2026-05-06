import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { date: string; revenue: number; units_sold: number };

type Props = {
  days: Row[];
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function RevenueChart({ days }: Props) {
  const data = days.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 text-sm text-slate-500">
        No daily rows in this range.
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 ring-1 ring-white/5">
      <p className="mb-4 text-sm font-medium text-slate-400">
        Revenue by day
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) =>
              typeof v === "number"
                ? `${Math.round(v / 1000)}k`
                : String(v)
            }
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#cbd5e1" }}
            formatter={(value) => {
              const n =
                typeof value === "number"
                  ? value
                  : Number(Array.isArray(value) ? value[0] : value);
              return [formatMoney(Number.isFinite(n) ? n : 0), "Revenue"];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as Row & { label: string };
              return p?.date ?? "";
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#fillRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
