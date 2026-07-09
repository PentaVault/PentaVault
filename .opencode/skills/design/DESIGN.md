# PentaVault Design System — Vivid Emerald + Jewel Tones

## Overview

PentaVault is a dark-mode-native developer security platform. Its visual language
is **colorful but tasteful**: a deep green-black canvas lit by a vivid emerald
brand signal, with sapphire, violet, and coral jewel tones used as functional
secondary accents (section identity, charts, interactive hovers). The feel is
alive and confident — poppy without being loud — closer to a premium, energetic
developer tool than to a flat grayscale console. Color carries meaning here:
emerald says "PentaVault / active / go", and each jewel tone gives a section or
data series its own identity. Depth still comes from border hierarchy and surface
elevation, now warmed by soft accent glows.

The guiding instinct: color is a signal, not noise. Lead with emerald as the
brand throughline, assign a jewel tone when a region or dataset needs its own
identity, and let hovers bloom with a spotlight glow in that region's accent —
but keep large surfaces calm and green-black so the color reads as intentional.

## Core principles

- **Dark-mode-native**: deep green-black backgrounds — never pure black. The
  darkness is structural; do not lighten primary surfaces to lift content.
- **Emerald is the brand**: `--accent` (emerald) is the primary signal — active
  state, focus, selection, wordmark, primary CTA. Everything reads as "emerald
  PentaVault."
- **Jewel tones as functional accents**: sapphire / violet / coral give sections,
  charts, and interactive spotlights their own identity. Use them to distinguish,
  not to decorate at random — a color should always mean something.
- **Border-defined space, glow-warmed**: separation comes from thin borders on
  dark surfaces; hover and active states add a soft accent glow rather than a
  heavy shadow.
- **Poppy but tasteful**: saturated accents on calm surfaces. Keep big fills
  green-black; let the color live in accents, edges, hovers, and data.

## Color tokens (source of truth: `src/styles/globals.css`)

All colors are CSS variables surfaced as Tailwind theme tokens. **Never hardcode
hex values in components** — use the token classes (`bg-background`,
`text-foreground`, `border-border`, `text-accent`, `text-sapphire`, etc.). If a
needed shade is missing, add a token, don't inline a hex.

### Surfaces (darkest → lightest)
- **`--background-deep` `#060a08`**: deepest surface (insets, page-bottom fade)
- **`--background` `#0a0f0d`**: page canvas (deep green-black)
- **`--card` `#0f1512`**: card / panel background
- **`--card-elevated` `#16211c`**: elevated / hover surface, active nav
- **`--background-elevated` `rgba(22,33,28,0.84)`**: translucent elevated fills
- **`--surface-frost` `rgba(16,185,129,0.07)`**: faint emerald frost wash

### Text
- **`--foreground` `#f2fbf6`**: primary text (soft mint-white)
- **`--foreground-soft` `#b3c6bd`**: secondary headings / softer body
- **`--muted-foreground` `#7d9488`**: metadata, captions, placeholder

### Borders (faint → prominent)
- **`--border-subtle` `#182119`**: barely-visible dividers
- **`--border` `#21302a`**: standard border
- **`--border-strong` `#2f453c`**: prominent / hover border

### Primary accent — emerald (the brand signal)
- **`--accent` `#10b981`**: emerald signal — active nav, selected state, primary
  CTA fill, key icons, links
- **`--accent-strong` `#34d399`**: brighter emerald for strongest emphasis
  (wordmark, hover-lit accent, gradient highlights)
- **`--accent-muted` `rgba(16,185,129,0.14)`**: soft emerald wash for selected
  rows, chips, subtle fills
- **`--focus-ring` `rgba(16,185,129,0.45)`**: emerald focus outline
- **`--accent-border` `rgba(16,185,129,0.4)`**: emerald border for elevated/active

### Secondary accents — jewel tones (functional: section identity, charts, hovers)
- **`--sapphire` `#3b82f6`** + **`--sapphire-muted` `rgba(59,130,246,0.14)`**
- **`--violet` `#a855f7`** + **`--violet-muted` `rgba(168,85,247,0.14)`**
- **`--coral` `#fb7185`** + **`--coral-muted` `rgba(251,113,133,0.14)`**

Use these to give a section, panel, or chart series its own identity, and as the
color of a hover spotlight. Emerald stays the default/brand; jewel tones are
assigned deliberately, not sprinkled.

### Status
- **`--danger` `#f43f5e`** + `--danger-muted`: destructive actions, errors
- **`--warning` `#fbbf24`** + `--warning-muted`: warnings, at-risk states

### Other
- **`--radius` `0.625rem` (10px)**: standard corner radius. Do not use pill
  (9999px) radii for primary CTAs — the system favors consistent ~10px corners.

## Depth & shadows

Depth is communicated through the border hierarchy (`--border-subtle` →
`--border` → `--border-strong`) and surface elevation (`--card` →
`--card-elevated`), now warmed by color. The active/elevated state is signalled by
the emerald accent border (`--accent-border`) and, on interactive surfaces, a soft
glow in the section's accent color. Where a shadow is needed (floating bars,
modals over content), a low-opacity black shadow is fine; a subtle emerald or
jewel-tone tint on the glow is on-brand — keep it soft and purposeful, never a
harsh neon halo. The page canvas itself carries faint emerald/sapphire radial
glows at the top (see `body` in `globals.css`) — lean into that lit-from-above
feel rather than flattening it.

