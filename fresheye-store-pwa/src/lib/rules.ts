// Pure rules engine — weight + gap. Zero AI, zero side effects.
// Mirrors backend src/modules/scan/rules-engine.ts. The server remains authoritative;
// this client copy exists so weight/gap can be shown instantly and offline.

import type { ProduceItemConfig, ShortageStatus } from '../types/domain';

export const CONFIDENCE_LOW_THRESHOLD = 0.70;

const SHORTAGE_CRITICAL_PCT = 60;
const SHORTAGE_MODERATE_PCT = 30;
const SURPLUS_MULTIPLIER = 1.5;

export function estimateWeight(units: number, item: ProduceItemConfig): number {
  return units * item.unit_weight_kg * item.depth_multiplier;
}

export function weightBreakdown(units: number, item: ProduceItemConfig): string {
  const w = estimateWeight(units, item);
  const depth = item.depth_multiplier !== 1 ? ` × ${item.depth_multiplier} עומק` : '';
  return `${units} יח' × ${item.unit_weight_kg.toFixed(3)} ק"ג${depth} = ${w.toFixed(2)} ק"ג`;
}

export interface GapResult {
  total_weight_kg: number;
  gap_kg: number;
  gap_pct: number;
  shortage_status: ShortageStatus;
}

export function calculateGap(units: number, item: ProduceItemConfig, quotaKg: number): GapResult {
  const weight = estimateWeight(units, item);
  const gap = Math.max(0, quotaKg - weight);
  const gapPct = quotaKg > 0 ? (gap / quotaKg) * 100 : 0;

  let status: ShortageStatus;
  if (weight === 0) status = 'out_of_stock';
  else if (gapPct > SHORTAGE_CRITICAL_PCT) status = 'critical';
  else if (gapPct > SHORTAGE_MODERATE_PCT) status = 'moderate';
  else if (weight > quotaKg * SURPLUS_MULTIPLIER) status = 'surplus';
  else status = 'ok';

  return {
    total_weight_kg: weight,
    gap_kg: gap,
    gap_pct: Math.round(gapPct * 100) / 100,
    shortage_status: status,
  };
}
