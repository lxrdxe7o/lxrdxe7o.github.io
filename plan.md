# XERO PORTFOLIO — FULL REDESIGN PLAN

> Author: Ishraful Haque  
> Date: 2026-05-10  
> Status: 🔨 In Progress

---

## 1. Project Overview

Redesign `xero-portfolio` (v2.0 → v3.0) from a single-page scrollable site into a **multi-page application** using the **full TanStack suite** with **completely unique 3D scenes per page** — each page is its own world/universe/dimension.

**Live URL:** https://lxrdxe7o.github.io/  
**Blog URL:** https://lxrdxe7o.vercel.app/

---

## 2. Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React 18.3 | ^18.3.1 | UI framework |
| Vite 6 | ^6.0.0 | Build tool |
| TypeScript | ~5.6.2 | Type safety |
| Three.js | ^0.170.0 | 3D rendering |
| @react-three/fiber | ^8.17.0 | React ↔ Three.js bridge |
| @react-three/drei | ^9.114.0 | 3D helpers |
| Framer Motion | ^11.11.0 | UI animations |
| **@tanstack/react-router** | **latest** | **File-based routing (NEW)** |
| **@tanstack/react-query** | **latest** | **Data fetching / cache (NEW)** |
| **@tanstack/react-virtual** | **latest** | **Virtual scrolling (NEW)** |
| **@tanstack/router-devtools** | **latest** | **Dev debugging (NEW)** |
| **clsx** | **latest** | **Conditional class merging (NEW)** |

---

## 3. File Structure (NEW)

```
src/
├── routes/
│   ├── __root.tsx              ← Root layout (navbar + canvas + transitions)
│   ├── index.tsx               ← Home page
│   ├── about.tsx               ← About page
│   ├── projects.tsx            ← Projects page
│   ├── experience.tsx          ← Experience timeline page
│   ├── skills.tsx              ← Skills showcase page
│   ├── uses.tsx                ← Uses / tech stack page
│   ├── notes.tsx               ← Notes / snippets page
│   ├── now.tsx                 ← "What I'm working on now" page
│   ├── contact.tsx             ← Contact page
│   ├── blog.tsx                ← Blog → external redirect to lxrdxe7o.vercel.app
│   └── $404.tsx               ← 404 catch-all page
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          ← Glassmorphic desktop navbar
│   │   ├── MobileMenu.tsx      ← Hamburger slide-out drawer (per-page themed)
│   │   └── PageTransition.tsx  ← Framer-motion page transition wrapper
│   ├── shared/
│   │   ├── GlassCard.tsx       ← Reusable glassmorphic card
│   │   ├── SectionHeader.tsx   ← Animated tag + title header
│   │   └── Badge.tsx           ← Skill/tag pill badges
│   ├── scenes/
│   │   ├── SceneEngine.tsx     ← Persistent <Canvas> wrapper (no remount on route change)
│   │   └── presets/
│   │       ├── SolarSystemScene.tsx      ← Deep space + full solar system
│   │       ├── QuantumAtomScene.tsx      ← Quantum atom field
│   │       ├── ForgeScene.tsx            ← Orbital station + geometric constructs
│   │       ├── WormholeScene.tsx         ← Wormhole tunnel with timeline particles
│   │       ├── CrystalCavernScene.tsx    ← Floating crystals + cavern reflections
│   │       ├── MatrixScene.tsx           ← Data streams + digital rain
│   │       ├── CrimsonVoidScene.tsx      ← Dark matter + crimson glow points
│   │       ├── PulsarScene.tsx           ← Pulsar energy field + radiating waves
│   │       └── ConstellationScene.tsx    ← Star network with connected nodes
│   └── sections/
│       ├── HomeContent.tsx               ← Hero + intro for home route
│       ├── AboutContent.tsx              ← Bio + skills for about route
│       ├── ProjectsContent.tsx           ← Project cards for projects route
│       ├── ExperienceContent.tsx         ← Timeline for experience route
│       ├── SkillsContent.tsx             ← Detailed skills grid for skills route
│       ├── UsesContent.tsx               ← Tech/tools list for uses route
│       ├── NotesContent.tsx              ← Notes list for notes route
│       ├── NowContent.tsx                ← Current work items for now route
│       └── ContactContent.tsx            ← Contact info + social links
├── styles/
│   └── globals.css                       ← Root CSS vars, themes, keyframes
└── hooks/
    ├── useScrollVelocity.ts              ← Shared scroll velocity tracking
    └── useSceneTransition.ts             ← Scene transition state manager
```

