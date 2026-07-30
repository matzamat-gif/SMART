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
1. קבע מה מוצג. אם אין בתמונה פירות או ירקות כלל (אדם, חדר, מסך, חפץ) — החזר {"items":[]} בלבד. לעולם אל תמציא מוצר. שים לב: שלטי מחירים, מספרים, ארגזים ריקים ומשקלים אינם מוצרים בפני עצמם — אל תיצור להם שורה.
2. קרא את השלטים והתוויות כ*עזר בלבד*. שם מוצר על שלט הוא רמז מכוון — לא מקור סמכות: ארגז עלול להתמלא במוצר אחר או שלט עלול לזוז. תמיד הצלב את השלט מול התוצרת שרואים בפועל. אם השלט תואם למה שנראה — זה מחזק את הזיהוי (ובזוג דומה מותר להעלות ביטחון עד 0.85). אם השלט סותר את מה שנראה — סמוך על התוצרת עצמה והורד ביטחון. שלט מטושטש/חתוך/לא קריא — התעלם.
3. זהה את המוצר לפי צבע, צורה, מרקם, גבעול ועלים. השווה לקטלוג שבהמשך. אם אתה מתלבט בין שני מוצרים — בחר את הסביר יותר והורד את הביטחון בהתאם. אל תדווח מוצר שאינך מזהה בבירור.
   היזהר במיוחד מזוגות דומים — כשאין שלט קריא ולא ניתן להבחין ביניהם בוודאות, אל תעלה מעל 0.6 ביטחון:
   • קולורבי (בליטות ירוקות-בהירות עגולות עם גבעולים/עלים) מול כרוב (ראש עלים צפוף וגדול) מול כרובית (פרחים לבנים).
   • בצל מול שום מול בצל ירוק; לימון מול ליים; קלמנטינה מול תפוז; חציל מול קישוא כהה; פלפל אדום מול עגבנייה.
   כשיש עלים/גבעולים בולטים על ירק עגול בהיר — סביר שזה קולורבי, לא כרוב.
4. ספור בשיטתיות — זה החלק הקריטי לדיוק. אל תנחש מספר עגול. עבוד כך:
   א. שכבה גלויה: ספֹר בפועל שורות × עמודות של היחידות שנראות על פני השטח. אם צפוף מדי לספור אחת-אחת — ספֹר אזור קטן מייצג (למשל רבע מהשטח) והכפל בהתאם.
   ב. הערכת מידות כבדיקה שנייה: הערך את גודל הכלי/הערימה ואת קוטר היחידה, וחשב כמה נכנסות בשכבה. דוגמה: ארגז ~40×60 ס"מ, עגבנייה ~7 ס"מ → כ-(40/7)×(60/7)≈48 בשכבה. השווה לספירה בסעיף א׳; אם רחוקים מאוד — בדוק שוב.
   ג. עומק/מילוי: הערך כמה שכבות (ארגז מלא לרוב 2–4 שכבות, חצי-מלא פחות) והכפל. אל תספור רק את הפנים הגלויות ואל תנפח מעבר לסביר.
   ד. סמן ביטחון נמוך יותר ככל שהספירה מבוססת יותר על הערכת שכבות מוסתרות ופחות על ספירה גלויה.
