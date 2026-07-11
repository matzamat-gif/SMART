// Local persistence (IndexedDB via idb). Enables scanning with no network and holds the
// outbox + full images until cloud reconciliation succeeds (Stage 2 spec §6, §8).

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ProduceItemConfig, QuotaConfig, LocalScan } from '../types/domain';

interface FreshEyeDB extends DBSchema {
  catalog: { key: string; value: ProduceItemConfig };
  quotas: { key: string; value: QuotaConfig };
  scans: { key: string; value: LocalScan; indexes: { by_status: string } };
  outbox: { key: string; value: { scan_id: string; queued_at: string } };
  images: { key: string; value: { image_id: string; scan_id: string; blob: Blob } };
}

let _db: Promise<IDBPDatabase<FreshEyeDB>> | null = null;

export function db(): Promise<IDBPDatabase<FreshEyeDB>> {
  if (_db) return _db;
  _db = openDB<FreshEyeDB>('fresheye', 1, {
    upgrade(d) {
      d.createObjectStore('catalog', { keyPath: 'id' });
      d.createObjectStore('quotas', { keyPath: 'produce_item_id' });
      const scans = d.createObjectStore('scans', { keyPath: 'scan_id' });
      scans.createIndex('by_status', 'status');
      d.createObjectStore('outbox', { keyPath: 'scan_id' });
      d.createObjectStore('images', { keyPath: 'image_id' });
    },
  });
  return _db;
}

// ── Catalog + quotas (synced copies so scans work offline) ──
export async function saveCatalog(items: ProduceItemConfig[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('catalog', 'readwrite');
  await Promise.all(items.map((i) => tx.store.put(i)));
  await tx.done;
}
export async function getCatalog(): Promise<ProduceItemConfig[]> {
  return (await db()).getAll('catalog');
}
export async function saveQuotas(q: QuotaConfig[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('quotas', 'readwrite');
  await Promise.all(q.map((x) => tx.store.put(x)));
  await tx.done;
}
export async function getQuotas(): Promise<Map<string, number>> {
  const rows = await (await db()).getAll('quotas');
  return new Map(rows.map((r) => [r.produce_item_id, r.quota_kg]));
}

// ── Scans + outbox + images ──
export async function saveScan(scan: LocalScan): Promise<void> {
  await (await db()).put('scans', scan);
}
export async function getScan(id: string): Promise<LocalScan | undefined> {
  return (await db()).get('scans', id);
}
export async function enqueue(scanId: string): Promise<void> {
  await (await db()).put('outbox', { scan_id: scanId, queued_at: new Date().toISOString() });
}
export async function dequeue(scanId: string): Promise<void> {
  await (await db()).delete('outbox', scanId);
}
export async function outboxIds(): Promise<string[]> {
  return (await db()).getAllKeys('outbox') as Promise<string[]>;
}
export async function saveImage(image_id: string, scan_id: string, blob: Blob): Promise<void> {
  await (await db()).put('images', { image_id, scan_id, blob });
}
export async function purgeImagesForScan(scanId: string): Promise<void> {
  // Called after reconciliation + sync succeed, so devices don't fill up (spec §8).
  const d = await db();
  const all = await d.getAll('images');
  const tx = d.transaction('images', 'readwrite');
  await Promise.all(all.filter((i) => i.scan_id === scanId).map((i) => tx.store.delete(i.image_id)));
  await tx.done;
}
