import { Renderer, fitSize, type SourceEl } from './engine/renderer';
import { STYLES, PALETTES, DEFAULTS, type Params } from './engine/styles';
import { WORKS, workParams, workUrl, lookName, presetName, type Work } from './works';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const PLAY_ICON = '<path d="M3 1.5v9l7.5-4.5z"/>', PAUSE_ICON = '<path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z"/>';
const secs = (w: Work) => w.dur ? Math.round(w.dur) + ' s' : '';

/* ---------- phone menu: close after a pick, a tap outside or Escape ---------- */
const menu = $<HTMLDetailsElement>('menu');
menu.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) menu.open = false; });
document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')!.focus(); } });

/* ---------- media: one element per work, shared by the wall and the viewer ---------- */
type Media = { el: SourceEl; w: number; h: number };
const media = new Map<string, Promise<Media>>();
function load(w: Work): Promise<Media> {
  if (!media.has(w.id)) media.set(w.id, (async () => {
    if (w.kind === 'video') {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = workUrl(w);
      await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); });
      return { el: v, w: v.videoWidth, h: v.videoHeight };
    }
    const i = new Image(); i.src = workUrl(w); await i.decode();
    return { el: i, w: i.naturalWidth, h: i.naturalHeight };
  })());
  return media.get(w.id)!;
}
const videoOf = (m: Media) => m.el instanceof HTMLVideoElement ? m.el : null;

/* ---------- the wall: proofs at their own aspect ratio, in justified rows ---------- */
const gl = Renderer.supported();
const shared = gl ? new Renderer() : null;
const wall = $('wall');
interface Item { w: Work; li: HTMLLIElement; a: HTMLAnchorElement; c: HTMLCanvasElement; m?: Media; near: boolean; seen: boolean; drawnW: number; lastT: number; }
const items: Item[] = WORKS.map(w => {
  const li = document.createElement('li'); li.className = 'work'; li.dataset.kind = w.kind;
  li.style.setProperty('--ar', String(w.w / w.h));
  li.innerHTML = '<a class="w-link" href="#' + w.id + '"><div class="plate"><canvas aria-hidden="true"></canvas>' +
    (w.kind === 'video' ? '<span class="tag l data">Video · ' + secs(w) + '</span>' : '') + '</div>' +
    '<span class="w-cap"><span class="w-title">' + esc(w.title) + '</span><span class="w-look">' + esc(lookName(w)) + '</span></span></a>';
  const a = li.querySelector('a')!;
  a.setAttribute('aria-label', w.title + ', ' + lookName(w) + '. ' + w.medium + (w.dur ? ', ' + secs(w) : '') + '.');
  wall.appendChild(li);
  return { w, li, a, c: li.querySelector('canvas')!, near: false, seen: false, drawnW: 0, lastT: -1 };
});

/** Wall proofs are small, so cells are kept big enough to read as marks while the picture still reads as a picture.
 *  The smallest useful cell depends on the mark: a glyph about 3.5 CSS px, a braille cell 3, a dither pixel 2, a brick 6. */
const CELL_PX: Record<number, number> = { 0: 3.5, 1: 3.5, 2: 2, 3: 6, 4: 3, 5: 3, 6: 2, 7: 2 };
const wallParams = (it: Item): Params => {
  const q = workParams(it.w), cw = it.c.clientWidth || 300;
  const cap = Math.round(cw / (CELL_PX[STYLES[q.style].mode] ?? 4.5));
  return { ...q, detail: Math.max(36, Math.min(q.detail, cap)), transparent: false };
};
const clock = () => performance.now() / 1000;
function drawItem(it: Item) {
  if (!it.m) return;
  const cw = it.c.clientWidth, ch = it.c.clientHeight; if (!cw || !ch) return;
  const long = Math.min(960, Math.round(Math.max(cw, ch) * Math.min(devicePixelRatio, 1.5)));
  const [w, h] = fitSize(it.m.w / it.m.h, long);
  if (it.c.width !== w || it.c.height !== h) { it.c.width = w; it.c.height = h; }
  const x = it.c.getContext('2d')!;
  if (!shared) { x.drawImage(it.m.el as CanvasImageSource, 0, 0, w, h); it.drawnW = cw; return; }
  shared.setSource(it.m.el, it.m.w, it.m.h);
  shared.render(wallParams(it), w, h, clock());
  x.drawImage(shared.canvas, 0, 0);
  it.drawnW = cw;
  const v = videoOf(it.m); if (v) it.lastT = v.currentTime;
}

