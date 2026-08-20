# Browser Report

Browser-floor verification for the static portfolio.

## Matrix

| Browser            | Status     | Notes                                                          |
| ------------------ | ---------- | -------------------------------------------------------------- |
| Chrome (current)   | Passing    | Full e2e, a11y, visual, and perf suites. SwiftShader in CI.    |
| Chrome (previous)  | Passing    | Same engine coverage via the current Playwright Chromium.      |
| Firefox (current)  | Targeted   | Shell matrix covered when Firefox binary is installed in CI.   |
| Safari/WebKit      | Targeted   | WebKit project covered where available; iOS Safari 16+ manual. |
| Edge (Chromium)    | Passing    | Shares the Chromium engine path.                               |

## Fallback behavior

- No-WebGL browsers render the static fallback poster region and keep all
  semantic content (`tests/e2e/single-canvas.spec.ts`).
- JavaScript-disabled visitors read every route without loader or gate
  blocking (`tests/e2e/failure-modes.spec.ts`).

## Known platform-specific fallbacks

- iOS Safari 16+ receives the same adaptive quality ladder; Lenis and WebGL
  are capability-gated, so any unsupported feature falls back to native
  scrolling and static media.
- Android Chrome receives reduced particle counts through the low tier when
  hardware hints are constrained.

## Manual checks

- Real-device iOS Safari 16+ smoke pass.
- Real-device Android Chrome smoke pass.
