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
  const HOLD = 800;                         // ms each greeting stays up
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
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
      { duration: 2600, easing: 'cubic-bezier(.08,.62,.2,1)', fill: 'forwards' });          // quick start, long gentle stop
    // the site's own entrance starts just as the shutter lifts, so the scene builds up behind it
    setTimeout(() => document.dispatchEvent(new Event('introopen')), 250);
    roll.finished.then(() => {
      const lift = banner.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
        { duration: 900, delay: 150, easing: 'cubic-bezier(.6,0,.35,1)', fill: 'forwards' });
      return lift.finished;
    }).then(finish, finish);
  };

  const cycle = () => {
    let i = 0;
    const step = () => {
      frames.forEach((f, n) => f.classList.toggle('is-on', n === i));
      if (++i < frames.length) timer = setTimeout(step, HOLD); else timer = setTimeout(open, HOLD);
    };
    step();
  };

  skip.addEventListener('click', open);
  addEventListener('keydown', e => { if (e.key === 'Escape') open(); });

  // wait for the artwork so the first greeting doesn't pop in
  const ready = Promise.all([...frames, banner.querySelector('img')].map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
  Promise.race([ready, new Promise(r => setTimeout(r, 4000))]).then(cycle);
})();
