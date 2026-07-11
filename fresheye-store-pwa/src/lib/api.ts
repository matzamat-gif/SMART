// API client for the store layer. Real endpoints already exist on the backend
// (scan.router.ts / chain.router.ts). The CV detection call is STUBBED here so the
// scaffold is fully runnable WITHOUT a validated model — swap `detect` for the real
// call once the Stage 1 CV gate is green.

import type { CVDetectionResult } from './cv-contract';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('fresheye_jwt'); // refreshed on reconnect before submit
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── STUB: CV detection ────────────────────────────────────────────────────────
// TODO(Stage 1 gate): replace with real POST /api/scans (multipart image) once the
// Roboflow model + thresholds are validated. Until then this returns deterministic
// fake detections so the whole loop is testable.
export async function detect(_image: Blob, catalogClasses: string[]): Promise<CVDetectionResult> {
  await new Promise((r) => setTimeout(r, 300)); // simulate latency
  const detections = catalogClasses.slice(0, 3).map((cls, i) => ({
    class: cls,
    count: 20 + i * 10,
    confidence: 0.6 + i * 0.12, // one deliberately low to exercise the confidence UI
  }));
  return { detections, stub: true };
}

// ─── Real endpoints (exist today) ──────────────────────────────────────────────
export async function submitScan(scanId: string, storeId: string): Promise<void> {
  const res = await fetch(`${BASE}/scans/${scanId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ store_id: storeId }),
  });
  if (!res.ok) throw new Error(`submit failed: ${res.status}`);
}

// ─── Reconcile (Stage 2 spec §7, §10) — the one NEW backend endpoint to add ─────
// On reconnect, offline scans are re-analyzed in the cloud and compared to what the
// manager approved. Agree (≤15%) → auto-submit. Conflict → needs_review.
export interface ReconcileResult {
  outcome: 'agree' | 'conflict';
  cloud_items?: Array<{ produce_item_id: string; confirmed_units: number }>;
}
export async function reconcile(
  scanId: string,
  image: Blob,
  offlineConfirmed: Array<{ produce_item_id: string; confirmed_units: number }>
): Promise<ReconcileResult> {
  const form = new FormData();
  form.append('client_scan_id', scanId);
  form.append('image', image);
  form.append('offline_confirmed_items', JSON.stringify(offlineConfirmed));
  const res = await fetch(`${BASE}/scans/reconcile`, {
    method: 'POST',
    headers: { ...authHeaders() }, // NOTE: not implemented server-side yet — see spec §10
    body: form,
  });
  if (!res.ok) throw new Error(`reconcile failed: ${res.status}`);
  return res.json();
}
