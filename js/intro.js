/* Opening shutter: five greetings, then the shutter rolls up (fast -> slow) and the board lifts away.
   Runs only when <html> has .intro-on (set in <head> on the first visit of a browser session). */
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-on')) return;

  const shutter = document.getElementById('introShutter');
  const banner  = document.getElementById('introBanner');
  const frames  = [...intro.querySelectorAll('.intro__frames img')];
  const HOLD = 520;                         // ms each greeting stays up
  let opened = false, timer = 0;

  const finish = () => {
    intro.classList.add('is-done');
    root.classList.remove('intro-on');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    const el = location.hash && document.querySelector(location.hash);   // honour a #link that was opened first
    if (el) el.scrollIntoView();
  };

  const sfx = window.SFX || { tick() {}, shutter() {}, unlock() { return Promise.resolve(); } };
  const open = () => {
    if (opened) return; opened = true; clearTimeout(timer);
    sfx.shutter();
    const roll = shutter.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-' + (shutter.offsetHeight + 8) + 'px)' }],   // whole artwork height, so no strip is left under the board
      { duration: 2000, easing: 'cubic-bezier(.35,.12,.3,1)', fill: 'forwards' });         // 2 s, matched to the shutter recording: steady roll, easing into the stop
    // the site's own entrance starts just as the shutter lifts, so the scene builds up behind it
    setTimeout(() => document.dispatchEvent(new Event('introopen')), 100);
    roll.finished.then(() => {
      shutter.style.visibility = 'hidden';   // gone completely before the board lifts
      const lift = banner.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
        { duration: 400, delay: 0, easing: 'cubic-bezier(.6,0,.35,1)', fill: 'forwards' });
      if (sfx.latch) sfx.latch();   // the board's sound starts with the lift itself
      return lift.finished;
    }).then(finish, finish);
  };

  // spin through the languages several times, fast at first, easing down until it settles on English (frame 0)
  const cycle = () => {
    const STEPS = frames.length * 3 + 1;          // 3 full loops + landing back on English
    const FIRST = 45, LAST = 260;                 // ms per frame at the start / at the end
    const k = Math.pow(LAST / FIRST, 1 / (STEPS - 1));
    let n = 0;
    const step = () => {
      const i = n % frames.length;
      frames.forEach((f, j) => f.classList.toggle('is-on', j === i));
      sfx.tick(1 - 0.45 * n / STEPS);                // each swap clicks, a touch softer as it slows down
      const d = FIRST * Math.pow(k, n);
      if (++n < STEPS) timer = setTimeout(step, d); else timer = setTimeout(open, 200);
    };
    step();
  };


  // wait for the artwork so the first greeting doesn't pop in
  const ready = Promise.all([...frames, banner.querySelector('img')].map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
  /* the shutter waits for a tap / click / key (that is also what lets the browser play its sounds).
     Scrolling or swiping opens it too, just without sound. */
  intro.style.animation = 'none';                 // the CSS safety net is only for when this script doesn't run
  let started = false;
  const go = withSound => {
    if (started) return; started = true;
    const unlocking = withSound ? sfx.unlock() : null;
    hint.classList.add('is-gone');
    ['click', 'keydown', 'wheel', 'touchmove'].forEach(ev => removeEventListener(ev, handler, true));
    // wait (briefly) for the browser to switch sound on, so the very first clicks aren't lost
    if (unlocking) Promise.race([unlocking, new Promise(r => setTimeout(r, 400))]).then(() => setTimeout(cycle, 30));
    else cycle();
  };
  const handler = e => {
    if (e.type === 'keydown' && ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    if (e.type === 'wheel' || e.type === 'touchmove') { go(false); return; }
    e.preventDefault(); go(true);
  };
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const hint = document.createElement('button');
  hint.type = 'button'; hint.className = 'intro__tap';
  hint.textContent = touch ? 'Tap to open' : 'Click to open';
  intro.appendChild(hint);
  intro.setAttribute('aria-hidden', 'false');
  Promise.race([ready, new Promise(r => setTimeout(r, 4000))]).then(() => {
    intro.classList.add('is-waiting');
    try { hint.focus({ preventScroll: true }); } catch (e) {}
    ['click', 'keydown', 'wheel', 'touchmove'].forEach(ev => addEventListener(ev, handler, { capture: true, passive: false }));
  });
})();
