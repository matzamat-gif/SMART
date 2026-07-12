import { useMemo, useState } from 'react';
import { ArrowLeftRight, BarChart3, Boxes, Clock, MessageCircle, RefreshCw } from 'lucide-react';
import type { Branch, Catalog, DeptId, Inventory, LogEntry, User } from '../types';
import { BRANCHES, DEPTS } from '../data/seed';
import { C } from '../lib/brand';
import { ago, kg, stampFull, status } from '../lib/format';

export function Dashboard({ user, branch, catalog, inventory, deptOf, log }: {
  user: User;
  branch: (id: string) => Branch;
  catalog: Catalog;
  inventory: Inventory;
  deptOf: (product: string) => DeptId | null;
  log: LogEntry[];
}) {
  const allIds = BRANCHES.map((b) => b.id);
  const scope = user.role === 'manager' ? [user.branch!] : allIds;
  const [sel, setSel] = useState<Set<string>>(() => new Set(scope));
  const isExec = user.role === 'exec';
  const allSel = sel.size === scope.length;
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n.size ? n : new Set(scope); });

  const { deptRoll, order, transfers } = useMemo(() => {
    const dr: Record<string, { total: number; alerts: number }> = {};
    DEPTS.forEach((d) => (dr[d.id] = { total: 0, alerts: 0 }));
    const ord: { bid: string; p: string; need: number; st: ReturnType<typeof status> }[] = [];
    const totals: Record<string, Record<string, number>> = {}; // bid -> product -> total kg

    [...sel].forEach((bid) => {
      const items = inventory[bid] || {};
      totals[bid] = {};
      Object.entries(items).forEach(([p, v]) => {
        const cat = catalog[p];
        if (!cat) return;
        const total = v.kg + v.backKg;
        totals[bid][p] = total;
        const d = deptOf(p);
        if (d && dr[d]) {
          dr[d].total += total;
          const st = status(total, cat);
          if (st.key !== 'ok') { dr[d].alerts++; ord.push({ bid, p, need: Math.max(0, cat.par - total), st }); }
        }
      });
    });
    ord.sort((a, b) => ({ crit: 0, low: 1, ok: 2 }[a.st.key] - { crit: 0, low: 1, ok: 2 }[b.st.key]) || b.need - a.need);

    // spec §7.4 — a branch with total > par*1.1 offers to complete a branch in alert for the same product.
    const trans: { from: string; to: string; p: string; amount: number }[] = [];
    Object.keys(catalog).forEach((p) => {
      const cat = catalog[p];
      const deficits = [...sel].filter((bid) => (totals[bid]?.[p] ?? 0) > 0 && (totals[bid]?.[p] ?? 0) <= cat.reorder)
        .map((bid) => ({ bid, need: cat.par - (totals[bid]?.[p] ?? 0) }));
      const surpluses = [...sel].filter((bid) => (totals[bid]?.[p] ?? 0) > cat.par * 1.1)
        .map((bid) => ({ bid, surplus: (totals[bid]?.[p] ?? 0) - cat.par }));
      deficits.forEach((d) => {
        const s = surpluses.find((x) => x.bid !== d.bid);
        if (s) trans.push({ from: s.bid, to: d.bid, p, amount: Math.round(Math.min(d.need, s.surplus) * 10) / 10 });
      });
    });

    return { deptRoll: dr, order: ord, transfers: trans.slice(0, 8) };
  }, [sel, inventory, catalog, deptOf]);

  function buildOrderText() {
    const head = `📋 רשימת הזמנה — נוי השדה\n${stampFull(Date.now())}\n────────────`;
    const lines = order.slice(0, 20).map((o) => `• ${o.p}${isExec ? ` (${branch(o.bid).short})` : ''} — ${o.st.label} · חסר ~${kg(o.need)}`);
    return [head, ...lines].join('\n');
  }
  function sendOrder() { window.open(`https://wa.me/?text=${encodeURIComponent(buildOrderText())}`, '_blank'); }

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: C.green }}><BarChart3 className="w-5 h-5" /> ניהול ובקרה</h2>

      {isExec && (
        <div className="-mx-5 px-5 overflow-x-auto">
          <div className="flex gap-2 w-max pb-1">
            <button onClick={() => setSel(new Set(allIds))} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap" style={{ background: allSel ? C.yellow : '#fff', color: C.green, border: allSel ? 'none' : `1px solid ${C.line}` }}>הכול</button>
            {BRANCHES.map((b) => {
              const on = sel.has(b.id);
              return <button key={b.id} onClick={() => toggle(b.id)} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap" style={on ? { background: C.green, color: '#fff' } : { background: '#fff', color: C.green, border: `1px solid ${C.line}` }}>{b.short}</button>;
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold mb-2 flex items-center gap-1.5" style={{ color: C.green }}><Boxes className="w-4 h-4" /> מלאי לפי מחלקה</h3>
        <div className="grid grid-cols-2 gap-3">
          {DEPTS.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold" style={{ color: C.green }}>{d.name}</span>
                {deptRoll[d.id].alerts > 0 && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: '#FEF3C7', color: '#92660A' }}>{deptRoll[d.id].alerts}</span>}
              </div>
              <p className="text-2xl font-extrabold mt-1" style={{ color: C.green }}>{kg(deptRoll[d.id].total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold flex items-center gap-1.5" style={{ color: C.green }}><RefreshCw className="w-4 h-4" /> רשימת הזמנה / השלמה</h3>
          {order.length > 0 && <button onClick={sendOrder} className="text-[11px] font-bold flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: '#25D366', color: '#fff' }}><MessageCircle className="w-3.5 h-3.5" /> שלח</button>}
        </div>
        {order.length === 0 ? (
          <div className="rounded-xl p-4 text-sm text-center" style={{ background: C.greenSoft, color: C.green }}>אין מה להשלים. כל המלאי תקין.</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {order.slice(0, 12).map((o, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: o.st.dot }} />
                  <div><p className="font-semibold text-sm" style={{ color: C.green }}>{o.p}</p>{isExec && <p className="text-[11px] text-stone-400">{branch(o.bid).short}</p>}</div>
                </div>
                <span className="font-bold text-sm" style={{ color: C.green }}>~{kg(o.need)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {transfers.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 flex items-center gap-1.5" style={{ color: C.green }}><ArrowLeftRight className="w-4 h-4" /> העברות מומלצות</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {transfers.map((t, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.green }}>{t.p}</p>
                  <p className="text-[11px] text-stone-400">{branch(t.from).short} ← {branch(t.to).short}</p>
                </div>
                <span className="font-bold text-sm" style={{ color: C.green }}>{kg(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 flex items-center gap-1.5" style={{ color: C.green }}><Clock className="w-4 h-4" /> יומן פעולות אחרון</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {log.slice(0, 8).map((l) => (
              <div key={l.id} className="px-4 py-2.5" style={{ borderTop: l !== log[0] ? `1px solid ${C.line}` : 'none' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: C.green }}>{l.kind === 'waste' ? 'דיווח פחת' : 'סריקה'} · {branch(l.branchId).short}</p>
                  <span className="text-[11px] text-stone-400">{ago(l.when)}</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">{l.by} · {l.items.map((i) => `${i.product} ${kg(i.kg)}`).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
