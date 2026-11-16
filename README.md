# ASCII Studio
Image/video → ASCII, braille, halftone, dither, bricks, particles. WebGL2, fully client-side.
- `npm run dev` · `npm run build` (static output in `dist/`, deploy anywhere)
- Pages: `/` landing, `/app/` generator. `?preset=<id>&sample=<0-2>&style=<id>` deep-links.
- Engine: `src/engine/` (shaders, glyph atlas, renderer, styles/presets, image + MP4 export via WebCodecs + mp4-muxer).
