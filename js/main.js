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

  /* ---- 10. showreel stereo → full mp3 player, with a real YouTube-playlist source ---- */
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
    if (!stereo || !audio || !wrap || !panel) return;

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
    let lastVol = 70;
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
      stereo.classList.toggle('is-playing', playing);
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
        artistEl.textContent = 'YouTube playlist';
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

    stereo.addEventListener('click', openPlayer);
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
      artistEl.textContent = 'YouTube playlist';
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
  })();
