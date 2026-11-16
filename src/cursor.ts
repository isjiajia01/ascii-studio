/** Custom pointer: a dot that sticks to the mouse and a ring that trails it. Mouse only; touch, keyboard and reduced-motion users keep their own behaviour. */
const fine = matchMedia('(hover:hover) and (pointer:fine)');
const still = matchMedia('(prefers-reduced-motion:reduce)');
// Where the system pointer stays: the generator's picture (precise work) and form fields where a text caret is expected.
const NATIVE = '#plate,select,textarea,input[type=text],input[type=number],input[type=search]';
const LIVE = 'a,button,summary,label,[role=button],input,.w-link';

if (fine.matches) {
  const root = document.documentElement;
  const dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'cur-dot'; ring.className = 'cur-ring';
  dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
  let x = -100, y = -100, rx = -100, ry = -100, raf = 0, on = false;

  const frame = () => {
    // Easing toward the pointer is the "lag"; reduced motion follows instantly.
    const k = still.matches ? 1 : 0.16;
    rx += (x - rx) * k; ry += (y - ry) * k;
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(frame) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const show = (v: boolean) => {
    if (v === on) return; on = v;
    root.classList.toggle('has-cursor', v);
    if (v) { document.body.append(ring, dot); } else { ring.remove(); dot.remove(); }
  };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') { show(false); return; }
    if (!on) { show(true); rx = x = e.clientX; ry = y = e.clientY; }
    x = e.clientX; y = e.clientY;
    const t = e.target as Element | null;
    const native = !!t?.closest?.(NATIVE);
    root.classList.toggle('cur-native', native);
    ring.classList.toggle('live', !native && !!t?.closest?.(LIVE));
    kick();
  }, { passive: true });
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') show(false); else ring.classList.add('down'); }, { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('down'), { passive: true });
  document.addEventListener('pointerleave', () => { ring.classList.add('away'); dot.classList.add('away'); });
  document.addEventListener('pointerenter', () => { ring.classList.remove('away'); dot.classList.remove('away'); });
  document.addEventListener('mouseleave', () => { ring.classList.add('away'); dot.classList.add('away'); });
  document.addEventListener('mouseenter', () => { ring.classList.remove('away'); dot.classList.remove('away'); });
}
