# FreshEye — Store-Layer PWA (CV-independent scaffold)

Runnable foundation for the store-layer app (Stage 2). Everything CV-dependent is stubbed
behind a clean seam, so this builds and runs **without a validated model**. Drop it into
Claude Code to continue the build once the Stage 1 CV gate is green.

## Run
```bash
npm install
npm run dev      # http://localhost:5173  — full 4-step loop, demo mode
npm run build    # tsc strict + vite build + PWA service worker  (verified passing)
```

## What's built (CV-independent)
- Vite + React 18 + TypeScript + vite-plugin-pwa (offline app shell, manifest, RTL, Heebo, brand tokens)
- The full 4-step loop: **camera → review/confirm → gap vs quota → submit**
- Pure rules engine (`src/lib/rules.ts`) — weight + gap + shortage status, mirrors the backend
- Confirmation gate — nothing advances until every item has a confirmed count
- Offline-first plumbing: IndexedDB stores (catalog, quotas, scans, outbox, images) in `src/lib/db.ts`
- Online default / conscious offline opt-in with a **temporary-estimate** heuristic (`src/lib/heuristic.ts`)
- Client-generated scan UUID (idempotency), outbox enqueue, image kept for cloud re-analysis
- Connectivity awareness (`src/lib/connectivity.ts`)

## What's stubbed / pending (CV-dependent — do NOT wire until Stage 1 is green)
- `src/lib/api.ts` → `detect()` returns fake detections behind `src/lib/cv-contract.ts`.
  Replace with real `POST /api/scans` once Roboflow + thresholds are validated. Screens don't change.
- `reconcile()` calls `POST /api/scans/reconcile` — **this endpoint must be added to the backend**
  (see Stage 2 spec §10). Auto-verify within 15% → submit; conflict → needs_review.
- Real PWA icons (192/512 PNG) before pilot install.
- Porting the full Design-handoff visuals on top of this skeleton.

## Config
- `VITE_API_BASE` (default `/api`) — backend base URL
- `VITE_DEMO` (default `true`) — simulates a successful submit so the loop completes with no
  backend. Set `false` when wiring the real API.

## Seam to respect
All CV lives behind `cv-contract.ts` and the `detect()` stub. Keeping that seam is what makes
this scaffold safe to build now: swap the stub for the real model later, nothing else moves.
