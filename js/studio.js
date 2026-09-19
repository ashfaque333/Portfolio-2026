/* Studio page: video edits carousel (coverflow) + fullscreen player. */
(() => {
  const reel = document.getElementById('vreel');
  if (!reel) return;
  const stage = reel.querySelector('.vreel__stage');
  const cards = [...stage.querySelectorAll('.vc')];
  const title = reel.querySelector('.vreel__title');
  const dlg = document.getElementById('vdlg');
  const dv = dlg && dlg.querySelector('video');
  const n = cards.length;
  let a = 0, hoverT = 0;

  const dist = i => { let d = (i - a + n) % n; if (d > n / 2) d -= n; return d; };

  const layout = () => {
    const sh = stage.clientHeight, sw = stage.clientWidth;
    const H = Math.min(sh * .94, sw * .78 / 1.0);
    const size = cards.map(c => { const ar = parseFloat(c.style.getPropertyValue('--ar')) || 1.5; let h = H, w = h * ar; const max = sw * .62; if (w > max) { w = max; h = w / ar; } return { w, h }; });
    const scale = d => d === 0 ? 1 : Math.max(.5, .82 - (Math.abs(d) - 1) * .16);
    const cx = {}; cx[0] = 0;
    for (const dir of [1, -1]) {
      let edge = size[a].w / 2;                                   // outer edge of the previous card
      for (let k = 1; k <= 3; k++) {
        const i = ((a + dir * k) % n + n) % n, s = scale(dir * k), w = size[i].w * s;
        const peek = w * (k === 1 ? .52 : .42);
        cx[dir * k] = dir * (edge - w + peek + w / 2);
        edge = edge + peek;
      }
    }
    cards.forEach((c, i) => {
      const d = dist(i), s = scale(d), vis = Math.abs(d) <= 3 && !(n % 2 === 0 && d === -n / 2 && Math.abs(d) > 3);
      c.style.width = size[i].w + 'px'; c.style.height = size[i].h + 'px';
      const x = cx[d] !== undefined ? cx[d] : 0;
      c.style.transform = `translate(calc(-50% + ${x}px), -50%) scale(${s})`;
      c.style.zIndex = String(10 - Math.abs(d));
      c.style.opacity = vis ? (d === 0 ? 1 : Math.abs(d) === 1 ? .9 : .6) : 0;
      c.style.setProperty('--dim', d === 0 ? 0 : Math.abs(d) === 1 ? .38 : .6);
      c.style.pointerEvents = vis ? 'auto' : 'none';
      c.tabIndex = vis ? 0 : -1;
      c.classList.toggle('is-active', d === 0);
      c.setAttribute('aria-label', (d === 0 ? 'Play ' : 'Show ') + c.dataset.title);
      if (d !== 0) stopPreview(c);
    });
    title.innerHTML = cards[a].dataset.title + '<small>' + cards[a].dataset.dur + '</small>';
  };

  const stopPreview = c => { const v = c.querySelector('video'); if (!c.classList.contains('is-playing')) return; c.classList.remove('is-playing'); v.pause(); };
  const startPreview = c => {
    const v = c.querySelector('video');
    if (!v.getAttribute('src')) v.src = c.dataset.src;
    v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); c.classList.add('is-playing');
  };

  const go = to => { a = ((to % n) + n) % n; layout(); };

  reel.querySelector('.vreel__nav--prev').addEventListener('click', () => go(a - 1));
  reel.querySelector('.vreel__nav--next').addEventListener('click', () => go(a + 1));
  cards.forEach((c, i) => {
    c.addEventListener('click', () => { if (dist(i) !== 0) { go(i); return; } openPlayer(c); });
    c.addEventListener('mouseenter', () => { if (c.classList.contains('is-active')) { clearTimeout(hoverT); hoverT = setTimeout(() => startPreview(c), 150); } });
    c.addEventListener('mouseleave', () => { clearTimeout(hoverT); stopPreview(c); });
  });
  addEventListener('keydown', e => {
    if (dlg && dlg.open) return;
    if (e.key === 'ArrowLeft') go(a - 1); else if (e.key === 'ArrowRight') go(a + 1);
  });

  // swipe
  let sx = null;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; });
  stage.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(a + (dx < 0 ? 1 : -1)); });

  const openPlayer = c => {
    if (!dlg || !dv) return;
    stopPreview(c); dv.src = c.dataset.src; dv.poster = c.querySelector('img').getAttribute('src');
    dlg.showModal(); const p = dv.play(); if (p && p.catch) p.catch(() => {});
  };
  if (dlg) {
    const close = () => { dv.pause(); dv.removeAttribute('src'); dv.load(); if (dlg.open) dlg.close(); };
    dlg.querySelector('.vdlg__x').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => { dv.pause(); });
  }

  layout();
  addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);
})();
