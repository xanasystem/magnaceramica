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
  data/brands.ts   Brand content (name, description, ImageMetadata) — single source of truth
  config/media.ts  URLs for heavy media hosted on Cloudflare R2
  assets/          Images optimized at build time via astro:assets (brands/, logos, photos)
  styles/global.css  Design tokens + global/reusable classes
public/
  img/             Images that can't go through astro:assets (CSS backgrounds, video posters)
  favicon*, apple-touch-icon.png
docs/source-assets/  Original design exports (not served)
```

The landing page (`pages/index.astro`) composes section components in order:
Hero → About → Brands → Experience → CustomTiles → Contact → Footer.

## Conventions

- **Styling:** plain CSS, no Tailwind. Global design tokens (colors, fonts, spacing, `--gutter`, `--ease`) live in `:root` in `src/styles/global.css`. Reusable classes there too: `.container`, `.section`, `.eyebrow`, `.section-title`, `.btn` / `.btn--ghost`. Component-specific styles go in scoped `<style>` blocks inside each `.astro` file. Reach for a token before hardcoding a value.
- **Brand colors:** terracotta `--color-primary: #905335`. Fonts: Cormorant Garamond (serif) + Montserrat (sans), loaded from Google Fonts in the layouts.
- **Content:** brand data is data-driven via `src/data/brands.ts` (the `Brand` interface). To add/edit a brand or its carousel, drop the image in `src/assets/brands/<brand>/...` and reference it by relative path through the `img()` helper — it resolves to an `ImageMetadata` via `import.meta.glob`. Don't hardcode in components.
- **Images:** use Astro's `<Image />` from `astro:assets` for content images, importing them from `src/assets/` so they're resized + served as webp with a responsive `srcset`. Pass `widths` + `sizes` matching the display size. Only the brand carousel keeps the full-res original (via `data-full`) for the lightbox. CSS `background-image` and video `poster` attributes can't use `<Image>`, so those few files stay in `public/img/`.
- **Adding a section:** create `src/components/<Name>.astro` and import it into `pages/index.astro`.

## Media hosting (Cloudflare R2)

Heavy files (videos) are **not** bundled in the repo — they're served from a Cloudflare R2 bucket. URLs live in `src/config/media.ts` (`R2_BASE` + `media`). When adding video or other large media, upload it to the bucket and reference it via `media.ts` rather than committing the binary. Brand tile JPGs live in `src/assets/brands/` (optimized at build time by `astro:assets`) but remain candidates for the same treatment if repo size grows.

## Contact form

The contact form (`src/components/Contact.astro`) posts to a serverless endpoint at `src/pages/api/contact.ts` (`prerender = false`, runs on Vercel). `src/form.config.ts` reads recipients/sender/subject from env vars; `.env.example` documents them. Full docs live in `docs/forms/`.

Security layers (do **not** remove any):

- **Turnstile** (Cloudflare CAPTCHA) + **honeypot** (`company` field, must be empty) + **two-layer validation** (client UX in the component, server is the source of truth in the endpoint — same rules).
- **Secrets** (`BREVO_API_KEY`, `TURNSTILE_SECRET_KEY`) live only in Vercel env vars; `.env` is gitignored. Only `PUBLIC_TURNSTILE_SITE_KEY` reaches the browser.
- **Vercel Firewall rate limit** on `/api/contact`: 5 requests / 10 min, Fixed Window, keyed by IP, Deny (persistent). The office IP is allowlisted with an Allow rule ordered **above** the rate-limit rule. This is configured in the Vercel dashboard (Firewall), not in code.

Email is sent via Brevo's JSON API from the shared verified domain `forms.xanasystem.com` (DKIM set up). A `200`/`ok` means Brevo accepted the call, not that the mail was delivered — trace issues via the Brevo transactional logs (`messageId` is logged). Adding a field means editing all three places: the `<input>` + client validation rule, the server read/validate/`escapeHtml`, and the email `htmlContent`.

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
