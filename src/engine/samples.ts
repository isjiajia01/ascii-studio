const W = 1000, H = 800;
function mk(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')!];
}
function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function rocket(): HTMLCanvasElement {
  const [c, x] = mk(); const r = rnd(7);
  let g = x.createRadialGradient(500, 400, 50, 500, 400, 700); g.addColorStop(0, '#24307a'); g.addColorStop(1, '#03030c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * .7) + ')'; x.beginPath(); x.arc(r() * W, r() * H, r() * 2 + .4, 0, 7); x.fill(); }
  g = x.createRadialGradient(780, 600, 10, 800, 640, 200); g.addColorStop(0, '#ffd9a0'); g.addColorStop(1, '#a8431f');
  x.fillStyle = g; x.beginPath(); x.arc(800, 640, 190, 0, 7); x.fill();
  x.save(); x.translate(470, 400); x.rotate(.55);
  const fl = x.createLinearGradient(0, 150, 0, 330); fl.addColorStop(0, '#fff6c8'); fl.addColorStop(.4, '#ff9a1f'); fl.addColorStop(1, 'rgba(255,60,0,0)');
  x.fillStyle = fl; x.beginPath(); x.moveTo(-45, 150); x.quadraticCurveTo(0, 360, 45, 150); x.fill();
  x.fillStyle = '#d6242c';
  x.beginPath(); x.moveTo(-60, 40); x.lineTo(-135, 170); x.lineTo(-55, 150); x.fill();
  x.beginPath(); x.moveTo(60, 40); x.lineTo(135, 170); x.lineTo(55, 150); x.fill();
  const b = x.createLinearGradient(-70, 0, 70, 0); b.addColorStop(0, '#9aa4b8'); b.addColorStop(.45, '#ffffff'); b.addColorStop(1, '#8c97ad');
  x.fillStyle = b; x.beginPath(); x.moveTo(0, -230); x.bezierCurveTo(90, -130, 80, 60, 55, 160); x.lineTo(-55, 160); x.bezierCurveTo(-80, 60, -90, -130, 0, -230); x.fill();
  x.fillStyle = '#d6242c'; x.beginPath(); x.moveTo(0, -230); x.bezierCurveTo(45, -190, 62, -150, 68, -110); x.lineTo(-68, -110); x.bezierCurveTo(-62, -150, -45, -190, 0, -230); x.fill();
  x.fillStyle = '#1b2a55'; x.beginPath(); x.arc(0, -30, 36, 0, 7); x.fill();
  x.fillStyle = '#7fd0ff'; x.beginPath(); x.arc(-6, -34, 26, 0, 7); x.fill();
  x.restore(); return c;
}

function sunset(): HTMLCanvasElement {
  const [c, x] = mk();
  let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c0b4a'); g.addColorStop(.45, '#ff5e62'); g.addColorStop(.62, '#ffc371'); g.addColorStop(1, '#1b2a49');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(500, 430, 10, 500, 430, 150); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffd36e');
  x.fillStyle = g; x.beginPath(); x.arc(500, 430, 120, 0, 7); x.fill();
  const layers: [number, string][] = [[470, '#7a3b6e'], [520, '#4a2557'], [580, '#2a1442']];
  layers.forEach(([y, col], k) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= 20; i++) x.lineTo(i * 50, y + Math.sin(i * 1.3 + k * 2) * 40 + Math.sin(i * .5 + k) * 55);
    x.lineTo(W, H); x.fill();
  });
  x.fillStyle = 'rgba(255,200,120,.35)'; for (let i = 0; i < 14; i++) x.fillRect(430 + i * 4, 640 + i * 10, 140 - i * 8, 3);
  return c;
}

function orbs(): HTMLCanvasElement {
  const [c, x] = mk();
  x.fillStyle = '#07070d'; x.fillRect(0, 0, W, H);
  const defs: [number, number, number, string, string][] = [[330, 330, 230, '#fff2d0', '#e0457b'], [680, 470, 170, '#d4f7ff', '#2563eb'], [560, 190, 90, '#e9ffd0', '#16a34a'], [250, 640, 80, '#ffe0f4', '#a21caf']];
  defs.forEach(([cx, cy, r, a, b]) => {
    const g = x.createRadialGradient(cx - r * .35, cy - r * .35, r * .1, cx, cy, r); g.addColorStop(0, a); g.addColorStop(.6, b); g.addColorStop(1, '#0a0614');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  });
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 8;
  x.beginPath(); x.ellipse(330, 330, 330, 70, -.35, 0, 7); x.stroke();
  x.lineWidth = 4; x.beginPath(); x.ellipse(680, 470, 250, 44, .3, 0, 7); x.stroke();
  return c;
}

export const SAMPLES = [
  { id: 'rocket', name: 'Rocket', make: rocket },
  { id: 'sunset', name: 'Sunset', make: sunset },
  { id: 'orbs', name: 'Orbs', make: orbs },
];
const cache = new Map<string, HTMLCanvasElement>();
export function getSample(i: number): HTMLCanvasElement {
  const index = Number.isFinite(i) ? Math.trunc(i) : 0;
  const s = SAMPLES[((index % SAMPLES.length) + SAMPLES.length) % SAMPLES.length];
  if (!cache.has(s.id)) cache.set(s.id, s.make());
  return cache.get(s.id)!;
}