/* motion: wall videos play only while near the screen, never under reduced motion unless asked */
let motion = !reduceMotion;
const motionBtn = $<HTMLButtonElement>('motion');
function syncMotion() {
  motionBtn.querySelector('svg')!.innerHTML = motion ? PAUSE_ICON : PLAY_ICON;
  motionBtn.querySelector('.lbl')!.textContent = motion ? 'Pause previews' : 'Play previews';
  items.forEach(syncPlayback);
}
function syncPlayback(it: Item) {
  const v = it.m && videoOf(it.m); if (!v) return;
  if (open && open.w.id === it.w.id) return; // the viewer owns it while it is open
  const run = motion && it.near && !it.li.hidden && !open;
  if (run && v.paused) void v.play().catch(() => {});
  else if (!run && !v.paused) v.pause();
}
motionBtn.onclick = () => { motion = !motion; syncMotion(); };

const io = new IntersectionObserver(es => {
  for (const e of es) {
    const it = items.find(x => x.li === e.target)!; it.near = e.isIntersecting;
    if (it.near && !it.seen) {
      it.seen = true;
      load(it.w).then(m => {
        it.m = m;
        const v = videoOf(m);
        // a still frame for the paused state: a moment into the clip, where the subject is in frame
        if (v && !motion) { v.currentTime = (it.w.dur || 4) * 0.45; v.addEventListener('seeked', () => drawItem(it), { once: true }); }
        drawItem(it); syncPlayback(it);
      }).catch(() => { it.li.classList.add('failed'); });
    } else syncPlayback(it);
  }
}, { rootMargin: '600px 0px' });
items.forEach(it => io.observe(it.li));

/* live frames for playing wall videos (one shared GL context, drawn into each proof) */
let lastFrame = 0;
function tick(now: number) {
  requestAnimationFrame(tick);
  if (open || now - lastFrame < 33) return;
  lastFrame = now;
  for (const it of items) {
    const v = it.m && videoOf(it.m);
    if (v && it.near && !it.li.hidden && v.currentTime !== it.lastT) drawItem(it);
  }
}
requestAnimationFrame(tick);
let rt = 0;
new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => items.forEach(it => { if (it.m && Math.abs(it.c.clientWidth - it.drawnW) > 8) drawItem(it); }), 140); }).observe(wall);

/* filter */
const filterEl = $('filter');
const kinds: [string, string][] = [['all', 'All'], ['image', 'Stills'], ['video', 'Video']];
let kind = 'all';
const chips = kinds.map(([k, n]) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
  const count = k === 'all' ? WORKS.length : WORKS.filter(w => w.kind === k).length;
  b.innerHTML = n + ' <span class="n data">' + count + '</span>';
  b.onclick = () => { kind = k; syncFilter(); };
  filterEl.appendChild(b); return [k, b] as const;
});
function syncFilter() {
  chips.forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === kind)));
  items.forEach(it => { it.li.hidden = kind !== 'all' && it.w.kind !== kind; });
  items.forEach(syncPlayback);
  requestAnimationFrame(() => items.forEach(it => { if (!it.li.hidden && it.m && Math.abs(it.c.clientWidth - it.drawnW) > 8) drawItem(it); }));
}
syncFilter();

if (!gl) $('noglLib').hidden = false;

/* credits */
$('credits').innerHTML = WORKS.map(w =>
  '<li><a class="link" href="#' + w.id + '">' + esc(w.title) + '</a><span>' + esc(w.by) + '. ' + esc(w.medium) + '.</span>' +
  '<span class="cred-src"><a href="' + esc(w.credit.url) + '" rel="noopener" target="_blank">' + esc(w.credit.source) + '<span class="vh"> (opens in a new tab)</span></a> · ' +
  '<a href="' + esc(w.credit.licenceUrl) + '" rel="noopener" target="_blank">' + esc(w.credit.licence) + '<span class="vh"> (opens in a new tab)</span></a></span></li>').join('');

