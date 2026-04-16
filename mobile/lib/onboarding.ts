/**
 * Helpers for the onboarding flow.
 *
 * The user picks language, location, and brand/color preferences before
 * they have an auth token (DEV-007). We persist those locally and replay
 * them after registration so the data isn't silently dropped.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_PREFERENCES_KEY = 'pendingOnboardingPreferences';

// Threshold at which we consider the wardrobe "ready" for the user's
// first daily outfit recommendation. Strategy 1 in the market analysis:
// "First outfit before the wardrobe is complete" — show value before the
// user finishes setup, ideally at 8–10 items across 3–4 categories.
export const FIRST_OUTFIT_ITEM_THRESHOLD = 8;
export const FIRST_OUTFIT_CATEGORY_THRESHOLD = 3;

// "Complete enough" threshold for unlocking optional surfaces and removing
// the wardrobe-completeness nag. The market analysis cites 30 items as the
// point at which recommendations become consistently useful.
export const WARDROBE_COMPLETE_ITEM_THRESHOLD = 30;

export interface PendingPreferences {
  preferred_brands?: string;
  preferred_colors?: string;
  city?: string;
  primary_language?: string;
}

export async function setPendingPreferences(patch: PendingPreferences): Promise<void> {
  const existingRaw = await AsyncStorage.getItem(PENDING_PREFERENCES_KEY);
  const existing: PendingPreferences = existingRaw ? safeParse(existingRaw) : {};
  const merged = { ...existing, ...patch };
  await AsyncStorage.setItem(PENDING_PREFERENCES_KEY, JSON.stringify(merged));
}

export async function getPendingPreferences(): Promise<PendingPreferences | null> {
  const raw = await AsyncStorage.getItem(PENDING_PREFERENCES_KEY);
  if (!raw) return null;
  return safeParse(raw);
}

export async function clearPendingPreferences(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
}

function safeParse<T = any>(json: string): T {
  try {
    return JSON.parse(json);
  } catch {
    return {} as T;
  }
}

/** Compute the wardrobe completeness score (0–100). */
export function computeCompletenessScore(items: { category?: string }[]): {
  score: number;
  totalItems: number;
  filledCategories: number;
  missingCategories: string[];
  perCategory: Record<string, number>;
} {
  const required = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];
  const perCategory: Record<string, number> = {};
  for (const r of required) perCategory[r] = 0;
  for (const item of items) {
    const cat = (item.category || '').toLowerCase();
    if (cat in perCategory) perCategory[cat] += 1;
  }
  const filledCategories = required.filter((c) => perCategory[c] > 0).length;
  const totalItems = items.length;

  // Score blends item count (60% weight) and category coverage (40%).
  const itemScore = Math.min(totalItems / WARDROBE_COMPLETE_ITEM_THRESHOLD, 1) * 60;
  const categoryScore = (filledCategories / required.length) * 40;
  const score = Math.round(itemScore + categoryScore);

  return {
    score,
    totalItems,
    filledCategories,
    missingCategories: required.filter((c) => perCategory[c] === 0),
    perCategory,
  };
}

export function isReadyForFirstOutfit(items: { category?: string }[]): boolean {
  if (items.length < FIRST_OUTFIT_ITEM_THRESHOLD) return false;
  const cats = new Set(items.map((i) => (i.category || '').toLowerCase()).filter(Boolean));
  return cats.size >= FIRST_OUTFIT_CATEGORY_THRESHOLD;
}
