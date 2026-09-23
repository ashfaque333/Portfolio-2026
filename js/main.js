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
      const pin = Math.min(p / 0.42, 1), pout = Math.min(Math.max((p - 0.55) / 0.45, 0), 1);   // 0 – 42 %: truck rolls in · 42 – 55 %: parked (reading) · 55 – 100 %: drives on out of the left edge
      about.style.setProperty('--ap', (1 - Math.pow(1 - pin, 2)).toFixed(4));
      about.style.setProperty('--ep', (pout * pout * (3 - 2 * pout)).toFixed(4));   // eases in and out
      about.classList.toggle('passed', p >= 0.5);   // truck is parked in front of the board here, so the swap is hidden behind it
    };
    addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /* ---- 6. things that hang from the nav bar (lemon + chilli, gold tassels, the blue fringe) ----
     Each one hangs from a fixed point and swings like a damped pendulum when the cursor / a finger sweeps through it.
     K = stiffness, C = damping, MAX = biggest angle (rad), push = how hard a sweep shoves it. */
  const swing = [];
  const add = (el, hit, o) => swing.push(Object.assign({ el, hit, a: 0, w: 0, lx: null, lt: 0, on: false }, o));
  document.querySelectorAll('.nimbu').forEach(el => add(el, el, { K: 22, C: 0.7, MAX: 0.36, push: 0.4 }));
  document.querySelectorAll('.tassel').forEach(el => add(el.querySelector('.ts'), el, { K: 30, C: 1.1, MAX: 0.5, push: 0.55 }));
  const fringe = document.querySelector('.fringe');
  const strips = [];
  if (fringe && !reduce) {
    for (let i = 0; i < 180; i++) { const e = document.createElement('i'); e.style.setProperty('--i', i); fringe.appendChild(e); const o = { K: 40, C: 1.2, MAX: 0.7, push: 1 }; add(e, null, o); strips.push(swing[swing.length - 1]); }
    fringe.classList.add('live');
  }
  if (swing.length && !reduce) {
    let raf = 0, last = 0;
    const tick = t => {
      const dt = Math.min((t - last) / 1000 || 0.016, 0.033); last = t;
      let moving = false;
      for (const s of swing) {
        if (!s.on) continue;
        s.w += (-s.K * s.a - s.C * s.w) * dt;         // damped pendulum
        s.a += s.w * dt;
        if (s.a > s.MAX) { s.a = s.MAX; s.w *= -0.3; } else if (s.a < -s.MAX) { s.a = -s.MAX; s.w *= -0.3; }
        if (Math.abs(s.a) < 0.0006 && Math.abs(s.w) < 0.004) { s.a = s.w = 0; s.on = false; }
        else moving = true;
        s.el.style.rotate = (s.a * 57.2958).toFixed(3) + 'deg';
      }
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const shove = (s, amt) => { s.w += amt; s.on = true; if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const speed = (s, e) => {                          // px/s the cursor sweeps sideways (moving right swings the bottom right)
      const now = performance.now(); let vx = 0;
      if (s.lx !== null && now > s.lt) vx = (e.clientX - s.lx) / (now - s.lt) * 1000;
      s.lx = e.clientX; s.lt = now; return Math.max(-2.6, Math.min(2.6, vx * -0.0022));
    };
    swing.forEach(s => {
      if (!s.hit) return;
      s.hit.addEventListener('pointermove', e => { const p = speed(s, e); if (Math.abs(p) > 0.03) shove(s, p * s.push); });
      s.hit.addEventListener('pointerleave', () => { s.lx = null; });
      s.hit.addEventListener('pointerenter', e => { s.lx = e.clientX; s.lt = performance.now(); });
    });
    if (strips.length) {
      const st = { lx: null, lt: 0 };
      fringe.addEventListener('pointermove', e => {
        const p = speed(st, e); if (Math.abs(p) < 0.03) return;
        const r = fringe.getBoundingClientRect(), c = (e.clientX - r.left) / r.width * strips.length;
        for (let d = -4; d <= 4; d++) { const s = strips[Math.round(c) + d]; if (s) shove(s, p * s.push * Math.exp(-d * d / 6) * 0.8); }
      });
      fringe.addEventListener('pointerleave', () => { st.lx = null; });
      fringe.addEventListener('pointerenter', e => { st.lx = e.clientX; st.lt = performance.now(); });
    }
  }

  /* ---- 6a. about page: the toolbox opens on hover / tap and the apps line up beside it ---- */
  const tools = document.getElementById('tools');
  if (tools) {
    const btn = tools.querySelector('.tb'), list = tools.querySelector('.ticons');
    let timer = 0;
    const set = on => { tools.classList.toggle('open', on); btn.setAttribute('aria-expanded', String(on)); };
    const open = () => { clearTimeout(timer); set(true); };
    const shut = () => { clearTimeout(timer); timer = setTimeout(() => set(false), 320); };
    btn.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') open(); });
    btn.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') shut(); });
    list.addEventListener('pointerover', e => { if (e.target.closest('li')) open(); });
    list.addEventListener('pointerout', e => { if (e.pointerType !== 'touch') shut(); });
    btn.addEventListener('click', () => { tools.classList.contains('open') ? set(false) : open(); });
    btn.addEventListener('focus', open);
    btn.addEventListener('blur', () => { if (!list.matches(':hover')) shut(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  /* ---- 6b. in-page links (Projects, Contact, Back to top...) glide there quickly instead of jumping ---- */
  if (!reduce) {
    const norm = p => p.replace(/index\.html$/, '').replace(/\/$/, '');
    let raf2 = 0;
    const stop = () => { if (raf2) { cancelAnimationFrame(raf2); raf2 = 0; } };
    ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, stop, { passive: true }));
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const u = new URL(a.href, location.href);
      if (!u.hash || norm(u.pathname) !== norm(location.pathname)) return;
      const id = decodeURIComponent(u.hash.slice(1));
      const el = id && id !== 'top' ? document.getElementById(id) : null;
      if (id && id !== 'top' && !el) return;
      e.preventDefault();
      const nav = document.getElementById('nav'); if (nav) nav.classList.remove('is-open');
      const margin = el ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0;
      const to = Math.max(0, Math.round(el ? el.getBoundingClientRect().top + scrollY - margin : 0));
      const from = scrollY, dist = to - from; if (!dist) return;
      const dur = Math.max(450, Math.min(1000, Math.abs(dist) * 0.16));      // fast: about 0.5 – 1 s however far it is
      const t0 = performance.now(); stop();
      const step = t => {
        const p = Math.min(1, (t - t0) / dur), k = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        scrollTo(0, from + dist * k);
        raf2 = p < 1 ? requestAnimationFrame(step) : 0;
      };
      raf2 = requestAnimationFrame(step);
      try { history.replaceState(null, '', u.hash || location.pathname); } catch (_) {}
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

  /* ---- 10. showreel: click the stereo (333.3 Faque FM) to open the mp3 player ---- */
  (() => {
    const stereo = document.getElementById('stereo');
    const audio = document.getElementById('stereoAudio');
    const wrap = document.getElementById('stereoPlayer');
    const panel = document.getElementById('stereoPanel');
    const xBtn = document.getElementById('stereoX');
    const backBtn = document.getElementById('stereoBackBtn');
    const playlistBtn = document.getElementById('stereoPlaylistBtn');
    const minBtn = document.getElementById('stereoMinBtn');
    const mini = document.getElementById('stereoMini');
    const miniIcon = document.getElementById('stereoMiniIcon');
    const playPause = document.getElementById('stereoPlayPause');
    const prevBtn = document.getElementById('stereoPrev');
    const nextBtn = document.getElementById('stereoNext');
    const seek = document.getElementById('stereoSeek');
    const vol = document.getElementById('stereoVol');
    const cur = document.getElementById('stereoCur');
    const dur = document.getElementById('stereoDur');
    if (!stereo || !audio || !wrap || !panel) return;

    const SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1DX24Nux3gigVe?si=62a3581a1e85430d';
    let seeking = false;
    const fmt = (s) => { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; };

    audio.volume = 0.7;

    function pop(el) {
      el.classList.add('is-popping');
      requestAnimationFrame(() => {
        void el.offsetWidth;
        requestAnimationFrame(() => el.classList.remove('is-popping'));
      });
    }
    function openPlayer() {
      wrap.hidden = false;
      mini.hidden = true;
      panel.style.display = '';
      pop(panel);
      if (audio.paused) audio.play().catch(() => {});
    }
    function closePlayer() {
      wrap.hidden = true;
      mini.hidden = true;
      audio.pause();
    }
    function minimize() {
      panel.style.display = 'none';
      mini.hidden = false;
    }
    function restore() {
      mini.hidden = true;
      panel.style.display = '';
    }

    stereo.addEventListener('click', openPlayer);
    xBtn.addEventListener('click', closePlayer);
    backBtn.addEventListener('click', closePlayer);
    minBtn.addEventListener('click', minimize);
    mini.addEventListener('click', restore);

    playlistBtn.addEventListener('click', () => {
      window.open(SPOTIFY_URL, '_blank', 'noopener');
      panel.classList.remove('is-state1');
      panel.classList.add('is-state2');
      playlistBtn.hidden = true;
      minBtn.hidden = false;
    });

    playPause.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    });
    prevBtn.addEventListener('click', () => { audio.currentTime = 0; });
    nextBtn.addEventListener('click', () => { audio.currentTime = 0; if (audio.paused) audio.play().catch(() => {}); });

    audio.addEventListener('play', () => {
      stereo.classList.add('is-playing');
      panel.classList.add('is-playing');
      mini.classList.remove('is-paused');
    });
    audio.addEventListener('pause', () => {
      stereo.classList.remove('is-playing');
      panel.classList.remove('is-playing');
      mini.classList.add('is-paused');
    });

    audio.addEventListener('loadedmetadata', () => { dur.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (seeking) return;
      cur.textContent = fmt(audio.currentTime);
      dur.textContent = fmt(audio.duration);
      if (audio.duration) seek.value = String((audio.currentTime / audio.duration) * 1000);
    });
    seek.addEventListener('input', () => { seeking = true; cur.textContent = fmt((seek.value / 1000) * (audio.duration || 0)); });
    seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });
    vol.addEventListener('input', () => { audio.volume = vol.value / 100; });
  })();
