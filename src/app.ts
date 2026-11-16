import { Renderer, fitSize, type SourceEl } from './engine/renderer';
import { STYLES, STYLE_ORDER, PALETTES, PRESETS, DEFAULTS, applyPreset, type Params } from './engine/styles';
import { getSample, SAMPLES } from './engine/samples';
import { exportImage, exportVideo, download, videoExportSupported } from './engine/export';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const view = $('view'), out = $<HTMLCanvasElement>('out'), orig = $<HTMLCanvasElement>('orig');
const drop = $('drop'), panel = $('panel'), presetsEl = $('presets'), transport = $('transport');
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
function sec(title: string, extra = ''): HTMLElement {
  const s = document.createElement('div'); s.className = 'sec ' + extra; s.innerHTML = '<h3>' + title + '</h3>'; panel.appendChild(s); return s;
}
function slider(parent: HTMLElement, key: keyof Params, label: string, min: number, max: number, step: number, fmt = (v: number) => String(Math.round(v * 100) / 100)) {
  const w = document.createElement('label'); w.className = 'ctl';
  w.innerHTML = '<span>' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '"><output></output>';
  const i = w.querySelector('input')!, o = w.querySelector('output')!;
  const sync = () => { i.value = String(p[key]); o.textContent = fmt(p[key] as number); };
  i.oninput = () => { (p as any)[key] = parseFloat(i.value); o.textContent = fmt(p[key] as number); touched(); };
  refreshers.push(sync); parent.appendChild(w); return w;
}
function toggle(parent: HTMLElement, key: keyof Params, label: string) {
  const w = document.createElement('label'); w.className = 'ctl sw';
  w.innerHTML = '<span>' + label + '</span><input type="checkbox">';
  const i = w.querySelector('input')!;
  i.onchange = () => { (p as any)[key] = i.checked; touched(); };
  refreshers.push(() => { i.checked = !!p[key]; }); parent.appendChild(w);
}
function touched() { activePreset = null; syncPresetUI(); markDirty(); }

const sStyle = sec('Style');
const styleGrid = document.createElement('div'); styleGrid.className = 'styles'; sStyle.appendChild(styleGrid);
const styleBtns = STYLE_ORDER.map(id => {
  const b = document.createElement('button'); b.className = 'pill'; b.textContent = STYLES[id].name;
  b.onclick = () => { p.style = id; touched(); refreshAll(); }; styleGrid.appendChild(b); return [id, b] as const;
});
const styleDesc = document.createElement('p'); styleDesc.className = 'desc'; sStyle.appendChild(styleDesc);
const customWrap = document.createElement('div'); customWrap.style.marginTop = '10px';
customWrap.innerHTML = '<input class="txt" id="custom" maxlength="64" placeholder="Characters, dark to light" spellcheck="false">';
sStyle.appendChild(customWrap);
const customIn = customWrap.querySelector('input')!;
customIn.oninput = () => { p.custom = customIn.value || ' .oO@'; touched(); };
refreshers.push(() => {
  styleBtns.forEach(([id, b]) => b.setAttribute('aria-pressed', String(p.style === id)));
  styleDesc.textContent = STYLES[p.style].desc; customWrap.style.display = p.style === 'custom' ? '' : 'none'; customIn.value = p.custom;
});

const sImg = sec('Picture');
slider(sImg, 'detail', 'Detail', 16, 360, 1, v => String(v));
slider(sImg, 'contrast', 'Contrast', 0.4, 2.4, 0.01);
slider(sImg, 'brightness', 'Brightness', -0.5, 0.5, 0.01);
toggle(sImg, 'invert', 'Invert');

const sCol = sec('Colour');
const seg = document.createElement('div'); seg.className = 'seg';
const modes: [Params['colorMode'], string][] = [['mono', 'Mono'], ['source', 'Picture'], ['palette', 'Palette']];
const segBtns = modes.map(([m, n]) => { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { p.colorMode = m; touched(); refreshAll(); }; seg.appendChild(b); return [m, b] as const; });
sCol.appendChild(seg);
const sw = document.createElement('div'); sw.className = 'swatches';
const swBtns = Object.entries(PALETTES).map(([id, pal]) => {
  const b = document.createElement('button'); b.className = 'sw1'; b.title = pal.name;
  b.style.background = 'linear-gradient(90deg,' + pal.c.join(',') + ')';
  b.onclick = () => { p.palette = id; p.colorMode = 'palette'; touched(); refreshAll(); }; sw.appendChild(b); return [id, b] as const;
});
sCol.appendChild(sw);
const cols = document.createElement('div'); cols.className = 'colors';
cols.innerHTML = '<label>Ink <input type="color" id="fg"></label><label>Background <input type="color" id="bg"></label>';
sCol.appendChild(cols);
const fgIn = cols.querySelector<HTMLInputElement>('#fg')!, bgIn = cols.querySelector<HTMLInputElement>('#bg')!;
fgIn.oninput = () => { p.fg = fgIn.value; touched(); }; bgIn.oninput = () => { p.bg = bgIn.value; touched(); };
refreshers.push(() => {
  segBtns.forEach(([m, b]) => b.classList.toggle('on', p.colorMode === m));
  swBtns.forEach(([id, b]) => b.classList.toggle('on', p.colorMode === 'palette' && p.palette === id));
  fgIn.value = p.fg; bgIn.value = p.bg;
});

