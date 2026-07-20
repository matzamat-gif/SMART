# נוי השדה — Field Inventory PWA

Full rebuild matching the product characterization (`אפיון מפתח - Noy HaSade`):
role-based navigation, live-camera scanning, department-grouped inventory with a
store/warehouse split, a management dashboard, and a catalog admin screen — all in
RTL Hebrew with the Noy HaSade brand design system.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 — demo mode, full app works with no backend
npm run build    # tsc strict + vite build + PWA service worker (verified passing)
```

Login: pick one of the three seed users on the login screen. Each role sees a
different tab set and home screen:

- **מוכרן (clerk)** — בית · סריקה · מלאי — scoped to one branch.
- **מנהל סניף (branch manager)** — בית · סריקה · מלאי · ניהול — scoped to one branch.
- **הנהלה (executive)** — בית · מלאי · ניהול · קטלוג — all 12 branches, no scan tab.

## What's built

- **Login** — 3 seed users, role icons; production would use org SSO instead.
- **Home** — scan-first for clerk/manager (coverage %, session counter, low-stock
  list with depletion-rate ETA); branch-chip overview + urgency-sorted branch list
  for exec.
- **Scan** — branch + store/warehouse location picker → live camera
  (`getUserMedia`, falls back to a file picker if camera access is denied) →
  analyzing animation → **quick-confirm** path (single product, high confidence,
  already in catalog) or **full-review** path (multiple products / low confidence /
  new product) → save. Supports stacking multiple photos of the same stand, with an
  honestly-measured confidence-trend message (up/down/unchanged/duplicate-image) —
  never a fake "confidence improved" label.
- **Inventory** — grouped by department, collapsible, dual-tone store+warehouse
  progress bar, staleness tag, waste ("פחת") reporting per item.
- **Dashboard** — department rollups, urgency-sorted reorder list with a WhatsApp
  share button, computed inter-branch transfer suggestions, recent activity log.
- **Catalog** (exec only) — uncertainty-threshold slider, per-product editing
  (unit weight / box weight for bulk / par / reorder point / freshness threshold /
  department), department + subcategory management with an "unassigned" bucket.
- Brand design system as CSS tokens (`src/lib/brand.ts`), Assistant font, full RTL.

## Vision AI — real recognition vs demo mode

`src/lib/vision.ts` has two modes:

- **Real recognition** — tap the key icon on the scan screen and paste an Anthropic
  API key (from platform.claude.com). The app then sends the photo(s) to the
  Anthropic Messages API (`claude-sonnet-4-6`, per the spec) with a catalog-aware
  Hebrew prompt. The prompt hard-requires an **empty result when the photo doesn't
  show a produce stand** — a selfie yields "לא זוהו פירות או ירקות", never a fake
  detection. The key is stored in this device's localStorage only.
- **Demo mode** — with no key, results are simulated presets so all screens stay
  exercisable. The UI labels every simulated result with a clear "מצב דמו" banner.

⚠️ Direct-from-browser API calls are for the pilot only (trusted store devices,
each with its own key). For production, move the call behind a backend proxy —
swap the fetch URL in `analyzeReal()` for `/api/scan`; nothing else changes.

## Accuracy levers (all active)

1. **Field calibration** — when a clerk manually corrects a unit weight in the
   review screen, the catalog value recalibrates (50/50 blend) and the product
   gets a "מכויל ×N" tag. Calibrate against real store-scale weighings.
2. **Multi-photo** — "הוסף תמונה לדיוק" merges angles; a nudge appears
   automatically when a single-photo result lands under the threshold.
3. **Uncertainty threshold** — the Catalog slider is wired into the scan flow;
   pilot default is 85% (raise scrutiny early, relax as trust builds).
4. **Training data** — every save records the AI result vs the clerk-approved
   result + a photo thumbnail (last 50, localStorage). The exec Catalog screen
   shows accuracy stats and exports the dataset as JSON — the base for prompt
   tuning and, later, a dedicated counting model (YOLO/Roboflow).
5. **Photography guidance** — concrete instructions in the camera overlay
   (fill the frame, shoot straight-on, avoid shadow/glare).

Under the hood, requests use adaptive thinking (the model reasons through
identification and layer-counting), photos are downscaled client-side to
1568px, and the prompt enforces a strict confidence rubric — never above 0.5
when product identity is uncertain.

## Still pending

- Real PWA icons (192/512 PNG) before pilot install.

## Deliberately deferred (documented, not silently missing)

- Persistent backend / auth — everything is in-memory per session (matches
  milestones M1–M4 in the spec; a real backend + SSO is M5).
- Offline queue + background sync banner.
- Low-confidence approval queue as a separate manager workflow.
- Duplicate-scan-within-30-minutes warning.
