/* Ashfaque Salahudeen — landing scene
   No dependencies. Three jobs:
   1. wait for the big scene image, then start the intro (html.is-ready)
   2. drive the parallax (--p on the hero, 0 → 1 as it scrolls away)
   3. mobile menu toggle */
(() => {
  const root = document.documentElement;

  /* ---- 0. usable viewport width (without the scrollbar) so 100vw-based layouts don't overflow and crop the right edge ---- */
  const setVw = () => root.style.setProperty('--vw', root.clientWidth + 'px');
  setVw();
  addEventListener('resize', setVw);
  if (window.ResizeObserver) new ResizeObserver(setVw).observe(root);

  const hero = document.querySelector('.hero');
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav__toggle');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. ready gate ---- */
  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => root.classList.add('is-ready')); };
  const introOn = root.classList.contains('intro-on');   // the site's own entrance waits for the opening shutter
  const scene = document.getElementById('scene-img');
  if (introOn) {
    document.addEventListener('introopen', start, { once: true });
    setTimeout(start, 20000);
  } else {
    if (scene && !scene.complete) {
      scene.decode ? scene.decode().then(start, start) : scene.addEventListener('load', start);
    } else start();
    setTimeout(start, 3000);
  }                         // never leave the page hidden on a slow connection

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

  /* ---- 4. showreel dialog ---- */
  const dlg = document.getElementById('reel');
  const tv = document.querySelector('.tv-screen');
  if (dlg && tv) {
    const frame = dlg.querySelector('.reel__frame');
    tv.addEventListener('click', () => {
      const src = tv.dataset.video;
      if (!src) { tv.querySelector('.tv-screen__txt').textContent = 'COMING SOON'; return; }
      frame.innerHTML = '<iframe src="' + src + (src.includes('?') ? '&' : '?') + 'autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Showreel"></iframe>';
      dlg.showModal();
    });
    dlg.addEventListener('close', () => { frame.innerHTML = ''; });
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.reel__x')) dlg.close(); });
  }

  /* ---- 5. about page: truck drives in as you scroll ---- */
  const about = document.querySelector('.about');
  if (about && !reduce) {
    let t = false;
    const upd = () => {
      t = false;
      const room = about.offsetHeight - innerHeight || 1;
      const p = Math.min(Math.max(-about.getBoundingClientRect().top / room, 0), 1);
      about.style.setProperty('--ap', (1 - Math.pow(1 - p, 2)).toFixed(4));
    };
    addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /* ---- 6. lemon + chilli charms: hover gives them a push, then they swing like they hang on a thread and slowly settle ---- */
  const charms = [...document.querySelectorAll('.nimbu')];
  if (charms.length && !reduce) {
    const K = 19, C = 0.55, MAX = 0.85;            // stiffness (period ~1.4s), damping (rings for a few seconds), max angle (rad)
    const st = charms.map(el => ({ el, a: 0, w: 0, lx: null, lt: 0 }));
    let raf = 0, last = 0;
    const tick = t => {
      const dt = Math.min((t - last) / 1000 || 0.016, 0.033); last = t;
      let moving = false;
      for (const s of st) {
        s.w += (-K * s.a - C * s.w) * dt;         // damped pendulum
        s.a += s.w * dt;
        if (s.a > MAX) { s.a = MAX; s.w *= -0.3; } else if (s.a < -MAX) { s.a = -MAX; s.w *= -0.3; }
        if (Math.abs(s.a) < 0.0006 && Math.abs(s.w) < 0.004) { s.a = s.w = 0; }
        else moving = true;
        s.el.style.rotate = (s.a * 57.2958).toFixed(3) + 'deg';
      }
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    st.forEach(s => {
      s.el.addEventListener('pointermove', e => {
        const now = performance.now();
        if (s.lx !== null && now > s.lt) {
          const vx = (e.clientX - s.lx) / (now - s.lt) * 1000;             // px/s: how fast the cursor sweeps through
          const push = Math.max(-2.6, Math.min(2.6, vx * -0.0022));          // faster sweep = harder push (moving right swings the bottom right)
          if (Math.abs(push) > 0.03) { s.w += push * 0.55; kick(); }
        }
        s.lx = e.clientX; s.lt = now;
      });
      s.el.addEventListener('pointerleave', () => { s.lx = null; });
      s.el.addEventListener('pointerenter', e => { s.lx = e.clientX; s.lt = performance.now(); });
    });
  }

  /* ---- 7. showreel: the horn on the steering wheel ---- */
  const horn = document.getElementById('horn');
  if (horn) {
    const honk = () => { try { const a = new Audio('assets/audio/horn.mp3'); a.volume = 0.9; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    horn.addEventListener('pointerdown', honk);
    horn.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { horn.classList.add('is-down'); honk(); } });
    horn.addEventListener('keyup', () => horn.classList.remove('is-down'));
  }

  /* ---- 8. footer: scale the truck so the whole back is on screen when you reach the bottom ---- */
  const foot = document.querySelector('.foot');
  if (foot) {
    const fit = () => {
      const pu = Math.max(Math.min(root.clientWidth, 1920), 720) / 1440;
      const navH = 118 * Math.min(root.clientWidth, 1920) / 1440;
      const room = innerHeight - navH - 16 - 14 * pu;             // space between the nav bar and the bottom of the screen
      const k = Math.max(.5, Math.min(.9, room / (672 * pu)));
      foot.style.setProperty('--fk', k.toFixed(3));
    };
    fit(); addEventListener('resize', fit);
  }
})();
