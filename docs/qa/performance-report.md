# Performance Report

Core Web Vitals budgets and runtime stability for the static portfolio.

## Budgets (Lighthouse CI, `lighthouserc.json`)

| Metric        | Budget   |
| ------------- | -------- |
| LCP           | ≤ 2500ms |
| CLS           | ≤ 0.1    |
| INP (proxy)   | ≤ 200ms  |
| Performance   | ≥ 90     |
| Accessibility | ≥ 95     |

## Browser smoke budgets (`tests/performance/budgets.spec.ts`)

- One canvas across repeated route loads and media activations.
- One renderer creation across the 50-route navigation loop.
- Home route asset requests stay within the static budget.
- Median frame time on the home scene stays under 100ms even under
  SwiftShader software rendering.

## Runtime stability

- `scripts/qa/memory-smoke.ts` drives 50 route changes and asserts exactly
  one canvas and one renderer instance remain.
- The renderer's `ResourceTracker` releases every route-scoped texture,
  geometry, and material when its scope ends (unit-tested).

## Optimization order

1. Remove work (paused loop when hidden, static mode has no loop).
2. Reduce asset cost (AVIF/WebP ladder, reduced-data eligibility).
3. Lower visual quality globally only as a last resort (adaptive tiers).

## Known measurement caveats

- CI runs Chromium with SwiftShader software rendering; measured frame times
  are an upper bound, not a field prediction.
- Lighthouse CI runs from a clean static server against `dist/`.
