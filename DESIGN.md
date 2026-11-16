# ASCII Studio: design

Scope: the landing page (`index.html`, `src/landing.ts`) and the generator (`app/index.html`, the DOM half of `src/app.ts`). One stylesheet: `src/style.css`. The engine (`src/engine/**`) is out of scope, except the additive `balloon` sample in `src/engine/samples.ts`.
Guideline used: WCAG 2.2 AA for the web (responsive reflow, keyboard focus, reduced motion).

## Commitment
1. **Subject world.** A darkroom and a composing room. A picture is screened into marks (halftone, letterpress, one-bit dither), checked on a proof with crop marks, and the keeper is circled with a china marker on the contact sheet.
2. **Point of view.** The product is a proofing table: every picture is a proof you set in type. **Signature:** crop marks frame every image (the *plate*), and a hand-drawn yellow china-marker loop circles the chosen preset or style.
3. **Type.** Bricolage Grotesque (variable; display at 800 weight and 75% width, body and lede at 400) and Martian Mono (only for measured data: sizes, values, timecode, file names, glyph ramps, inline character examples). Both are self-hosted in `public/fonts/` under the OFL (licence files sit next to them and are linked from the footer).
4. **Palette.** Warm carbon dominates (darkroom black, not blue-black), paper-white ink, and one sharp accent: china-marker yellow, kept for "this one is chosen".
5. **Layout.** The landing page is a proof sheet: a hero plate, three contact-sheet frames for the process, a type-specimen index that drives one large proof, a tuning desk, a two-column FAQ and a closing contact sheet. Every two-part section uses one column system: 5fr + 7fr with a 72px gutter, so plates and second columns share one line. The generator is a light table: the plate in the centre, the contact strip of presets under it and a control rail with a pinned export block. **Motion:** one moment, where the hero proof "develops" from original to type (a 1.1 s ease-out wipe that rests at 68%, with the output over most of the picture); everything else is feedback only. Reduced motion skips the wipe and stops the hero animation.

Defaults we checked for: no coloured accent word in the headline, no numbered or uppercase-tracked eyebrows (the "Step 1" eyebrows were removed again), no hairline broadsheet grid and no card grid of features. The near-black + accent pairing is justified by the darkroom subject; the accent is marker yellow, used sparingly. No light-weight grey paragraphs: the lede is 400 weight in full paper ink.

## Tokens (`src/style.css` `:root`)
| Role | Token | Value | Use |
|---|---|---|---|
| Page | `--carbon-0` | `#0e0d0b` | body, nav, stage |
| Image well | `--carbon-well` | `#090807` | behind canvases on plates |
| Raised | `--carbon-1` | `#161512` | control rail, preset strip, menus |
| Control fill | `--carbon-2` | `#201e1a` | buttons, inputs, tiles, inline `code` |
| Control hover | `--carbon-3` | `#2b2924` | hover/chosen tile fill |
| Rule | `--rule` | `#34312b` | group separators (decorative) |
| Rule strong | `--rule-strong` | `#706a60` | control borders, slider track, crop marks (≥3:1 on carbon-1/2) |
| Ink | `--paper` | `#f0eadc` | text, lede, primary button, focus ring, "on" state |
| Ink 2 | `--paper-2` | `#c2baa9` | secondary text, glyph ramps |
| Ink 3 | `--paper-3` | `#9a9384` | captions, data, muted labels |
| Marker | `--marker` / `--marker-ink` | `#ffd23f` / `#1a1500` | "chosen" (loop and ring), "n on" badges, export progress |
| Alert | `--alert` | `#ff9a76` | error messages, the no-WebGL2 notice |

Type roles: display `h1` clamp(56–124px) / .94, 800 weight, 75% width, +.004em · section `h2` clamp(40–80px) / .96, same cut · step `h3` clamp(32–44px) · `h3` 20px, 650 weight · lede clamp(19–22px) / 1.45, 400 weight, paper, 30ch · body 16px / 1.55 · UI 13–14px, 500–650 weight · `.data` Martian Mono 11.5px, 87.5% width, tabular figures. The closing `h2` uses the section size, never larger than the hero.
Space (4-pt): `--s1`…`--s9` = 4, 8, 12, 16, 24, 32, 48, 72, 112. Radius: `--r` 2px (controls only; plates are square). Motion: `--ease` cubic-bezier(.2,.7,.2,1), `--fast` 140ms, `--slow` 900ms. `--nav-h` is 56px, or 52px at ≤860px. Loop: `--loop` (9-slice SVG), `--loop-w` 20px band, `--loop-out` 16px outset.

## One rule for state
- **Chosen** (one of a set: preset, specimen, hero preview, style, colour mode, palette) is always circled in marker yellow: the hand-drawn **loop** on proofs (presets, specimen rows) and a 2px marker **ring** on compact controls (chips, style tiles, colour-mode segments, palette swatches). Text goes to paper and 600 weight, and `aria-pressed` is set, so the state is never colour-only.
- **On** (a toggle: Split, switches) is a paper fill. **Focus** is a 2px paper outline offset by 2px, never yellow, so focus never reads as chosen.
- **Nothing is chosen before there is a picture:** in the generator's empty state (`.app.is-empty`) the preset loop is not drawn and the style/mode rings fall back to neutral borders.

