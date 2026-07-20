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
// weights and ask the model to pick names from it. Demands an empty result for
// non-produce photos, a step-by-step counting method, and a strict confidence
// rubric so the reported confidence actually tracks accuracy.
function buildPrompt(catalog: Catalog, imageCount: number): string {
  const catalogLines = Object.entries(catalog)
    .map(([name, c]) => `- ${name}${c.bulk ? ' (תפזורת)' : ` (~${c.unitG} גרם ליחידה)`}`)
    .join('\n');
  return `אתה מומחה לזיהוי וכימות תוצרת חקלאית. נתח תמונה מחנות "נוי השדה": זהה מוצר, ספור יחידות והערך משקל. התוצרת יכולה להיות על דוכן, בארגז, בקערה או על משטח אחר.

שיטת עבודה — בצע בסדר הזה:
1. קבע מה מוצג. אם אין בתמונה פירות או ירקות כלל (אדם, חדר, מסך, חפץ) — החזר {"items":[]} בלבד. לעולם אל תמציא מוצר.
2. זהה את המוצר לפי צבע, צורה, מרקם, גבעול ועלים. השווה לקטלוג שבהמשך. אם אתה מתלבט בין שני מוצרים — בחר את הסביר יותר והורד את הביטחון בהתאם. אל תדווח מוצר שאינך מזהה בבירור.
3. ספור בשיטתיות: קודם יחידות גלויות (שורות × עמודות), ואז הוסף הערכת שכבות מוסתרות לפי עומק הכלי או הערימה. דוגמה: 8 עגבניות גלויות בקערה בעומק של ~2 שכבות → ~16 יחידות. אל תדווח רק את מה שנראה ואל תנפח מעבר לסביר.
4. משקל: למוצר ספיר — count × משקל ליחידה. אם המוצר בקטלוג, השתמש במשקל הקטלוגי (הוא מכויל), אלא אם היחידות בתמונה חריגות בגודלן. לתפזורת — הערך totalWeightGrams לפי נפח.

סולם confidence — היה כן וקפדני, הערך נבדק מול שקילה אמיתית:
- 0.9 ומעלה: רק כשהמוצר ודאי לחלוטין וכל היחידות נראות וניתנות לספירה אחת-אחת.
- 0.7–0.9: המוצר ודאי, אבל חלק מהיחידות מוסתרות והספירה כוללת הערכה.
- 0.5–0.7: המוצר סביר אך התמונה חלקית, מטושטשת או עמוסה; הספירה גסה.
- מתחת ל-0.5: הזיהוי עצמו לא בטוח. אם אינך בטוח מהו המוצר — לעולם אל תעלה מעל 0.5.

הקטלוג המוכר (העדף שם מהרשימה, ביחיד):
${catalogLines}

לכל מוצר החזר:
- product: שם בעברית, יחיד וסטנדרטי, מהקטלוג אם קיים
- count: מספר יחידות (null אם תפזורת כמו ענבים/תות/פטריות)
- unitWeightGrams: משקל ממוצע ליחידה בגרמים (0 אם תפזורת)
- totalWeightGrams: הערכת משקל כולל בגרמים (חובה תמיד)
- confidence: 0 עד 1 לפי הסולם למעלה

${imageCount > 1 ? `יש ${imageCount} תמונות של אותו דוכן מזוויות שונות — שלב אותן: ספור לפי הזווית הברורה ביותר ואמת מול האחרות.\n` : ''}החזר JSON בלבד, בלי טקסט נוסף ובלי backticks:
{"items":[{"product":"","count":0,"unitWeightGrams":0,"totalWeightGrams":0,"confidence":0}]}`;
}

// Phone photos can be 12MP+ — oversized for the API (5MB limit, and detail
// beyond ~1.6K px doesn't help). Downscale client-side before sending.
export function downscaleImage(im: CapturedImage, maxEdge = 1568, quality = 0.85): Promise<CapturedImage> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      if (scale >= 1) { resolve(im); return; }
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', quality);
      resolve({ b64: url.split(',')[1], mediaType: 'image/jpeg', url: im.url });
    };
    img.onerror = () => resolve(im);
    img.src = im.url;
  });
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
  const scaled = await Promise.all(images.map((im) => downscaleImage(im)));
  const content: unknown[] = scaled.map((im) => ({
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
      max_tokens: 4096,
      // Adaptive thinking: the model reasons through identification and
      // layer-counting before answering — measurably better than one-shot.
      thinking: { type: 'adaptive' },
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
