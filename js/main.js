/* Ashfaque Salahudeen — landing scene
   No dependencies. Three jobs:
   1. wait for the big scene image, then start the intro (html.is-ready)
   2. drive the parallax (--p on the hero, 0 → 1 as it scrolls away)
   3. mobile menu toggle */
(() => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav__toggle');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. ready gate ---- */
  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => root.classList.add('is-ready')); };
  const scene = document.getElementById('scene-img');
  if (scene && !scene.complete) {
    scene.decode ? scene.decode().then(start, start) : scene.addEventListener('load', start);
  } else start();
  setTimeout(start, 3000);                         // never leave the page hidden on a slow connection

  /* ---- 2. parallax ---- */
  if (hero && !reduce) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = hero.offsetHeight || 1;
      const p = Math.min(Math.max(scrollY / h, 0), 1);
      hero.style.setProperty('--p', p.toFixed(4));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---- 3. mobile menu ---- */
  if (toggle && nav) {
    const set = open => { nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.addEventListener('click', e => { if (e.target.closest('.nav__links a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }
})();
