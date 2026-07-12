import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Clock, ScanLine } from 'lucide-react';
import type { Branch, Catalog, DeptId, Inventory, User } from '../types';
import { BRANCHES } from '../data/seed';
import { C } from '../lib/brand';
import { ago, depletionEta, kg, stale, status } from '../lib/format';
import { BranchChips, Kpi } from './ui';

type View = 'home' | 'scan' | 'inventory' | 'dashboard' | 'catalog';

interface Shared {
  user: User;
  branch: (id: string) => Branch;
  catalog: Catalog;
  inventory: Inventory;
  deptOf: (product: string) => DeptId | null;
}

export function Home({ user, branch, catalog, inventory, history, session, go }: Shared & { history: Record<string, { kg: number; at: number }>; session: number; go: (v: View) => void }) {
  const isExec = user.role === 'exec';
  const allIds = BRANCHES.map((b) => b.id);
  const [sel, setSel] = useState<Set<string>>(() => new Set(allIds));

  if (!isExec) {
    const branchId = user.branch!;
    const items = inventory[branchId] || {};
    const tracked = Object.keys(catalog);
    const freshToday = tracked.filter((p) => items[p] && !stale(items[p].at, catalog[p]?.freshH)).length;
    const lows = Object.entries(items)
      .map(([p, v]) => ({ p, ...v, total: v.kg + v.backKg, cat: catalog[p] }))
      .filter((r) => r.cat && status(r.total, r.cat).key !== 'ok')
      .sort((a, b) => a.total / a.cat.par - b.total / b.cat.par);
    const cover = tracked.length ? Math.round((freshToday / tracked.length) * 100) : 0;

    return (
      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: C.green }}>שלום, {user.name.split(' ')[0]}</h2>
          <p className="text-stone-500 text-sm mt-0.5">{branch(user.branch!).name}</p>
        </div>

        <button
          onClick={() => go('scan')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition shadow-md"
          style={{ background: C.yellow }}
        >
          <div className="rounded-xl p-3" style={{ background: 'rgba(30,62,32,0.12)' }}>
            <ScanLine className="w-8 h-8" style={{ color: C.green }} />
          </div>
          <div className="text-right flex-1" style={{ color: C.green }}>
            <p className="font-extrabold text-xl">סרוק דוכן</p>
            <p className="text-sm opacity-80">צלם — וה-AI סופר ומעריך משקל</p>
          </div>
          <ArrowLeft className="w-6 h-6" style={{ color: C.green }} />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-stone-400 text-xs mb-1">נסרקו היום בסניף</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-extrabold" style={{ color: C.green }}>{freshToday}</span>
              <span className="text-stone-400 text-sm mb-0.5">/ {tracked.length} מוצרים</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: C.line }}>
              <div className="h-full rounded-full" style={{ width: `${cover}%`, background: cover >= 80 ? C.leaf : cover >= 50 ? '#F0B429' : '#E25C5C' }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-stone-400 text-xs mb-1">סרקת בסשן</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-extrabold" style={{ color: C.green }}>{session}</span>
              <span className="text-stone-400 text-sm mb-0.5">דוכנים</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">מאז הכניסה האחרונה</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2 flex items-center gap-1.5" style={{ color: C.green }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#B45309' }} /> דורש מילוי בדוכן
          </h3>
          {lows.length === 0 ? (
            <div className="rounded-xl p-4 text-sm text-center" style={{ background: C.greenSoft, color: C.green }}>הכול מלא בסניף. כל הכבוד.</div>
          ) : (
            <div className="space-y-2">
              {lows.slice(0, 6).map((l) => {
                const st = status(l.total, l.cat);
                const prev = history[`${branchId}::${l.p}`];
                const eta = prev && l.at ? depletionEta(prev.kg, l.total, (l.at - prev.at) / 3600000, l.cat.reorder) : null;
                return (
                  <div key={l.p} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-semibold" style={{ color: C.green }}>{l.p}</p>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1"><Clock className="w-3 h-3" />{ago(l.at)}{eta ? ` · ${eta}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-600">{kg(l.total)}</span>
                      <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n.size ? n : new Set(allIds); });

  const branchData = useMemo(() => {
    return [...sel]
      .map((bid) => {
        const items = inventory[bid] || {};
        let total = 0, alerts = 0, worst: 'ok' | 'low' | 'crit' = 'ok', oldest: number | null = null, scanned = 0;
        Object.entries(items).forEach(([p, v]) => {
          const cat = catalog[p];
          if (!cat) return;
          const t = v.kg + v.backKg;
          total += t;
          scanned++;
          const st = status(t, cat);
          if (st.key !== 'ok') alerts++;
          if (st.key === 'crit') worst = 'crit'; else if (st.key === 'low' && worst !== 'crit') worst = 'low';
          const ts = v.at ?? v.backAt;
          if (ts != null && (oldest == null || ts < oldest)) oldest = ts;
        });
        return { bid, total, alerts, worst, oldest, scanned };
      })
      .sort((a, b) => ({ crit: 0, low: 1, ok: 2 }[a.worst] - { crit: 0, low: 1, ok: 2 }[b.worst]) || b.alerts - a.alerts);
  }, [sel, inventory, catalog]);

  const grandKg = branchData.reduce((s, b) => s + b.total, 0);
  const grandAlerts = branchData.reduce((s, b) => s + b.alerts, 0);
  const attention = branchData.filter((b) => b.worst !== 'ok').length;
  const oldestSync = branchData.reduce<number | null>((m, b) => (b.oldest != null && (m == null || b.oldest < m) ? b.oldest : m), null);

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold" style={{ color: C.green }}>שלום, {user.name.split(' ')[0]}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{sel.size === allIds.length ? `מבט-על על ${allIds.length} סניפים` : `${sel.size} מתוך ${allIds.length} סניפים`}</p>
      </div>

      <BranchChips items={BRANCHES} selected={sel} onToggle={toggle} onAll={() => setSel(new Set(allIds))} />

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="סה״כ מלאי" value={kg(grandKg)} dark />
        <Kpi label="פריטים בהתראה" value={grandAlerts} accent="#B45309" />
        <Kpi label="סניפים בטיפול" value={`${attention}/${branchData.length}`} accent={attention ? '#B91C1C' : C.green} />
        <Kpi label="עדכניות אחרונה" value={ago(oldestSync)} accent={stale(oldestSync) ? '#B91C1C' : C.green} small />
      </div>

      <div>
        <h3 className="font-bold mb-2" style={{ color: C.green }}>סניפים — לפי דחיפות</h3>
        <div className="space-y-2">
          {branchData.map((b) => {
            const info = branch(b.bid);
            const dot = { crit: '#E25C5C', low: '#F0B429', ok: C.leaf }[b.worst];
            return (
              <div key={b.bid} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: C.green }}>{info.name}</p>
                  <p className="text-[11px] text-stone-400 flex items-center gap-1">
                    {b.scanned === 0 ? <span style={{ color: '#B91C1C' }}>לא נסרק</span> : <><Clock className="w-3 h-3" />{ago(b.oldest)}</>}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-extrabold text-sm" style={{ color: C.green }}>{kg(b.total)}</p>
                  {b.alerts > 0 && <p className="text-[11px] font-bold" style={{ color: '#B45309' }}>{b.alerts} בהתראה</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
