import { useMemo, useState } from 'react';
import { ChevronDown, Clock, Package } from 'lucide-react';
import type { Catalog, DeptId, Inventory as InventoryData, Place, User } from '../types';
import { BRANCHES, DEPTS } from '../data/seed';
import { C } from '../lib/brand';
import { ago, kg, stale, status } from '../lib/format';

export function InventoryScreen({ user, catalog, inventory, deptOf, onWaste }: {
  user: User;
  catalog: Catalog;
  inventory: InventoryData;
  deptOf: (product: string) => DeptId | null;
  onWaste: (branchId: string, product: string, place: Place, amountKg: number) => void;
}) {
  const isExec = user.role === 'exec';
  const branchIds = isExec ? BRANCHES.map((b) => b.id) : [user.branch!];
  const [activeBranch, setActiveBranch] = useState(branchIds[0]);
  const bid = isExec ? activeBranch : user.branch!;
  const items = inventory[bid] || {};
  const [wasteFor, setWasteFor] = useState<string | null>(null);
  const [wastePlace, setWastePlace] = useState<Place>('store');
  const [wasteAmt, setWasteAmt] = useState('');

  const byDept = useMemo(() => {
    const m: Record<string, { p: string; kg: number; backKg: number; total: number; at: number | null; backAt: number | null; by: string | null; cat: Catalog[string]; st: ReturnType<typeof status> }[]> = {};
    Object.entries(items).forEach(([p, v]) => {
      const cat = catalog[p];
      if (!cat) return;
      const d = deptOf(p) || 'other';
      const total = v.kg + v.backKg;
      (m[d] = m[d] || []).push({ p, kg: v.kg, backKg: v.backKg, total, at: v.at, backAt: v.backAt, by: v.by, cat, st: status(total, cat) });
    });
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.total / a.cat.par - b.total / b.cat.par));
    return m;
  }, [items, catalog, deptOf]);

  const deptName = (id: string) => DEPTS.find((d) => d.id === id)?.name || 'ללא מחלקה';
  const [open, setOpen] = useState<Record<string, boolean>>({ fruit: true, veg: true, other: true });

  function submitWaste() {
    const amt = Number(wasteAmt);
    if (wasteFor && amt > 0) onWaste(bid, wasteFor, wastePlace, amt);
    setWasteFor(null);
    setWasteAmt('');
  }

  return (
    <div className="p-5 space-y-4">
      <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: C.green }}><Package className="w-5 h-5" /> מלאי לפי מחלקה</h2>

      {isExec && (
        <div className="-mx-5 px-5 overflow-x-auto">
          <div className="flex gap-2 w-max pb-1">
            {BRANCHES.map((b) => {
              const on = b.id === bid;
              return (
                <button key={b.id} onClick={() => setActiveBranch(b.id)} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap active:scale-95 transition" style={on ? { background: C.green, color: '#fff' } : { background: '#fff', color: C.green, border: `1px solid ${C.line}` }}>{b.short}</button>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(byDept).length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-sm text-stone-400 shadow-sm">אין נתוני מלאי לסניף זה. צריך לבצע סריקה.</div>
      ) : (
        [...DEPTS.map((d) => d.id), 'other'].filter((d) => byDept[d]).map((d) => {
          const rows = byDept[d];
          const total = rows.reduce((s, r) => s + r.total, 0);
          const alerts = rows.filter((r) => r.st.key !== 'ok').length;
          return (
            <div key={d} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setOpen((o) => ({ ...o, [d]: !o[d] }))} className="w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 transition" style={{ color: '#A8A29E', transform: open[d] ? 'none' : 'rotate(-90deg)' }} />
                  <span className="font-extrabold" style={{ color: C.green }}>{deptName(d)}</span>
                  {alerts > 0 && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: '#FEF3C7', color: '#92660A' }}>{alerts}</span>}
                </div>
                <span className="text-sm font-bold text-stone-400">{kg(total)}</span>
              </button>
              {open[d] && rows.map((r) => (
                <div key={r.p} className="px-4 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: C.green }}>{r.p}</p>
                        {stale(r.at ?? r.backAt, r.cat.freshH) && <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: '#FEE2E2', color: '#B91C1C' }}>לא עדכני</span>}
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden flex" style={{ background: C.line }}>
                        <div style={{ width: `${Math.min(100, (r.kg / r.cat.par) * 100)}%`, background: r.st.bar }} />
                        <div style={{ width: `${Math.min(100 - Math.min(100, (r.kg / r.cat.par) * 100), (r.backKg / r.cat.par) * 100)}%`, background: r.st.bar, opacity: 0.4 }} />
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="rounded px-1.5 py-0.5" style={{ background: C.cream }}>חנות {kg(r.kg)}</span>
                        <span className="rounded px-1.5 py-0.5" style={{ background: C.cream }}>מחסן {kg(r.backKg)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ago(r.at ?? r.backAt)}{r.by ? ` · ${r.by}` : ''}</span>
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-extrabold text-sm" style={{ color: C.green }}>{kg(r.total)}</p>
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: r.st.bg, color: r.st.fg }}>{r.st.label}</span>
                    </div>
                  </div>
                  <button onClick={() => { setWasteFor(r.p); setWastePlace('store'); }} className="mt-2 text-[11px] font-bold" style={{ color: '#B45309' }}>דיווח פחת</button>
                </div>
              ))}
            </div>
          );
        })
      )}

      {wasteFor && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-3 max-w-md mx-auto" style={{ paddingBottom: 30 }}>
            <div className="mx-auto mb-1" style={{ width: 40, height: 4, borderRadius: 99, background: '#E7E5E1' }} />
            <h3 className="font-extrabold text-lg" style={{ color: C.green }}>דיווח פחת — {wasteFor}</h3>
            <div className="grid grid-cols-2 gap-2 bg-stone-50 rounded-xl p-1" style={{ border: `1px solid ${C.line}` }}>
              {(['store', 'back'] as Place[]).map((p) => (
                <button key={p} onClick={() => setWastePlace(p)} className="rounded-lg py-1.5 text-sm font-bold transition" style={wastePlace === p ? { background: C.green, color: '#fff' } : { color: '#78716C' }}>
                  {p === 'store' ? 'חנות' : 'מחסן'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-stone-500">כמות (ק״ג)</label>
              <input autoFocus type="number" value={wasteAmt} onChange={(e) => setWasteAmt(e.target.value)} className="mt-1 w-full bg-stone-50 border rounded-xl px-3 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setWasteFor(null)} className="flex-1 bg-stone-100 text-stone-600 rounded-xl py-3 font-semibold active:scale-[0.98]">ביטול</button>
              <button onClick={submitWaste} className="flex-1 rounded-xl py-3 font-extrabold active:scale-[0.98]" style={{ background: C.green, color: '#fff' }}>דווח</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
