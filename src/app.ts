import { Renderer, fitSize, type SourceEl } from './engine/renderer';
import { STYLES, STYLE_ORDER, PALETTES, PRESETS, DEFAULTS, applyPreset, type Params } from './engine/styles';
import { getSample, SAMPLES } from './engine/samples';
import { exportImage, exportVideo, download, videoExportSupported } from './engine/export';
import { sound } from './sound';
import { findWork, workParams, workUrl } from './works';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const view = $('view'), out = $<HTMLCanvasElement>('out'), orig = $<HTMLCanvasElement>('orig');
const drop = $('drop'), panel = $('panel'), presetsEl = $('presets'), transport = $('transport'), app = $('app');
const fileIn = $<HTMLInputElement>('file');

let p: Params = { ...DEFAULTS };
let activePreset: string | null = 'classic';
let dirty = true, clock = 0, last = performance.now();
let src: { el: SourceEl; w: number; h: number; kind: 'image' | 'video' } | null = null;
let renderer: Renderer | null = null;
const thumbR = Renderer.supported() ? new Renderer() : null;

if (!thumbR) { $('glmsg').hidden = false; }
else renderer = new Renderer(out);

const markDirty = () => { dirty = true; };
const isLive = () => !!src && ((src.kind === 'video' && !(src.el as HTMLVideoElement).paused) || p.animate);

/* ---------- panel ---------- */
type Ctl = () => void;
const refreshers: Ctl[] = [];
const metaRefreshers: Ctl[] = []; // slug + 'n on' badges; safe to run while a control is being edited
/** A collapsible control group. `fx` lists effect keys; the summary shows how many are on while it is closed. */
function sec(title: string, open = true, fx: (keyof Params)[] = []): HTMLElement {
  const d = document.createElement('details'); d.className = 'grp'; d.open = open;
  d.innerHTML = '<summary><span></span><span class="mod"></span></summary><div class="grp-body"></div>';
  d.querySelector('summary span')!.textContent = title;
  panel.appendChild(d);
  if (fx.length) {
    const mod = d.querySelector<HTMLElement>('.mod')!;
    metaRefreshers.push(() => {
      const n = fx.filter(k => p[k] !== DEFAULTS[k]).length;
      d.classList.toggle('is-mod', n > 0); mod.textContent = n + ' on';
    });
  }
  return d.querySelector<HTMLElement>('.grp-body')!;
}
function slider(parent: HTMLElement, key: keyof Params, label: string, min: number, max: number, step: number, fmt = (v: number) => String(Math.round(v * 100) / 100)) {
  const w = document.createElement('label'); w.className = 'ctl';
  w.innerHTML = '<span>' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '"><output></output>';
  const i = w.querySelector('input')!, o = w.querySelector('output')!;
  const fill = () => i.style.setProperty('--v', ((parseFloat(i.value) - min) / (max - min) * 100) + '%');
  const sync = () => { i.value = String(p[key]); o.textContent = fmt(p[key] as number); fill(); };
  i.oninput = () => { (p as any)[key] = parseFloat(i.value); o.textContent = fmt(p[key] as number); fill(); touched(); };
  refreshers.push(sync); parent.appendChild(w); return w;
}
function toggle(parent: HTMLElement, key: keyof Params, label: string) {
  const w = document.createElement('label'); w.className = 'ctl sw';
  w.innerHTML = '<span>' + label + '</span><input type="checkbox" class="switch">';
  const i = w.querySelector('input')!;
  i.onchange = () => { (p as any)[key] = i.checked; touched(); };
  refreshers.push(() => { i.checked = !!p[key]; }); parent.appendChild(w);
}
function touched() { activePreset = null; syncPresetUI(); markDirty(); metaRefreshers.forEach(f => f()); }

