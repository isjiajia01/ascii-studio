import { Renderer, fitSize } from './engine/renderer';
import { PRESETS, STYLES, applyPreset, DEFAULTS, type Params } from './engine/styles';
import { getSample, SAMPLES } from './engine/samples';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The landing proofs use the balloon: bright subject, dark sky, readable in every style. */
const SI = Math.max(0, SAMPLES.findIndex(s => s.id === 'balloon'));
const SNAME = SAMPLES[SI].id + '.png';

/* mobile section menu: close after a pick or a tap outside */
const menu = document.getElementById('menu') as HTMLDetailsElement | null;
if (menu) {
  menu.addEventListener('click', e => { if ((e.target as HTMLElement).closest('a')) menu.open = false; });
  document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')!.focus(); } });
}

if (!Renderer.supported()) { document.body.classList.add('no-gl'); }
else init();

/** Before/after split: pointer drag (hover-scrub with a mouse) plus arrow keys. */
function bindCmp(el: HTMLElement, start: number) {
  let pos = start;
  const put = (v: number) => { pos = Math.max(0, Math.min(100, v)); el.style.setProperty('--p', pos + '%'); el.setAttribute('aria-valuenow', String(Math.round(pos))); };
  put(start);
  let down = false;
  const set = (e: PointerEvent) => { const r = el.getBoundingClientRect(); put((e.clientX - r.left) / r.width * 100); };
  el.addEventListener('pointerdown', e => { down = true; el.setPointerCapture(e.pointerId); set(e); });
  el.addEventListener('pointermove', e => { if (down || e.pointerType === 'mouse') set(e); });
  el.addEventListener('pointerup', () => { down = false; });
  el.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') put(pos - step); else if (e.key === 'ArrowRight') put(pos + step);
    else if (e.key === 'Home') put(0); else if (e.key === 'End') put(100); else return;
    e.preventDefault();
  });
  return put;
}

