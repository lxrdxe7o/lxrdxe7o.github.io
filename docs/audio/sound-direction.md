# Sound Direction

Original minimal dark-tech sound layer for `lxrdxe7o`. Every asset is
produced by `scripts/audio/build-audio.ts` from deterministic synthesis —
no third-party samples, no recorded material, no reference audio recreated.

## Palette

| Cue | Role | Character |
| --- | --- | --- |
| `ambience-field` | Home / Work / About ambience | Slow dark pad, low-passed, breath-like movement; seamless loop |
| `ambience-editorial` | Writing / Notes / utility ambience | Quieter and sparser than the field: less movement, more air |
| `cue-hover` | Pointer hover feedback | Short soft tick, barely above silence |
| `cue-select` | Activation feedback | Slightly brighter tick with a fast decay |
| `transition-route` | Route handoff marker | Low swell that rises and falls inside the crossfade window |

## Rules

1. Everything is opt-in: no sound may play before an explicit entry choice.
2. Silent entry has complete feature parity; no timing depends on audio.
3. Every start, stop, and handoff uses a gain ramp; nothing starts abruptly.
4. Loops must be seamless: the last sample continues into the first without a
   click, verified by `scripts/audio/validate-audio.ts`.
5. Peak loudness is bounded below -14 dBFS to leave headroom for stacking.
6. The mute control is global and persistent; visibility suspension stops
   output while consent is remembered.
7. Missing or unsupported files degrade to silence, never to an error.