/* ---------- viewer: one work on the light table ---------- */
const dlg = $<HTMLDialogElement>('viewer');
const vOut = $<HTMLCanvasElement>('vOut'), vOrig = $<HTMLCanvasElement>('vOrig'), vCmp = $('vCmp'), vView = $('vView');
const vPlay = $<HTMLButtonElement>('vPlay');
const viewR = gl ? new Renderer(vOut) : null;
let open: Item | null = null, openedHere = false, vDirty = true, cmpAt = 100;

const putCmp = (v: number) => { cmpAt = Math.max(0, Math.min(100, v)); vCmp.style.setProperty('--p', cmpAt + '%'); vCmp.setAttribute('aria-valuenow', String(Math.round(cmpAt))); vCmp.classList.toggle('is-cmp', cmpAt < 99.5); };
{
  let down = false;
  const set = (e: PointerEvent) => { const r = vCmp.getBoundingClientRect(); putCmp((e.clientX - r.left) / r.width * 100); };
  vCmp.addEventListener('pointerdown', e => { down = true; vCmp.setPointerCapture(e.pointerId); set(e); });
  vCmp.addEventListener('pointermove', e => { if (down) set(e); });
  ['pointerup', 'pointercancel'].forEach(t => vCmp.addEventListener(t, () => { down = false; }));
  vCmp.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') putCmp(cmpAt - step); else if (e.key === 'ArrowRight') putCmp(cmpAt + step);
    else if (e.key === 'Home') putCmp(0); else if (e.key === 'End') putCmp(100); else return;
    e.preventDefault(); e.stopPropagation();
  });
}

function settingsRows(w: Work): string {
  const q = workParams(w), d = DEFAULTS;
  const rows: [string, string][] = [];
  rows.push(['Look', w.look ? esc(w.look) : esc(presetName(w.preset)) + (w.tweak ? ' preset, retuned' : ' preset')]);
  rows.push(['Style', esc(STYLES[q.style].name) + ' · detail <span class="data">' + q.detail + '</span>']);
  const col = q.colorMode === 'source' ? 'The picture’s own' : q.colorMode === 'palette' ? (PALETTES[q.palette]?.name ?? q.palette) + ' palette'
    : 'Ink <span class="data">' + q.fg + '</span> on <span class="data">' + q.bg + '</span>';
  rows.push(['Colour', col]);
  const pic: string[] = [];
  if (q.contrast !== d.contrast) pic.push('contrast <span class="data">' + q.contrast + '</span>');
  if (q.brightness !== d.brightness) pic.push('brightness <span class="data">' + q.brightness + '</span>');
  if (q.invert) pic.push('inverted');
  if (pic.length) rows.push(['Picture', pic.join(' · ')]);
  const fx: [keyof Params, string][] = [['outlines', 'outlines'], ['glow', 'glow'], ['scanlines', 'scanlines'], ['crt', 'CRT curve'], ['aberration', 'aberration'], ['grain', 'grain'], ['flicker', 'flicker'], ['rain', 'rain']];
  const on = fx.filter(([k]) => (q[k] as number) > 0).map(([k, n]) => n + ' <span class="data">' + q[k] + '</span>');
  rows.push(['Effects', on.length ? on.join(' · ') : 'None']);
  return rows.map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('');
}

const visible = () => items.filter(it => !it.li.hidden);
function show(it: Item) {
  const w = it.w;
  open = it; vDirty = true; putCmp(100);
  vView.style.setProperty('--ar', String(w.w / w.h));
  $('vMedium').textContent = w.medium + (w.dur ? ' · ' + secs(w) + ', looped' : '');
  $('vTitle').textContent = w.title; $('vBy').textContent = w.by; $('vNote').textContent = w.note;
  $('vSet').innerHTML = settingsRows(w);
  $<HTMLAnchorElement>('vOpen').href = '../app/?work=' + w.id;
  $('vCredit').innerHTML = 'Source: <a class="link" href="' + esc(w.credit.url) + '" rel="noopener" target="_blank">' + esc(w.credit.author) + '<span class="vh"> (opens in a new tab)</span></a> · ' +
    '<a class="link" href="' + esc(w.credit.licenceUrl) + '" rel="noopener" target="_blank">' + esc(w.credit.licence) + '<span class="vh"> (opens in a new tab)</span></a>';
  const vis = visible(), k = vis.indexOf(it);
  $('vPos').textContent = (k + 1) + ' of ' + vis.length;
  vPlay.hidden = w.kind !== 'video';
  load(w).then(m => {
    if (open !== it) return;
    it.m = m;
    viewR?.setSource(m.el, m.w, m.h);
    const v = videoOf(m);
    items.forEach(syncPlayback); // wall videos rest while the viewer is open
    if (v) { if (!reduceMotion) void v.play().catch(() => {}); else v.pause(); syncPlay(); }
    vDirty = true;
  });
  if (!dlg.open) dlg.showModal();
}
function syncPlay() {
  const v = open?.m && videoOf(open.m); if (!v) return;
  vPlay.querySelector('svg')!.innerHTML = v.paused ? PLAY_ICON : PAUSE_ICON;
  vPlay.querySelector('.lbl')!.textContent = v.paused ? 'Play' : 'Pause';
}
vPlay.onclick = () => { const v = open?.m && videoOf(open.m); if (!v) return; if (v.paused) void v.play(); else v.pause(); syncPlay(); };

