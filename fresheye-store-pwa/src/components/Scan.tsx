import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Camera, Check, CheckCircle2, FlaskConical, ImagePlus, Info, KeyRound,
  Loader2, ScanLine, TrendingDown, TrendingUp, X, Zap,
} from 'lucide-react';
import type { Catalog, Place, ScanItem, User } from '../types';
import { BRANCHES } from '../data/seed';
import { C } from '../lib/brand';
import { kg, nowStr } from '../lib/format';
import { analyzePhoto, getApiKey, hasApiKey, matchCatalogName, setApiKey, type CapturedImage } from '../lib/vision';
import { NumField } from './ui';

const CONFIDENCE_THRESHOLD = 0.75;
const ANALYZE_STEPS = ['מעלה את התמונה', 'מזהה פריטים', 'סופר יחידות', 'מעריך משקל'];

function AnalyzeOverlay({ imgUrl }: { imgUrl?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 550);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0B0A' }}>
      <div className="relative flex-1 overflow-hidden">
        {imgUrl && <img src={imgUrl} alt="דוכן" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,11,10,0.55), rgba(10,11,10,0.2) 40%, rgba(10,11,10,0.85))' }} />
        <div className="absolute inset-x-0 top-0" style={{ height: '38%', background: 'radial-gradient(120% 80% at 50% 0%, rgba(164,214,104,0.45), rgba(30,62,32,0.15) 45%, transparent 70%)', animation: 'aurora 4s ease-in-out infinite' }} />
        <div className="absolute inset-x-0" style={{ top: 0, height: 3, background: C.leaf, boxShadow: `0 0 18px 4px ${C.leaf}, 0 0 60px 12px rgba(164,214,104,0.5)`, animation: 'scanSweep 2.6s ease-in-out infinite, scanGlow 2.6s ease-in-out infinite' }} />
      </div>
      <div className="px-6 pt-5" style={{ background: '#141513', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, marginTop: -28 }}>
        <div className="mx-auto mb-5" style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }} />
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center gap-1">
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 4, height: 4, borderRadius: 99, background: C.leaf, display: 'inline-block', animation: `dotPulse 1.2s ${i * 0.18}s infinite` }} />)}
          </span>
          <span key={step} className="text-white font-extrabold text-lg" style={{ animation: 'floatUp 0.4s ease' }}>{ANALYZE_STEPS[step]}</span>
        </div>
        <p className="text-right text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>בינה מלאכותית סורקת את הדוכן</p>
        <div className="space-y-2.5">
          {ANALYZE_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3" style={{ opacity: i <= step ? 1 : 0.32, transition: 'opacity 0.4s' }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 99, background: i < step ? C.leaf : i === step ? 'rgba(164,214,104,0.18)' : 'rgba(255,255,255,0.08)', border: i === step ? `2px solid ${C.leaf}` : 'none' }}>
                {i < step ? <Check className="w-3.5 h-3.5" style={{ color: '#0A0B0A' }} /> : i === step ? <span style={{ width: 7, height: 7, borderRadius: 99, background: C.leaf, animation: 'scanGlow 1s infinite' }} /> : null}
              </span>
              <span className="text-sm font-semibold" style={{ color: i <= step ? '#fff' : 'rgba(255,255,255,0.5)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Both overlays use fixed positioning so they cover the full viewport,
// independent of the scan screen's own scroll container.
function CameraCapture({ onClose, onCapture, err, count }: {
  onClose: () => void;
  onCapture: (im: CapturedImage) => void;
  err: string;
  count: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [camErr, setCamErr] = useState(false);
  const [flash, setFlash] = useState<'auto' | 'on' | 'off'>('auto');
  const [clock, setClock] = useState(() => nowStr());

  useEffect(() => {
    const id = setInterval(() => setClock(nowStr()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera');
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; try { await videoRef.current.play(); } catch { /* autoplay may be blocked; user can still snap */ } }
        setReady(true);
      } catch {
        setCamErr(true);
      }
    })();
    return () => { active = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function snap() {
    if (camErr || !ready) { fileRef.current?.click(); return; }
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const url = c.toDataURL('image/jpeg', 0.85);
    onCapture({ b64: url.split(',')[1], mediaType: 'image/jpeg', url });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onCapture({ b64: (r.result as string).split(',')[1], mediaType: f.type, url: r.result as string });
    r.readAsDataURL(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  const cycleFlash = () => setFlash((f) => (f === 'auto' ? 'on' : f === 'on' ? 'off' : 'auto'));
  const flashLabel = flash === 'auto' ? 'מבזק אוטו' : flash === 'on' ? 'מבזק דולק' : 'מבזק כבוי';

  return (
    <div className="fixed inset-0 z-50 flex justify-center" style={{ background: '#0C0C0C' }}>
      <div dir="rtl" className="relative w-full h-full flex flex-col" style={{ background: '#1A1A1A' }}>
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <button onClick={onClose} aria-label="סגור" className="rounded-full p-2 active:scale-95 transition" style={{ background: 'rgba(255,255,255,0.14)' }}><X className="w-5 h-5 text-white" /></button>
          <div className="flex items-center gap-2 text-white text-sm font-semibold"><span>{clock}</span><span className="w-2 h-2 rounded-full" style={{ background: '#4ADE80' }} /></div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" style={{ opacity: ready ? 1 : 0, transition: 'opacity .3s' }} />
          {!ready && !camErr && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm font-semibold">מפעיל מצלמה…</span>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 pointer-events-none">
            <div className="w-full rounded-2xl border-2 border-dashed" style={{ aspectRatio: '4 / 3', borderColor: 'rgba(255,255,255,0.6)' }} />
            <p className="text-white/90 text-sm font-semibold mt-4">כוון לדוכן המלא</p>
          </div>
          {err && (
            <div className="absolute inset-x-6 top-4 rounded-xl px-3 py-2 text-sm font-semibold text-center flex items-center justify-center gap-1.5" style={{ background: 'rgba(226,92,92,0.95)', color: '#fff' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}
          {camErr && (
            <div className="absolute inset-x-6 bottom-4 rounded-xl px-3 py-2.5 text-xs text-center" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
              המצלמה אינה זמינה בדפדפן זה — הקש על הלחצן להעלאת תמונה מהמכשיר.
            </div>
          )}
          {count > 0 && <span className="absolute top-4 left-4 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: C.yellow, color: C.green }}>{count} צולמו</span>}
        </div>
        <div className="px-8 pt-4 pb-2 flex items-center justify-between">
          <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1.5 text-white active:scale-95 transition" style={{ width: 64 }}>
            <span className="rounded-xl p-2.5 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)' }}><ImagePlus className="w-5 h-5" /></span>
            <span className="text-[11px] font-medium">תמונה נוספת</span>
          </button>
          <button onClick={snap} aria-label="צלם" className="rounded-full p-1 active:scale-95 transition" style={{ border: '4px solid rgba(255,255,255,0.9)' }}>
            <span className="block rounded-full" style={{ width: 64, height: 64, background: camErr ? C.yellow : '#fff' }} />
          </button>
          <button onClick={cycleFlash} className="flex flex-col items-center gap-1.5 active:scale-95 transition" style={{ width: 64, color: flash === 'on' ? C.yellow : '#fff' }}>
            <span className="rounded-xl p-2.5 flex items-center justify-center" style={{ background: flash === 'on' ? C.yellow : 'rgba(255,255,255,0.14)' }}><Zap className="w-5 h-5" style={{ color: flash === 'on' ? C.green : '#fff' }} /></span>
            <span className="text-[11px] font-medium">{flashLabel}</span>
          </button>
        </div>
        <p className="text-center text-white/55 text-xs pb-7">צלם את כל הדוכן במסגרת אחת · ניתן לצרף עוד תמונות</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      </div>
    </div>
  );
}

type ConfMsg = { tone: 'up' | 'down' | 'flat'; text: string } | null;
type Stage = 'setup' | 'capture' | 'analyzing' | 'confirm' | 'review' | 'saved' | 'error';

export function Scan({ user, catalog, onCommit, session, backHome }: {
  user: User;
  catalog: Catalog;
  onCommit: (branchId: string, place: Place, items: ScanItem[], byName: string) => void;
  session: number;
  backHome: () => void;
}) {
  const [branchId, setBranchId] = useState(user.branch || BRANCHES[0].id);
  const [place, setPlace] = useState<Place>('store');
  const [imgs, setImgs] = useState<CapturedImage[]>([]);
  const [stage, setStage] = useState<Stage>('setup');
  const [items, setItems] = useState<ScanItem[]>([]);
  const [err, setErr] = useState('');
  const [confMsg, setConfMsg] = useState<ConfMsg>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [showKeySheet, setShowKeySheet] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(() => hasApiKey());
  const presetRef = useRef(Math.floor(Math.random() * 6));
  const prevConfRef = useRef<number | null>(null);
  const catalogNames = Object.keys(catalog);

  async function runAnalysis(list: CapturedImage[]) {
    setStage('analyzing');
    setErr('');
    try {
      const { items: raw, demo } = await analyzePhoto(list, catalog, presetRef.current);
      setIsDemo(demo);
      const rows: ScanItem[] = raw.map((it) => {
        const matched = matchCatalogName(it.product, catalogNames);
        const bulk = it.count == null || it.count === 0;
        const unitG = Number(it.unitWeightGrams) || catalog[matched]?.unitG || 0;
        const w = bulk ? (Number(it.totalWeightGrams) || 0) / 1000 : (Number(it.count) * unitG) / 1000;
        return {
          product: matched,
          count: bulk ? null : Number(it.count),
          unitG,
          bulk,
          weightKg: Math.round(w * 10) / 10,
          confidence: Number(it.confidence) || 0,
          isNew: !catalog[matched],
        };
      }).filter((r) => r.product);

      if (!rows.length) {
        setErr('לא זוהו פירות או ירקות בתמונה. ודא שהדוכן ממלא את הפריים ונסה שוב.');
        setStage('error');
        return;
      }

      const avg = rows.reduce((s, r) => s + r.confidence, 0) / rows.length;
      if (list.length > 1) {
        const dup = list[list.length - 2]?.url === list[list.length - 1]?.url;
        const prev = prevConfRef.current;
        if (dup) setConfMsg({ tone: 'flat', text: 'תמונה זהה לקודמת — אין מידע חדש, הביטחון לא השתנה.' });
        else if (prev != null && avg > prev + 0.02) setConfMsg({ tone: 'up', text: `שולבו ${list.length} תמונות — הביטחון עלה ל-${Math.round(avg * 100)}%.` });
        else if (prev != null && avg < prev - 0.02) setConfMsg({ tone: 'down', text: `שולבו ${list.length} תמונות — הביטחון ירד מעט ל-${Math.round(avg * 100)}%.` });
        else setConfMsg({ tone: 'flat', text: `שולבו ${list.length} תמונות — הביטחון דומה (${Math.round(avg * 100)}%).` });
      } else setConfMsg(null);
      prevConfRef.current = avg;

      setItems(rows);
      setStage(list.length === 1 && rows.length === 1 && rows[0].confidence >= CONFIDENCE_THRESHOLD && !rows[0].isNew ? 'confirm' : 'review');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שגיאה בניתוח');
      setStage('error');
    }
  }

  function handleCapture(im: CapturedImage) { const next = [...imgs, im]; setImgs(next); runAnalysis(next); }
  function addMore() { setStage('capture'); }
  function editRow(i: number, patch: Partial<ScanItem>) {
    setItems((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const n = { ...r, ...patch };
      if (!n.bulk && Number(n.unitG) > 0) n.weightKg = Math.round((Number(n.count) * Number(n.unitG)) / 100) / 10;
      return n;
    }));
  }
  function retake() { setImgs([]); setItems([]); setErr(''); setConfMsg(null); prevConfRef.current = null; presetRef.current = Math.floor(Math.random() * 6); setStage('setup'); }
  function save() { onCommit(branchId, place, items, user.name); setStage('saved'); }

  const lastUrl = imgs[imgs.length - 1]?.url;
  const branchObj = BRANCHES.find((b) => b.id === branchId)!;

  if (stage === 'capture') {
    return <CameraCapture onClose={() => setStage(items.length ? 'review' : 'setup')} onCapture={handleCapture} err={err} count={imgs.length} />;
  }
  if (stage === 'analyzing') return <AnalyzeOverlay imgUrl={lastUrl} />;

  function saveKey() {
    setApiKey(keyDraft);
    setKeyConfigured(hasApiKey());
    setShowKeySheet(false);
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Camera className="w-5 h-5" style={{ color: C.green }} /><h2 className="text-lg font-extrabold" style={{ color: C.green }}>סריקת דוכן</h2></div>
        <div className="flex items-center gap-2">
          {session > 0 && <span className="text-xs rounded-full px-2.5 py-1 font-bold" style={{ background: C.greenSoft, color: C.green }}>נסרקו {session}</span>}
          <button onClick={() => { setKeyDraft(getApiKey()); setShowKeySheet(true); }} aria-label="הגדרות זיהוי" className="rounded-lg p-1.5 active:scale-95" style={{ background: keyConfigured ? C.greenSoft : '#FEF3C7', color: keyConfigured ? C.green : '#92660A' }}>
            <KeyRound className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!keyConfigured && stage === 'setup' && (
        <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: '#FEF3C7', color: '#92660A' }}>
          <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
          <span><b>מצב דמו:</b> לא הוגדר מפתח זיהוי, ולכן התוצאות מדומות ואינן מבוססות על התמונה. הקש על סמל המפתח כדי להפעיל זיהוי אמיתי.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500">סניף</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={!!user.branch} className="mt-1 w-full bg-white border rounded-xl px-3 py-2.5 text-sm disabled:opacity-60" style={{ borderColor: C.line }}>
            {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500">מיקום</label>
          <div className="mt-1 grid grid-cols-2 gap-1 bg-white rounded-xl p-1" style={{ border: `1px solid ${C.line}` }}>
            {(['store', 'back'] as Place[]).map((p) => (
              <button key={p} onClick={() => setPlace(p)} className="rounded-lg py-1.5 text-sm font-bold transition" style={place === p ? { background: C.green, color: '#fff' } : { color: '#78716C' }}>
                {p === 'store' ? 'חנות' : 'מחסן'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {stage === 'setup' && (
        <button onClick={() => setStage('capture')} className="w-full border-2 border-dashed rounded-2xl py-16 flex flex-col items-center gap-3 bg-white active:opacity-80" style={{ borderColor: '#D6D3D1', color: '#A8A29E' }}>
          <div className="rounded-2xl p-4" style={{ background: C.yellow }}><Camera className="w-9 h-9" style={{ color: C.green }} /></div>
          <span className="text-sm font-bold" style={{ color: C.green }}>פתח מצלמה</span>
          <span className="text-xs">הניתוח מתחיל אוטומטית</span>
        </button>
      )}

      {stage === 'error' && (
        <div className="space-y-3">
          <div className="text-sm rounded-xl p-3 flex gap-2" style={{ background: '#FEE2E2', color: '#B91C1C' }}><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{err}</div>
          <button onClick={() => setStage('capture')} className="w-full rounded-xl py-4 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: C.yellow, color: C.green }}><ScanLine className="w-5 h-5" /> נסה שוב</button>
        </div>
      )}

      {(stage === 'confirm' || stage === 'review') && isDemo && (
        <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: '#FEF3C7', color: '#92660A' }}>
          <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
          <span><b>תוצאה מדומה (מצב דמו).</b> הזיהוי לא ניתח את התמונה. הגדר מפתח זיהוי (סמל המפתח למעלה) לזיהוי אמיתי.</span>
        </div>
      )}

      {stage === 'confirm' && items[0] && (
        <div className="space-y-3">
          {lastUrl && <img src={lastUrl} alt="דוכן" className="w-full rounded-2xl object-cover max-h-56" />}
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-1" style={{ color: C.leaf }} />
            <p className="text-2xl font-extrabold" style={{ color: C.green }}>{items[0].product}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: C.green }}>{kg(items[0].weightKg)}</p>
            <p className="text-xs text-stone-400 mt-1">{items[0].bulk ? 'בתפזורת' : `${items[0].count} יח׳ × ${items[0].unitG} גרם`} · ביטחון {Math.round(items[0].confidence * 100)}%</p>
          </div>
          <button onClick={addMore} className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: '#fff', color: C.green, border: `1px solid ${C.line}` }}><ImagePlus className="w-5 h-5" /> הוסף תמונה לדיוק</button>
          <div className="flex gap-2">
            <button onClick={() => setStage('review')} className="flex-1 bg-stone-100 text-stone-600 rounded-xl py-3 font-semibold active:scale-[0.98]">תקן</button>
            <button onClick={save} className="flex-1 rounded-xl py-3 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: C.green, color: '#fff' }}><Check className="w-5 h-5" /> שמור למלאי</button>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-3">
          {lastUrl && <img src={lastUrl} alt="דוכן" className="w-full rounded-2xl object-cover max-h-48" />}
          {confMsg ? (
            <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={confMsg.tone === 'up' ? { background: C.greenSoft, color: C.green } : confMsg.tone === 'down' ? { background: '#FEF3C7', color: '#92660A' } : { background: '#F5F5F4', color: '#78716C' }}>
              {confMsg.tone === 'up' ? <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" /> : confMsg.tone === 'down' ? <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{confMsg.text}</span>
            </div>
          ) : (
            <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: C.greenSoft, color: C.green }}><Check className="w-4 h-4" /> בדוק ותקן לפני שמירה.</div>
          )}
          {items.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <input value={r.product} onChange={(e) => editRow(i, { product: e.target.value })} className="font-bold bg-transparent border-b border-transparent focus:border-stone-300 outline-none" style={{ color: C.green }} />
                <div className="flex items-center gap-1.5">
                  {r.isNew && <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: '#E0F2FE', color: '#0369A1' }}>חדש</span>}
                  <span className="text-[10px] rounded-full px-2 py-0.5" style={r.confidence < CONFIDENCE_THRESHOLD ? { background: '#FEF3C7', color: '#92660A' } : { background: '#F5F5F4', color: '#78716C' }}>ביטחון {Math.round(r.confidence * 100)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {!r.bulk ? (
                  <>
                    <NumField label="יחידות" value={r.count ?? 0} onChange={(v) => editRow(i, { count: Number(v) || 0 })} />
                    <NumField label="גרם ליח׳" value={r.unitG} onChange={(v) => editRow(i, { unitG: Number(v) || 0 })} />
                  </>
                ) : (
                  <NumField label='משקל (ק״ג)' value={r.weightKg} onChange={(v) => editRow(i, { weightKg: Number(v) || 0 })} wide />
                )}
                <div><p className="text-[11px] text-stone-400 mb-1">סה״כ</p><p className="font-extrabold py-2" style={{ color: C.green }}>{kg(r.weightKg)}</p></div>
              </div>
            </div>
          ))}
          <button onClick={addMore} className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: '#fff', color: C.green, border: `1px solid ${C.line}` }}><ImagePlus className="w-5 h-5" /> הוסף תמונה לדיוק</button>
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 bg-stone-100 text-stone-600 rounded-xl py-3 font-semibold active:scale-[0.98]">צלם מחדש</button>
            <button onClick={save} className="flex-1 rounded-xl py-3 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: C.green, color: '#fff' }}><Check className="w-5 h-5" /> שמור למלאי</button>
          </div>
        </div>
      )}

      {stage === 'saved' && (
        <div className="space-y-4 pt-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="inline-flex rounded-full p-3 mb-2" style={{ background: C.greenSoft }}><Check className="w-8 h-8" style={{ color: C.green }} /></div>
            <p className="font-extrabold text-lg" style={{ color: C.green }}>נשמר במלאי</p>
            <p className="text-sm text-stone-500 mt-1">{items.map((i) => `${i.product} ${kg(i.weightKg)}`).join(' · ')}</p>
            <p className="text-xs text-stone-400 mt-1">{branchObj.name} · {place === 'store' ? 'חנות' : 'מחסן'}</p>
          </div>
          <button onClick={retake} className="w-full rounded-xl py-4 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: C.yellow, color: C.green }}><ScanLine className="w-5 h-5" /> סרוק דוכן נוסף</button>
          <button onClick={backHome} className="w-full bg-stone-100 text-stone-600 rounded-xl py-3 font-semibold active:scale-[0.98]">סיום</button>
        </div>
      )}

      {showKeySheet && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-3 max-w-md mx-auto" style={{ paddingBottom: 30 }}>
            <div className="mx-auto mb-1" style={{ width: 40, height: 4, borderRadius: 99, background: '#E7E5E1' }} />
            <h3 className="font-extrabold text-lg flex items-center gap-2" style={{ color: C.green }}><KeyRound className="w-5 h-5" /> הגדרות זיהוי AI</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              הדבק מפתח API של Anthropic כדי להפעיל זיהוי אמיתי של התמונות (מתקבל ב-platform.claude.com).
              המפתח נשמר במכשיר זה בלבד. ללא מפתח — האפליקציה רצה במצב דמו עם תוצאות מדומות.
            </p>
            <input
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-..."
              dir="ltr"
              autoComplete="off"
              className="w-full bg-stone-50 border rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
              style={{ borderColor: C.line }}
            />
            <p className="text-[11px] text-stone-400 leading-relaxed">
              לפיילוט בלבד: בגרסת הייצור הזיהוי יעבור דרך שרת, והמפתח לא יישמר במכשירים.
            </p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowKeySheet(false)} className="flex-1 bg-stone-100 text-stone-600 rounded-xl py-3 font-semibold active:scale-[0.98]">ביטול</button>
              <button onClick={saveKey} className="flex-1 rounded-xl py-3 font-extrabold active:scale-[0.98]" style={{ background: C.green, color: '#fff' }}>שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
