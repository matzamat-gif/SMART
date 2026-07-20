import { useState } from 'react';
import { Database, Download, FolderTree, Package, Plus, Settings2, Trash2 } from 'lucide-react';
import type { Catalog as CatalogData, DeptId, ScanRecord, Subcat } from '../types';
import { DEPTS } from '../data/seed';
import { C } from '../lib/brand';
import { NumField } from './ui';

export function Catalog({ catalog, setCatalog, subcats, setSubcats, threshold, setThreshold, records, onClearRecords }: {
  catalog: CatalogData;
  setCatalog: React.Dispatch<React.SetStateAction<CatalogData>>;
  subcats: Subcat[];
  setSubcats: React.Dispatch<React.SetStateAction<Subcat[]>>;
  threshold: number;
  setThreshold: (n: number) => void;
  records: ScanRecord[];
  onClearRecords: () => void;
}) {
  const [tab, setTab] = useState<'products' | 'depts'>('products');
  return (
    <div className="p-5 space-y-4">
      <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: C.green }}><Settings2 className="w-5 h-5" /> קטלוג ומחלקות</h2>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-bold" style={{ color: C.green }}>סף אי-ודאות</label>
          <span className="text-sm font-extrabold" style={{ color: C.green }}>{threshold}%</span>
        </div>
        <input type="range" min={50} max={95} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full" style={{ accentColor: C.green }} />
        <p className="text-[11px] text-stone-400 mt-1">מתחת לסף — סריקה עוברת לסקירה מלאה במקום אישור מהיר.</p>
      </div>

      <TrainingData records={records} onClear={onClearRecords} />

      <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm">
        {([['products', 'מוצרים', Package], ['depts', 'מחלקות', FolderTree]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition" style={tab === id ? { background: C.green, color: '#fff' } : { color: '#78716C' }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'products'
        ? <Products catalog={catalog} setCatalog={setCatalog} subcats={subcats} />
        : <Depts catalog={catalog} subcats={subcats} setSubcats={setSubcats} />}
    </div>
  );
}

function TrainingData({ records, onClear }: { records: ScanRecord[]; onClear: () => void }) {
  const real = records.filter((r) => !r.demo);
  const correctedCount = real.filter((r) => r.corrected).length;
  const accuracy = real.length ? Math.round(((real.length - correctedCount) / real.length) * 100) : null;

  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noy-scan-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: C.green }}><Database className="w-4 h-4" /> נתוני אימון מהפיילוט</h3>
        {records.length > 0 && (
          <button onClick={() => { if (confirm('למחוק את כל נתוני האימון שנאספו?')) onClear(); }} className="rounded-lg p-1.5 active:scale-90" style={{ color: '#B91C1C' }} aria-label="נקה נתונים"><Trash2 className="w-4 h-4" /></button>
        )}
      </div>
      <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
        כל סריקה נשמרת עם תוצאת ה-AI מול האישור הסופי של המוכרן — הבסיס לשיפור הדיוק לאורך הפיילוט.
      </p>
      <div className="flex items-center gap-4 text-sm mb-3">
        <span><b style={{ color: C.green }}>{records.length}</b> <span className="text-stone-400 text-xs">סריקות</span></span>
        <span><b style={{ color: C.green }}>{real.length}</b> <span className="text-stone-400 text-xs">זיהוי אמיתי</span></span>
        {accuracy != null && <span><b style={{ color: accuracy >= 80 ? C.green : '#B45309' }}>{accuracy}%</b> <span className="text-stone-400 text-xs">ללא תיקון ידני</span></span>}
      </div>
      <button onClick={exportJson} disabled={!records.length} className="w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40" style={{ background: C.greenSoft, color: C.green }}>
        <Download className="w-4 h-4" /> ייצוא נתוני אימון (JSON)
      </button>
    </div>
  );
}

