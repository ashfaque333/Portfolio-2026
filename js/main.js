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

  /* ---- 4. showreel: plays inside the TV. Idle = looping screensaver GIF.
         Click = play / pause; mute + fullscreen in the corner (fullscreen gets the full native controls);
         pauses when scrolled away and goes back to the screensaver when it ends ---- */
  const box = document.getElementById('tvbox');
  const tvv = document.getElementById('tvVideo');
  if (box && tvv) {
    const hit = document.getElementById('tvHit'), mute = document.getElementById('tvMute'), fs = document.getElementById('tvFs');
    const load = () => { if (!tvv.getAttribute('src')) tvv.src = tvv.dataset.src; box.classList.add('has-reel'); };
    const play = () => { load(); document.dispatchEvent(new Event('reelplay')); const p = tvv.play(); if (p && p.catch) p.catch(() => {}); };
    const sync = () => {
      box.classList.toggle('is-playing', !tvv.paused);
      box.classList.toggle('is-muted', tvv.muted || tvv.volume === 0);
      hit.setAttribute('aria-label', tvv.paused ? 'Play showreel' : 'Pause showreel');
      mute.setAttribute('aria-label', tvv.muted ? 'Unmute' : 'Mute');
    };
    hit.addEventListener('click', () => { if (tvv.paused) play(); else tvv.pause(); });
    mute.addEventListener('click', () => { tvv.muted = !tvv.muted; });
    fs.addEventListener('click', () => {
      tvv.controls = true;                                                   // timeline + volume in fullscreen
      if (tvv.requestFullscreen) tvv.requestFullscreen().catch(() => { tvv.controls = false; });
      else if (tvv.webkitRequestFullscreen) tvv.webkitRequestFullscreen();
      else if (tvv.webkitEnterFullscreen) tvv.webkitEnterFullscreen();      // iPhone
      if (tvv.paused) play();
    });
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    const onFs = () => { tvv.controls = fsEl() === tvv; };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    tvv.addEventListener('webkitendfullscreen', () => { tvv.controls = false; });
    ['play', 'pause', 'volumechange'].forEach(ev => tvv.addEventListener(ev, sync));
    tvv.addEventListener('ended', () => {
      if (fsEl() === tvv && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      box.classList.remove('has-reel'); tvv.currentTime = 0; sync();
    });
    if (window.IntersectionObserver) new IntersectionObserver(es => {
      es.forEach(e => { if (!e.isIntersecting && !tvv.paused && fsEl() !== tvv) tvv.pause(); });
    }, { threshold: 0.2 }).observe(box);
  }

  /* ---- 5. about page: truck drives in as you scroll ----
     The truck follows the scroll with a little inertia (it glides to where the scroll is instead of snapping),
     rolls in over 0 – 45 %, parks briefly (45 – 51 %) and then pulls away again over 51 – 100 %. */
  const about = document.querySelector('.about');
  if (about && !reduce) {
    let IN = 0.45, OUT = 0.51;
    const FOLLOW = 6;                               // FOLLOW: higher = snappier, lower = floatier
    let target = 0, cur = 0, raf = 0, last = 0;
    /* phones: the truck is much wider than the screen and parks with the board partly beside its cab, so the board
       only changes once the truck's front has driven past the board's left edge (it is fully behind the truck then) */
    const phone = matchMedia('(max-width: 600px)');
    /* touch screens (phones, iPads): the drive in is much shorter than the drive out, so the scroll is shared out in
       proportion to each distance — the truck keeps one steady speed either side of its stop, and the wheels turn
       exactly as far as the truck travels */
    const touch = matchMedia('(hover: none) and (pointer: coarse)');
    const truckEl = about.querySelector('.about__truck'), boardEl = document.getElementById('cboard');
    let dIn = 1, dOut = 1, circ = 1;
    const layout = () => {
      if (!touch.matches || !truckEl) { IN = 0.45; OUT = 0.51; about.classList.remove('evenDrive'); return; }
      const tw = truckEl.offsetWidth, ml = parseFloat(getComputedStyle(truckEl).marginLeft) || 0, vw = innerWidth / 100;
      dIn = Math.max(1, 70 * vw - ml); dOut = tw + ml + 4 * vw; circ = Math.PI * 0.105 * tw;
      const MOVE = 0.93;                            // the rest (7 %) is the short stop in front of the board
      IN = MOVE * dIn / (dIn + dOut); OUT = IN + (1 - MOVE);
      about.classList.add('evenDrive');
    };
    const covered = () => {
      if (!truckEl || !boardEl) return true;
      const t = truckEl.getBoundingClientRect(), bd = boardEl.getBoundingClientRect();
      return t.left + t.width * 0.05 <= bd.left;
    };
    const measure = () => {
      const room = about.offsetHeight - innerHeight || 1;
      target = Math.min(Math.max(-about.getBoundingClientRect().top / room, 0), 1);
    };
    const apply = p => {
      const pin = Math.min(p / IN, 1), pout = Math.min(Math.max((p - OUT) / (1 - OUT), 0), 1);
      if (touch.matches) {
        // steady speed, with only a short ease right at the stop and at the pull-away
        const ap = pin >= 1 ? 1 : (pin < 0.85 ? pin / 0.925 : 1 - (1 - pin) * (1 - pin) / (2 * 0.15 * 0.925));
        const ep = pout <= 0 ? 0 : (pout > 0.15 ? (pout - 0.075) / 0.925 : pout * pout / (2 * 0.15 * 0.925));
        about.style.setProperty('--ap', ap.toFixed(4));
        about.style.setProperty('--ep', ep.toFixed(4));
        about.style.setProperty('--wr', (-(ap * dIn + ep * dOut) / circ * 360).toFixed(1) + 'deg');
      } else {
        about.style.setProperty('--ap', (1 - Math.pow(1 - pin, 1.6)).toFixed(4));   // gentle slow-down into the stop
        about.style.setProperty('--ep', Math.pow(pout, 1.5).toFixed(4));            // gentle pull-away, no long dead spot
      }
      about.classList.toggle('passed', p >= (IN + OUT) / 2 && (!phone.matches || covered()));   // truck is in front of the board here, so the swap is hidden behind it
    };
    const step = t => {
      const dt = Math.min(Math.max((t - last) / 1000, 0), 0.05); last = t;
      cur += (target - cur) * (1 - Math.exp(-dt * FOLLOW));
      if (Math.abs(target - cur) < 0.0004) cur = target;
      apply(cur);
      raf = cur !== target ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { measure(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { layout(); kick(); });
    layout(); measure(); cur = target; apply(cur);      // reloading mid-page: start where the scroll already is
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
      const pu = Math.max(Math.min(root.clientWidth, 5120), 720) / 1440;
      const navH = 118 * Math.min(root.clientWidth, 5120) / 1440;
      const room = innerHeight - navH - 16 - 14 * pu;             // space between the nav bar and the bottom of the screen
      const k = Math.max(.5, Math.min(.9, room / (672 * pu)));
      foot.style.setProperty('--fk', k.toFixed(3));
    };
    fit(); addEventListener('resize', fit);
  }
})();

  /* ---- 10. showreel stereo → full mp3 player, with a real YouTube-playlist source ---- */
  (() => {
    const FM_KEY = 'faqueFM';
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(FM_KEY) || 'null'); } catch (e) {}
    if (saved && Date.now() - (saved.ts || 0) > 30 * 60 * 1000) saved = null;   // stale (left the site a while ago)
    const stereo = document.getElementById('stereo');
    /* About / Studio don't have the player in their HTML: if the radio was on, build it from the home page's markup */
    if (!document.getElementById('stereoPlayer')) {
      if (!saved) return;
      document.body.insertAdjacentHTML('beforeend', `<audio id="stereoAudio" src="assets/showreel/faque-fm.mp3" preload="none"></audio>
    <div class="stereoPlayer" id="stereoPlayer" hidden>
      <div class="stereoPlayer__panel is-state1" id="stereoPanel">
        <button class="stereoPlayer__x" id="stereoX" type="button" aria-label="Close player">✕</button>
        <div class="stereoPlayer__lcd">
          <div class="stereoPlayer__art" aria-hidden="true">🎵</div>
          <div class="stereoPlayer__meta">
            <p class="stereoPlayer__title" id="stereoTitle">333.3 Faque FM</p>
            <p class="stereoPlayer__artist" id="stereoArtist">FM STATION</p>
          </div>
          <div class="stereoPlayer__eq" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <input class="stereoPlayer__seek" id="stereoSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
          <span class="stereoPlayer__cur" id="stereoCur">0:00</span>
          <span class="stereoPlayer__dur" id="stereoDur">0:00</span>
          <span class="stereoPlayer__volIcon" aria-hidden="true">🔊</span>
          <input class="stereoPlayer__vol" id="stereoVol" type="range" min="0" max="100" value="70" aria-label="Volume">
        </div>
        <button class="stereoPlayer__btn stereoPlayer__prev" id="stereoPrev" type="button" aria-label="Previous track"></button>
        <button class="stereoPlayer__btn stereoPlayer__play" id="stereoPlayPause" type="button" aria-label="Play or pause"></button>
        <button class="stereoPlayer__btn stereoPlayer__next" id="stereoNext" type="button" aria-label="Next track"></button>
        <button class="stereoPlayer__foot stereoPlayer__playlist" id="stereoPlaylistBtn" type="button">Listen to playlist</button>
        <button class="stereoPlayer__foot stereoPlayer__minimize" id="stereoMinBtn" type="button" hidden>Minimize</button>
        <button class="stereoPlayer__foot stereoPlayer__back" id="stereoBackBtn" type="button">Go back</button>
      </div>
      <div class="stereoMin" id="stereoMini" hidden aria-label="333.3 Faque FM — minimized player">
        <button class="stereoMin__max" id="stereoMinMax" type="button" aria-label="Expand player">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6.4l4.3 4.3-1.4 1.4L5 7.4V10H3V4h1zm16 16h-6v-2h3.6l-4.3-4.3 1.4-1.4L19 16.6V14h2v6h-1z" fill="currentColor"/></svg>
        </button>
        <button class="stereoMin__prev" id="stereoMinPrev" type="button" aria-label="Previous track"></button>
        <button class="stereoMin__play" id="stereoMinPlay" type="button" aria-label="Play or pause"></button>
        <button class="stereoMin__next" id="stereoMinNext" type="button" aria-label="Next track"></button>
        <button class="stereoMin__close" id="stereoMinClose" type="button" aria-label="Close player"></button>
        <button class="stereoMin__ring" id="stereoMinRing" type="button" aria-label="Expand player"></button>
      </div>
    </div>
    <div id="ytPlayerTarget" style="position:fixed; left:-9999px; top:-9999px; width:2px; height:2px; overflow:hidden; pointer-events:none;"></div>`);
    }
    const audio = document.getElementById('stereoAudio');
    const wrap = document.getElementById('stereoPlayer');
    const panel = document.getElementById('stereoPanel');
    const xBtn = document.getElementById('stereoX');
    const backBtn = document.getElementById('stereoBackBtn');
    const playlistBtn = document.getElementById('stereoPlaylistBtn');
    const minBtn = document.getElementById('stereoMinBtn');
    const mini = document.getElementById('stereoMini');
    const minRing = document.getElementById('stereoMinRing');
    const minMax = document.getElementById('stereoMinMax');
    const minPrev = document.getElementById('stereoMinPrev');
    const minNext = document.getElementById('stereoMinNext');
    const minPlay = document.getElementById('stereoMinPlay');
    const minClose = document.getElementById('stereoMinClose');
    const playPause = document.getElementById('stereoPlayPause');
    const prevBtn = document.getElementById('stereoPrev');
    const nextBtn = document.getElementById('stereoNext');
    const seek = document.getElementById('stereoSeek');
    const vol = document.getElementById('stereoVol');
    const cur = document.getElementById('stereoCur');
    const dur = document.getElementById('stereoDur');
    const titleEl = document.getElementById('stereoTitle');
    const artistEl = document.getElementById('stereoArtist');
    if (!audio || !wrap || !panel) return;

    /* Paste individual YouTube song links here (full URL or bare video ID both work).
       Ashfaque: only add ones you've actually confirmed play in an embedded player —
       a playlist auto-imported from Spotify tends to include removed/region-locked/
       embedding-disabled tracks, which is what was causing the "stuck loading" bug.
       One is picked at random each time the player opens, and it shuffles through the
       rest so it isn't replaying the same track, skipping automatically past any single
       one that fails instead of getting stuck. */
    const YT_VIDEO_URLS = [
      'https://www.youtube.com/watch?v=3vp4ddZ-bCI',
      'https://www.youtube.com/watch?v=A7NpQUkItTM',
      'https://www.youtube.com/watch?v=QLVwGG1TZHk',
      'https://www.youtube.com/watch?v=cEP6oU0Qug4',
      'https://www.youtube.com/watch?v=Q-eI83gXUgc',
      'https://www.youtube.com/watch?v=E7renNYrmLQ',
      'https://www.youtube.com/watch?v=tjghhOQNwLg',
      'https://www.youtube.com/watch?v=24gfxvQCuf0',
      'https://www.youtube.com/watch?v=oyLX1eVLEj0',
      'https://www.youtube.com/watch?v=8w_X3-BsRG0',
      'https://www.youtube.com/watch?v=hALU7lBeZSA',
      'https://www.youtube.com/watch?v=9ngC804UK3k',
      'https://www.youtube.com/watch?v=klrTOJyOr5I',
      'https://www.youtube.com/watch?v=CtcbQ-t2FcU',
      'https://www.youtube.com/watch?v=WgsaDcJYGg4',
      'https://www.youtube.com/watch?v=Cj2uiUNwrdY',
      'https://www.youtube.com/watch?v=wpBNNp8zXkw',
      'https://www.youtube.com/watch?v=wpQetvjxb_Y',
      'https://www.youtube.com/watch?v=dxTAn9GBMuM',
      'https://www.youtube.com/watch?v=CIrbgy1S7MQ',
      'https://www.youtube.com/watch?v=7MlAgc1tCpo',
      'https://www.youtube.com/watch?v=h8IR1_EF-k8',
      'https://www.youtube.com/watch?v=GSCpkYYawKM',
      'https://www.youtube.com/watch?v=CRa2yWCnNkI',
      'https://www.youtube.com/watch?v=RHMV2oERwtE',
      'https://www.youtube.com/watch?v=BDIh37fiCAE',
      'https://www.youtube.com/watch?v=1sinydrAhVA',
      'https://www.youtube.com/watch?v=3x4qeKaUCkM',
      'https://www.youtube.com/watch?v=NtAsTxKcWBo',
      'https://www.youtube.com/watch?v=4vUuI_mibKc',
      'https://www.youtube.com/watch?v=omizykFNt6w'
      // add more as you like — one is picked at random each time
    ];
    function extractYTId(url) {
      const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : (/^[a-zA-Z0-9_-]{11}$/.test(url) ? url : null);
    }
    const YT_VIDEO_IDS = YT_VIDEO_URLS.map(extractYTId).filter(Boolean);

    let seeking = false;
    let source = 'local';           // 'local' (intro mp3) | 'yt' (random pick from YT_VIDEO_IDS, played in-page)
    let ytPlayer = null, ytReady = false, ytPendingPlay = false, ytApiRequested = false;
    let lastVol = 70, resumeAt = 0;
    let playOrder = [], playIdx = -1, ytErrorStreak = 0;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    function reshufflePlayOrder() {
      playOrder = shuffle(YT_VIDEO_IDS.map((_, i) => i));
      playIdx = 0;
    }
    function currentVideoId() {
      if (playIdx < 0 || playIdx >= playOrder.length) reshufflePlayOrder();
      return YT_VIDEO_IDS[playOrder[playIdx]];
    }
    function advanceVideo() {
      playIdx++;
      if (playIdx >= playOrder.length) reshufflePlayOrder();
      return currentVideoId();
    }

    const fmt = (s) => { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; };

    audio.volume = 0.7;

    function pop(el) {
      el.classList.add('is-popping');
      requestAnimationFrame(() => {
        void el.offsetWidth;
        requestAnimationFrame(() => el.classList.remove('is-popping'));
      });
    }
    function setPlayingUI(playing) {
      if (stereo) stereo.classList.toggle('is-playing', playing);
      if (playing) mini.classList.remove('is-blocked');
      panel.classList.toggle('is-playing', playing);
      mini.classList.toggle('is-paused', !playing);
    }

    /* ---- YouTube IFrame API (loaded lazily, only once the user opts into the playlist) ---- */
    function loadYTApi(cb) {
      if (window.YT && window.YT.Player) { cb(); return; }
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prevReady) prevReady(); cb(); };
      if (!ytApiRequested) {
        ytApiRequested = true;
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }
    function createYTPlayer() {
      loadYTApi(() => {
        ytPlayer = new YT.Player('ytPlayerTarget', {
          height: '2', width: '2',
          videoId: currentVideoId(),
          playerVars: {
            autoplay: 0, controls: 0, disablekb: 1,
            playsinline: 1, origin: window.location.origin
          },
          events: {
            onReady: (e) => {
              ytReady = true;
              e.target.setVolume(Number(vol.value));
              if (resumeAt > 1) { e.target.seekTo(resumeAt, true); resumeAt = 0; }
              if (ytPendingPlay) { e.target.playVideo(); ytPendingPlay = false; }
            },
            onStateChange: (e) => {
              if (source !== 'yt') return;
              if (e.data === YT.PlayerState.PLAYING) { ytErrorStreak = 0; clearTimeout(window.__ytWatchdog); setPlayingUI(true); updateYTTitle(); }
              else if (e.data === YT.PlayerState.PAUSED) { setPlayingUI(false); }
              else if (e.data === YT.PlayerState.BUFFERING) { titleEl.textContent = 'Buffering…'; }
              else if (e.data === YT.PlayerState.ENDED) { ytPlayer.loadVideoById(advanceVideo()); }
            },
            onError: () => {
              /* video removed/restricted/not embeddable — skip to another random pick rather
                 than getting stuck; give up (fall back to local mp3) only if every track in the
                 list fails in a row, so one or two bad links never break the player */
              if (source !== 'yt' || !ytPlayer) return;
              ytErrorStreak++;
              if (ytErrorStreak >= Math.max(YT_VIDEO_IDS.length, 1)) return; /* let the watchdog fall back */
              ytPlayer.loadVideoById(advanceVideo());
              ytPlayer.playVideo();
            }
          }
        });
      });
    }
    function updateYTTitle() {
      if (!ytPlayer || !ytPlayer.getVideoData) return;
      try {
        const d = ytPlayer.getVideoData();
        const t = (d && d.title) ? d.title : '333.3 Faque FM';
        titleEl.textContent = t;
        artistEl.textContent = '333.3 Faque FM';
      } catch (e) {}
    }

    /* ---- unified transport, dispatched by active source ---- */
    function isPlaying() {
      if (source === 'local') return !audio.paused;
      return !!(ytPlayer && ytReady && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);
    }
    function play() {
      if (source === 'local') { audio.play().catch(() => {}); }
      else if (ytPlayer && ytReady) { ytPlayer.playVideo(); }
      else { ytPendingPlay = true; }
    }
    function pause() {
      if (source === 'local') audio.pause();
      else if (ytPlayer && ytReady) ytPlayer.pauseVideo();
    }
    function toggle() { if (isPlaying()) pause(); else play(); }
    function prev() {
      if (source === 'local') { audio.currentTime = 0; }
      else if (ytPlayer && ytReady) {
        playIdx = playIdx > 0 ? playIdx - 1 : 0;
        ytPlayer.loadVideoById(currentVideoId());
        ytPlayer.playVideo();
      }
    }
    function next() {
      if (source === 'local') { audio.currentTime = 0; if (audio.paused) audio.play().catch(() => {}); }
      else if (ytPlayer && ytReady) { ytPlayer.loadVideoById(advanceVideo()); ytPlayer.playVideo(); }
    }
    document.addEventListener('reelplay', () => { if (isPlaying()) pause(); });   // the radio goes quiet when the showreel starts
    function setVolume(v) {
      audio.volume = v / 100;
      if (ytPlayer && ytReady) ytPlayer.setVolume(Number(v));
    }

    function openPlayer() {
      wrap.hidden = false;
      mini.hidden = true;
      panel.style.display = '';
      pop(panel);
      play();
    }
    function closePlayer() {
      try { sessionStorage.removeItem(FM_KEY); } catch (e) {}
      wrap.hidden = true;
      mini.hidden = true;
      audio.pause();
      if (ytPlayer && ytReady) ytPlayer.pauseVideo();
    }
    function minimize() {
      panel.style.display = 'none';
      mini.hidden = false;
      pop(mini);
    }
    function restore() {
      mini.hidden = true;
      panel.style.display = '';
      pop(panel);
    }

    if (stereo) stereo.addEventListener('click', openPlayer);
    xBtn.addEventListener('click', closePlayer);
    backBtn.addEventListener('click', closePlayer);
    minBtn.addEventListener('click', minimize);

    playlistBtn.addEventListener('click', () => {
      if (!YT_VIDEO_IDS.length) {
        /* nothing pasted into YT_VIDEO_URLS yet — nothing to play, so don't even try */
        titleEl.textContent = '333.3 Faque FM';
        artistEl.textContent = 'FM STATION — playlist unavailable';
        return;
      }
      audio.pause();
      source = 'yt';
      ytErrorStreak = 0;
      panel.classList.remove('is-state1');
      panel.classList.add('is-state2');
      playlistBtn.hidden = true;
      minBtn.hidden = false;
      titleEl.textContent = 'Loading playlist…';
      artistEl.textContent = '333.3 Faque FM';
      if (!ytPlayer) { ytPendingPlay = true; createYTPlayer(); } else { ytPlayer.loadVideoById(currentVideoId()); play(); }

      /* watchdog: if the playlist hasn't actually started within 8s (blocked embed, network issue,
         ad-blocker, etc.) fall back to the intro track instead of leaving the widget stuck loading */
      clearTimeout(window.__ytWatchdog);
      window.__ytWatchdog = setTimeout(() => {
        if (source === 'yt' && !isPlaying()) {
          source = 'local';
          panel.classList.remove('is-state2');
          panel.classList.add('is-state1');
          playlistBtn.hidden = false;
          minBtn.hidden = true;
          titleEl.textContent = '333.3 Faque FM';
          artistEl.textContent = 'FM STATION — playlist unavailable';
          audio.play().catch(() => {});
        }
      }, 8000);
    });

    playPause.addEventListener('click', toggle);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    audio.addEventListener('play', () => { if (source === 'local') setPlayingUI(true); });
    audio.addEventListener('pause', () => { if (source === 'local') setPlayingUI(false); });
    audio.addEventListener('loadedmetadata', () => { if (source === 'local') dur.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (source !== 'local' || seeking) return;
      cur.textContent = fmt(audio.currentTime);
      dur.textContent = fmt(audio.duration);
      if (audio.duration) seek.value = String((audio.currentTime / audio.duration) * 1000);
    });

    /* poll for live progress from the YouTube player (no timeupdate event on the IFrame API) */
    setInterval(() => {
      if (source !== 'yt' || seeking || !ytPlayer || !ytReady) return;
      const d = (ytPlayer.getDuration && ytPlayer.getDuration()) || 0;
      const c = (ytPlayer.getCurrentTime && ytPlayer.getCurrentTime()) || 0;
      cur.textContent = fmt(c);
      dur.textContent = fmt(d);
      if (d) seek.value = String((c / d) * 1000);
    }, 400);

    seek.addEventListener('input', () => {
      seeking = true;
      const d = source === 'local' ? (audio.duration || 0) : ((ytPlayer && ytPlayer.getDuration && ytPlayer.getDuration()) || 0);
      cur.textContent = fmt((seek.value / 1000) * d);
    });
    seek.addEventListener('change', () => {
      const frac = seek.value / 1000;
      if (source === 'local') { if (audio.duration) audio.currentTime = frac * audio.duration; }
      else if (ytPlayer && ytReady) { const d = ytPlayer.getDuration(); if (d) ytPlayer.seekTo(frac * d, true); }
      seeking = false;
    });
    vol.addEventListener('input', () => { lastVol = Number(vol.value); setVolume(vol.value); });

    /* ---- minimized circular remote ---- */
    minPlay.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    minPrev.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    minNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    minClose.addEventListener('click', (e) => { e.stopPropagation(); closePlayer(); });
    minMax.addEventListener('click', (e) => { e.stopPropagation(); restore(); });
    minRing.addEventListener('click', restore);

    /* ---- carry the radio across pages: remember what's playing, pick it up on the next page ---- */
    function curTime() {
      if (source === 'local') return audio.currentTime || 0;
      return (ytPlayer && ytReady && ytPlayer.getCurrentTime) ? ytPlayer.getCurrentTime() : resumeAt;
    }
    function saveState() {
      if (wrap.hidden) return;
      const st = { source, order: playOrder, idx: playIdx, t: curTime(), playing: isPlaying() || (saved && saved.playing && !userPaused), vol: Number(vol.value), ts: Date.now() };
      try { sessionStorage.setItem(FM_KEY, JSON.stringify(st)); } catch (e) {}
    }
    let userPaused = false;
    [playPause, minPlay].forEach(b => b.addEventListener('click', () => { userPaused = isPlaying(); }, true));
    addEventListener('pagehide', saveState);
    setInterval(() => { if (!wrap.hidden) saveState(); }, 1500);

    if (saved) {
      vol.value = saved.vol != null ? saved.vol : 70; lastVol = Number(vol.value); setVolume(vol.value);
      wrap.hidden = false;
      if (saved.source === 'yt' && YT_VIDEO_IDS.length) {
        source = 'yt';
        if (Array.isArray(saved.order) && saved.order.length === YT_VIDEO_IDS.length) { playOrder = saved.order; playIdx = saved.idx; }
        panel.classList.remove('is-state1'); panel.classList.add('is-state2');
        playlistBtn.hidden = true; minBtn.hidden = false;
        titleEl.textContent = 'Tuning in…'; artistEl.textContent = '333.3 Faque FM';
      }
      panel.style.display = 'none'; mini.hidden = false;
      setPlayingUI(false);
      if (saved.playing) {
        resumeAt = saved.t || 0;
        if (source === 'yt') { ytPendingPlay = true; createYTPlayer(); }
        else {
          const go = () => { if (resumeAt) audio.currentTime = resumeAt; audio.play().catch(() => mini.classList.add('is-blocked')); };
          audio.preload = 'auto'; if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true }); audio.load();
        }
        /* if the browser didn't let it start on its own, show the "tap play" pulse */
        setTimeout(() => { if (!isPlaying()) { mini.classList.add('is-blocked'); if (source === 'yt') updateYTTitle(); } }, 3500);
        /* Firefox / Safari only let sound start on a new page after a click or key press there: the first one anywhere
           on the page carries the music on (clicks on the player itself are left to its own buttons) */
        const carryOn = e => {
          ['pointerup', 'click', 'touchend', 'keydown'].forEach(ev => removeEventListener(ev, carryOn, true));
          if (isPlaying() || wrap.contains(e.target)) return;
          if (source === 'local' && resumeAt && audio.currentTime < 1) audio.currentTime = resumeAt;   // pick up where it was
          play();
        };
        ['pointerup', 'click', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, carryOn, true));
      } else if (source === 'yt') { resumeAt = saved.t || 0; createYTPlayer(); }
    }
  })();
