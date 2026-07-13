// Vision AI — spec §6.
//
// Two modes:
//
// 1. REAL (API key configured): calls the Anthropic Messages API directly from
//    the browser with the photo(s) as base64 image blocks and a catalog-aware
//    Hebrew prompt. The prompt instructs the model to return an EMPTY items
//    list when the photo does not show a produce stand — so a selfie or a
//    random photo yields "לא זוהו מוצרים" instead of a fake detection.
//
//    ⚠️ Direct browser access requires the user's own API key, stored only in
//    this device's localStorage. That is acceptable for a pilot on trusted
//    store devices; for production the call must move behind a backend proxy
//    so no key ever ships to the client (swap the fetch URL for /api/scan —
//    nothing else in the app changes).
//
// 2. DEMO (no key): returns preset fake detections so screens stay exercisable
//    without any backend. The UI labels these results as simulated.

import type { Catalog } from '../types';

export interface RawDetection {
  product: string;
  count: number | null;
  unitWeightGrams: number;
  totalWeightGrams: number;
  confidence: number;
}

export interface CapturedImage {
  b64: string;
  mediaType: string;
  url: string;
}

export interface AnalysisResult {
  items: RawDetection[];
  demo: boolean; // true when the result is simulated, not derived from the photo
}

const API_KEY_STORAGE = 'noy_vision_api_key_v1';
// Model per the product spec (אפיון מפתח §2.1 / §6).
const VISION_MODEL = 'claude-sonnet-4-6';

export function getApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(API_KEY_STORAGE, key.trim());
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // storage unavailable (private mode) — key just won't persist
  }
}

export const hasApiKey = (): boolean => getApiKey().length > 0;

// Catalog-aware prompt, spec §6: send the known product list + calibrated unit
// weights and ask the model to pick names from it. Explicitly demands an empty
// result for non-produce photos and honest confidence.
function buildPrompt(catalog: Catalog, imageCount: number): string {
  const catalogLines = Object.entries(catalog)
    .map(([name, c]) => `- ${name}${c.bulk ? ' (תפזורת)' : ` (~${c.unitG} גרם ליחידה)`}`)
    .join('\n');
  return `אתה מנתח תמונה מחנות ירקות ופירות "נוי השדה". המטרה: לזהות אילו מוצרים נמצאים על הדוכן, לספור יחידות ולהעריך משקל.

כללי ברזל:
1. אם התמונה אינה מציגה דוכן/תצוגה/ארגזים של פירות או ירקות (למשל: אדם, חדר, מסך, חפץ אחר) — החזר {"items":[]} בלבד. לעולם אל תמציא מוצר.
2. היה כן לגבי confidence: תמונה מטושטשת, חלקית או עמוסה = ביטחון נמוך. אל תנפח את הערך.
3. בדרך כלל דוכן אחד מכיל מוצר אחד. אם יש כמה מוצרים ברורים — החזר פריט לכל אחד.
4. ספירה: שורות × עמודות × שכבות. בערימה עמוקה הערך גם יחידות מוסתרות, לא רק את הנראות.

הקטלוג המוכר (העדף שם מהרשימה, ביחיד):
${catalogLines}

לכל מוצר החזר:
- product: שם בעברית, יחיד וסטנדרטי, מהקטלוג אם קיים
- count: מספר יחידות (null אם תפזורת כמו ענבים/תות/פטריות)
- unitWeightGrams: משקל ממוצע ליחידה בגרמים (0 אם תפזורת)
- totalWeightGrams: הערכת משקל כולל בגרמים (חובה תמיד)
- confidence: 0 עד 1

${imageCount > 1 ? `יש ${imageCount} תמונות של אותו דוכן מזוויות שונות — שלב אותן להערכה מדויקת יותר.\n` : ''}החזר JSON בלבד, בלי טקסט נוסף ובלי backticks:
{"items":[{"product":"","count":0,"unitWeightGrams":0,"totalWeightGrams":0,"confidence":0}]}`;
}

function parseItems(text: string): RawDetection[] {
  if (!text) return [];
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s === -1 || e === -1) return [];
  try {
    const parsed = JSON.parse(clean.slice(s, e + 1));
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function analyzeReal(images: CapturedImage[], catalog: Catalog): Promise<RawDetection[]> {
  const content: unknown[] = images.map((im) => ({
    type: 'image',
    source: { type: 'base64', media_type: im.mediaType, data: im.b64 },
  }));
  content.push({ type: 'text', text: buildPrompt(catalog, images.length) });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('מפתח ה-API אינו תקין. בדוק אותו בהגדרות הזיהוי.');
    if (res.status === 429) throw new Error('חרגת ממכסת הבקשות. נסה שוב בעוד רגע.');
    throw new Error(`שגיאת שרת הזיהוי (${res.status}). נסה שוב.`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('')
    .trim();
  return parseItems(text);
}

// ---- Demo mode (no key configured) ----

const MOCK_PRESETS: RawDetection[][] = [
  [{ product: 'עגבנייה', count: 14, unitWeightGrams: 110, totalWeightGrams: 1540, confidence: 0.71 }],
  [{ product: 'בננה', count: 32, unitWeightGrams: 120, totalWeightGrams: 3840, confidence: 0.66 }],
  [{ product: 'תפוח עץ', count: 26, unitWeightGrams: 180, totalWeightGrams: 4680, confidence: 0.73 }],
  [{ product: 'ענבים', count: null, unitWeightGrams: 0, totalWeightGrams: 5200, confidence: 0.62 }],
  [{ product: 'פלפל אדום', count: 9, unitWeightGrams: 160, totalWeightGrams: 1440, confidence: 0.6 }],
  [
    { product: 'עגבנייה', count: 12, unitWeightGrams: 110, totalWeightGrams: 1320, confidence: 0.55 },
    { product: 'מלפפון', count: 18, unitWeightGrams: 120, totalWeightGrams: 2160, confidence: 0.58 },
  ],
];

function mockAnalysis(presetIdx: number, imgCount: number): RawDetection[] {
  const base = MOCK_PRESETS[presetIdx % MOCK_PRESETS.length];
  const boost = Math.min(0.27, 0.1 * (imgCount - 1));
  return base.map((it) => ({ ...it, confidence: Math.min(0.98, it.confidence + boost) }));
}

export async function analyzePhoto(images: CapturedImage[], catalog: Catalog, presetIdx: number): Promise<AnalysisResult> {
  if (hasApiKey()) {
    return { items: await analyzeReal(images, catalog), demo: false };
  }
  await new Promise((r) => setTimeout(r, 300));
  return { items: mockAnalysis(presetIdx, images.length), demo: true };
}

// Catalog-aware name matching, spec §6: normalize → exact → containment → edit distance ≤ 2.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/["'׳״]/g, '');
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function matchCatalogName(detected: string, catalogNames: string[]): string {
  const n = normalize(detected);
  for (const name of catalogNames) if (normalize(name) === n) return name;
  for (const name of catalogNames) {
    const cn = normalize(name);
    if (cn.includes(n) || n.includes(cn)) return name;
  }
  let best: string | null = null;
  let bestDist = 3;
  for (const name of catalogNames) {
    const d = levenshtein(n, normalize(name));
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best ?? detected;
}
