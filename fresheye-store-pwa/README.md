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

## What's stubbed — do not wire until Stage 1 CV gate is green

- `src/lib/vision.ts` → `analyzePhoto()` returns mock detections behind a documented
  seam. The Anthropic Vision call **must** be proxied through a backend (never
  called directly from the client — that requires exposing an API key). Swapping
  the mock body for a real `fetch('/api/scan')` is the only change needed; no
  screen depends on this seam directly.
- Real PWA icons (192/512 PNG) before pilot install.

## Deliberately deferred (documented, not silently missing)

- Persistent backend / auth — everything is in-memory per session (matches
  milestones M1–M4 in the spec; a real backend + SSO is M5).
- Offline queue + background sync banner.
- Low-confidence approval queue as a separate manager workflow.
- Duplicate-scan-within-30-minutes warning.