5. משקל: חשב בשתי דרכים ובחר את הסביר. (א) count × משקל ליחידה — למוצר בקטלוג השתמש במשקל המכויל, אלא אם היחידות בתמונה חריגות בגודלן (אז התאם). (ב) בדיקת נפח עצמאית: נפח הערימה × צפיפות אופיינית. אם שתי הדרכים קרובות — ביטחון גבוה; אם רחוקות — הורד ביטחון ובחר את השמרנית מביניהן. לתפזורת (ענבים/תות/פטריות) — הערך totalWeightGrams לפי נפח בלבד.

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
// Quality 0.92 (not 0.85): the extra bitrate keeps small price-sign text sharp
// enough for the model to read, which is our strongest identification cue.
export function downscaleImage(im: CapturedImage, maxEdge = 1568, quality = 0.92): Promise<CapturedImage> {
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

// Pings the API with a tiny request to verify the key works end-to-end:
// authentication, billing/credit, model access, and browser CORS. Returns a
// clear pass/fail so the user isn't guessing whether real recognition is live.
export async function testApiKey(): Promise<{ ok: boolean; message: string }> {
  const key = getApiKey();
  if (!key) return { ok: false, message: 'לא הוזן מפתח. הדבק מפתח ולחץ שמור.' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: VISION_MODEL, max_tokens: 4, messages: [{ role: 'user', content: 'hi' }] }),
    });
    if (res.ok) return { ok: true, message: 'המפתח תקין וזיהוי אמיתי פעיל. אפשר לסרוק.' };
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* ignore */ }
    if (res.status === 401) return { ok: false, message: 'מפתח לא תקין (401). ודא שהעתקת אותו במלואו מ-console.anthropic.com.' };
    if (res.status === 400 && /credit|balance|billing/i.test(detail)) return { ok: false, message: 'אין קרדיט בחשבון. הוסף אמצעי תשלום ב-console.anthropic.com ← Billing.' };
    if (res.status === 429) return { ok: false, message: 'חריגה ממכסת הבקשות (429). המתן רגע ונסה שוב.' };
    return { ok: false, message: `שגיאת שרת (${res.status})${detail ? ': ' + detail : ''}.` };
  } catch {
    // A thrown fetch is almost always a network/CORS problem, not a bad key.
    return { ok: false, message: 'לא הצלחתי להגיע לשרת (בעיית רשת). בדוק חיבור אינטרנט ונסה שוב.' };
  }
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

// One call to the Messages API. `thinkTokens > 0` enables bounded extended
// thinking; 0 disables thinking entirely. Returns both the parsed items and the
// stop_reason so the caller can react to truncation.
async function callVision(
  content: unknown[],
  thinkTokens: number,
): Promise<{ items: RawDetection[]; stop: string | null }> {
  // The JSON answer is tiny (a handful of items), so a few thousand output
  // tokens is always enough. The trap with adaptive thinking was that reasoning
  // had NO cap and could swallow the whole budget on a busy stand, truncating
  // the JSON. Here thinking is bounded and max_tokens always leaves ~4000 tokens
  // of headroom for the answer AFTER thinking, so the JSON can never be cut off.
  const OUTPUT_HEADROOM = 4000;
  const body: Record<string, unknown> = {
    model: VISION_MODEL,
    max_tokens: thinkTokens + OUTPUT_HEADROOM,
    messages: [{ role: 'user', content }],
  };
  // Extended thinking helps identification + hidden-layer counting. Bounded so
  // it can't starve the output. temperature must be default (omitted) when on.
  if (thinkTokens > 0) body.thinking = { type: 'enabled', budget_tokens: thinkTokens };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
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
  return { items: parseItems(text), stop: data.stop_reason ?? null };
}

async function analyzeReal(images: CapturedImage[], catalog: Catalog): Promise<RawDetection[]> {
  const scaled = await Promise.all(images.map((im) => downscaleImage(im)));
  const content: unknown[] = scaled.map((im) => ({
    type: 'image',
    source: { type: 'base64', media_type: im.mediaType, data: im.b64 },
  }));
  content.push({ type: 'text', text: buildPrompt(catalog, images.length) });

  // Primary attempt: bounded thinking for best accuracy. Enough room for the
  // per-item two-method counting + volume cross-check to actually run.
  const first = await callVision(content, 5000);
  if (first.items.length || first.stop !== 'max_tokens') return first.items;

  // Truncated with no result (rare, very busy stand): retry once with thinking
  // OFF so the entire budget goes to the JSON. Slightly less reasoning, but a
  // real answer beats a truncation error.
  const retry = await callVision(content, 0);
  if (retry.items.length || retry.stop !== 'max_tokens') return retry.items;

  throw new Error('הניתוח נקטע לפני שהסתיים. נסה שוב, או צלם פחות סוגים בפריים אחד.');
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
