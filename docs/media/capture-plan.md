# Project Media Capture Plan

Generated as part of Task 5 (deterministic project capture and media
pipeline). This tracks, per approved flagship project
(`artifacts/audit/reports/portfolio-audit.md`), how its media was or will be
produced. The pipeline never fabricates screenshots — a project only gets
media once genuine source material exists.

## Automated (live-url) capture

| Project | Method | Status |
| --- | --- | --- |
| `xero-dev` | Playwright capture of `https://lxrdxe7o.vercel.app/` (desktop + mobile, hero + mid-scroll stills, a 6s muted loop + poster) | Done — manifest at `src/data/media-manifests/xero-dev.ts`, assets in `public/media/projects/xero-dev/` |

## Manual source required

These flagship projects have no live, navigable web route, so
`scripts/capture/capture-project.ts` cannot capture them automatically
without fabricating a scene. Each is registered in
`scripts/capture/capture-config.ts` with `method: 'manual-source-required'`
and an explanatory note. Once real source material exists (a terminal
recording, an operator-selected screenshot, etc.), it can be dropped into
`artifacts/media/captures/<slug>/` as a still/video and run through
`processImage`/`encodeVideoLoop`/`buildMediaManifest` the same way the
`xero-dev` live capture does — the encode/manifest stages are format-source
agnostic.

| Project | What's needed |
| --- | --- |
| `krakenvim` | Operator-directed terminal recording of the Neovim configuration in use. |
| `hachi` | Operator-directed terminal recording of the Rust TUI. |
| `mikeneko` | Operator-directed Discord screen capture of the bot in a server. |
| `shiro-nekoo-115` | Local build + operator-directed capture of the C hospital management system. |
| `deaddrop` | Local build + operator-directed capture. |
| `dotfiles` | Operator-selected desktop screenshot; no single representative interface. |
| `tora-neko-311` | Local build + operator-directed capture of the PHP airline booking system. |
| `kuro-nekoo-215` | Local build + operator-directed capture of the Java desktop application. |

Populating these is a content-production follow-up, not a pipeline gap: the
pipeline itself (capture, encode, manifest, budgets, validation) is
complete and tested for both the live-URL path and any pre-existing still or
video handed to `processImage`/`encodeVideoLoop` directly.