const GLYPHS: Record<string, string> = {
  classic: '@%#*', detailed: '$8&o', blocks: '▓▒░', letters: 'AbC', sparse: '+:.', binary: '101', braille: '⣿⣶⣤',
  dots: '●•·', dither: '▚▞▚', bricks: '▣▣▣', custom: 'Aa+.', particles: '·•·', film: '◐◑', drift: '▞▖▝',
};
const sStyle = sec('Style');
const styleGrid = document.createElement('div'); styleGrid.className = 'styles'; styleGrid.setAttribute('role', 'group'); styleGrid.setAttribute('aria-label', 'Style'); sStyle.appendChild(styleGrid);
const styleBtns = STYLE_ORDER.map(id => {
  const b = document.createElement('button'); b.className = 'style';
  b.innerHTML = '<span class="gl" aria-hidden="true"></span><span></span>';
  b.querySelector('.gl')!.textContent = GLYPHS[id] || '';
  (b.lastChild as HTMLElement).textContent = STYLES[id].name;
  b.onclick = () => { sound.tick(); p.style = id; touched(); refreshAll(); }; styleGrid.appendChild(b); return [id, b] as const;
});
const styleDesc = document.createElement('p'); styleDesc.className = 'desc'; sStyle.appendChild(styleDesc);
const customWrap = document.createElement('div'); customWrap.style.marginTop = '10px';
customWrap.innerHTML = '<input class="txt" id="custom" maxlength="64" placeholder="Characters, dark to light" spellcheck="false" aria-label="Custom characters, dark to light">';
sStyle.appendChild(customWrap);
const customIn = customWrap.querySelector('input')!;
customIn.oninput = () => { p.custom = customIn.value || ' .oO@'; touched(); };
refreshers.push(() => {
  styleBtns.forEach(([id, b]) => b.setAttribute('aria-pressed', String(p.style === id)));
  styleDesc.textContent = STYLES[p.style].desc; customWrap.style.display = p.style === 'custom' ? '' : 'none'; customIn.value = p.custom;
});

// Short desktop windows: start Picture closed so the effect groups are not pushed under the export block.
const sImg = sec('Picture', !matchMedia('(min-width:861px) and (max-height:859px)').matches);
slider(sImg, 'detail', 'Detail', 16, 360, 1, v => String(v));
slider(sImg, 'contrast', 'Contrast', 0.4, 2.4, 0.01);
slider(sImg, 'brightness', 'Brightness', -0.5, 0.5, 0.01);
toggle(sImg, 'invert', 'Invert');