---

## 4. Per-Page Worlds

Each page has a **completely independent 3D scene** with its own design language, color palette, and visual identity.

| Route | Page Name | 3D Universe | Primary Color | Accent Color | Emoji |
|-------|-----------|-------------|---------------|--------------|-------|
| `/` | **Home** | 🌞 Full Solar System + Nebula + cosmic dust | `#a855f7` Purple | `#ec4899` Pink | ⭐ |
| `/about` | **About** | 🔬 Quantum Atom Field — nucleus + electron clouds | `#22d3ee` Cyan | `#6366f1` Blue | ⚛️ |
| `/projects` | **Projects** | 🏗️ Orbital Station — geometric frames in orbit | `#f97316` Orange | `#fbbf24` Amber | 🔧 |
| `/experience` | **Experience** | 🕳️ Wormhole Tunnel — swirling timeline vortex | `#fbbf24` Gold | `#eab308` Yellow | 📜 |
| `/skills` | **Skills** | 💎 Crystal Cavern — faceted crystals refracting light | `#10b981` Emerald | `#14b8a6` Teal | 💎 |
| `/uses` | **Uses** | 💾 Digital Matrix — cascading data streams | `#6366f1` Indigo | `#8b5cf6` Violet | 💻 |
| `/notes` | **Notes** | 🔴 Crimson Void — floating code snippets in void | `#dc2626` Dark Red | `#e11d48` Rose | 📝 |
| `/now` | **Now** | ⚡ Pulsar Core — radiating energy waves | `#eab308` Yellow | `#84cc16` Lime | ⚡ |
| `/contact` | **Contact** | 🌐 Star Constellation — connected node network | `#ec4899` Pink | `#d946ef` Fuchsia | 📡 |
| `/blog` | **Blog** | → External link to `lxrdxe7o.vercel.app` | — | — | ✍️ |

### Scene Details

#### 🌞 Home — Solar System Scene (Enhanced)
- Retains existing Sun + 8 planets + exoplanet systems
- Added: enhanced corona effects, asteroid belt ring, comet trails
- Camera: slow auto-rotate, responds to scroll for zoom
- Colors: deep purples, golds, pinks

#### ⚛️ About — Quantum Atom Scene
- Central nucleus with pulsing protons/neutrons
- 6 electron orbital rings with glowing electrons
- Background: quantum probability cloud (semi-transparent particle field)
- Scroll interaction: atoms split/recombine based on velocity
- Colors: cyan, electric blue, white

#### 🏗️ Projects — Orbital Station Scene
- Central hexagonal space station structure
- Orbiting geometric panels (solar arrays, modules)
- Connecting laser beams between structures
- Space debris particles floating
- Colors: warm oranges, ambers, metallic grays

#### 🕳️ Experience — Wormhole Tunnel Scene
- Central vortex/tunnel with swirling spacetime distortion
- Timeline particles flowing through the wormhole
- Event horizons with gravitational lensing effect
- Star streaks from time dilation
- Colors: golds, warm yellows, deep space black

#### 💎 Skills — Crystal Cavern Scene
- Multiple floating faceted crystals (icosahedron, dodecahedron, custom)
- Light refraction through crystal surfaces (shader-based)
- Cavern walls with bioluminescent glow
- Floating light orbs between crystals
- Colors: emeralds, teals, translucent whites

