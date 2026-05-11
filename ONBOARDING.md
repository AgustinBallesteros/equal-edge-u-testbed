# Equal Edge U — Screen Testbed

## What this is
A Next.js 16 prototype testbed for building and previewing Equal Edge app screens. It provides a pixel-accurate viewport shell with a floating dev menu — no routing, no backend, no state management overhead. You drop a screen component in, it renders inside the correct device frame.

## Stack
- Next.js 16.2.1 (Pages Router, Turbopack)
- TypeScript 5
- React 19
- Tailwind CSS 4
- Inter font (via `next/font/google`)

## Running locally
```bash
npm install
npm run dev   # → http://localhost:3000
```

## File structure
```
pages/
  index.tsx        ← the only file you'll ever touch to add a screen
  _app.tsx         ← imports globals.css, do not modify
  _document.tsx    ← standard Next.js document, do not modify
styles/
  globals.css      ← imports Tailwind + motion-system.css + token overrides
  motion-system.css ← generic motion token layer (ms- classes + CSS vars)
```

## How to add a screen

Open `pages/index.tsx`. Find the single placeholder comment:

```tsx
{/* ── Drop your screen component here ── */}
<span style={{ color: "#ccc", fontSize: 13, fontFamily: "var(--font-inter)" }}>
  {isDesktop ? "Desktop" : "Mobile"} — add your screen here
</span>
```

Replace it with your component, using `isDesktop` to branch:

```tsx
{isDesktop ? <DesktopScreen /> : <MobileScreen />}
```

Define `MobileScreen` and `DesktopScreen` in the same file (preferred for prototyping) or import from `components/`. Keep it simple — this is a testbed, not a production app.

## Dev menu (floating ⊞ button, top-left)
- **Platform** — toggles Mobile / Desktop. Resizes the viewport frame accordingly.
- **Viewport** (mobile only) — iPhone 17 Pro Max (440×956), Android Large (412×917), Responsive (fills window).
- **Scale** — manual zoom for mobile frames. Auto-fits on load; drag to fine-tune.
- Tap-and-hold the button to drag it anywhere. Double-tap to reset to origin.

## Key variables available in `Home` (pages/index.tsx)
| Variable | Type | What it is |
|---|---|---|
| `isDesktop` | `boolean` | true when Platform = Desktop |
| `isResponsive` | `boolean` | true when Viewport = Responsive |
| `platform` | `"mobile" \| "desktop"` | raw platform state |
| `preset` | `PresetKey` | active viewport preset key |
| `scale` | `number` | current zoom (0.3–1.0) |
| `w`, `h` | `number \| null` | viewport dimensions (null when desktop/responsive) |

## Design tokens (pages/index.tsx)
```ts
const BLUE = "#558BF7";   // primary accent — buttons, rings, active states

const MS = {              // motion tokens (JS mirror of motion-system.css)
  dFast: "150ms",
  eOut:  "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;
```

Extend `MS` as needed — the full token set lives in `styles/motion-system.css` as CSS custom properties (`--ms-duration-*`, `--ms-ease-*`, etc.).

## Motion system (styles/motion-system.css)
Apply CSS classes directly to elements. All prefixed `ms-` to avoid collisions:

| Class | Effect |
|---|---|
| `ms-enter` | fade-up entrance (opacity + translateY) |
| `ms-enter-fade` | fade-only entrance |
| `ms-btn` | press scale feedback |
| `ms-btn-icon` | tighter press scale (icons/compact) |
| `ms-progress-linear` | animated linear progress bar |
| `ms-progress-circular` | SVG circular progress |
| `ms-checkbox` | animated checkbox (stroke-dashoffset) |
| `no-scrollbar` | hides scrollbar (globals.css) |

Use `data-stagger="N"` (0–7) on `ms-enter` elements for staggered entrance animations.

## Viewport frame internals
The frame div uses these styles — match them in your screen component:
```ts
{
  width:  isDesktop ? "100%" : w!,   // e.g. 440px for iPhone 17
  height: isDesktop ? "100%" : h!,   // e.g. 956px
  overflow: "hidden",
  background: "#fff",
  userSelect: "none",
}
```
Your screen component receives no explicit width/height props — it should fill `100% × 100%` of its parent.

## Conventions
- **Single-file preferred**: keep all components for a screen in `pages/index.tsx` unless the file exceeds ~1000 lines, then split into `components/<ScreenName>.tsx`.
- **Inline styles over Tailwind for layout**: use Tailwind for typography utilities (`font-bold`, `text-black`, etc.) and inline styles for positioning, sizing, and custom values.
- **No data fetching**: mock all data as local constants or in `data/mock.ts`.
- **No routing**: this is a single-page testbed — simulate navigation with local state.
- **TypeScript strict**: all props typed, no `any` unless unavoidable.

## Lint / type-check
```bash
npx tsc --noEmit          # type check
npx eslint pages/index.tsx  # lint
```
Both should return clean (0 errors, 0 warnings) before committing.