const sCol = sec('Colour', false);
const colVal = sCol.closest('details')!.querySelector('summary')!.insertBefore(document.createElement('span'), sCol.closest('details')!.querySelector('.mod'));
colVal.className = 'val data';
const seg = document.createElement('div'); seg.className = 'seg';
seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Colour mode');
const modes: [Params['colorMode'], string][] = [['mono', 'Mono'], ['source', 'Picture'], ['palette', 'Palette']];
const segBtns = modes.map(([m, n]) => { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { sound.tick(); p.colorMode = m; touched(); refreshAll(); }; seg.appendChild(b); return [m, b] as const; });
sCol.appendChild(seg);
// Palette swatches only matter in Palette mode, Ink only in Mono; Background applies to every mode.
const palWrap = document.createElement('div'); palWrap.className = 'pal';
palWrap.innerHTML = '<div class="swatches" role="group" aria-label="Palette"></div><p class="pal-name"><span class="data">Palette</span> <span></span></p>';
const sw = palWrap.querySelector<HTMLElement>('.swatches')!, palName = palWrap.querySelector<HTMLElement>('.pal-name span:last-child')!;
const swBtns = Object.entries(PALETTES).map(([id, pal]) => {
  const b = document.createElement('button'); b.className = 'sw1'; b.title = pal.name; b.setAttribute('aria-label', pal.name);
  b.style.background = 'linear-gradient(90deg,' + pal.c.join(',') + ')';
  b.onclick = () => { sound.tick(); p.palette = id; touched(); refreshAll(); }; sw.appendChild(b); return [id, b] as const;
});
sCol.appendChild(palWrap);
const cols = document.createElement('div'); cols.className = 'colors';
cols.innerHTML = '<label id="fgwrap">Ink <input type="color" id="fg"></label><label>Background <input type="color" id="bg"></label>';
sCol.appendChild(cols);
const fgWrap = cols.querySelector<HTMLElement>('#fgwrap')!;
const fgIn = cols.querySelector<HTMLInputElement>('#fg')!, bgIn = cols.querySelector<HTMLInputElement>('#bg')!;
fgIn.oninput = () => { p.fg = fgIn.value; touched(); }; bgIn.oninput = () => { p.bg = bgIn.value; touched(); };
refreshers.push(() => {
  segBtns.forEach(([m, b]) => { b.classList.toggle('on', p.colorMode === m); b.setAttribute('aria-pressed', String(p.colorMode === m)); });
  swBtns.forEach(([id, b]) => { const on = p.palette === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  palWrap.hidden = p.colorMode !== 'palette'; fgWrap.hidden = p.colorMode !== 'mono';
  palName.textContent = (PALETTES[p.palette] || PALETTES.green).name;
  colVal.textContent = modes.find(([m]) => m === p.colorMode)![1];
  fgIn.value = p.fg; bgIn.value = p.bg;
});

const sOut = sec('Outlines & glow', false, ['outlines', 'glow']);
slider(sOut, 'outlines', 'Outlines', 0, 100, 1); slider(sOut, 'glow', 'Glow', 0, 100, 1);
const sScr = sec('Old screen', false, ['scanlines', 'crt', 'aberration', 'grain', 'flicker']);
slider(sScr, 'scanlines', 'Scanlines', 0, 100, 1); slider(sScr, 'crt', 'CRT curve', 0, 100, 1);
slider(sScr, 'aberration', 'Aberration', 0, 100, 1); slider(sScr, 'grain', 'Film grain', 0, 100, 1); slider(sScr, 'flicker', 'Flicker', 0, 100, 1);
const sMot = sec('Motion', false, ['animate', 'rain']);
toggle(sMot, 'animate', 'Animate'); slider(sMot, 'speed', 'Speed', 0.1, 4, 0.1); slider(sMot, 'rain', 'Digital rain', 0, 1, 0.01);

/* export */
const sExp = document.createElement('section'); sExp.className = 'exp'; sExp.setAttribute('aria-label', 'Export'); panel.appendChild(sExp);
sExp.insertAdjacentHTML('beforeend', '<h2 class="vh">Export</h2><div class="exp-row"><select id="fmt" aria-label="Format" aria-describedby="msg"></select>' +
  '<select id="size" aria-label="Size, long edge" aria-describedby="msg"><option value="1280">1280 px</option><option value="1920" selected>1920 px</option><option value="3840">3840 px</option></select>' +
  '<button class="btn primary" id="export">Export</button><button class="btn" id="cancel" hidden>Cancel</button></div>' +
  '<label class="ctl sw" id="trwrap"><span>Transparent background</span><input type="checkbox" class="switch" id="tr"></label>' +
  '<progress id="prog" max="1" value="0" hidden aria-label="Export progress"></progress><p class="msg" id="msg" aria-live="polite"></p>');
const fmtSel = $<HTMLSelectElement>('fmt'), sizeSel = $<HTMLSelectElement>('size'), trIn = $<HTMLInputElement>('tr');
const prog = $<HTMLProgressElement>('prog'), msg = $('msg'), expBtn = $<HTMLButtonElement>('export'), cancelBtn = $<HTMLButtonElement>('cancel');
const toExp = $<HTMLButtonElement>('toExport');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Phone layout: the export block sits at the end of the controls, so the pinned toolbar carries a jump to it.
toExp.onclick = () => { sExp.scrollIntoView({ block: 'end', behavior: reduceMotion ? 'auto' : 'smooth' }); expBtn.focus({ preventScroll: true }); };
function fillFormats() {
  const v = src?.kind === 'video';
  const opts = (v ? [['mp4', 'MP4'], ['jpeg', 'JPEG'], ['webp', 'WebP']] : [['jpeg', 'JPEG'], ['webp', 'WebP']]);
  fmtSel.innerHTML = opts.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
  fmtChanged();
}
const SIZE_NAME: Record<string, string> = { '1280': '720p', '1920': '1080p', '3840': '4K' };
/** The line under the export row says what the two selects mean, so the size is never a bare number. */
function expHint() {
  msg.classList.remove('err');
  if (!src) { msg.textContent = 'Add a picture to export.'; return; }
  const f = fmtSel.value, name = f === 'webp' ? 'WebP' : f.toUpperCase();
  const what = f !== 'mp4' && src.kind === 'video' ? name + ' of this frame' : name;
  msg.textContent = what + ' · long edge ' + sizeSel.value + ' px (' + SIZE_NAME[sizeSel.value] + ')';
}
function fmtChanged() { $('trwrap').style.display = fmtSel.value === 'webp' ? '' : 'none'; expHint(); }
fmtSel.onchange = fmtChanged;
sizeSel.onchange = expHint;
/** Empty state: nothing to export yet, so the export controls are off and say why. */
function syncExportState() {
  const none = !src;
  [expBtn, fmtSel, sizeSel, trIn, toExp].forEach(el => { el.disabled = none; });
  app.classList.toggle('is-empty', none);
  expHint();
}
let abort: AbortController | null = null;
cancelBtn.onclick = () => abort?.abort();
expBtn.onclick = async () => {
  msg.classList.remove('err');
  if (!src) { expHint(); return; }
  const edge = parseInt(sizeSel.value), fmt = fmtSel.value;
  expBtn.disabled = true; prog.hidden = true; msg.textContent = 'Rendering…';
  const name = 'ascii-' + p.style;
  try {
    if (fmt === 'mp4') {
      if (!videoExportSupported()) throw new Error('MP4 export needs WebCodecs (Chrome, Edge, Safari 16.4+).');
      const v = src.el as HTMLVideoElement; abort = new AbortController();
      prog.hidden = false; cancelBtn.hidden = false; prog.value = 0;
      const blob = await exportVideo(v, p, edge, f => { prog.value = f; msg.textContent = 'Rendering frames… ' + Math.round(f * 100) + '%'; }, abort.signal);
      download(blob, name + '.mp4'); msg.textContent = 'Saved MP4 (' + (blob.size / 1048576).toFixed(1) + ' MB).'; sound.done();
    } else {
      const { blob, ext } = await exportImage(src.el, src.w, src.h, { ...p, transparent: trIn.checked }, edge, fmt as 'jpeg' | 'webp', p.animate || src.kind === 'video' ? clock : 0);
      download(blob, name + '.' + ext); msg.textContent = 'Saved ' + (ext === 'webp' ? 'WebP' : ext.toUpperCase()) + ' (' + Math.round(blob.size / 1024) + ' KB).'; sound.done();
    }
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError';
    msg.textContent = aborted ? 'Cancelled.' : 'Export failed: ' + (e as Error).message; msg.classList.toggle('err', !aborted); if (!aborted) sound.fail();
  } finally { expBtn.disabled = false; cancelBtn.hidden = true; prog.hidden = true; abort = null; markDirty(); }
};

function refreshAll() { refreshers.forEach(f => f()); metaRefreshers.forEach(f => f()); }

/* ---------- presets ---------- */
const presetCards = PRESETS.map(pr => {
  const b = document.createElement('button'); b.className = 'preset'; b.title = pr.name;
  b.innerHTML = '<canvas width="120" height="96" aria-hidden="true"></canvas><span>' + pr.name + '</span>';
  b.onclick = () => { sound.tick(); p = applyPreset(p, pr.id); activePreset = pr.id; refreshAll(); syncPresetUI(); markDirty(); revealPreset(true); };
  presetsEl.appendChild(b); return { pr, b, c: b.querySelector('canvas')! };
});
function syncPresetUI() {
  // The marker loop means "your picture, in this preset": it only appears once there is a picture.
  presetCards.forEach(({ pr, b }) => { const on = pr.id === activePreset; b.classList.toggle('on', on && !!src); b.classList.toggle('marked', on && !!src); b.setAttribute('aria-pressed', String(on)); });
}
/** Keep the chosen preset inside the strip's unfaded area (on load it may be the 9th card of 19). */
function revealPreset(smooth = false) {
  const card = presetCards.find(x => x.pr.id === activePreset)?.b; if (!card) return;
  const r = card.getBoundingClientRect(), sr = presetsEl.getBoundingClientRect(), pad = 72;
  const dx = r.left < sr.left + pad ? r.left - sr.left - pad : r.right > sr.right - pad ? r.right - sr.right + pad : 0;
  if (dx) presetsEl.scrollBy({ left: dx, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
}
let thumbAt = 0;
function renderThumbs() {
  if (!thumbR) return;
  // Before a picture is added, the strip previews every preset on the first sample.
  const s = src ?? (() => { const c = getSample(3); return { el: c as SourceEl, w: c.width, h: c.height }; })();
  thumbR.setSource(s.el, s.w, s.h);
  const [w, h] = fitSize(s.w / s.h, 132);
  for (const { pr, c } of presetCards) {
    const q = applyPreset(p, pr.id); q.detail = Math.max(16, Math.round(q.detail * 0.36));
    thumbR.render(q, w, h, clock);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.getContext('2d')!.drawImage(thumbR.canvas, 0, 0);
  }
  thumbAt = performance.now();
}

/* ---------- source loading ---------- */
let srcName = '';
const plate = $('plate'), slugEl = $('slug'), srcInfo = $('srcInfo');
function syncSlug() {
  if (!src) return;
  const style = STYLES[p.style].name, preset = PRESETS.find(x => x.id === activePreset)?.name;
  // The file name lives in the nav; the slug carries only what the controls changed.
  // Names come from the static preset/style tables, never from user input.
  slugEl.innerHTML = preset ? '<b>' + preset + '</b> preset · ' + style + ' · detail ' + p.detail : '<b>' + style + '</b> · detail ' + p.detail;
  srcInfo.innerHTML = '<b></b> · ' + src.w + '×' + src.h + ' · ' + src.kind;
  srcInfo.querySelector('b')!.textContent = srcName;
}
metaRefreshers.push(syncSlug);
function setSource(el: SourceEl, w: number, h: number, kind: 'image' | 'video') {
  if (src?.kind === 'video' && src.el !== el) { const o = src.el as HTMLVideoElement; o.pause(); URL.revokeObjectURL(o.src); }
  src = { el, w, h, kind };
  renderer?.setSource(el, w, h);
  drop.classList.add('hidden'); view.classList.remove('empty');
  ($('compare') as HTMLButtonElement).disabled = false; ($('split') as HTMLButtonElement).disabled = false;
  // The source aspect sizes the plate everywhere and, on phones, the height of the pinned preview.
  app.style.setProperty('--ar', String(w / h));
  transport.hidden = kind !== 'video'; app.classList.toggle('is-video', kind === 'video');
  syncSlug();
  $('stripNote').textContent = kind === 'video' ? 'Your video in every preset.' : 'Your picture in every preset.';
  fillFormats(); syncExportState(); syncPresetUI(); renderThumbs(); markDirty(); sound.load();
}
function loadSample(i: number) { const c = getSample(i); srcName = SAMPLES[i % SAMPLES.length].id + '.png'; setSource(c, c.width, c.height, 'image'); }
/** Opens a picture or a video from a URL: a dropped file (blob URL) or a Library work (same-origin file). */
async function openMedia(url: string, video: boolean) {
  if (video) {
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); });
    setSource(v, v.videoWidth, v.videoHeight, 'video'); void v.play(); bindVideo(v);
  } else {
    const img = new Image(); img.src = url;
    await img.decode();
    setSource(img, img.naturalWidth, img.naturalHeight, 'image');
  }
}
async function loadFile(f: File) {
  srcName = f.name;
  try { await openMedia(URL.createObjectURL(f), f.type.startsWith('video/')); } catch { msg.textContent = 'Could not read that file.'; }
}
const play = $<HTMLButtonElement>('play'), scrub = $<HTMLInputElement>('scrub'), timeEl = $('time');
const PLAY_ICON = '<path d="M3 1.5v9l7.5-4.5z"/>', PAUSE_ICON = '<path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z"/>';
/** The button shows what a press does: a play or pause glyph plus its word (the word is visually hidden on phones). */
function setPlay(paused: boolean) {
  play.querySelector('svg')!.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
  play.querySelector('.lbl')!.textContent = paused ? 'Play' : 'Pause';
}
const fmtT = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function bindVideo(v: HTMLVideoElement) {
  play.onclick = () => { if (v.paused) void v.play(); else v.pause(); setPlay(v.paused); markDirty(); };
  setPlay(false);
  const fill = () => scrub.style.setProperty('--v', (parseFloat(scrub.value) / 10) + '%');
  scrub.oninput = () => { v.currentTime = (parseFloat(scrub.value) / 1000) * v.duration; fill(); markDirty(); };
  v.ontimeupdate = () => { if (document.activeElement !== scrub) { scrub.value = String(Math.round(v.currentTime / v.duration * 1000)); fill(); } timeEl.textContent = fmtT(v.currentTime) + ' / ' + fmtT(v.duration); };
  v.onseeked = markDirty;
}
$('browse').onclick = () => fileIn.click(); $('replace').onclick = () => fileIn.click();
fileIn.onchange = () => { const f = fileIn.files?.[0]; if (f) void loadFile(f); fileIn.value = ''; };
const sampleOrder = [3, 0, 1, 2].filter(i => i < SAMPLES.length);
$('samples').innerHTML = sampleOrder.map(i => '<button class="sample" data-s="' + i + '"><canvas width="240" height="192" aria-hidden="true"></canvas>' + SAMPLES[i].name + '</button>').join('');
$('samples').querySelectorAll('canvas').forEach((c, k) => c.getContext('2d')!.drawImage(getSample(sampleOrder[k]), 0, 0, c.width, c.height));
$('samples').onclick = e => { const b = (e.target as HTMLElement).closest('[data-s]') as HTMLElement | null; if (b) loadSample(+b.dataset.s!); };
for (const t of ['dragenter', 'dragover']) window.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); });
for (const t of ['dragleave', 'drop']) window.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); });
window.addEventListener('drop', e => { const f = (e as DragEvent).dataTransfer?.files?.[0]; if (f) void loadFile(f); });
window.addEventListener('paste', e => {
  const it = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/') || i.type.startsWith('video/'));
  const f = it?.getAsFile(); if (f) void loadFile(f);
});

