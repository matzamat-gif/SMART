// Client-side subset of the shared domain types.
// Kept in sync with backend src/shared/types/domain.ts — the server is the source of truth.

export type ScanType = 'morning' | 'midday' | 'manual';

export type ShortageStatus =
  | 'unconfirmed' | 'out_of_stock' | 'critical' | 'moderate' | 'surplus' | 'ok';

// Local-only lifecycle status for a scan on the device (see Stage 2 spec §6).
export type LocalScanStatus =
  | 'draft_local'      // estimate produced (cloud detect OR offline heuristic), awaiting confirm
  | 'confirmed_local'  // manager approved
  | 'queued'           // confirmed but offline — sitting in the outbox
  | 'syncing'
  | 'submitted'        // accepted by chain (online path, or reconciled-agree)
  | 'needs_review'     // cloud reconciliation found a conflict — awaiting re-approval
  | 'failed';

export type EstimateSource = 'cloud' | 'heuristic';

export interface ProduceItemConfig {
  id: string;
  name_he: string;
  category: 'vegetables' | 'fruits' | 'herbs';
  unit_weight_kg: number;
  depth_multiplier: number;
  roboflow_class: string;
}

export interface QuotaConfig {
  produce_item_id: string;
  quota_kg: number;
}

export interface ScanItem {
  produce_item_id: string;
  name_he: string;
  detected_units: number;
  confirmed_units: number | null;
  confidence: number;          // composite confidence 0..1 (see Stage 1 plan §3)
  unit_weight_kg: number;
  depth_multiplier: number;
  daily_quota_kg: number;
  total_weight_kg: number;
  gap_kg: number;
  gap_pct: number;
  shortage_status: ShortageStatus;
  is_low_confidence: boolean;
  user_corrected: boolean;
}

export interface LocalScan {
  scan_id: string;             // client-generated UUID — idempotency key
  store_id: string;
  chain_id: string;
  scan_type: ScanType;
  status: LocalScanStatus;
  estimate_source: EstimateSource;
  items: ScanItem[];
  image_ids: string[];         // keys into the `images` store (full blobs, offline only)
  created_at: string;
}
