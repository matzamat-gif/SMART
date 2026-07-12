// Vision AI seam — spec §6.
//
// In production this calls a backend endpoint that proxies the Anthropic
// Messages API (the vision call MUST NOT be made directly from the client:
// it needs a server-held API key). Until that backend exists, this module
// returns believable mock detections so every screen is fully exercisable.
// Swapping the mock body of `analyzePhoto` for a real `fetch('/api/scan')`
// is the only change needed — nothing else in the app depends on this seam.

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

export async function analyzePhoto(images: CapturedImage[], presetIdx: number): Promise<RawDetection[]> {
  // Simulated network + inference latency so the analyzing animation reads naturally.
  await new Promise((r) => setTimeout(r, 300));
  return mockAnalysis(presetIdx, images.length);
}

// Catalog-aware name matching, spec §6: normalize → exact → singular/plural →
// containment → edit distance ≤ 2.
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