function init() {
  const shared = new Renderer();
  const draw = (dst: HTMLCanvasElement, src: HTMLCanvasElement, p: Params, long: number, t = 0) => {
    shared.setSource(src, src.width, src.height);
    const [w, h] = fitSize(src.width / src.height, long);
    shared.render({ ...p, transparent: false }, w, h, t);
    dst.width = w; dst.height = h; dst.getContext('2d')!.drawImage(shared.canvas, 0, 0);
  };
  const drawOrig = (dst: HTMLCanvasElement, src: HTMLCanvasElement, long: number) => {
    const [w, h] = fitSize(src.width / src.height, long); dst.width = w; dst.height = h; dst.getContext('2d')!.drawImage(src, 0, 0, w, h);
  };
  const pic = getSample(SI);
  /** Small proofs (phones) get fewer, larger cells so the marks stay readable: about one cell per 6 CSS px. */
  const fitDetail = (d: number, el: HTMLElement) => Math.max(40, Math.min(d, Math.round(el.clientWidth / 6)));
  /** Proofs on the landing page are seen large, so cells are kept big enough to read as type. */
  const proofParams = (id: string) => {
    const q = applyPreset(DEFAULTS, id); q.detail = Math.round(q.detail * 0.72);
    // Long glyph ramps pick up the faint sky gradient as rows of marks; a touch more contrast keeps the sky clean.
    if (q.style === 'detailed') { q.contrast = 1.4; q.brightness = -0.08; }
    return q;
  };

  /* hero: its own context, animated. The one orchestrated moment: the proof "develops" from original to type,
     stopping with the output over most of the picture and the divider clear of the balloon. */
  const heroOut = $<HTMLCanvasElement>('heroOut'), heroOrig = $<HTMLCanvasElement>('heroOrig'), heroCmp = $('heroCmp');
  const hero = new Renderer(heroOut);
  hero.setSource(pic, pic.width, pic.height);
  drawOrig(heroOrig, pic, 1000);
  const REST = 68;
  const putHero = bindCmp(heroCmp, reduceMotion ? REST : 100);
  if (!reduceMotion) {
    const t0 = performance.now() + 450, dur = 1100;
    const sweep = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)); const e = 1 - Math.pow(1 - k, 3);
      putHero(100 - (100 - REST) * e); if (k < 1) requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }
  const heroIds = ['detailed', 'poster', 'bricks', 'monitor', 'swarm'];
  let cur = proofParams('detailed');
  const pills = $('heroPills'), heroSlug = $('heroSlug');
  heroIds.forEach(id => {
    const pr = PRESETS.find(x => x.id === id)!; const b = document.createElement('button'); b.className = 'chip'; b.textContent = pr.name;
    b.setAttribute('aria-pressed', String(id === heroIds[0]));
    b.onclick = () => {
      cur = proofParams(id); cur.animate = cur.animate && !reduceMotion;
      pills.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      heroSlug.innerHTML = '<b>' + pr.name + '</b> · ' + STYLES[cur.style].name.toLowerCase() + ' · ' + SNAME;
    };
    pills.appendChild(b);
  });
  const aspect = pic.width / pic.height;
  let vis = true; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(heroCmp);
  let drawn = false;
  const loop = (now: number) => {
    requestAnimationFrame(loop); if (!vis) return;
    if (reduceMotion && drawn && !cur.animate) return;
    const [w, h] = fitSize(aspect, Math.min(1000, Math.max(heroCmp.clientWidth, heroCmp.clientHeight) * Math.min(devicePixelRatio, 1.5)));
    hero.render({ ...cur, detail: fitDetail(cur.detail, heroCmp), transparent: false }, w, h, now / 1000); drawn = true;
  };
  requestAnimationFrame(loop);

  /* how it works: three frames of one contact sheet: the original, three styles side by side, the finished file */
  const s1 = $<HTMLCanvasElement>('step1'), s2 = $<HTMLCanvasElement>('step2'), s3 = $<HTMLCanvasElement>('step3');
  drawOrig(s1, pic, 720);
  const strip = document.createElement('canvas'); const [sw, sh] = fitSize(aspect, 720); strip.width = sw; strip.height = sh;
  const sx = strip.getContext('2d')!;
  ['classic', 'noir', 'bricks'].forEach((id, k) => {
    const tmp = document.createElement('canvas'); draw(tmp, pic, proofParams(id), 720);
    sx.drawImage(tmp, Math.round(k * sw / 3), 0, Math.ceil(sw / 3), sh, Math.round(k * sw / 3), 0, Math.ceil(sw / 3), sh);
  });
  sx.fillStyle = '#0e0d0b'; sx.fillRect(Math.round(sw / 3) - 1, 0, 3, sh); sx.fillRect(Math.round(2 * sw / 3) - 1, 0, 3, sh);
  s2.width = sw; s2.height = sh; s2.getContext('2d')!.drawImage(strip, 0, 0);
  draw(s3, pic, proofParams('poster'), 720);

  /* style specimen: an index of styles, one large proof of the same picture */
  const picks: { id: string; name: string; style: string; gl: string }[] = [
    { id: 'classic', name: 'Classic', style: 'classic', gl: '@%#*+=-:.' },
    { id: 'braillecolour', name: 'Braille', style: 'braille', gl: '⣿⣷⣶⣤⣀' },
    { id: 'bricks', name: 'Bricks', style: 'bricks', gl: '▣▣▣▢' },
    { id: 'detailed', name: 'Detailed', style: 'detailed', gl: '$B8&Wo*' },
    { id: 'poster', name: 'Round dots', style: 'dots', gl: '●●•·.' },
    { id: 'onebit', name: 'Dither', style: 'dither', gl: '▓▒░▚▞' },
    { id: 'swarm', name: 'Particles', style: 'particles', gl: '·•∙ · •' },
    { id: 'monitor', name: 'Old monitor', style: 'classic', gl: '#*+=:.' },
  ];
  const gal = $('gallery'), specOut = $<HTMLCanvasElement>('specOut'), specOrig = $<HTMLCanvasElement>('specOrig');
  const specName = $('specName'), specDesc = $('specDesc'), specTry = $<HTMLAnchorElement>('specTry');
  const specCmp = $('specCmp');
  bindCmp(specCmp, 70);
  drawOrig(specOrig, pic, 1000);
  const btns: HTMLButtonElement[] = [];
  const show = (k: number) => {
    const it = picks[k];
    btns.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === k)); b.classList.toggle('marked', i === k); });
    const q = proofParams(it.id); q.detail = fitDetail(q.detail, specCmp);
    draw(specOut, pic, q, 1000, 1.3);
    specName.textContent = it.name;
    specDesc.textContent = it.id === 'monitor' ? 'Phosphor green, scanlines and curved glass.' : STYLES[it.style as keyof typeof STYLES].desc;
    specTry.href = './app/?preset=' + it.id + '&sample=' + SI;
    specTry.textContent = 'Open ' + it.name + ' in the generator';
  };
  picks.forEach((it, i) => {
    const li = document.createElement('li'); const b = document.createElement('button');
    b.innerHTML = '<span class="nm"></span><span class="gl" aria-hidden="true"></span>';
    b.querySelector('.nm')!.textContent = it.name; b.querySelector('.gl')!.textContent = it.gl;
    b.onclick = () => show(i);
    li.appendChild(b); gal.appendChild(li); btns.push(b);
  });
  show(0);

  /* tuning desk live demo: warm amber so it sits inside the carbon palette */
  const live = $<HTMLCanvasElement>('live');
  const lp: Params = { ...applyPreset(DEFAULTS, 'classic'), detail: 84, colorMode: 'palette', palette: 'amber', bg: '#0c0703', contrast: 1.25, outlines: 55, glow: 45, scanlines: 40 };
  const redraw = () => draw(live, pic, lp, 1000);
  document.querySelectorAll<HTMLInputElement>('.rng input').forEach(i => {
    const o = i.closest('.rng')!.querySelector('output')!;
    const sync = () => { i.style.setProperty('--v', i.value + '%'); o.textContent = i.value; };
    sync(); (lp as any)[i.dataset.k!] = +i.value;
    i.oninput = () => { (lp as any)[i.dataset.k!] = +i.value; sync(); redraw(); };
  });
  redraw();

  /* closing contact sheet: six presets on the same picture, drawn when it comes into view */
  const sheet = $('sheet');
  const sheetIds = ['detailed', 'noir', 'amber', 'newspaper', 'gameboy', 'bricks'];
  sheetIds.forEach(id => {
    const pr = PRESETS.find(x => x.id === id)!;
    const li = document.createElement('li');
    li.innerHTML = '<a href="./app/?preset=' + id + '"><canvas aria-hidden="true"></canvas><span></span></a>';
    li.querySelector('span')!.textContent = pr.name;
    sheet.appendChild(li);
  });
  const fillSheet = () => sheet.querySelectorAll('canvas').forEach((c, k) => draw(c as HTMLCanvasElement, pic, proofParams(sheetIds[k]), 480));
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { fillSheet(); io.disconnect(); } }, { rootMargin: '400px' });
  io.observe(sheet);
}
