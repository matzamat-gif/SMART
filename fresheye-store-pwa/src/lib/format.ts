import type { CatalogEntry, StatusInfo } from '../types';
import { C } from './brand';

export const kg = (n: number | null | undefined): string =>
  n == null ? '—' : `${(Math.round(n * 10) / 10).toLocaleString('he-IL')} ק״ג`;

export const nowStr = (): string =>
  new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export const stampFull = (ts: number): string => {
  const d = new Date(ts);
  return `${d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
};

export const ago = (ts: number | null | undefined): string => {
  if (!ts) return 'לא נסרק';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
};

export const stale = (ts: number | null | undefined, freshH = 24): boolean =>
  !ts || Date.now() - ts > freshH * 3600 * 1000;

export function status(current: number, cat: CatalogEntry): StatusInfo {
  if (current <= cat.reorder * 0.5) {
    return { key: 'crit', label: 'קריטי', bg: '#FEE2E2', fg: '#B91C1C', bar: '#E25C5C', dot: '#E25C5C' };
  }
  if (current <= cat.reorder) {
    return { key: 'low', label: 'נמוך', bg: '#FEF3C7', fg: '#92660A', bar: '#F0B429', dot: '#F0B429' };
  }
  return { key: 'ok', label: 'תקין', bg: C.greenSoft, fg: C.green, bar: C.leaf, dot: C.leaf };
}

// depletion-rate ETA, spec §7.3 — only shown when the drop is meaningful (> 0.3kg over the window)
export function depletionEta(prevKg: number, curKg: number, hoursElapsed: number, reorder: number): string | null {
  if (hoursElapsed <= 0) return null;
  const drop = prevKg - curKg;
  if (drop <= 0.3) return null;
  const rate = drop / hoursElapsed; // kg/hour
  if (rate <= 0) return null;
  const hoursLeft = (curKg - reorder) / rate;
  if (!isFinite(hoursLeft) || hoursLeft <= 0) return null;
  if (hoursLeft < 24) return `ייגמר בעוד כ-${Math.round(hoursLeft)} ש׳`;
  return `ייגמר בעוד כ-${Math.round(hoursLeft / 24)} ימים`;
}
