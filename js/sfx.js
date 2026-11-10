/* Site sound effects, all made in code with the Web Audio API (no sound files).
   - SFX.tick()         one soft "haptic" click (the greeting spin on the opening shutter)
   - SFX.shutter(ms)    an old rolling metal shutter going up, timed to the roll animation
   - the truck engine   idles while a moving-truck scene is on screen and revs with scroll speed
   Browsers only allow sound after the visitor clicks / taps / presses a key, so everything stays
   silent until then (SFX.unlock() is called from those gestures). */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.SFX = { unlock() {}, tick() {}, shutter() {}, ready: () => false }; return; }

  const VOL = { tick: 0.22, shutter: 0.5, engine: 0.07 };   // engine kept low so it never gets in the way
  let ctx = null, master = null, noiseBuf = null;

  function init() {
    if (ctx) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    // 2 s of white noise, reused by every effect
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ready = () => !!ctx && ctx.state === 'running';
  function unlock() {
    try { init(); if (ctx.state !== 'running') ctx.resume(); } catch (e) {}
  }
  // any real gesture on any page unlocks sound; Chrome may also allow it straight away on later pages of the site
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
  try { init(); ctx.resume().catch(() => {}); } catch (e) {}

  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); return s; };
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }

  /* ---- tick: a tiny dry click, like a phone's haptic detent ---- */
  function tick(strength = 1) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.005;
    const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.4;
    n.connect(bp).connect(g).connect(master);
    env(g, t, 0.001, VOL.tick * strength, 0.002, 0.012);
    n.start(t); n.stop(t + 0.03);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.02);
    o.connect(og).connect(master);
    env(og, t, 0.001, VOL.tick * 0.5 * strength, 0, 0.022);
    o.start(t); o.stop(t + 0.04);
  }

  /* ---- shutter: slats clattering over the roller (fast, then slowing), a rolling rumble, a stop clunk ---- */
  function bez(p1, p2, t) { const u = 1 - t; return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t; }
  function easeAt(x, x1, y1, x2, y2) {            // value of cubic-bezier(x1,y1,x2,y2) at time x
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bez(x1, x2, m) < x) lo = m; else hi = m; }
    return bez(y1, y2, (lo + hi) / 2);
  }
  function shutter(ms = 950) {
    if (!ready()) return;
    const t0 = ctx.currentTime + 0.01, D = ms / 1000, SLATS = 30;
    const out = ctx.createGain(); out.gain.value = VOL.shutter; out.connect(master);
    // slat clacks: one each time the roll animation passes another slat
    let k = 1; const N = 400;
    for (let i = 1; i <= N; i++) {
      const x = i / N, y = easeAt(x, .08, .62, .2, 1);
      while (y >= k / SLATS && k <= SLATS) {
        const t = t0 + x * D, sp = 1 - k / SLATS;               // later slats are slower and softer
        const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 900; bp.Q.value = 3;
        n.connect(bp).connect(g).connect(out);
        env(g, t, 0.002, 0.35 + 0.5 * sp, 0.004, 0.05);
        n.start(t); n.stop(t + 0.08);
        const o = ctx.createOscillator(), og = ctx.createGain();   // thin metallic ring of the slat
        o.type = 'triangle'; o.frequency.value = 420 + Math.random() * 260;
        o.connect(og).connect(out);
        env(og, t, 0.002, 0.08 + 0.1 * sp, 0, 0.07);
        o.start(t); o.stop(t + 0.1);
        k++;
      }
    }
    // rolling rumble that follows the speed of the roll
    const r = noise(), lp = ctx.createBiquadFilter(), rg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8;
    r.connect(lp).connect(rg).connect(out);
    rg.gain.setValueAtTime(0.0001, t0);
    for (let i = 0; i <= 20; i++) {
      const x = i / 20, a = easeAt(Math.min(1, x + 0.02), .08, .62, .2, 1) - easeAt(x, .08, .62, .2, 1);
      rg.gain.linearRampToValueAtTime(Math.max(0.0001, Math.min(0.9, a * 22)), t0 + x * D);
    }
    rg.gain.linearRampToValueAtTime(0.0001, t0 + D + 0.05);
    r.start(t0); r.stop(t0 + D + 0.1);
    // clunk as it hits the top
    const tc = t0 + D - 0.03;
    const c = ctx.createOscillator(), cg = ctx.createGain();
    c.type = 'sine'; c.frequency.setValueAtTime(140, tc); c.frequency.exponentialRampToValueAtTime(55, tc + 0.18);
    c.connect(cg).connect(out); env(cg, tc, 0.003, 0.55, 0.01, 0.2); c.start(tc); c.stop(tc + 0.3);
    const cn = noise(), cb = ctx.createBiquadFilter(), cng = ctx.createGain();
    cb.type = 'bandpass'; cb.frequency.value = 650; cb.Q.value = 1.2;
    cn.connect(cb).connect(cng).connect(out); env(cng, tc, 0.002, 0.5, 0.01, 0.09); cn.start(tc); cn.stop(tc + 0.15);
  }

  /* ---- truck engine: a diesel idle that revs up with scroll speed and settles back when the scroll stops.
     Plays only while the about-page truck or the projects truck is on screen. ---- */
  const scenes = [...document.querySelectorAll('.about, #projects')];
  if (scenes.length) {
    let eng = null, visible = new Set(), rev = 0, target = 0, lastY = scrollY, lastT = performance.now(), raf = 0, fade = 0;
    // something else making sound (showreel, studio videos, Faque FM)
    const mediaPlaying = () => [...document.querySelectorAll('audio, video')].some(m => !m.paused && !m.muted && m.volume > 0)
      || !!document.querySelector('#stereoPanel.is-playing');
    function build() {
      const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9; lp.connect(out);
      const body = ctx.createGain(); body.gain.value = 0.55; body.connect(lp);
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
      const o2 = ctx.createOscillator(); o2.type = 'square';
      const o2g = ctx.createGain(); o2g.gain.value = 0.25;
      o1.connect(body); o2.connect(o2g).connect(body);
      // diesel "chug": the level throbs at half the firing rate
      const chug = ctx.createOscillator(), chugG = ctx.createGain(); chug.type = 'sine'; chugG.gain.value = 0.35;
      chug.connect(chugG).connect(body.gain);
      // intake / exhaust hiss that rises with the revs
      const n = noise(), nbp = ctx.createBiquadFilter(), ng = ctx.createGain();
      nbp.type = 'bandpass'; nbp.frequency.value = 700; nbp.Q.value = 0.7; ng.gain.value = 0.05;
      n.connect(nbp).connect(ng).connect(lp);
      [o1, o2, chug, n].forEach(s => s.start());
      return { out, lp, o1, o2, chug, ng, nbp };
    }
    function set(r) {
      const t = ctx.currentTime, f = 36 + 60 * r;                 // firing rate, Hz
      eng.o1.frequency.setTargetAtTime(f, t, 0.06);
      eng.o2.frequency.setTargetAtTime(f * 2.01, t, 0.06);
      eng.chug.frequency.setTargetAtTime(f / 2, t, 0.06);
      eng.lp.frequency.setTargetAtTime(560 + 1500 * r, t, 0.08);   // high enough that phone / laptop speakers still carry the rumble
      eng.ng.gain.setTargetAtTime(0.03 + 0.22 * r, t, 0.08);
      eng.nbp.frequency.setTargetAtTime(600 + 900 * r, t, 0.08);
      const duck = mediaPlaying() ? 0.25 : 1;                     // quieter while the showreel / radio plays
      eng.out.gain.setTargetAtTime(VOL.engine * fade * duck * (0.6 + 0.4 * r), t, 0.12);
    }
    function loop(now) {
      const dt = Math.max(1, now - lastT); lastT = now;
      const v = Math.abs(scrollY - lastY) / dt * 1000; lastY = scrollY;   // px per second
      target = Math.min(1, v / 2200);
      rev += (target - rev) * (target > rev ? 0.12 : 0.035);            // revs up quickly, winds down slowly
      const want = visible.size ? 1 : 0; fade += (want - fade) * 0.06;
      if (ready()) { if (!eng) eng = build(); set(rev); }
      if (want || fade > 0.01) raf = requestAnimationFrame(loop);
      else { raf = 0; if (eng) eng.out.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
    }
    const kick = () => { if (!raf) { lastY = scrollY; lastT = performance.now(); raf = requestAnimationFrame(loop); } };
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(es => {
        es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
        if (visible.size) kick();
      }, { threshold: 0.15 });
      scenes.forEach(s => io.observe(s));
    }
    addEventListener('pointerdown', () => { if (visible.size) kick(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && eng) eng.out.gain.setTargetAtTime(0, ctx.currentTime, 0.05); });
  }

  window.SFX = { unlock, tick, shutter, ready };
})();
