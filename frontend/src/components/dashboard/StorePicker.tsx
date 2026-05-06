type Props = {
  stores: { id: string }[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function StorePicker({ stores, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <label
        htmlFor="store-select"
        className="text-sm font-medium text-slate-400"
      >
        Store
      </label>
      <div className="relative max-w-md flex-1">
        <select
          id="store-select"
          value={value ?? ""}
          disabled={disabled || stores.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="focus-visible:ring-emerald-500/40 w-full cursor-pointer appearance-none rounded-xl border border-slate-700/80 bg-surface-850 py-3 pl-4 pr-10 font-mono text-sm text-emerald-100 outline-none ring-1 ring-white/5 transition hover:border-slate-600 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stores.length === 0 ? (
            <option value="">No stores</option>
          ) : (
            stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))
          )}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          ▾
        </span>
      </div>
    </div>
  );
}
