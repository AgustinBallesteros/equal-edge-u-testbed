# cognativ-testbed

A lightweight Next.js prototype testbed for building and previewing app screens at pixel-accurate dimensions. Drop a component in, see it inside the right device frame immediately — no routing, no backend, no state management overhead.

## What it does

- **Viewport shell** — renders your screen component inside a device frame (iPhone 17 Pro Max, Android Large, Responsive, or full Desktop)
- **Floating dev menu** — toggle platform, switch viewport presets, and fine-tune zoom scale without touching code
- **Motion system** — a set of pre-built CSS animation classes (`ms-enter`, `ms-btn`, `ms-checkbox`, etc.) ready to apply
- **Clean starting point** — one file to edit, zero opinions about your screen's architecture

## Stack

| | |
|---|---|
| Framework | Next.js 16.2.1 (Pages Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS 4 + inline styles |
| Font | Inter via `next/font/google` |

## Getting started

```bash
git clone https://github.com/AgustinBallesteros/equal-edge-u-testbed.git
cd cognativ-testbed
npm install
npm run dev        # → http://localhost:3000
```

## Adding a screen

Open `pages/index.tsx`. Find the placeholder inside the viewport frame:

```tsx
{/* ── Drop your screen component here ── */}
<span style={{ color: "#ccc", fontSize: 13, fontFamily: "var(--font-inter)" }}>
  {isDesktop ? "Desktop" : "Mobile"} — add your screen here
</span>
```

Replace it with your component:

```tsx
{isDesktop ? <DesktopScreen /> : <MobileScreen />}
```

Define `MobileScreen` and `DesktopScreen` in the same file (preferred for prototyping), or import from `components/`. Your component should fill `100% × 100%` of its parent — the frame handles dimensions.

## Dev menu

The floating **⊞** button (top-left) controls:

| Control | What it does |
|---|---|
| **Platform** | Toggle Mobile / Desktop. Desktop fills the full window. |
| **Viewport** (mobile) | iPhone 17 Pro Max (440×956), Android Large (412×917), Responsive |
| **Scale** | Manual zoom for mobile frames. Auto-fits on load. |

Tap-and-hold the button to drag it anywhere. Double-tap to reset to origin.

## Key variables (available in `Home`)

```ts
isDesktop    // boolean — true when Platform = Desktop
isResponsive // boolean — true when Viewport = Responsive
platform     // "mobile" | "desktop"
preset       // active viewport preset key
scale        // current zoom (0.3–1.0)
w, h         // viewport dimensions in px (null when desktop/responsive)
```

## Design tokens

```ts
const BLUE = "#558BF7";   // primary accent — swap for your project color

const MS = {
  dFast: "150ms",
  eOut:  "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;
```

The full motion token set lives in `styles/motion-system.css` as CSS custom properties.

## Motion classes

Apply directly to elements, all prefixed `ms-`:

| Class | Effect |
|---|---|
| `ms-enter` | Fade-up entrance |
| `ms-enter-fade` | Fade-only entrance |
| `ms-btn` | Press scale feedback |
| `ms-btn-icon` | Tighter press scale (icons) |
| `ms-progress-linear` | Animated linear progress bar |
| `ms-progress-circular` | SVG circular progress |
| `ms-checkbox` | Animated checkbox (stroke-dashoffset) |
| `no-scrollbar` | Hides scrollbar |

Use `data-stagger="N"` (0–7) on `ms-enter` elements for staggered entrances.

## Conventions

- **Single-file preferred** — keep all components in `pages/index.tsx` unless it exceeds ~1000 lines, then split into `components/<ScreenName>.tsx`
- **Inline styles for layout** — use Tailwind for typography utilities, inline styles for positioning and custom values
- **No data fetching** — mock all data as local constants or in `data/mock.ts`
- **No routing** — simulate navigation with local state
- **TypeScript strict** — all props typed, no `any` unless unavoidable

## Lint / type-check

```bash
npx tsc --noEmit            # type check
npx eslint pages/index.tsx  # lint
```

Both should return clean before committing.