#### 💾 Uses — Digital Matrix Scene
- Cascading data streams (matrix rain effect)
- Floating data blocks with code snippets
- Network connection lines between nodes
- Grid floor with perspective depth
- Colors: indigo, violet, terminal green accents

#### 🔴 Notes — Crimson Void Scene
- Deep dark void background
- Floating glowing text fragments / code snippets
- Particle systems with crimson/rose glow
- Occasional supernova-like bursts
- Colors: dark reds, roses against near-black

#### ⚡ Now — Pulsar Scene
- Central pulsar with rotating beams
- Radiating energy waves/ripples
- Electromagnetic field visualization
- Charged particle trails
- Colors: yellows, limes, electric whites

#### 🌐 Contact — Constellation Scene
- Stars arranged as constellation patterns
- Interactive nodes connected by glowing lines
- Hoverable/clickable contact nodes
- Data pulses traveling along connection lines
- Colors: pinks, fuchsias, magentas

---

## 5. Navigation System

### Desktop Navbar
- **Position:** Fixed top, `z-index: 100`
- **Style:** Glassmorphic — `backdrop-filter: blur(20px)`, semi-transparent
- **Background:** CSS variable `--navbar-bg` per page (translucent version of page accent)
- **Contents:** Logo "Ishraful Haque", nav links (Home, About, Projects, Experience, Skills, Uses, Notes, Now, Contact, Blog)
- **Active state:** Underline glow matching page accent color
- **Transitions:** Smooth color transitions on route change

### Mobile Hamburger Menu
- **Trigger:** Animated hamburger icon (☰ → ✕)
- **Drawer:** Slide-in from right, full height
- **Theming:** Per-page accent color for drawer background, links, and icon colors
- **Contents:** Same nav links + close button
- **Backdrop:** Blurred overlay
- **Touch targets:** Minimum 48px

### Nav Per-Page Theming
CSS custom properties updated via `data-route` attribute on `<html>`:
```css
html[data-route="home"] { --nav-accent: #a855f7; --nav-bg: rgba(10,3,8,0.8); }
html[data-route="about"] { --nav-accent: #22d3ee; --nav-bg: rgba(0,20,30,0.8); }
/* ... etc per page */
```

---

## 6. Routing Architecture

### TanStack Router v2 Setup

```typescript
// src/routes/__root.tsx
import { createRootRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { Meta, Scripts } from '@tanstack/start'
import SceneEngine from '@/components/scenes/SceneEngine'
import Navbar from '@/components/layout/Navbar'
import MobileMenu from '@/components/layout/MobileMenu'
import PageTransition from '@/components/layout/PageTransition'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Meta />
      <Scripts />
      <div className="app-root">
        <SceneEngine />
        <Navbar />
        <MobileMenu />
        <main className="content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </>
  )
}
```

### Route Registration
```typescript
// src/routeTree.gen.ts (auto-generated by tanstack-router)
import { createRouteRegistry } from '@tanstack/react-router'
import { IndexRoute } from './routes/index.lazy'
import { AboutRoute } from './routes/about.lazy'
// ... all routes
```

### File-Based Route Loading
```typescript
// vite.config.ts
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
  ],
})
```

---

## 7. 3D Scene Engine

### SceneEngine Architecture
```typescript
// src/components/scenes/SceneEngine.tsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useLocation } from '@tanstack/react-router'
import scenePresets from './presets'

export default function SceneEngine() {
  const { pathname } = useLocation()
  const currentScene = scenePresets[pathname] || scenePresets['/']
  
  return (
    <div className="scene-container">
      <Canvas camera={currentScene.camera}>
        <Suspense fallback={null}>
          <currentScene.Component />
        </Suspense>
      </Canvas>
    </div>
  )
}
```

