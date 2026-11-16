/** Damped wheel scrolling for the page (landing, library). Mouse wheels only: trackpads already have inertia, and reduced motion keeps native scrolling. */
if (!matchMedia('(prefers-reduced-motion:reduce)').matches && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const el = document.scrollingElement as HTMLElement;
  let target = 0, cur = 0, raf = 0;
  const max = () => el.scrollHeight - innerHeight;
  const inScroller = (t: EventTarget | null) => {
    for (let n = t instanceof Element ? t : null; n && n !== document.body && n !== el; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return true;
    }
    return false;
  };
  const step = () => {
    cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.5) { cur = target; raf = 0; } else raf = requestAnimationFrame(step);
    el.scrollTo({ top: cur, behavior: 'instant' });
  };
  addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inScroller(e.target)) return;
    if (e.deltaMode === 0 && Math.abs(e.deltaY) < 40) return; // trackpad: leave native
    e.preventDefault();
    if (!raf) { cur = el.scrollTop; target = cur; }
    const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    target = Math.max(0, Math.min(max(), target + d));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
  // Anything else that moves the page (keys, anchors, scrollbar drag) takes over: resync.
  addEventListener('scroll', () => { if (!raf) { cur = target = el.scrollTop; } }, { passive: true });
}
