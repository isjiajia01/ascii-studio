import { Renderer, fitSize } from './engine/renderer';
import { PRESETS, applyPreset, DEFAULTS, type Params } from './engine/styles';
import { getSample } from './engine/samples';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
if (!Renderer.supported()) { document.body.classList.add('no-gl'); }
else init();

function bindCmp(el: HTMLElement, start: number) {
  el.style.setProperty('--p', start + '%');
  let down = false;
  const set = (e: PointerEvent) => { const r = el.getBoundingClientRect(); el.style.setProperty('--p', Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)) + '%'); };
  el.addEventListener('pointerdown', e => { down = true; el.setPointerCapture(e.pointerId); set(e); });
  el.addEventListener('pointermove', e => { if (down || e.pointerType === 'mouse') set(e); });
  el.addEventListener('pointerup', () => { down = false; });
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

  /* hero: its own context, animated */
  const heroOut = $<HTMLCanvasElement>('heroOut'), heroOrig = $<HTMLCanvasElement>('heroOrig'), heroCmp = $('heroCmp');
  const hero = new Renderer(heroOut);
  const rocket = getSample(0);
  hero.setSource(rocket, rocket.width, rocket.height);
  drawOrig(heroOrig, rocket, 900);
  bindCmp(heroCmp, 100);
  const sweep = () => { let k = 100; const id = setInterval(() => { k -= 2; heroCmp.style.setProperty('--p', k + '%'); if (k <= 50) clearInterval(id); }, 16); };
  setTimeout(sweep, 500);
  const heroIds = ['classic', 'rain', 'monitor', 'bricks', 'noir', 'swarm'];
  let cur = applyPreset(DEFAULTS, 'classic');
  const pills = $('heroPills');
  heroIds.forEach(id => {
    const pr = PRESETS.find(x => x.id === id)!; const b = document.createElement('button'); b.className = 'pill'; b.textContent = pr.name;
    b.onclick = () => { cur = applyPreset(DEFAULTS, id); cur.animate = true; pills.querySelectorAll('.pill').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
    pills.appendChild(b); if (id === 'classic') b.setAttribute('aria-pressed', 'true');
  });
  const aspect = rocket.width / rocket.height;
  let vis = true; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(heroCmp);
  const loop = (now: number) => {
    requestAnimationFrame(loop); if (!vis) return;
    const [w, h] = fitSize(aspect, Math.min(1000, Math.max(heroCmp.clientWidth, heroCmp.clientHeight)));
    hero.render({ ...cur, transparent: false }, w, h, now / 1000);
  };
  requestAnimationFrame(loop);

  /* typed headline */
  const typed = $('typed'); const words = ['text.', 'braille.', 'halftone dots.', 'bricks.', 'ones and zeros.']; let wi = 0, ci = 0, del = false;
  const tick = () => {
    const w = words[wi]; ci += del ? -1 : 1; typed.textContent = w.slice(0, ci) + '▌';
    let d = del ? 35 : 80;
    if (!del && ci === w.length) { del = true; d = 1600; } else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; d = 300; }
    setTimeout(tick, d);
  };
  setTimeout(tick, 2500);

  /* gallery */
  const picks: [string, string, number][] = [['classic', 'Classic', 0], ['noir', 'Braille', 1], ['bricks', 'Bricks', 2], ['detailed', 'Detailed', 1], ['poster', 'Round dots', 0], ['onebit', 'Dither', 2], ['swarm', 'Particles', 1], ['monitor', 'Old monitor', 0]];
  const sel: Record<string, string> = { noir: 'braille', bricks: 'bricks', detailed: 'detailed', poster: 'dots', onebit: 'dither', swarm: 'particles', classic: 'classic', monitor: 'classic' };
  const gal = $('gallery');
  picks.forEach(([id, name, si], i) => {
    const pr = PRESETS.find(x => x.id === id)!; const s = getSample(si);
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = '<div class="cmp"><canvas class="o"></canvas><canvas class="after a"></canvas><div class="bar"><i></i></div><span class="t l mono">Output</span><span class="t r mono">Original</span></div>' +
      '<div class="meta"><span class="mono n">0' + (i + 1) + '</span><h3>' + name + '</h3><a class="try mono" href="./app/?preset=' + id + '&sample=' + si + '">Try it →</a></div><p>' + (pr.id ? describe(sel[id]) : '') + '</p>';
    gal.appendChild(card);
    const cmp = card.querySelector<HTMLElement>('.cmp')!; bindCmp(cmp, 55);
    drawOrig(card.querySelector('.o')!, s, 520);
    const q = applyPreset(DEFAULTS, id); q.detail = Math.round(q.detail * 0.55);
    draw(card.querySelector('.a')!, s, q, 520, 1.3);
  });

  /* features live demo */
  const live = $<HTMLCanvasElement>('live'); const ls = getSample(1);
  const lp: Params = { ...applyPreset(DEFAULTS, 'detailed'), detail: 70, colorMode: 'palette', palette: 'ice', outlines: 55, glow: 40, scanlines: 0 };
  const redraw = () => draw(live, ls, lp, 520);
  document.querySelectorAll<HTMLInputElement>('.rng input').forEach(i => i.oninput = () => { (lp as any)[i.dataset.k!] = +i.value; redraw(); });
  redraw();
}

function describe(style: string) {
  const m: Record<string, string> = {
    classic: 'Characters chosen by brightness, with the edges traced in lines.', braille: 'Tiny raised-dot cells for smooth, delicate detail.',
    bricks: 'A toy-brick mosaic with studs, in a limited colour set.', detailed: "A long run of fine characters, in the picture's own colours.",
    dots: 'A halftone grid, like a printed poster.', dither: 'One-bit ordered grain, crisp as an old screen.',
    particles: 'Keeps a gradient and scatters glowing dots across it.',
  };
  return m[style] || 'Phosphor green, scanlines and curved glass.';
}
