/* Opening shutter: five greetings, then the shutter rolls up (fast -> slow) and the board lifts away.
   Runs only when <html> has .intro-on (set in <head> on the first visit of a browser session). */
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-on')) return;

  const shutter = document.getElementById('introShutter');
  const banner  = document.getElementById('introBanner');
  const frames  = [...intro.querySelectorAll('.intro__frames img')];
  const skip    = document.getElementById('introSkip');
  const HOLD = 520;                         // ms each greeting stays up
  let opened = false, timer = 0;

  const finish = () => {
    intro.classList.add('is-done');
    root.classList.remove('intro-on');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    const el = location.hash && document.querySelector(location.hash);   // honour a #link that was opened first
    if (el) el.scrollIntoView();
  };

  const open = () => {
    if (opened) return; opened = true; clearTimeout(timer);
    skip.hidden = true;
    const roll = shutter.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-' + (shutter.offsetHeight + 8) + 'px)' }],   // whole artwork height, so no strip is left under the board
      { duration: 1500, easing: 'cubic-bezier(.08,.62,.2,1)', fill: 'forwards' });          // quick start, long gentle stop
    // the site's own entrance starts just as the shutter lifts, so the scene builds up behind it
    setTimeout(() => document.dispatchEvent(new Event('introopen')), 150);
    roll.finished.then(() => {
      shutter.style.visibility = 'hidden';   // gone completely before the board lifts
      const lift = banner.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
        { duration: 600, delay: 0, easing: 'cubic-bezier(.6,0,.35,1)', fill: 'forwards' });
      return lift.finished;
    }).then(finish, finish);
  };

  // spin through the languages several times, fast at first, easing down until it settles on English (frame 0)
  const cycle = () => {
    const STEPS = frames.length * 4 + 1;          // 4 full loops + landing back on English
    const FIRST = 55, LAST = 520;                 // ms per frame at the start / at the end
    const k = Math.pow(LAST / FIRST, 1 / (STEPS - 1));
    let n = 0;
    const step = () => {
      const i = n % frames.length;
      frames.forEach((f, j) => f.classList.toggle('is-on', j === i));
      const d = FIRST * Math.pow(k, n);
      if (++n < STEPS) timer = setTimeout(step, d); else timer = setTimeout(open, HOLD + 200);
    };
    step();
  };

  skip.addEventListener('click', open);
  addEventListener('keydown', e => { if (e.key === 'Escape') open(); });

  // wait for the artwork so the first greeting doesn't pop in
  const ready = Promise.all([...frames, banner.querySelector('img')].map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
  Promise.race([ready, new Promise(r => setTimeout(r, 4000))]).then(cycle);
})();