## Typography

- Sans: `--font-brand-sans`; Mono: `--font-brand-mono` (used for slugs, tokens,
  code, and small uppercase labels).
- Small labels use the mono uppercase treatment:
  `text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground`.
- Prefer weight 400–500; reserve 600 for genuine emphasis. Accent-colored text
  (emerald or a jewel tone) is a legitimate way to add emphasis without reaching
  for heavier weights.

## Motion

Micro-transitions are encouraged but must be subtle and fast. Two mechanisms:

1. **Tailwind/CSS transitions + keyframes** for hover/press/focus, tab-slide,
   spotlight-glow follow, and Radix `data-[state]`-driven dialog/dropdown
   enter-exit (defined in `globals.css`). This is the default — no dependency.
2. **`motion` library** (installed) for interactive/stateful surfaces where CSS is
   awkward: the floating action bar, sidebar collapse, and SVG marks (e.g.
   `src/components/shared/brand-mark.tsx`, which draws its outline in on mount).

Rules: durations ~140–220ms for UI transitions; ease-out for enters, ease-in for
exits. **Always** honor `prefers-reduced-motion` (guard keyframes with the media
query; use `useReducedMotion()` with `motion`; disable the spotlight follow when
reduced). Motion should feel like the UI settling and lighting up, never like it
performing.

## Component conventions

- **Buttons**: primary = emerald fill (`bg-accent` + `--background-deep`/dark text
  for contrast), ~10px radius, hover brightens toward `--accent-strong` with a
  soft emerald glow. Secondary = `outline`. Danger = `--danger` tokens.
- **Cards**: `bg-card`, `border-border`, `--radius` corners; hover lifts to
  `bg-card-elevated` / `border-border-strong` and blooms a spotlight glow in the
  card's assigned accent (emerald by default, or its section's jewel tone).
- **Active nav**: `bg-card-elevated` + `text-foreground` with an emerald accent
  edge; inactive is `text-muted-foreground` hovering to `text-foreground`.
- **Focus**: `box-shadow: 0 0 0 2px var(--focus-ring)` (emerald; already global on
  inputs, buttons, links).
- **Selected / highlighted**: an emerald wash (`bg-accent-muted`) + accent border
  (`border-accent/50`). For section-scoped highlights, swap in the section's jewel
  tone (`bg-sapphire-muted`, `bg-violet-muted`, `bg-coral-muted`).
- **Hover spotlight**: interactive cards and panels use a **mouse-following
  spotlight border glow** in the section's accent color — a radial highlight that
  tracks the cursor along the card's edge. Emerald by default; sapphire / violet /
  coral where a section owns that tone. Disable the follow under reduced motion.

## Do / Don't

**Do**
- Keep big surfaces green-black (`--background`/`--card`); create depth with
  borders and soft accent glows.
- Use emerald as the brand throughline (active/focus/selection, primary CTA,
  wordmark), and assign a jewel tone when a section or chart series needs identity.
- Add mouse-following spotlight glows in the section's accent on interactive cards.
- Keep motion subtle, fast, and reduced-motion-aware. Consistent ~10px radius.

**Don't**
- Don't hardcode hex colors in components — use tokens (`text-accent`,
  `text-sapphire`, `bg-accent-muted`, …).
- Don't go back to monochrome/near-white accents — emerald is the brand now.
- Don't scatter jewel tones meaninglessly; every color should signal something
  (section, series, state). Don't flood a whole surface with saturated fill.
- Don't use pill-radius primary CTAs or harsh neon halos.
- Don't lighten the primary background to separate content — use borders, glow,
  and elevation.

## Prompt snippets (for generating on-brand UI)

- "Hero on a deep green-black `#0a0f0d` canvas with a faint emerald radial glow
  top-left. Headline `#f2fbf6`, weight 500, tight line-height. Sub-text `#b3c6bd`.
  Primary CTA: emerald `#10b981` fill, dark `#060a08` text, 10px radius, soft
  emerald glow on hover."
- "Feature card: `#0f1512` bg, 1px `#21302a` border, 10px radius; hover lifts to
  `#16211c` bg + `#2f453c` border with a mouse-following emerald `#10b981`
  spotlight glow along the edge. Title 20px weight 500 `#f2fbf6`; body 14px
  `#7d9488`. Icon tinted emerald `#34d399`."
- "Three feature sections, each with its own jewel-tone identity: emerald
  `#10b981`, sapphire `#3b82f6`, violet `#a855f7`. Section icon + heading accent
  and hover spotlight use that section's color; body text stays `#b3c6bd` on
  `#0f1512` cards."
- "Nav bar: `#0a0f0d` bg. 14px links, inactive `#7d9488`, active `#f2fbf6` on a
  `#16211c` pill with an emerald `#10b981` accent edge. Emerald wordmark left,
  emerald-fill CTA right."
- "Analytics chart on `#0f1512`: series in emerald `#10b981`, sapphire `#3b82f6`,
  violet `#a855f7`, coral `#fb7185`; gridlines `#21302a`; labels `#7d9488`."