/* compare */
function drawOrig() {
  if (!src) return;
  if (orig.width !== out.width || orig.height !== out.height) { orig.width = out.width; orig.height = out.height; }
  orig.getContext('2d')!.drawImage(src.el as CanvasImageSource, 0, 0, orig.width, orig.height);
}
function showOrig(on: boolean) {
  view.classList.toggle('compare', on);
  if (on) drawOrig();
}
const splitBtn = $<HTMLButtonElement>('split'), divider = $<HTMLButtonElement>('divider');
let splitAt = 50;
const putSplit = (v: number) => { splitAt = Math.max(0, Math.min(100, v)); plate.style.setProperty('--p', splitAt + '%'); divider.setAttribute('aria-valuenow', String(Math.round(splitAt))); };
splitBtn.onclick = () => {
  const on = !view.classList.contains('split');
  view.classList.toggle('split', on); splitBtn.setAttribute('aria-pressed', String(on));
  if (on) { putSplit(splitAt); drawOrig(); }
};
let dragging = false;
const dragTo = (e: PointerEvent) => { const r = plate.getBoundingClientRect(); putSplit((e.clientX - r.left) / r.width * 100); };
plate.addEventListener('pointerdown', e => { if (!view.classList.contains('split')) return; dragging = true; plate.setPointerCapture(e.pointerId); dragTo(e); });
plate.addEventListener('pointermove', e => { if (dragging) dragTo(e); });
['pointerup', 'pointercancel'].forEach(t => plate.addEventListener(t, () => { dragging = false; }));
divider.addEventListener('keydown', e => {
  const step = e.shiftKey ? 10 : 2;
  if (e.key === 'ArrowLeft') putSplit(splitAt - step); else if (e.key === 'ArrowRight') putSplit(splitAt + step); else return;
  e.preventDefault();
});
const cmpBtn = $('compare');
cmpBtn.addEventListener('contextmenu', e => e.preventDefault()); // long-press on touch must not open a menu
['pointerdown'].forEach(t => cmpBtn.addEventListener(t, () => showOrig(true)));
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => cmpBtn.addEventListener(t, () => showOrig(false)));
window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'c' && !e.repeat && !(e.target as HTMLElement).matches('input,select')) showOrig(true); });
window.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'c') showOrig(false); });

