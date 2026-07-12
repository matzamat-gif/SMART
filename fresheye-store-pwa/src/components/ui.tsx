import { C } from '../lib/brand';

export function Kpi({ label, value, dark, accent, small }: { label: string; value: string | number; dark?: boolean; accent?: string; small?: boolean }) {
  if (dark) {
    return (
      <div className="rounded-2xl p-4 text-white" style={{ background: C.green }}>
        <p className="text-xs" style={{ color: C.leaf }}>{label}</p>
        <p className="text-2xl font-extrabold mt-1">{value}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-stone-400 text-xs">{label}</p>
      <p className={`${small ? 'text-lg' : 'text-2xl'} font-extrabold mt-1`} style={{ color: accent || C.green }}>{value}</p>
    </div>
  );
}

export function NumField({ label, value, onChange, wide }: { label: string; value: number; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[11px] text-stone-400 mb-1">{label}</p>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-stone-50 border rounded-lg px-2 py-1.5 text-sm outline-none"
        style={{ borderColor: C.line }}
      />
    </div>
  );
}

export function BranchChips({ items, selected, onToggle, onAll, allLabel = 'כל הסניפים' }: {
  items: { id: string; short: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  allLabel?: string;
}) {
  const allSel = selected.size === items.length;
  return (
    <div className="-mx-5 px-5 overflow-x-auto">
      <div className="flex gap-2 w-max pb-1">
        <button
          onClick={onAll}
          className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap active:scale-95 transition"
          style={allSel ? { background: C.yellow, color: C.green, border: 'none' } : { background: '#fff', color: C.green, border: `1px solid ${C.line}` }}
        >
          {allLabel}
        </button>
        {items.map((b) => {
          const on = selected.has(b.id);
          return (
            <button
              key={b.id}
              onClick={() => onToggle(b.id)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap active:scale-95 transition"
              style={on ? { background: C.green, color: '#fff', border: 'none' } : { background: '#fff', color: C.green, border: `1px solid ${C.line}` }}
            >
              {b.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
