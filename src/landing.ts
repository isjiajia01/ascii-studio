import { Renderer, fitSize } from './engine/renderer';
import { PRESETS, STYLES, applyPreset, DEFAULTS, type Params } from './engine/styles';
import { getSample, SAMPLES } from './engine/samples';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  /* hero: its own context, animated. The one orchestrated moment: the proof "develops" from original to type. */
  const heroOut = $<HTMLCanvasElement>('heroOut'), heroOrig = $<HTMLCanvasElement>('heroOrig'), heroCmp = $('heroCmp');
  const hero = new Renderer(heroOut);
  const rocket = getSample(0);
  hero.setSource(rocket, rocket.width, rocket.height);
  drawOrig(heroOrig, rocket, 1000);
  const putHero = bindCmp(heroCmp, reduceMotion ? 50 : 100);
  if (!reduceMotion) {
    const t0 = performance.now() + 450, dur = 1100;
    const sweep = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)); const e = 1 - Math.pow(1 - k, 3);
      putHero(100 - 50 * e); if (k < 1) requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }
  const heroIds = ['classic', 'rain', 'monitor', 'bricks', 'noir', 'swarm'];
  let cur = applyPreset(DEFAULTS, 'classic');
  const pills = $('heroPills'), heroSlug = $('heroSlug');
  heroIds.forEach(id => {
    const pr = PRESETS.find(x => x.id === id)!; const b = document.createElement('button'); b.className = 'chip'; b.textContent = pr.name;
    b.setAttribute('aria-pressed', String(id === 'classic'));
    b.onclick = () => {
      cur = applyPreset(DEFAULTS, id); cur.animate = !reduceMotion;
      pills.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      heroSlug.innerHTML = '<b>' + pr.name + '</b> · ' + STYLES[cur.style].name.toLowerCase() + ' · rocket.png';
    };
    pills.appendChild(b);
  });
  const aspect = rocket.width / rocket.height;
  let vis = true; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(heroCmp);
  let drawn = false;
  const loop = (now: number) => {
    requestAnimationFrame(loop); if (!vis) return;
    if (reduceMotion && drawn && !cur.animate) return;
    const [w, h] = fitSize(aspect, Math.min(1000, Math.max(heroCmp.clientWidth, heroCmp.clientHeight) * Math.min(devicePixelRatio, 1.5)));
    hero.render({ ...cur, transparent: false }, w, h, now / 1000); drawn = true;
  };
  requestAnimationFrame(loop);

  /* style specimen: an index of styles, one large proof */
  const picks: { id: string; name: string; style: string; si: number; gl: string }[] = [
    { id: 'classic', name: 'Classic', style: 'classic', si: 0, gl: '@%#*+=-:.' },
    { id: 'noir', name: 'Braille', style: 'braille', si: 1, gl: '⣿⣷⣶⣤⣀' },
    { id: 'bricks', name: 'Bricks', style: 'bricks', si: 2, gl: '▣▣▣▢' },
    { id: 'detailed', name: 'Detailed', style: 'detailed', si: 1, gl: '$B8&Wo*' },
    { id: 'poster', name: 'Round dots', style: 'dots', si: 0, gl: '●●•·.' },
    { id: 'onebit', name: 'Dither', style: 'dither', si: 2, gl: '▓▒░▚▞' },
    { id: 'swarm', name: 'Particles', style: 'particles', si: 1, gl: '·•∙ · •' },
    { id: 'monitor', name: 'Old monitor', style: 'classic', si: 0, gl: '#*+=:.' },
  ];
  const gal = $('gallery'), specOut = $<HTMLCanvasElement>('specOut'), specOrig = $<HTMLCanvasElement>('specOrig');
  const specSlug = $('specSlug'), specTry = $<HTMLAnchorElement>('specTry');
  bindCmp($('specCmp'), 55);
  const btns: HTMLButtonElement[] = [];
  const show = (k: number) => {
    const it = picks[k]; const s = getSample(it.si);
    btns.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === k)); b.classList.toggle('marked', i === k); });
    drawOrig(specOrig, s, 1000);
    const q = applyPreset(DEFAULTS, it.id); q.detail = Math.round(q.detail * 0.8);
    draw(specOut, s, q, 1000, 1.3);
    specSlug.innerHTML = '<b>' + it.name + '</b> · ' + SAMPLES[it.si].id + '.png';
    specTry.href = './app/?preset=' + it.id + '&sample=' + it.si;
    specTry.textContent = 'Open ' + it.name + ' in the generator';
  };
  picks.forEach((it, i) => {
    const li = document.createElement('li'); const b = document.createElement('button');
    b.innerHTML = '<span class="nm"></span><span class="gl" aria-hidden="true"></span><span class="ds"></span>';
    b.querySelector('.nm')!.textContent = it.name; b.querySelector('.gl')!.textContent = it.gl;
    b.querySelector('.ds')!.textContent = it.id === 'monitor' ? 'Phosphor green, scanlines and curved glass.' : STYLES[it.style as keyof typeof STYLES].desc;
    b.onclick = () => show(i);
    li.appendChild(b); gal.appendChild(li); btns.push(b);
  });
  show(0);

  /* finishing desk live demo */
  const live = $<HTMLCanvasElement>('live'); const ls = getSample(1);
  const lp: Params = { ...applyPreset(DEFAULTS, 'detailed'), detail: 70, colorMode: 'palette', palette: 'ice', outlines: 55, glow: 40, scanlines: 0 };
  const redraw = () => draw(live, ls, lp, 1000);
  document.querySelectorAll<HTMLInputElement>('.rng input').forEach(i => {
    const o = i.closest('.rng')!.querySelector('output')!;
    const sync = () => { i.style.setProperty('--v', i.value + '%'); o.textContent = i.value; };
    sync();
    i.oninput = () => { (lp as any)[i.dataset.k!] = +i.value; sync(); redraw(); };
  });
  redraw();
}