function step(dir: number) {
  if (!open) return;
  const vis = visible(), k = vis.indexOf(open), next = vis[(k + dir + vis.length) % vis.length];
  const v = open.m && videoOf(open.m); if (v) v.pause();
  history.replaceState(null, '', '#' + next.w.id);
  show(next);
}
$('vPrev').onclick = () => step(-1); $('vNext').onclick = () => step(1);

function closeViewer() {
  if (!open) return;
  const it = open; open = null;
  if (dlg.open) dlg.close();
  if (openedHere) history.back(); else history.replaceState(null, '', location.pathname + location.search);
  openedHere = false;
  items.forEach(syncPlayback);
  it.a.focus({ preventScroll: false });
}
$('vClose').onclick = closeViewer;
dlg.addEventListener('cancel', e => { e.preventDefault(); closeViewer(); });
// a click on the backdrop (the dialog box itself, outside its content) closes it
dlg.addEventListener('click', e => { if (e.target === dlg) closeViewer(); });

wall.addEventListener('click', e => {
  const a = (e.target as HTMLElement).closest('a.w-link'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const it = items.find(x => x.a === a)!;
  history.pushState(null, '', '#' + it.w.id); openedHere = true; show(it);
});
function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1)), it = items.find(x => x.w.id === id);
  if (it) { if (open !== it) show(it); }
  else if (open) { const was = open; open = null; dlg.close(); openedHere = false; items.forEach(syncPlayback); was.a.focus(); }
}
window.addEventListener('popstate', fromHash);
$('credits').addEventListener('click', e => {
  const a = (e.target as HTMLElement).closest('a[href^="#"]'); if (!a) return;
  e.preventDefault(); const it = items.find(x => '#' + x.w.id === a.getAttribute('href'))!;
  if (it.li.hidden) { kind = 'all'; syncFilter(); }
  history.pushState(null, '', '#' + it.w.id); openedHere = true; show(it);
});

/* viewer render loop: stills once per change, video every new frame */
let vLastT = -1, vSize = '';
function vtick() {
  requestAnimationFrame(vtick);
  if (!open || !open.m) return;
  const m = open.m, v = videoOf(m);
  const pw = vCmp.clientWidth, ph = vCmp.clientHeight; if (!pw || !ph) return;
  const long = Math.min(1600, Math.round(Math.max(pw, ph) * Math.min(devicePixelRatio, 2)));
  const size = pw + 'x' + ph;
  if (size !== vSize) { vSize = size; vDirty = true; }
  if (!vDirty && !(v && v.currentTime !== vLastT)) return;
  const [w, h] = fitSize(m.w / m.h, long);
  if (viewR) viewR.render({ ...workParams(open.w), transparent: false }, w, h, clock());
  else { vOut.width = w; vOut.height = h; vOut.getContext('2d')!.drawImage(m.el as CanvasImageSource, 0, 0, w, h); }
  if (vOrig.width !== w || vOrig.height !== h) { vOrig.width = w; vOrig.height = h; }
  vOrig.getContext('2d')!.drawImage(m.el as CanvasImageSource, 0, 0, w, h);
  vDirty = false; vLastT = v ? v.currentTime : -1;
}
requestAnimationFrame(vtick);
document.addEventListener('visibilitychange', () => { if (document.hidden) items.forEach(it => { const v = it.m && videoOf(it.m); v?.pause(); }); else { items.forEach(syncPlayback); if (open) syncPlay(); } });

syncMotion();
fromHash();
