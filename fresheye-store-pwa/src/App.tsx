import { useState } from 'react';
import { BarChart3, Camera, Leaf, LogOut, Package, Settings2 } from 'lucide-react';
import type { Catalog, DeptId, Inventory, LogEntry, Place, ScanItem, ScanRecord, Subcat, User } from './types';
import { BRANCHES, ROLE_LABELS, SEED_CATALOG, SEED_SUBCATS, seedInventory } from './data/seed';
import { C } from './lib/brand';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Scan } from './components/Scan';
import { InventoryScreen } from './components/Inventory';
import { Dashboard } from './components/Dashboard';
import { Catalog as CatalogScreen } from './components/Catalog';

type View = 'home' | 'scan' | 'inventory' | 'dashboard' | 'catalog';
type HistoryKey = string; // `${branchId}::${product}::${place}`
interface HistoryPoint { kg: number; at: number; }

const RECORDS_STORAGE = 'noy_scan_records_v1';
const MAX_RECORDS = 50;

function loadRecords(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE);
    return raw ? (JSON.parse(raw) as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

function persistRecords(records: ScanRecord[]) {
  try {
    localStorage.setItem(RECORDS_STORAGE, JSON.stringify(records));
  } catch {
    // quota exceeded — retry without image thumbnails
    try {
      localStorage.setItem(RECORDS_STORAGE, JSON.stringify(records.map((r) => ({ ...r, imageThumb: null }))));
    } catch { /* storage unavailable */ }
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(SEED_CATALOG);
  const [subcats, setSubcats] = useState<Subcat[]>(SEED_SUBCATS);
  const [inventory, setInventory] = useState<Inventory>(seedInventory);
  const [history, setHistory] = useState<Record<HistoryKey, HistoryPoint>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [records, setRecords] = useState<ScanRecord[]>(loadRecords);
  const [view, setView] = useState<View>('home');
  const [session, setSession] = useState(0);
  // Pilot default: 85% — more scans go through human review until trust is built.
  const [threshold, setThreshold] = useState(85);

  const branch = (id: string) => BRANCHES.find((b) => b.id === id)!;
  const deptOf = (product: string): DeptId | null => {
    const sc = subcats.find((s) => s.id === catalog[product]?.cat);
    return sc ? sc.dept : null;
  };

  function commitScan(branchId: string, place: Place, items: ScanItem[], byName: string) {
    const t = Date.now();
    setInventory((prev) => {
      const next = { ...prev, [branchId]: { ...(prev[branchId] || {}) } };
      items.forEach((it) => {
        const existing = next[branchId][it.product] || { kg: 0, at: null, by: null, conf: null, backKg: 0, backAt: null, backBy: null };
        if (place === 'store') {
          next[branchId][it.product] = { ...existing, kg: it.weightKg, at: t, by: byName, conf: it.confidence };
        } else {
          next[branchId][it.product] = { ...existing, backKg: it.weightKg, backAt: t, backBy: byName };
        }
      });
      return next;
    });
    setHistory((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        const existing = inventory[branchId]?.[it.product];
        const prevTotal = existing ? existing.kg + existing.backKg : 0;
        const prevAt = place === 'store' ? existing?.at : existing?.backAt;
        if (existing && prevAt) next[`${branchId}::${it.product}`] = { kg: prevTotal, at: prevAt };
      });
      return next;
    });
    setCatalog((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        if (!next[it.product]) {
          next[it.product] = { unitG: it.bulk ? 0 : Math.max(1, Math.round(it.unitG || 0)), boxKg: it.bulk ? Math.max(1, Math.round(it.weightKg)) : 0, par: 15, reorder: 4, bulk: !!it.bulk, cat: null, freshH: 24, calib: 0 };
        } else if (it.unitEdited && !it.bulk && it.unitG > 0) {
          // Field calibration (spec §1 מטרות-על): a clerk-corrected unit weight
          // recalibrates the catalog. Blend 50/50 with the current value so a
          // single outlier correction doesn't swing the whole catalog.
          const cur = next[it.product].unitG;
          const corrected = Math.round(it.unitG);
          const blended = cur > 0 ? Math.round((cur + corrected) / 2) : corrected;
          if (blended !== cur) {
            next[it.product] = { ...next[it.product], unitG: blended, calib: next[it.product].calib + 1 };
          }
        }
      });
      return next;
    });
    const entry: LogEntry = { id: `${t}_${Math.random()}`, branchId, by: byName, when: t, kind: 'scan', items: items.map((i) => ({ product: i.product, kg: i.weightKg, place })) };
    setLog((prev) => [entry, ...prev].slice(0, 60));
    setSession((s) => s + 1);
  }

  function addRecord(r: Omit<ScanRecord, 'id'>) {
    setRecords((prev) => {
      const next = [{ ...r, id: `${r.at}_${Math.random().toString(36).slice(2, 8)}` }, ...prev].slice(0, MAX_RECORDS);
      persistRecords(next);
      return next;
    });
  }

  function clearRecords() {
    setRecords([]);
    persistRecords([]);
  }

  function reportWaste(branchId: string, product: string, place: Place, amountKg: number) {
    const t = Date.now();
    setInventory((prev) => {
      const existing = prev[branchId]?.[product];
      if (!existing) return prev;
      const next = { ...prev, [branchId]: { ...prev[branchId] } };
      if (place === 'store') next[branchId][product] = { ...existing, kg: Math.max(0, existing.kg - amountKg) };
      else next[branchId][product] = { ...existing, backKg: Math.max(0, existing.backKg - amountKg) };
      return next;
    });
    const entry: LogEntry = { id: `${t}_${Math.random()}`, branchId, by: user!.name, when: t, kind: 'waste', items: [{ product, kg: amountKg, place }] };
    setLog((prev) => [entry, ...prev].slice(0, 60));
  }

  if (!user) return <Login onLogin={(u) => { setUser(u); setView('home'); setSession(0); }} />;

  const tabs: { id: View; label: string; icon: typeof Leaf }[] = [{ id: 'home', label: 'בית', icon: Leaf }];
  if (user.role !== 'exec') tabs.push({ id: 'scan', label: 'סריקה', icon: Camera });
  tabs.push({ id: 'inventory', label: 'מלאי', icon: Package });
  if (user.role !== 'clerk') tabs.push({ id: 'dashboard', label: 'ניהול', icon: BarChart3 });
  if (user.role === 'exec') tabs.push({ id: 'catalog', label: 'קטלוג', icon: Settings2 });

  return (
    <div dir="rtl" className="min-h-screen flex justify-center" style={{ background: C.cream, color: C.green }}>
      <div className="w-full max-w-md min-h-screen flex flex-col relative shadow-xl" style={{ background: C.cream }}>
        <header className="px-5 pt-5 pb-4 sticky top-0 z-20" style={{ background: C.green }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl p-1.5 flex items-center justify-center" style={{ background: C.yellow }}><Leaf className="w-5 h-5" style={{ color: C.green }} /></div>
              <div className="text-white">
                <h1 className="font-extrabold text-lg leading-none tracking-tight">נוי השדה</h1>
                <p className="text-xs mt-0.5" style={{ color: C.leaf }}>ניהול מלאי בשטח</p>
              </div>
            </div>
            <button onClick={() => setUser(null)} className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 text-white active:scale-95 transition" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <LogOut className="w-3.5 h-3.5" /> יציאה
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-white">
            <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: C.yellow, color: C.green }}>{ROLE_LABELS[user.role]}</span>
            <span className="opacity-90">{user.name}</span>
            {user.branch && <span className="opacity-70">· {branch(user.branch).short}</span>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 relative">
          {view === 'home' && <Home user={user} branch={branch} catalog={catalog} inventory={inventory} deptOf={deptOf} history={history} session={session} go={setView} />}
          {view === 'scan' && <Scan user={user} catalog={catalog} threshold={threshold} onCommit={commitScan} onRecord={addRecord} session={session} backHome={() => setView('home')} />}
          {view === 'inventory' && <InventoryScreen user={user} catalog={catalog} inventory={inventory} deptOf={deptOf} onWaste={reportWaste} />}
          {view === 'dashboard' && <Dashboard user={user} branch={branch} catalog={catalog} inventory={inventory} deptOf={deptOf} log={log} />}
          {view === 'catalog' && <CatalogScreen catalog={catalog} setCatalog={setCatalog} subcats={subcats} setSubcats={setSubcats} threshold={threshold} setThreshold={setThreshold} records={records} onClearRecords={clearRecords} />}
        </main>

        <nav className="absolute bottom-0 inset-x-0 bg-white px-2 py-2 flex justify-around z-20" style={{ borderTop: `1px solid ${C.line}` }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button key={t.id} onClick={() => setView(t.id)} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition" style={{ color: active ? C.green : '#A8A29E' }}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} /><span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