### Scene Presets Registry
```typescript
// src/components/scenes/presets.ts
import SolarSystemScene from './presets/SolarSystemScene'
import QuantumAtomScene from './presets/QuantumAtomScene'
// ... all scenes

export default {
  '/': SolarSystemScene,
  '/about': QuantumAtomScene,
  '/projects': ForgeScene,
  '/experience': WormholeScene,
  '/skills': CrystalCavernScene,
  '/uses': MatrixScene,
  '/notes': CrimsonVoidScene,
  '/now': PulsarScene,
  '/contact': ConstellationScene,
  '/blog': SolarSystemScene, // fallback (blog is external)
}
```

### Canvas Persistence
- Canvas is **mounted once** in root layout
- Scene components swap via suspense — canvas context persists
- Camera transitions animate between presets
- DPR/performance settings adapt per scene complexity

---

## 8. CSS Theme System

### Root CSS Variables
```css
:root {
  /* Base space theme */
  --color-bg: #0a0308;
  --color-bg-elevated: #120610;
  --color-surface: #1a0a14;
  --color-border: #2a1020;
  
  /* Accent (defaults to home theme) */
  --color-primary: #a855f7;
  --color-primary-light: #c084fc;
  --color-primary-dark: #7c3aed;
  --color-accent: #ec4899;
  --color-blue: #6366f1;
  --color-cyan: #22d3ee;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing & radius */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 4rem;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
}

/* Per-route overrides */
html[data-route="about"] {
  --color-primary: #22d3ee;
  --color-primary-light: #67e8f9;
  --color-primary-dark: #0891b2;
  --color-accent: #6366f1;
  --color-bg: #000d14;
}

html[data-route="projects"] {
  --color-primary: #f97316;
  --color-primary-light: #fb923c;
  --color-primary-dark: #ea580c;
  --color-accent: #fbbf24;
  --color-bg: #140a00;
}
/* ... etc per page */
```

---

## 9. Page Content Plan

### Home (`/`)
- **Tag:** "Full-Stack Developer"
- **Title:** "Hi, I'm Ishraful Haque" (with animated gradient + typewriter)
- **Description:** Building modern, performant, and scalable applications with a passion for clean code and innovative solutions.
- **CTA:** View Projects → `/projects`, Get in Touch → `/contact`
- **3D:** Solar System (existing, enhanced)

### About (`/about`)
- **Tag:** "About Me"
- **Title:** "Who I Am"
- **Content:** Bio paragraphs about being a full-stack developer, Linux enthusiast, systems programming passion
- **Skills Grid:** TypeScript, React, Rust, Linux/Arch, Lua, Python, Three.js, Neovim
- **3D:** Quantum Atom Field

### Projects (`/projects`)
- **Tag:** "My Work"
- **Title:** "Featured Projects"
- **Cards:** KrakenVim, dotfiles, xero-shell, DeadDrop, hachi, mikeneko + new placeholder projects
- **Each card:** Title, description, tech tags, GitHub link
- **3D:** Orbital Station

### Experience (`/experience`)
- **Tag:** "Timeline"
- **Title:** "Professional Journey"
- **Layout:** Vertical timeline with milestones
- **Placeholder entries:** Education, first dev job, key projects, current role
- **3D:** Wormhole Tunnel

### Skills (`/skills`)
- **Tag:** "Technologies"
- **Title:** "Technical Arsenal"
- **Layout:** Grid of skill categories (Languages, Frameworks, Tools, DevOps, 3D/Graphics)
- **Each item:** Icon, name, proficiency bar
- **3D:** Crystal Cavern

### Uses (`/uses`)
- **Tag:** "My Setup"
- **Title:** "What I Use"
- **Layout:** Categories — Hardware, Software, Services, Workflow
- **Placeholder items:** MacBook Pro, Neovim, Arch Linux, VS Code, etc.
- **3D:** Digital Matrix

### Notes (`/notes`)
- **Tag:** "Thoughts"
- **Title:** "Notes & Snippets"
- **Layout:** List of note cards with title, excerpt, date, tags
- **Placeholder topics:** "Rust async patterns", "Neovim config deep-dive", "Three.js shader tricks"
- **3D:** Crimson Void

