import { useEffect, useState } from 'react';
import { DeviceFrame } from './components/DeviceFrame';
import { Header } from './components/Chrome';
import { CameraScreen } from './screens/CameraScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { GapScreen } from './screens/GapScreen';
import { SubmitScreen } from './screens/SubmitScreen';
import { isOnline, onConnectivityChange } from './lib/connectivity';
import { getCatalog, saveCatalog, getQuotas, saveQuotas, saveScan, saveImage, enqueue } from './lib/db';
import { SEED_CATALOG, SEED_QUOTAS } from './lib/seed';
import { detect } from './lib/api';
import { submitScan } from './lib/api';
import { buildDraft, correctItem, allConfirmed } from './state/scanMachine';
import type { ProduceItemConfig, LocalScan } from './types/domain';
import { heuristicUnits } from './lib/heuristic';

// Demo mode simulates a successful submit so the loop completes without a backend.
// Set VITE_DEMO=false once the real API is wired.
const DEMO = (import.meta.env.VITE_DEMO ?? 'true') !== 'false';

const STORE_ID = 'store-pilot-1';
const CHAIN_ID = 'chain-noy-hasade';

type Step = 'camera' | 'review' | 'gap' | 'submit';

export default function App() {
  const [online, setOnline] = useState(isOnline());
  const [offlineOptIn, setOfflineOptIn] = useState(false);
  const [catalog, setCatalog] = useState<ProduceItemConfig[]>([]);
  const [quotas, setQuotas] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<Step>('camera');
  const [scan, setScan] = useState<LocalScan | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => onConnectivityChange(setOnline), []);

  // Load catalog/quotas from IndexedDB; seed on first run.
  useEffect(() => {
    (async () => {
      let cat = await getCatalog();
      if (cat.length === 0) { await saveCatalog(SEED_CATALOG); await saveQuotas(SEED_QUOTAS); cat = SEED_CATALOG; }
      setCatalog(cat);
      setQuotas(await getQuotas());
    })();
  }, []);

  async function handleCapture(image: Blob) {
    const useOnline = online;
    const classes = catalog.map((c) => c.roboflow_class);

    let detections;
    let source: 'cloud' | 'heuristic';
    if (useOnline) {
      detections = (await detect(image, classes)).detections; // STUB until Stage 1 gate
      source = 'cloud';
    } else {
      // Offline: coarse heuristic per item (frameFill defaulted mid; manager corrects next).
      detections = catalog.slice(0, 3).map((c) => ({
        class: c.roboflow_class,
        count: heuristicUnits({ item: c, frameFill: 0.5, fullStandUnits: 80 }),
        confidence: 0.4,
      }));
      source = 'heuristic';
    }

    const draft = buildDraft({
      store_id: STORE_ID, chain_id: CHAIN_ID, scan_type: 'morning',
      estimate_source: source, detections, catalog, quotas, image_ids: ['img-1'],
    });
    await saveImage('img-1', draft.scan_id, image); // full image kept for cloud re-analysis
    await saveScan(draft);
    setScan(draft);
    setStep('review');
  }

  function handleCorrect(itemId: string, units: number) {
    setScan((s) => (s ? correctItem(s, itemId, units, catalog) : s));
  }

  function handleConfirmAll() {
    setScan((s) => {
      if (!s) return s;
      // Any untouched item is confirmed at its detected count (explicit approval).
      const confirmed = { ...s, items: s.items.map((it) => ({
        ...it, confirmed_units: it.confirmed_units ?? it.detected_units,
      })) };
      saveScan(confirmed);
      return confirmed;
    });
    setStep('gap');
  }

  async function handleSubmit() {
    if (!scan) return;
    if (online) {
      try {
        if (!DEMO) await submitScan(scan.scan_id, STORE_ID);
        const submitted = { ...scan, status: 'submitted' as const };
        await saveScan(submitted); setScan(submitted);
      } catch {
        await enqueue(scan.scan_id);
        const queued = { ...scan, status: 'queued' as const };
        await saveScan(queued); setScan(queued);
      }
    } else {
      await enqueue(scan.scan_id); // outbox → background sync re-analyzes on reconnect
      const queued = { ...scan, status: 'queued' as const };
      await saveScan(queued); setScan(queued);
    }
    setDone(true);
  }

  return (
    <DeviceFrame>
      <Header online={online} />
      {step === 'camera' && (
        <CameraScreen online={online} offlineOptIn={offlineOptIn}
          onOfflineOptIn={() => setOfflineOptIn(true)} onCapture={handleCapture} />
      )}
      {step === 'review' && scan && (
        <ReviewScreen scan={scan} catalog={catalog} onCorrect={handleCorrect}
          onConfirmAll={handleConfirmAll} canAdvance={allConfirmed({ ...scan,
            items: scan.items.map((it) => ({ ...it, confirmed_units: it.confirmed_units ?? it.detected_units })) })} />
      )}
      {step === 'gap' && scan && <GapScreen scan={scan} onContinue={() => setStep('submit')} />}
      {step === 'submit' && scan && (
        <SubmitScreen scan={scan} online={online} done={done} onSubmit={handleSubmit} />
      )}
    </DeviceFrame>
  );
}
