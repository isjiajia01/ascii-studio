# ASCII Studio: design

Scope: the landing page (`index.html`, `src/landing.ts`) and the generator (`app/index.html`, the DOM half of `src/app.ts`). One stylesheet: `src/style.css`. The engine (`src/engine/**`) is out of scope.
Guideline used: WCAG 2.2 AA for the web (responsive reflow, keyboard focus, reduced motion).

## Commitment
1. **Subject world.** A darkroom and a composing room. A picture is screened into marks (halftone, letterpress, one-bit dither), checked on a proof with crop marks, and the keeper is circled with a china marker on the contact sheet.
2. **Point of view.** The product is a proofing table: every picture is a proof you set in type. **Signature:** crop marks frame every image (the *plate*), and a hand-drawn yellow china-marker loop circles the chosen preset or style.
3. **Type.** Bricolage Grotesque (variable; display at 800 weight and 75% width, lede at 300) and Martian Mono (only for measured data: sizes, values, timecode, file names, glyph ramps). Both are self-hosted in `public/fonts/` under the OFL (licence files sit next to them).
4. **Palette.** Warm carbon dominates (darkroom black, not blue-black), paper-white ink, and one sharp accent: china-marker yellow, kept for "this one is chosen".
5. **Layout.** The landing page is a proof sheet: a hero plate, one running sentence for the process, a type-specimen index that drives one large proof (not a card grid), a finishing desk and a two-column FAQ. The generator is a light table: the plate in the centre, the contact strip of presets under it and a control rail with a pinned export block. **Motion:** one moment, where the hero proof "develops" from original to type (a 1.1 s ease-out wipe); everything else is feedback only. Reduced motion skips the wipe and stops the hero animation.

Defaults we checked for: the coloured or typed accent word in the headline was removed. The numbered `01/02/03` labels, uppercase-tracked mono eyebrows, the hairline broadsheet grid and the 4×2 card grid were removed. The lavender accent was replaced. The remaining near-black + accent pairing is justified by the darkroom subject: the accent is marker yellow, used sparingly.

## Tokens (`src/style.css` `:root`)
| Role | Token | Value | Use |
|---|---|---|---|
| Page | `--carbon-0` | `#0e0d0b` | body, nav, stage |
| Image well | `--carbon-well` | `#090807` | behind canvases on plates |
| Raised | `--carbon-1` | `#161512` | control rail, preset strip |
| Control fill | `--carbon-2` | `#201e1a` | buttons, inputs, tiles |
| Control hover | `--carbon-3` | `#2b2924` | hover/selected tile fill |
| Rule | `--rule` | `#34312b` | group separators (decorative) |
| Rule strong | `--rule-strong` | `#706a60` | control borders, slider track, crop marks (≥3:1 on carbon-1/2) |
| Ink | `--paper` | `#f0eadc` | text, primary button, focus ring, "on" state |
| Ink 2 | `--paper-2` | `#c2baa9` | secondary text |
| Ink 3 | `--paper-3` | `#9a9384` | captions, data, muted labels |
| Marker | `--marker` / `--marker-ink` | `#ffd23f` / `#1a1500` | chosen preset/style loop, active glyph, "n on" badges, export progress |
| Alert | `--alert` | `#ff9a76` | error messages, the no-WebGL2 notice |

Type roles: display `h1` clamp(56–124px) / .86, 800 weight, 75% width · section `h2` clamp(40–80px) / .9, 800 weight, 75% width · `h3` 20px, 650 weight · lede clamp(18–21px), 300 weight · body 16px / 1.55 · UI 13–14px, 500–650 weight · `.data` Martian Mono 11.5px, 87.5% width, tabular figures.
Space (4-pt): `--s1`…`--s9` = 4, 8, 12, 16, 24, 32, 48, 72, 112. Radius: `--r` 2px (controls only; plates are square). Motion: `--ease` cubic-bezier(.2,.7,.2,1), `--fast` 140ms, `--slow` 900ms. `--nav-h` is 56px, or 52px at ≤860px.

