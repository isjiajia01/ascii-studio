# ASCII Studio
Image/video → ASCII, braille, halftone, dither, bricks, particles. WebGL2, fully client-side.
- `npm run dev` · `npm run build` (static output in `dist/`, deploy anywhere)
- Pages: `/` landing, `/app/` generator, `/library/` finished works. `?preset=<id>&sample=<0-3>&style=<id>` deep-links; `?work=<id>` opens a library work (file + settings from `src/works.ts`, media in `public/works/`).
- Engine: `src/engine/` (shaders, glyph atlas, renderer, styles/presets, image + MP4 export via WebCodecs + mp4-muxer).