## Components
- **btn**: `.btn`, `.primary` (paper fill), `.ghost`, `.lg` (48px), `.icon` (36px square); `[aria-pressed=true]` fills with paper; disabled at 45% opacity; `.k` is a key hint.
- **chip**: `.chip` (hero preview switcher), with `aria-pressed` and the marker ring.
- **plate**: `.plate` image surface with crop marks (`::before`). `.cmp` adds the before/after split (`--p`, `.after`, `.bar`, `.tag.l/.r`) as `role=slider` with arrow, Shift+arrow, Home and End keys.
- **marked**: `.marked::after` draws the china-marker loop as a `border-image` 9-slice: the corners keep their shape at every size, the stroke sits about 9px outside the element and crosses itself once at the top-left like a marker stroke. Used on `.preset.on` and the active specimen row.
- **frame**: `.frame` a contact-sheet frame (3:2, 2:1 on phones) with an optional `.tag` file slug. Used by the three steps.
- **sheet**: `.sheet` the closing contact sheet, six presets on the balloon, each linking to the generator with that preset.
- **slug**: `.slug` caption line under a plate: name in paper, data in `.data`.
- **specimen index** (landing): `.spec-index` rows with name and glyph ramp; rows share the proof's height, so the list never jumps. The active style's description is in the proof caption (`.spec-cap`).
- **menu** (landing, ≤860px): `details.menu` with the section links; closes on pick, outside tap or Escape.
- **control group** (generator): `details.grp` > `summary` + `.grp-body`. Effect groups show a `.mod` badge ("2 on"); Colour shows its mode as `.val`. Style and Picture start open (Picture starts closed on desktop windows under 860px tall); Colour, Outlines & glow, Old screen and Motion start closed.
- **ctl**: `.ctl` (label 76px | range | value 36px) and `.ctl.sw` (label | `input.switch`). Ranges are 28px tall with a 3px track and a 10×20 thumb; fill comes from `--v`.
- **style tile**: `.style` (glyph cell 13px mono + name), 2 columns, 36px tall.
- **seg**: `.seg` 3-way colour mode. **swatch**: `.sw1` palette chips, 7 in one row, shown only in Palette mode with the chosen name under them. Ink shows only in Mono; Background shows in every mode.
- **preset card**: `.preset` (104×84 thumbnail + name) in `.strip` › `.presets`. The strip head shows the count and, on desktop, `.pager` arrows; `.fade-l`/`.fade-r` edge fades show that more presets sit off-screen.
- **toolbar**: `.toolbar` (slug, Hold to compare, Split, and on phones `.to-exp`, a jump to the export block). **transport**: `.transport` (play, scrub, timecode).
- **drop**: `.drop` empty state (headline, Choose a file, sample thumbnails `.sample`, balloon first); `.over` shows a solid marker border while a file is dragged over.
- **export block**: `.exp`, one row: Format, Size (long edge in px) and Export; a hint line says what the two selects mean ("JPEG · long edge 1920 px (1080p)"). A transparent toggle appears for WebP; MP4 shows a progress bar and Cancel takes Export's place. Pinned to the rail bottom on desktop with a fade above it while more controls sit below (`.panel.more`); inline at the end of the controls on phones.

## Key flows and states
- **Empty:** the drop panel invites a file or a sample. The preset strip previews every preset on the balloon and says so ("Previewed on a sample until you add a picture."). Compare, Split and the whole export block are disabled, with "Add a picture to export." as the reason.
- **Loaded:** the plate takes the source aspect ratio (`--ar`, set by `setSource`). The nav shows file · size · kind; the toolbar slug shows only preset · style · detail (each fact appears once).
- **Compare:** hold the button (or C) to see the original in full; long-press does not open a menu on touch. **Split** toggles a draggable, keyboard-operable divider (output on the left, original on the right).
- **Video:** the transport bar appears, and the formats become MP4, JPEG and WebP (frame exports say "of this frame").
- **Export:** busy text, then a progress bar and Cancel for MP4. Success reports the size; errors use `--alert`.
- **Leaving:** Styles and Help open in a new tab; with a picture loaded, the page asks before it unloads (logo, reload, close).
- **No WebGL2:** the landing page shows `.nogl` over the hero; the generator shows `#glmsg` in the drop panel.
- **Mobile (≤860px):** `.app` becomes the single scroll parent of stage, strip and rail, so the stage (40svh, 200–440px) and toolbar stay pinned under the nav for the whole control list. The toolbar's Export jumps to the export block and focuses its button. Under 560px the toolbar slug hides and the nav shows the logo mark plus the file. In the empty state the stage is not pinned and the drop panel takes the room it needs. The landing nav swaps its links for the Menu.

## Accessibility and verification
- Measured contrast (WCAG): paper 15.2:1, paper-2 9.5:1 and paper-3 6.0:1 on carbon-1; paper-3 is 4.76:1 on carbon-3 (its worst case). Marker-ink on marker is 12.6:1, and rule-strong is 3.1:1 on carbon-2. Primary button text is 16.2:1.
- Targets: buttons are at least 36px tall (40px in the phone toolbar, 44px for Export, 48px for large ones), group headers 44px, ranges 28px, style tiles 36px, menu links 44px.
- Reduced motion: no hero wipe (it rests at 68%), no headline animation, no smooth scroll or smooth paging.
- Renders inspected at 1440×900, 1440×768, 960×800 and 390×844 (landing; generator empty, loaded, video + split, MP4 export progress, colour modes, scrolled controls). `scrollWidth - clientWidth` is 0 at 390 and 960. Evidence is in `~/.cache/agent-runtime/ascii-polish/fix/`.

## Decisions and deferred
- Fonts are self-hosted (Latin subset only). Non-Latin text and the braille/block glyph ramps fall back to the system stack.
- The yellow marker is the only accent. Errors use a softer coral (`--alert`) so they never look like a selection.
- The landing proofs use the balloon sample (bright subject on a dark sky) and lower the detail on small plates (about one cell per 6px) so the marks stay readable.
- Presets do not refresh their thumbnails after a slider change unless the source is live. That is engine-loop behaviour and was left unchanged.
- Deferred: fullscreen view, a light theme, persisting work across reloads, and keyboard shortcuts beyond C.