## Components
- **btn**: `.btn`, `.primary` (paper fill), `.ghost`, `.lg` (48px); `[aria-pressed=true]` fills with paper; disabled at 45% opacity; `.k` is a key hint.
- **chip**: `.chip` (hero preview switcher), with `aria-pressed`.
- **plate**: `.plate` image surface with crop marks (`::before`). `.cmp` adds the before/after split (`--p`, `.after`, `.bar`, `.tag.l/.r`) as `role=slider` with arrow, Shift+arrow, Home and End keys.
- **marked**: `.marked::after` draws the china-marker loop (`--loop` SVG, non-scaling stroke). It is used on `.preset.on` and the active specimen row.
- **slug**: `.slug` caption line under a plate: name in paper, data in `.data`.
- **specimen index** (landing): `.spec-index` rows with name, glyph ramp and a description shown for the active row.
- **control group** (generator): `details.grp` > `summary` + `.grp-body`. Effect groups show a `.mod` badge ("2 on") so active effects stay visible while a group is closed. Old screen and Motion start closed.
- **ctl**: `.ctl` (label | range | output value) and `.ctl.sw` (label | `input.switch`). Range fill comes from `--v`, which `app.ts`/`landing.ts` set.
- **style tile**: `.style` (glyph cell + name), 2 columns; when selected it has a paper border and a marker glyph.
- **seg**: `.seg` 3-way colour mode. **swatch**: `.sw1` palette chips (4 columns, with `aria-pressed`).
- **preset card**: `.preset` (104×84 thumbnail + name) in `.strip` › `.presets`.
- **toolbar**: `.toolbar` (slug, Hold to compare, Split). **transport**: `.transport` (play, scrub, timecode).
- **drop**: `.drop` empty state (headline, Choose a file, sample thumbnails `.sample`); `.over` shows a solid marker border while a file is dragged over.
- **export block**: `.exp` is pinned to the bottom of the rail on desktop and flows inline on mobile. It holds Format/Size selects, a transparent toggle (WebP only), the Export button, a progress bar and `.msg`/`.msg.err`.

## Key flows and states
- **Empty:** the drop panel invites a file or a sample. The preset strip already previews every preset on the rocket sample. Compare and Split are disabled.
- **Loaded:** the plate takes the source aspect ratio (`--ar`, set by `setSource`). The slug shows file · preset · style · detail, and the nav shows file · size · kind.
- **Compare:** hold the button (or C) to see the original in full. **Split** toggles a draggable, keyboard-operable divider (output on the left, original on the right).
- **Video:** the transport bar appears, and the formats become MP4, JPEG and WebP.
- **Export:** busy text, then a progress bar and Cancel for MP4. Success reports the size; errors use `--alert`.
- **No WebGL2:** the landing page shows `.nogl` over the hero; the generator shows `#glmsg` in the drop panel.
- **Mobile (≤860px):** the image and toolbar stay pinned under the nav (44svh) while the preset strip and controls scroll beneath. The landing sections stack, and the specimen proof sits above a 2-column index.

## Accessibility and verification
- Measured contrast (WCAG): paper 15.2:1, paper-2 9.5:1 and paper-3 6.0:1 on carbon-1; paper-3 is 4.76:1 on carbon-3 (its worst case). Marker-ink on marker is 12.6:1, and rule-strong is 3.1:1 on carbon-2. Primary button text is 16.2:1.
- Focus: a 2px paper outline offset by 2px everywhere. It is deliberately not yellow, so focus never reads as "selected".
- Targets: buttons are at least 36px tall (48px for large ones), ranges are 24px tall, and style tiles are 40px. Selection is never colour-only: it uses `aria-pressed`, weight and border as well as the marker.
- Reduced motion: no hero wipe, no headline animation and no smooth scroll.
- Renders inspected at 1440×900 and 390×844 (landing and generator; empty, loaded, video + split, tuned). `scrollWidth - clientWidth` is 0 at 390. Evidence is in `~/.cache/agent-runtime/ascii-polish/designer/`.

## Decisions and deferred
- Fonts are self-hosted (Latin subset only). Non-Latin text falls back to the system stack.
- The yellow marker is the only accent. Errors use a softer coral (`--alert`) so they never look like a selection.
- Presets do not refresh their thumbnails after a slider change unless the source is live. That is engine-loop behaviour and was left unchanged.
- Deferred: fullscreen view, a light theme, and keyboard shortcuts beyond C.
