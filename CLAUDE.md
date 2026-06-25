# Magna Cerámica

Marketing site for Magna Cerámica, the ceramic-tile division of Grupo Merhi, connecting Spanish tile brands (Baldocer, Alaplana) with the UK market. Built with Astro (no UI framework), static output, content in English.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project structure

```
src/
  pages/          Routes (index.astro = landing; legal pages)
  layouts/        Layout.astro (main), LegalLayout.astro (legal pages)
  components/      One .astro per landing section
  data/brands.ts   Brand content (name, description, image paths) — single source of truth
  config/media.ts  URLs for heavy media hosted on Cloudflare R2
  styles/global.css  Design tokens + global/reusable classes
public/
  img/             Bundled images (logos, brand tiles, section backgrounds)
  favicon*, apple-touch-icon.png
docs/source-assets/  Original design exports (not served)
```

The landing page (`pages/index.astro`) composes section components in order:
Hero → About → Brands → Experience → CustomTiles → Contact → Footer.

## Conventions

- **Styling:** plain CSS, no Tailwind. Global design tokens (colors, fonts, spacing, `--gutter`, `--ease`) live in `:root` in `src/styles/global.css`. Reusable classes there too: `.container`, `.section`, `.eyebrow`, `.section-title`, `.btn` / `.btn--ghost`. Component-specific styles go in scoped `<style>` blocks inside each `.astro` file. Reach for a token before hardcoding a value.
- **Brand colors:** terracotta `--color-primary: #905335`. Fonts: Cormorant Garamond (serif) + Montserrat (sans), loaded from Google Fonts in the layouts.
- **Content:** brand data is data-driven via `src/data/brands.ts` (the `Brand` interface). To add/edit a brand or its carousel, edit that file — don't hardcode in components.
- **Adding a section:** create `src/components/<Name>.astro` and import it into `pages/index.astro`.

## Media hosting (Cloudflare R2)

Heavy files (videos) are **not** bundled in the repo — they're served from a Cloudflare R2 bucket. URLs live in `src/config/media.ts` (`R2_BASE` + `media`). When adding video or other large media, upload it to the bucket and reference it via `media.ts` rather than committing the binary. Brand tile JPGs currently live in `public/img/brands/` but are candidates for the same treatment if repo size grows.

## Legal pages

`legal-notice`, `privacy-policy`, and `cookies-policy` use `LegalLayout.astro` (marked `noindex`). The layout styles slotted content via `:global(...)` selectors and provides helper classes like `.cookie-table` and `.placeholder` for unfilled legal details.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
