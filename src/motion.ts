/** Staggered entrance: blocks rise in with a small, growing delay as they scroll into view. Skipped for reduced motion; classes are added by script so nothing hides without it. */
if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
  requestAnimationFrame(() => {
    const els = [...document.querySelectorAll<HTMLElement>(
      'main > section > *, main > section > .wrap > *, .lib-wall li, footer .wrap > *')]
      .filter(el => !el.closest('[hidden]') && getComputedStyle(el).position !== 'sticky');
    els.forEach(el => el.classList.add('rise'));
    const io = new IntersectionObserver(es => {
      let n = 0;
      for (const e of es) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).style.setProperty('--d', Math.min(n++ * 90, 450) + 'ms');
        e.target.classList.add('in'); io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
  });
}