### Now (`/now`)
- **Tag:** "Currently"
- **Title:** "What I'm Working On Now"
- **Layout:** Cards for current projects, learning goals, reading list
- **Placeholder items:** Building this portfolio, learning Rust WASM, reading SICP
- **3D:** Pulsar Scene

### Contact (`/contact`)
- **Tag:** "Get In Touch"
- **Title:** "Let's Connect"
- **Content:** Email, GitHub, LinkedIn, Twitter with SVG icons
- **Email:** ishrak7106@gmail.com
- **3D:** Constellation Network

### Blog (`/blog`)
- **Type:** External link → https://lxrdxe7o.vercel.app/
- **In nav:** Appears as link with ✍️ icon
- **On click:** Opens external tab

---

## 10. Page Transitions

- **Route change:** Framer Motion `AnimatePresence` wraps `<Outlet />`
- **Exit animation:** Current page content fades out + 3D scene dims
- **Enter animation:** New page content fades in + 3D scene lights up
- **Camera transition:** Smooth lerp from current camera position/target to new preset
- **Duration:** 600ms, ease-in-out
- **CSS vars:** Transition smoothly between color palettes

---

## 11. Mobile Hamburger Menu

```tsx
// MobileMenu.tsx
interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  route: string // Current route for theming
}
```

- **Trigger:** Animated hamburger icon (3-line → X animation)
- **Position:** Fixed right side
- **Drawer:** Slide-in from right, 80% width, full height
- **Background:** Glassmorphic with `--nav-bg` per page
- **Nav links:** Stacked vertically, colored with `--nav-accent`
- **Close:** X icon or backdrop click
- **Accessibility:** Focus trap, ESC to close, ARIA labels

---

## 12. Per-Page Icons

Each page in the navbar shows a themed icon:

| Route | Icon | Implementation |
|-------|------|----------------|
| `/` | ⭐ | SVG star |
| `/about` | ⚛️ | SVG atom |
| `/projects` | 🔧 | SVG wrench |
| `/experience` | 📜 | SVG scroll |
| `/skills` | 💎 | SVG diamond |
| `/uses` | 💻 | SVG laptop |
| `/notes` | 📝 | SVG pencil |
| `/now` | ⚡ | SVG lightning |
| `/contact` | 📡 | SVG satellite |
| `/blog` | ✍️ | SVG pen |

Icons render in navbar links, page headers (SectionHeader), and mobile menu.

---

## 13. Build Steps (Order)

1. ✅ Install TanStack suite + clsx
2. Set up TanStack Router config + route tree
3. Build root layout (`__root.tsx`) with canvas + Navbar + MobileMenu
4. Build SceneEngine with canvas persistence
5. Port & enhance existing SolarSystem scene for Home
6. Build 8 new 3D scene presets
7. Build page content components (9 pages)
8. Implement route-level CSS theming
9. Add page transitions with Framer Motion
10. Polish hamburger menu with per-page theming
11. Link blog to external domain
12. Fix lint + typecheck
13. Test on mobile + desktop

---

## 14. Known Challenges

- **Canvas memory:** Must properly dispose of old scene geometries/materials when switching
- **Mobile performance:** Lower-end devices need reduced particle counts per scene
- **CSS transitions:** Custom properties don't natively animate — need `@property` or JS-driven transitions
- **TanStack Router setup:** Requires `@tanpack/start` adapter or manual file-based config

---

## 15. Acceptance Criteria

- [ ] 10 pages accessible via unique URLs
- [ ] Each page shows a distinct 3D scene with unique design language
- [ ] Navbar updates theme per page
- [ ] Mobile hamburger shows page-themed drawer
- [ ] Page transitions are smooth (content + camera)
- [ ] Blog links externally to lxrdxe7o.vercel.app
- [ ] Name "Ishraful Haque" used throughout
- [ ] All placeholder content present
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Responsive on phone/tablet/desktop