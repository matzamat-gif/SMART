// Dev seed so the scaffold runs standalone (no backend needed). In production the catalog
// and quotas are synced from the server into IndexedDB. Values mirror the pilot catalog CSV.
import type { ProduceItemConfig, QuotaConfig } from '../types/domain';

export const SEED_CATALOG: ProduceItemConfig[] = [
  { id: 'i-tomato', name_he: 'עגבנייה', category: 'vegetables', unit_weight_kg: 0.120, depth_multiplier: 1.8, roboflow_class: 'tomato' },
  { id: 'i-cucumber', name_he: 'מלפפון', category: 'vegetables', unit_weight_kg: 0.110, depth_multiplier: 1.6, roboflow_class: 'cucumber' },
  { id: 'i-pepper', name_he: 'פלפל', category: 'vegetables', unit_weight_kg: 0.160, depth_multiplier: 1.4, roboflow_class: 'bell_pepper' },
  { id: 'i-banana', name_he: 'בננה', category: 'fruits', unit_weight_kg: 0.120, depth_multiplier: 1.2, roboflow_class: 'banana' },
  { id: 'i-apple', name_he: 'תפוח עץ', category: 'fruits', unit_weight_kg: 0.170, depth_multiplier: 1.8, roboflow_class: 'apple' },
];

export const SEED_QUOTAS: QuotaConfig[] = [
  { produce_item_id: 'i-tomato', quota_kg: 25 },
  { produce_item_id: 'i-cucumber', quota_kg: 15 },
  { produce_item_id: 'i-pepper', quota_kg: 12 },
  { produce_item_id: 'i-banana', quota_kg: 10 },
  { produce_item_id: 'i-apple', quota_kg: 18 },
];
