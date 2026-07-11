// Offline "best-effort" estimate — a coarse heuristic, NOT a CV model (Stage 2 spec §5).
// Used only when the user consciously chooses to work offline. Every result is flagged
// temporary and is re-analyzed by the cloud on reconnect.
//
// This is intentionally crude: it cannot see the produce. It seeds a starting number
// the manager corrects by hand. Real accuracy comes from the cloud re-analysis.

import type { ProduceItemConfig } from '../types/domain';

export interface HeuristicInput {
  item: ProduceItemConfig;
  // Manager-provided coarse fill level of the stand, 0..1 (e.g. from a slider).
  frameFill: number;
  // Approx units a full stand holds for this item — a per-item constant to calibrate.
  fullStandUnits: number;
}

export function heuristicUnits({ frameFill, fullStandUnits }: HeuristicInput): number {
  const clamped = Math.max(0, Math.min(1, frameFill));
  return Math.round(clamped * fullStandUnits);
}
