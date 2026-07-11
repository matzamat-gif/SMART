// Builds and advances a LocalScan through the 4-step loop. Pure helpers around the
// rules engine — no React, no I/O, so it's trivially testable.

import type { CVDetection } from '../lib/cv-contract';
import type { ProduceItemConfig, LocalScan, ScanItem, EstimateSource, ScanType } from '../types/domain';
import { estimateWeight, calculateGap, CONFIDENCE_LOW_THRESHOLD } from '../lib/rules';

function uuid(): string {
  return crypto.randomUUID(); // client-generated → idempotency key for retries
}

export function buildDraft(params: {
  store_id: string;
  chain_id: string;
  scan_type: ScanType;
  estimate_source: EstimateSource;
  detections: CVDetection[];
  catalog: ProduceItemConfig[];
  quotas: Map<string, number>;
  image_ids: string[];
}): LocalScan {
  const byClass = new Map(params.catalog.map((c) => [c.roboflow_class, c]));

  const items: ScanItem[] = [];
  for (const d of params.detections) {
    const item = byClass.get(d.class);
    if (!item) continue;
    const quota = params.quotas.get(item.id) ?? 0;
    const gap = calculateGap(d.count, item, quota);
    items.push({
      produce_item_id: item.id,
      name_he: item.name_he,
      detected_units: d.count,
      confirmed_units: null,
      confidence: d.confidence,
      unit_weight_kg: item.unit_weight_kg,
      depth_multiplier: item.depth_multiplier,
      daily_quota_kg: quota,
      total_weight_kg: gap.total_weight_kg,
      gap_kg: gap.gap_kg,
      gap_pct: gap.gap_pct,
      shortage_status: gap.shortage_status,
      is_low_confidence: d.confidence < CONFIDENCE_LOW_THRESHOLD,
      user_corrected: false,
    });
  }

  // Low-confidence first (needs attention), then by gap severity.
  items.sort((a, b) =>
    a.is_low_confidence !== b.is_low_confidence
      ? a.is_low_confidence ? -1 : 1
      : b.gap_kg - a.gap_kg
  );

  return {
    scan_id: uuid(),
    store_id: params.store_id,
    chain_id: params.chain_id,
    scan_type: params.scan_type,
    status: 'draft_local',
    estimate_source: params.estimate_source,
    items,
    image_ids: params.image_ids,
    created_at: new Date().toISOString(),
  };
}

// Apply a manager correction to one item and recompute its weight/gap via the rules.
export function correctItem(scan: LocalScan, itemId: string, units: number, catalog: ProduceItemConfig[]): LocalScan {
  const item = catalog.find((c) => c.id === itemId);
  if (!item) return scan;
  return {
    ...scan,
    items: scan.items.map((it) => {
      if (it.produce_item_id !== itemId) return it;
      const gap = calculateGap(units, item, it.daily_quota_kg);
      return {
        ...it,
        confirmed_units: units,
        user_corrected: units !== it.detected_units,
        total_weight_kg: estimateWeight(units, item),
        gap_kg: gap.gap_kg,
        gap_pct: gap.gap_pct,
        shortage_status: gap.shortage_status,
      };
    }),
  };
}

// Confirmation gate: every item must have a confirmed count before submit.
export function allConfirmed(scan: LocalScan): boolean {
  return scan.items.every((it) => it.confirmed_units !== null);
}

export function totals(scan: LocalScan): { weight: number; gap: number } {
  return scan.items.reduce(
    (acc, it) => ({ weight: acc.weight + it.total_weight_kg, gap: acc.gap + it.gap_kg }),
    { weight: 0, gap: 0 }
  );
}