function Products({ catalog, setCatalog, subcats }: { catalog: CatalogData; setCatalog: React.Dispatch<React.SetStateAction<CatalogData>>; subcats: Subcat[] }) {
  const set = <K extends keyof CatalogData[string]>(p: string, f: K, v: CatalogData[string][K]) =>
    setCatalog((prev) => ({ ...prev, [p]: { ...prev[p], [f]: v } }));
  const num = (p: string, f: 'unitG' | 'boxKg' | 'par' | 'reorder' | 'freshH', v: string) => set(p, f, Number(v) || 0);
  return (
    <div className="space-y-2">
      <p className="text-stone-500 text-xs">משקל ליח׳, יעד ונק׳ הזמנה (קבועים פר מוצר), ושיוך לתת-מחלקה.</p>
      {Object.entries(catalog).map(([p, c]) => (
        <div key={p} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold" style={{ color: C.green }}>{p}</span>
            <div className="flex items-center gap-1.5">
              {c.calib > 0 && <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: C.greenSoft, color: C.green }}>מכויל ×{c.calib}</span>}
              {c.bulk && <span className="text-[10px] rounded-full px-2 py-0.5 bg-stone-100 text-stone-500">תפזורת</span>}
            </div>
          </div>
          <select value={c.cat || ''} onChange={(e) => set(p, 'cat', e.target.value || null)} className="w-full bg-stone-50 border rounded-lg px-2 py-1.5 text-sm mb-2 outline-none" style={{ borderColor: c.cat ? C.line : '#FCA5A5' }}>
            <option value="">— ללא מחלקה —</option>
            {DEPTS.map((d) => (
              <optgroup key={d.id} label={d.name}>
                {subcats.filter((s) => s.dept === d.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="grid grid-cols-4 gap-2">
            {c.bulk
              ? <NumField label='ק״ג/ארגז' value={c.boxKg} onChange={(v) => num(p, 'boxKg', v)} />
              : <NumField label="גרם/יח׳" value={c.unitG} onChange={(v) => num(p, 'unitG', v)} />}
            <NumField label='יעד ק״ג' value={c.par} onChange={(v) => num(p, 'par', v)} />
            <NumField label='הזמנה ק״ג' value={c.reorder} onChange={(v) => num(p, 'reorder', v)} />
            <NumField label="סף טריות (ש׳)" value={c.freshH} onChange={(v) => num(p, 'freshH', v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Depts({ catalog, subcats, setSubcats }: { catalog: CatalogData; subcats: Subcat[]; setSubcats: React.Dispatch<React.SetStateAction<Subcat[]>> }) {
  const [adding, setAdding] = useState<DeptId | null>(null);
  const [name, setName] = useState('');
  const count = (id: string) => Object.values(catalog).filter((c) => c.cat === id).length;
  const uncat = Object.entries(catalog).filter(([, c]) => !c.cat || !subcats.find((s) => s.id === c.cat)).map(([p]) => p);
  const add = (dept: DeptId) => { if (!name.trim()) return; setSubcats((p) => [...p, { id: 'sc' + Date.now(), dept, name: name.trim() }]); setName(''); setAdding(null); };
  return (
    <div className="space-y-4">
      {DEPTS.map((d) => (
        <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold" style={{ color: C.green }}>{d.name}</h3>
            <button onClick={() => { setAdding(d.id); setName(''); }} className="flex items-center gap-1 text-xs font-bold rounded-lg px-2 py-1" style={{ background: C.greenSoft, color: C.green }}><Plus className="w-3.5 h-3.5" /> תת-מחלקה</button>
          </div>
          <div className="space-y-2">
            {subcats.filter((s) => s.dept === d.id).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: C.cream }}>
                <span className="text-sm font-semibold text-stone-700">{s.name}</span>
                <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: count(s.id) ? C.greenSoft : '#F5F5F4', color: count(s.id) ? C.green : '#A8A29E' }}>{count(s.id)} מוצרים</span>
              </div>
            ))}
            {adding === d.id && (
              <div className="flex gap-2">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(d.id)} placeholder="שם תת-מחלקה" className="flex-1 bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" style={{ borderColor: C.line }} />
                <button onClick={() => add(d.id)} className="rounded-lg px-3 text-sm font-bold" style={{ background: C.yellow, color: C.green }}>הוסף</button>
              </div>
            )}
          </div>
        </div>
      ))}
      {uncat.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#FEF3C7' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#92660A' }}>ממתינים לשיוך ({uncat.length})</p>
          <p className="text-xs" style={{ color: '#92660A' }}>{uncat.join(' · ')}</p>
          <p className="text-[11px] mt-1 opacity-80" style={{ color: '#92660A' }}>שייך אותם בלשונית "מוצרים".</p>
        </div>
      )}
    </div>
  );
}