const sOut = sec('Outlines & glow');
slider(sOut, 'outlines', 'Outlines', 0, 100, 1); slider(sOut, 'glow', 'Glow', 0, 100, 1);
const sScr = sec('Old screen');
slider(sScr, 'scanlines', 'Scanlines', 0, 100, 1); slider(sScr, 'crt', 'CRT curve', 0, 100, 1);
slider(sScr, 'aberration', 'Aberration', 0, 100, 1); slider(sScr, 'grain', 'Film grain', 0, 100, 1); slider(sScr, 'flicker', 'Flicker', 0, 100, 1);
const sMot = sec('Motion');
toggle(sMot, 'animate', 'Animate'); slider(sMot, 'speed', 'Speed', 0.1, 4, 0.1); slider(sMot, 'rain', 'Digital rain', 0, 1, 0.01);

/* export */
const sExp = sec('Export', 'exp');
sExp.insertAdjacentHTML('beforeend', '<label class="ctl" style="grid-template-columns:70px 1fr"><span>Format</span><select id="fmt"></select></label>' +
  '<label class="ctl" style="grid-template-columns:70px 1fr"><span>Size</span><select id="size"><option value="1280">720p (1280)</option><option value="1920" selected>1080p (1920)</option><option value="3840">4K (3840)</option></select></label>' +
  '<label class="ctl sw" id="trwrap"><span>Transparent background</span><input type="checkbox" id="tr"></label>' +
  '<div class="row"><button class="btn primary" id="export" style="flex:1">Export</button><button class="btn" id="cancel" hidden>Cancel</button></div>' +
  '<progress id="prog" max="1" value="0" hidden></progress><p class="msg" id="msg">Free. No watermark. Rendered on your device.</p>');
const fmtSel = $<HTMLSelectElement>('fmt'), sizeSel = $<HTMLSelectElement>('size'), trIn = $<HTMLInputElement>('tr');
const prog = $<HTMLProgressElement>('prog'), msg = $('msg'), expBtn = $<HTMLButtonElement>('export'), cancelBtn = $<HTMLButtonElement>('cancel');
function fillFormats() {
  const v = src?.kind === 'video';
  const opts = (v ? [['mp4', 'MP4 video'], ['jpeg', 'JPEG (current frame)'], ['webp', 'WebP (current frame)']] : [['jpeg', 'JPEG'], ['webp', 'WebP']]);
  fmtSel.innerHTML = opts.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
  fmtChanged();
}
function fmtChanged() { $('trwrap').style.display = fmtSel.value === 'webp' ? '' : 'none'; }
fmtSel.onchange = fmtChanged;
let abort: AbortController | null = null;
cancelBtn.onclick = () => abort?.abort();
expBtn.onclick = async () => {
  if (!src) { msg.textContent = 'Add a picture or video first.'; return; }
  const edge = parseInt(sizeSel.value), fmt = fmtSel.value;
  expBtn.disabled = true; prog.hidden = true; msg.textContent = 'Rendering…';
  const name = 'ascii-' + p.style;
  try {
    if (fmt === 'mp4') {
      if (!videoExportSupported()) throw new Error('MP4 export needs WebCodecs (Chrome, Edge, Safari 16.4+).');
      const v = src.el as HTMLVideoElement; abort = new AbortController();
      prog.hidden = false; cancelBtn.hidden = false; prog.value = 0;
      const blob = await exportVideo(v, p, edge, f => { prog.value = f; msg.textContent = 'Rendering frames… ' + Math.round(f * 100) + '%'; }, abort.signal);
      download(blob, name + '.mp4'); msg.textContent = 'Saved MP4 (' + (blob.size / 1048576).toFixed(1) + ' MB).';
    } else {
      const { blob, ext } = await exportImage(src.el, src.w, src.h, { ...p, transparent: trIn.checked }, edge, fmt as 'jpeg' | 'webp', p.animate || src.kind === 'video' ? clock : 0);
      download(blob, name + '.' + ext); msg.textContent = 'Saved ' + ext.toUpperCase() + ' (' + Math.round(blob.size / 1024) + ' KB).';
    }
  } catch (e) {
    msg.textContent = (e as Error).name === 'AbortError' ? 'Cancelled.' : 'Export failed: ' + (e as Error).message;
  } finally { expBtn.disabled = false; cancelBtn.hidden = true; prog.hidden = true; abort = null; markDirty(); }
};

function refreshAll() { refreshers.forEach(f => f()); }

