# PentaVault — AI Logo / Icon Generation Prompt

Copy-paste the block below into an image model (Midjourney, DALL·E, Ideogram,
Recraft, Flux, etc.). It encodes the product, the brand palette already in the
app, and the "minimal / fast / colorful" qualities you asked for. A second,
tighter prompt is included for the favicon/app-icon size.

The active in-app mark is the SVG logo served from `public/logo.svg`, with
matching Next.js metadata icons in `src/app/icon.svg`, `src/app/apple-icon.svg`,
and the source `src/app/favicon.svg`. Regenerate only if you want a different
brand direction.

Brand palette (from `src/styles/globals.css` — keep the logo in these):

- Primary emerald `#10B981`, bright emerald `#34D399`
- Jewel accents (optional secondary): sapphire `#3B82F6`, violet `#A855F7`, coral `#FB7185`
- Deep green-black background `#0A0F0D`

---

## Prompt A — primary logo (wordmark-friendly icon)

```text
Design a minimal, modern app icon for "PentaVault", a developer security product
that stores API keys and secrets and hands out short-lived proxy tokens instead
of the real key (a "runtime secrets proxy for AI-assisted development").

Concept: a clean geometric PENTAGON (five sides, referencing "Penta") that also
reads as a VAULT or shield, with a subtle keyhole or a single locked node at its
center. It should feel secure, fast, and technical — like a premium developer
tool (think Linear, Vercel, Doppler, Stripe icons), NOT a clip-art padlock.

Style: flat vector, minimal, geometric, high contrast, bold single-glyph mark
that reads at 16px. Vivid emerald green (#10B981 to #34D399 gradient) as the
primary color on a deep near-black green background (#0A0F0D). Optional: one thin
sapphire (#3B82F6) or violet (#A855F7) accent stroke for a jewel-tone highlight.
Crisp edges, generous negative space, subtle depth, no text, no drop shadows,
centered, icon only. Convey speed and minimalism.

Deliver as a square icon on a transparent background and on the dark background.
```

## Prompt B — favicon / small app icon (ultra-minimal)

```text
Ultra-minimal favicon for "PentaVault". A single emerald (#10B981) geometric
pentagon glyph with a tiny center dot/keyhole, flat vector, no text, no gradient
noise, must stay legible at 16x16px. Transparent background. Crisp, fast, iconic.
```

## Repository / product context (paste if the tool accepts a system/context field)

- **Product:** PentaVault — a security-first secrets-management + runtime-proxy
  platform. Stores encrypted secrets, issues scoped proxy tokens (`pv_tok_`), and
  proxies requests to upstream providers so the real key never reaches the client.
- **Positioning:** "Your AI agent should never see your real API keys."
- **Repo:** frontend `C:\Users\abhas\PentaVault` (Next.js 16, React 19, Tailwind
  v4); backend `PentaVault-Backend` (Fastify + Drizzle); Rust CLI `pv`.
- **Aesthetic:** dark-mode-native, vivid emerald + jewel tones, minimal, fast,
  micro-interactions. Inspired by Doppler / Stripe / Linear iconography.
- **Qualities to convey:** minimal, fast, secure, colorful, developer-grade.

## After you generate it

1. Export the icon as **SVG**. PNG exports at 512, 192, 32, and 16 px are useful
   for app-store or social surfaces, but the website icon should stay SVG.
2. Put the same SVG in `src/app/icon.svg`, `src/app/apple-icon.svg`,
   `src/app/favicon.svg`, and `public/logo.svg`.
3. Verify `BrandMark`, root metadata, OpenGraph, and Twitter card images still
   point at those SVG files.
