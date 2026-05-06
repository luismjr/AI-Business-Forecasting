import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { date: string; units_sold: number };

type Props = {
  days: Row[];
};

export function UnitsMiniChart({ days }: Props) {
  const data = days.map((d) => ({
    units_sold: d.units_sold,
    label: d.date.slice(5),
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-56 w-full rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 ring-1 ring-white/5">
      <p className="mb-3 text-sm font-medium text-slate-400">Units sold by day</p>
      <ResponsiveContainer width="100%" height="82%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              fontSize: "13px",
            }}
            formatter={(value) => {
              const n =
                typeof value === "number"
                  ? value
                  : Number(Array.isArray(value) ? value[0] : value);
              return [
                (Number.isFinite(n) ? n : 0).toLocaleString(),
                "Units",
              ];
            }}
          />
          <Bar dataKey="units_sold" fill="#64748b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