/* ---------- loop ---------- */
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!src || !renderer) return;
  const live = isLive();
  if (live) clock += dt;
  if (!dirty && !live) return;
  const [w, h] = fitSize(src.w / src.h, Math.min(1600, Math.max(900, Math.round(Math.max(view.clientWidth, view.clientHeight) * Math.min(devicePixelRatio, 1.5)))));
  const t = (p.animate || src.kind === 'video') ? clock : 0;
  renderer.render({ ...p, transparent: false }, w, h, t);
  dirty = false;
  if (live && now - thumbAt > 1500) renderThumbs();
  if (view.classList.contains('compare') || view.classList.contains('split')) drawOrig();
}
requestAnimationFrame(frame);
let rt: number; window.addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(markDirty, 120); });

/* ---------- init ---------- */
const q = new URLSearchParams(location.search);
const qp = q.get('preset'); if (qp && PRESETS.some(x => x.id === qp)) { p = applyPreset(p, qp); activePreset = qp; }
const qs = q.get('style'); if (qs && qs in STYLES) { p.style = qs as Params['style']; activePreset = null; }
// Library deep link (?work=<id>): the work's own file with its settings. A tuned work marks no preset as chosen.
const work = findWork(q.get('work'));
if (work) { p = workParams(work); activePreset = work.tweak ? null : work.preset; }
refreshAll(); syncPresetUI(); fillFormats(); syncExportState();
if (renderer && !q.has('sample') && !work) renderThumbs();
if (renderer && work) { srcName = work.file; openMedia(workUrl(work), work.kind === 'video').catch(() => { renderThumbs(); msg.textContent = 'Could not load ' + work.file + '.'; }); }
else if (renderer && q.has('sample')) loadSample(parseInt(q.get('sample')!) || 0);

