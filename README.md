# Magna Cerámica

Marketing site for **Magna Cerámica**, the ceramic-tile division of Grupo Merhi, connecting leading Spanish tile brands (Baldocer, Alaplana) with the UK market for over 30 years.

Built with [Astro](https://astro.build) — static output, no UI framework, plain CSS with design tokens.

## 🚀 Getting started

```sh
npm install      # install dependencies (requires Node >= 22.12.0)
npm run dev      # start the dev server at http://localhost:4321
```

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the local dev server                  |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |

## 📁 Project structure

```
src/
  pages/            Routes — index.astro (landing) + legal pages
  layouts/          Layout.astro (main), LegalLayout.astro (legal pages)
  components/        One .astro file per landing section
  data/brands.ts    Brand content (names, descriptions, image paths)
  config/media.ts   URLs for heavy media hosted on Cloudflare R2
  styles/global.css Design tokens + global / reusable classes
public/             Static assets (logos, brand tiles, favicons)
docs/source-assets/ Original design exports (not served)
```

The landing page composes section components in order:
**Hero → About → Brands → Experience → CustomTiles → Contact → Footer.**

## 🎨 Styling

Plain CSS, no Tailwind. Global design tokens (colors, fonts, spacing) live in
`:root` in [`src/styles/global.css`](src/styles/global.css), along with reusable
classes (`.container`, `.section`, `.btn`, `.eyebrow`, …). Component-specific
styles go in scoped `<style>` blocks. Brand palette: terracotta `#905335`;
fonts Cormorant Garamond (serif) + Montserrat (sans).

## 🖼️ Media hosting

Heavy files (videos) are **not** bundled in the repo — they are served from a
Cloudflare R2 bucket. URLs live in [`src/config/media.ts`](src/config/media.ts).
When adding video or large media, upload it to the bucket and reference it there
rather than committing the binary.

## 🤝 Contributing

To add or edit a brand, update [`src/data/brands.ts`](src/data/brands.ts) — it's
the single source of truth. To add a section, create a component in
`src/components/` and import it into `src/pages/index.astro`.

See [`CLAUDE.md`](CLAUDE.md) for more detailed conventions.