/* ---------- presets ---------- */
const presetCards = PRESETS.map(pr => {
  const b = document.createElement('button'); b.className = 'preset'; b.title = pr.name;
  b.innerHTML = '<canvas width="120" height="120"></canvas><span>' + pr.name + '</span>';
  b.onclick = () => { p = applyPreset(p, pr.id); activePreset = pr.id; refreshAll(); syncPresetUI(); markDirty(); };
  presetsEl.appendChild(b); return { pr, b, c: b.querySelector('canvas')! };
});
function syncPresetUI() { presetCards.forEach(({ pr, b }) => b.classList.toggle('on', pr.id === activePreset)); }
let thumbAt = 0;
function renderThumbs() {
  if (!thumbR || !src) return;
  thumbR.setSource(src.el, src.w, src.h);
  const [w, h] = fitSize(src.w / src.h, 132);
  for (const { pr, c } of presetCards) {
    const q = applyPreset(p, pr.id); q.detail = Math.max(16, Math.round(q.detail * 0.36));
    thumbR.render(q, w, h, clock);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.getContext('2d')!.drawImage(thumbR.canvas, 0, 0);
  }
  thumbAt = performance.now();
}

/* ---------- source loading ---------- */
function setSource(el: SourceEl, w: number, h: number, kind: 'image' | 'video') {
  if (src?.kind === 'video' && src.el !== el) { const o = src.el as HTMLVideoElement; o.pause(); URL.revokeObjectURL(o.src); }
  src = { el, w, h, kind };
  renderer?.setSource(el, w, h);
  drop.classList.add('hidden');
  transport.hidden = kind !== 'video';
  fillFormats(); renderThumbs(); markDirty();
}
function loadSample(i: number) { const c = getSample(i); setSource(c, c.width, c.height, 'image'); }
async function loadFile(f: File) {
  const url = URL.createObjectURL(f);
  if (f.type.startsWith('video/')) {
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); });
    setSource(v, v.videoWidth, v.videoHeight, 'video'); void v.play(); bindVideo(v);
  } else {
    const img = new Image(); img.src = url;
    try { await img.decode(); } catch { msg.textContent = 'Could not read that file.'; return; }
    setSource(img, img.naturalWidth, img.naturalHeight, 'image');
  }
}
const play = $<HTMLButtonElement>('play'), scrub = $<HTMLInputElement>('scrub'), timeEl = $('time');
const fmtT = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function bindVideo(v: HTMLVideoElement) {
  play.onclick = () => { if (v.paused) void v.play(); else v.pause(); play.textContent = v.paused ? 'Play' : 'Pause'; markDirty(); };
  play.textContent = 'Pause';
  scrub.oninput = () => { v.currentTime = (parseFloat(scrub.value) / 1000) * v.duration; markDirty(); };
  v.ontimeupdate = () => { if (document.activeElement !== scrub) scrub.value = String(Math.round(v.currentTime / v.duration * 1000)); timeEl.textContent = fmtT(v.currentTime) + ' / ' + fmtT(v.duration); };
  v.onseeked = markDirty;
}
$('browse').onclick = () => fileIn.click(); $('replace').onclick = () => fileIn.click();
fileIn.onchange = () => { const f = fileIn.files?.[0]; if (f) void loadFile(f); fileIn.value = ''; };
$('samples').innerHTML = SAMPLES.map((s, i) => '<button class="btn" data-s="' + i + '">Sample: ' + s.name + '</button>').join('');
$('samples').onclick = e => { const b = (e.target as HTMLElement).closest('[data-s]') as HTMLElement | null; if (b) loadSample(+b.dataset.s!); };
for (const t of ['dragenter', 'dragover']) window.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); });
for (const t of ['dragleave', 'drop']) window.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); });
window.addEventListener('drop', e => { const f = (e as DragEvent).dataTransfer?.files?.[0]; if (f) void loadFile(f); });
window.addEventListener('paste', e => {
  const it = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/') || i.type.startsWith('video/'));
  const f = it?.getAsFile(); if (f) void loadFile(f);
});

/* compare */
function showOrig(on: boolean) {
  view.classList.toggle('compare', on);
  if (on && src) { orig.width = out.width; orig.height = out.height; orig.getContext('2d')!.drawImage(src.el as CanvasImageSource, 0, 0, orig.width, orig.height); }
}
const cmpBtn = $('compare');
['pointerdown'].forEach(t => cmpBtn.addEventListener(t, () => showOrig(true)));
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => cmpBtn.addEventListener(t, () => showOrig(false)));
window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'c' && !(e.target as HTMLElement).matches('input,select')) showOrig(true); });
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
  if (view.classList.contains('compare')) showOrig(true);
}
requestAnimationFrame(frame);
let rt: number; window.addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(markDirty, 120); });

/* ---------- init ---------- */
const q = new URLSearchParams(location.search);
const qp = q.get('preset'); if (qp && PRESETS.some(x => x.id === qp)) { p = applyPreset(p, qp); activePreset = qp; }
const qs = q.get('style'); if (qs && qs in STYLES) { p.style = qs as Params['style']; activePreset = null; }
refreshAll(); syncPresetUI();
if (renderer && q.has('sample')) loadSample(parseInt(q.get('sample')!) || 0);