/* ---------- cues ---------- */
// Preset strip: edge fades and pager buttons show that more presets sit off-screen.
const prevP = $<HTMLButtonElement>('prevP'), nextP = $<HTMLButtonElement>('nextP');
function syncStrip() {
  const atStart = presetsEl.scrollLeft < 4, atEnd = presetsEl.scrollLeft + presetsEl.clientWidth >= presetsEl.scrollWidth - 4;
  presetsEl.classList.toggle('fade-l', !atStart); presetsEl.classList.toggle('fade-r', !atEnd);
  prevP.disabled = atStart; nextP.disabled = atEnd;
}
const page = (dir: number) => presetsEl.scrollBy({ left: dir * presetsEl.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
prevP.onclick = () => page(-1); nextP.onclick = () => page(1);
presetsEl.addEventListener('scroll', syncStrip, { passive: true });
// Control rail: a fade above the pinned export block while more controls sit below it.
// Only fade when a real share of a row is hidden: a few px of overflow must not dim a header that is fully readable.
function syncRail() { panel.classList.toggle('more', panel.scrollTop + panel.clientHeight < panel.scrollHeight - 24); }
panel.addEventListener('scroll', syncRail, { passive: true });
panel.addEventListener('toggle', syncRail, true);
new ResizeObserver(() => { syncStrip(); syncRail(); }).observe(document.body);
revealPreset(); syncStrip(); syncRail();
// Phone nav: Styles and Help sit in a menu that closes after a pick, a tap outside or Escape.
const menu = $<HTMLDetailsElement>('menu');
menu.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) menu.open = false; });
document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')!.focus(); } });
// Leaving the page drops the picture and every setting, so ask first once there is work to lose.
window.addEventListener('beforeunload', e => { if (src) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- interface sound (off by default) ---------- */
const soundBtn = $<HTMLButtonElement>('soundBtn'), soundTxt = $('soundTxt'), soundWave = document.getElementById('soundWave')!;
function syncSound() {
  const o = sound.enabled; soundBtn.setAttribute('aria-pressed', String(o)); soundTxt.textContent = o ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-label', o ? 'Interface sounds: on' : 'Interface sounds: off');
  soundWave.style.display = o ? '' : 'none';
}
soundBtn.onclick = () => { sound.set(!sound.enabled); syncSound(); };
syncSound();
