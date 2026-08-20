# Visual, Motion, and Audio Parity Scorecard

Evidence-based parity tracking between the implemented `lxrdxe7o` portfolio and
the approved reference/current baselines captured in Task 1. This document
records calibration decisions and intentional differences; it never targets
copied pixels.

## Categories

| Category          | Status      | Intentional differences / notes                                                                 |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Loader / entry    | Implemented | Real byte-weighted loading; sound/silent gate opens only after assets settle. No reference timer copied. |
| Home hierarchy    | Implemented | Oversized `lxrdxe7o` identity with Work/About emphasis, availability, and social links.          |
| Navigation / Index| Partial     | Full-screen Index is deferred; header/footer navigation covers every route today.                |
| Project sequence  | Implemented | Editorial case-study template with next-project wrap; verified metadata only.                    |
| Route transitions | Implemented | DOM + canvas transitions through one controller; reduced-motion uses short fades.                |
| Pointer/touch     | Implemented | Normalized pointer signals with frame coalescing; keyboard equivalents for every hover surface.  |
| Scroll pacing     | Implemented | Lenis only when motion, input, and capability allow; native scroll preserved otherwise.          |
| Audio behaviour   | Implemented | Opt-in only, crossfaded ambience, persistent mute, silent parity. Missing files degrade to silence. |
| Responsive        | Implemented | Art-directed mobile/desktop compositions; 200% zoom reflows without clipping.                    |
| Fallback parity   | Implemented | Static, no-WebGL, no-JS, reduced-data, and failed-asset paths keep semantic content usable.       |

## Known intentional differences

1. **Sound palette** is an original minimal dark-tech synthesis; no reference
   audio is sampled or recreated.
2. **Typography** uses open-source Geist + JetBrains Mono instead of the
   reference's licensed grotesque.
3. **Full-screen Index** (Task 16) is the next major interaction milestone;
   today the header/footer expose the same route map.
4. **Transitions** use Motion (OSI-licensed) instead of GSAP per the approved
   dependency policy.

## High-severity gaps

None outstanding. The full-screen Index remains a planned enhancement rather
than a parity failure, and is tracked as Task 16.
