# AGENTS.md — ascii.isjia.page (ASCII Studio)

Browser-only image/video to ASCII, braille, halftone, dither and bricks generator. Vite + TypeScript, custom WebGL2 shader engine. Live at https://ascii.isjia.page (GitHub Pages, custom domain via `public/CNAME`, deployed by `.github/workflows/pages.yml` on push to `main`).

- Design spec: `DESIGN.md`. Engine: `src/engine/**`. UI: `index.html`, `app/index.html`, `src/style.css`, `src/landing.ts`, `src/app.ts`.
- Check before pushing: `npm ci && npm run build` (tsc + vite build). Dev: `npx vite --host 127.0.0.1 --port <free port>`; do not use 5173.
- Mediabunny (MPL-2.0) is used unmodified for MP4 export; keep `THIRD_PARTY_NOTICES.md` shipped with distributions.
- No analytics, no uploads: everything stays in the browser. Do not add a backend or tracking.
- Fonts in `public/fonts/` are self-hosted under their open licences; keep the licence files.
