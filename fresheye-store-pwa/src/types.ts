export type Role = 'clerk' | 'manager' | 'exec';

export interface Branch {
  id: string;
  name: string;
  short: string;
  addr: string;
  tel: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  branch: string | null;
}

export type DeptId = 'fruit' | 'veg';

export interface Dept {
  id: DeptId;
  name: string;
}

export interface Subcat {
  id: string;
  dept: DeptId;
  name: string;
}

export interface CatalogEntry {
  unitG: number; // average unit weight in grams (0 = bulk)
  boxKg: number; // standard box weight, kg (bulk estimation anchor)
  par: number; // desired stand quota, kg
  reorder: number; // reorder point, kg
  bulk: boolean;
  cat: string | null; // subcat id
  freshH: number; // freshness threshold, hours
  calib: number; // manual-correction counter
}

export type Catalog = Record<string, CatalogEntry>;

export interface InventorySnapshot {
  kg: number; // store/stand kg
  at: number | null; // store timestamp
  by: string | null;
  conf: number | null; // AI confidence 0..1
  backKg: number; // warehouse/back kg
  backAt: number | null;
  backBy: string | null;
}

export type BranchInventory = Record<string, InventorySnapshot>;
export type Inventory = Record<string, BranchInventory>;

export interface LogEntry {
  id: string;
  branchId: string;
  by: string;
  when: number;
  kind: 'scan' | 'waste' | 'approve' | 'reject';
  items: { product: string; kg: number; place: Place }[];
}

export type Place = 'store' | 'back';

export type StatusKey = 'ok' | 'low' | 'crit';

export interface StatusInfo {
  key: StatusKey;
  label: string;
  bg: string;
  fg: string;
  bar: string;
  dot: string;
}

export interface ScanItem {
  product: string;
  count: number | null;
  unitG: number;
  bulk: boolean;
  weightKg: number;
  confidence: number;
  isNew: boolean;
}
