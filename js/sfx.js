/* Site sound effects (Web Audio API).
   - SFX.tick()        one soft "haptic" click, made in code (the greeting spin on the opening shutter)
   - SFX.shutter()     the recorded old rolling shutter going up (assets/audio/shutter.mp3, ~2.6 s)
   - the truck engine  recorded diesel, cut into: start (played once per truck), idle loop, rev loop, switch-off.
                       Idles while a truck scene is on screen and revs with scroll speed.
   Browsers only allow sound after the visitor clicks / taps / presses a key, so everything stays
   silent until then (SFX.unlock() is called from those gestures). */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.SFX = { unlock() {}, tick() {}, shutter() {}, ready: () => false }; return; }

  const VOL = { tick: 0.22, shutter: 0.55, engine: 0.0125 };   // engine kept very low so it never gets in the way
  const LOOP = { idle: [0.25, 2.7], rev: [0.25, 2.6] };       // loop start / length (s) inside the loop files
  let ctx = null, master = null, noiseBuf = null;
  const buf = {};

  function load(name) {
    if (buf[name]) return buf[name];
    return (buf[name] = fetch('assets/audio/' + name + '.mp3').then(r => r.arrayBuffer())
      .then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).catch(() => null));
  }
  function init() {
    if (ctx) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);   // white noise for the tick
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (document.getElementById('intro')) load('shutter');
    if (document.querySelector('.about, #projects')) ['truck-start', 'truck-idle', 'truck-rev', 'truck-off'].forEach(load);
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

  /* ---- shutter: the recording, started together with the roll animation ---- */
  let shutterBuf = null;
  function shutter() {
    if (!ready()) return;
    const go = b => { if (!b) return; const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; g.gain.value = VOL.shutter; src.connect(g).connect(master); src.start(); };
    if (shutterBuf) go(shutterBuf); else load('shutter').then(b => { shutterBuf = b; go(b); });
  }

  /* ---- board snapping up: a quick double metal click + a small knock, as it locks into place ---- */
  function latch() {
    if (!ready()) return;
    const t0 = ctx.currentTime + 0.005;
    [[0, 1], [0.045, 0.65]].forEach(([dt, s]) => {
      const t = t0 + dt;
      const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 2600 + Math.random() * 600; bp.Q.value = 4;
      n.connect(bp).connect(g).connect(master); env(g, t, 0.001, 0.32 * s, 0.003, 0.035); n.start(t); n.stop(t + 0.06);
      [1180, 1730, 2470].forEach((f, i) => {                     // short metallic ring
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
        o.connect(og).connect(master); env(og, t, 0.001, 0.07 * s / (i + 1), 0, 0.09 + 0.04 * i); o.start(t); o.stop(t + 0.2);
      });
    });
    const k = ctx.createOscillator(), kg = ctx.createGain();     // the knock of the board against the frame
    k.type = 'sine'; k.frequency.setValueAtTime(190, t0); k.frequency.exponentialRampToValueAtTime(80, t0 + 0.08);
    k.connect(kg).connect(master); env(kg, t0, 0.002, 0.28, 0, 0.1); k.start(t0); k.stop(t0 + 0.15);
  }

  /* ---- truck engine ---- */
  const scenes = [...document.querySelectorAll('.about, #projects')];
  if (scenes.length) {
    const visible = new Set();
    let B = null, eng = null, rev = 0, lastY = scrollY, lastT = performance.now(), raf = 0;
    Promise.all(['truck-start', 'truck-idle', 'truck-rev', 'truck-off'].map(n => ctx ? load(n) : Promise.resolve(null)))
      .then(([start, idle, revb, off]) => { if (idle && revb) { B = { start, idle, rev: revb, off }; kick(); } });
    // something else making sound (showreel, studio videos, Faque FM): the engine drops right down
    const mediaPlaying = () => [...document.querySelectorAll('audio, video')].some(m => !m.paused && !m.muted && m.volume > 0)
      || !!document.querySelector('#stereoPanel.is-playing');
    const seen = el => { try { return sessionStorage.getItem('truckStarted:' + (el.id || el.className.split(' ')[0])) === '1'; } catch (e) { return false; } };
    const markSeen = el => { try { sessionStorage.setItem('truckStarted:' + (el.id || el.className.split(' ')[0]), '1'); } catch (e) {} };
    const loopSrc = (b, [ls, len]) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = ls; s.loopEnd = ls + len; return s; };

    function startEngine() {                      // bring the idle / rev loops in; the ignition only the first time per truck
      const t = ctx.currentTime, scene = [...visible][0];
      const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
      const gI = ctx.createGain(), gR = ctx.createGain(); gI.gain.value = 0; gR.gain.value = 0;
      gI.connect(out); gR.connect(out);
      const si = loopSrc(B.idle, LOOP.idle), sr = loopSrc(B.rev, LOOP.rev);
      si.connect(gI); sr.connect(gR);
      let at = t;
      if (scene && !seen(scene) && B.start) {
        markSeen(scene);
        const st = ctx.createBufferSource(), sg = ctx.createGain();
        st.buffer = B.start; sg.gain.value = VOL.engine * (mediaPlaying() ? 0.25 : 1);
        st.connect(sg).connect(master); st.start(t);
        at = t + B.start.duration - 0.3;           // loops take over as the ignition settles
      }
      si.start(at, LOOP.idle[0]); sr.start(at, LOOP.rev[0] + Math.random() * 2);
      out.gain.setValueAtTime(0, t); out.gain.setValueAtTime(0, at); out.gain.linearRampToValueAtTime(1, at + (at > t ? 0.5 : 1.6));   // coming back to a truck: a slow fade in
      eng = { out, gI, gR, si, sr, from: at };
    }
    function stopEngine() {                       // the switch-off clip, then silence
      const t = ctx.currentTime;
      if (B.off) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = B.off; g.gain.value = VOL.engine * (mediaPlaying() ? 0.25 : 1) * 0.9;
        s.connect(g).connect(master); s.start(t); }
      eng.out.gain.cancelScheduledValues(t); eng.out.gain.setValueAtTime(eng.out.gain.value, t); eng.out.gain.linearRampToValueAtTime(0, t + 0.35);
      eng.si.stop(t + 0.4); eng.sr.stop(t + 0.4); eng = null;
    }
    /* how fast the truck is actually moving: on the about page that's the truck's own (smoothed) drive progress,
       on the home page it's the scroll speed through the projects road */
    const aboutEl = document.querySelector('.about');
    let lastP = null, vel = 0;
    const truckPos = () => { const cs = getComputedStyle(aboutEl); return (parseFloat(cs.getPropertyValue('--ap')) || 0) + (parseFloat(cs.getPropertyValue('--ep')) || 0); };
    function loop(now) {
      const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
      let speed;
      if (aboutEl && visible.has(aboutEl)) {
        const pos = truckPos(); speed = lastP === null ? 0 : Math.abs(pos - lastP) / dt / 0.55; lastP = pos;   // ~0.55 of the drive per second = full revs
      } else {
        speed = Math.abs(scrollY - lastY) / dt / 1800; lastP = null;                                         // 1800 px/s = full revs
      }
      lastY = scrollY;
      vel += (Math.min(1, speed) - vel) * (1 - Math.exp(-dt / 0.09));            // smooth out jumpy wheel / touch scrolling
      const tau = vel > rev ? 0.18 : 0.6;                                         // revs up briskly, winds down gently
      rev += (vel - rev) * (1 - Math.exp(-dt / tau));
      if (ready() && B) {
        const on = visible.size > 0 && !document.hidden;
        if (on && !eng) startEngine();
        else if (!on && eng) stopEngine();
        if (eng) {
          const t = ctx.currentTime, duck = mediaPlaying() ? 0.25 : 1;
          eng.gI.gain.setTargetAtTime(VOL.engine * duck * (1 - 0.75 * rev), t, 0.08);
          eng.gR.gain.setTargetAtTime(VOL.engine * duck * 1.6 * rev, t, 0.08);
          const rate = 1 + 0.2 * rev;                                             // a little higher as it revs
          if (t > eng.from) { eng.si.playbackRate.setTargetAtTime(rate, t, 0.1); eng.sr.playbackRate.setTargetAtTime(rate, t, 0.1); }
        }
      }
      raf = (visible.size || eng) ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (!raf) { lastY = scrollY; lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(es => {
        es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
        kick();
      }, { threshold: 0.15 });
      scenes.forEach(s => io.observe(s));
    }
    addEventListener('pointerdown', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
  }

  window.SFX = { unlock, tick, shutter, latch, ready };
})();
