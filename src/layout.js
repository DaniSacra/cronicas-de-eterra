// ===== Tela cheia: resolução lógica acompanha a janela, escala inteira em pixels do aparelho =====
(() => {
  const screenEl = document.getElementById('screen');
  // Small town areas (fog or a cozy interior) fill the view with a little zoom; battle and the rest use the normal scale
  // Walking in town on a portrait phone, the view is narrower (TOWN_MIN_W) so the party is not tiny
  let key = '', plain = false; // plain: the normal scale right now (the battle copies the scene before its mode is set)
  const inTown = () => !plain && typeof G !== 'undefined' && G.mode === 'town' && !!TOWN.A;
  const roomFor = () => (inTown() && (TOWN.A.cozy || TOWN.A.vision) ? G.area : '');
  const keyFor = () => (inTown() ? 'town:' + roomFor() : '');
  function fit() {
    const r = screenEl.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const bw = r.width * dpr, bh = r.height * dpr, room = roomFor();
    key = keyFor();
    const { w, h, s } = viewFit(bw, bh, { minW: inTown() ? TOWN_MIN_W : 0, room: room ? { w: TOWN.A.W * TS, h: TOWN.A.H * TS } : null });
    resizeView(w, h);
    const cw = w * s / dpr, ch = h * s / dpr;
    view.style.width = cw + 'px'; view.style.height = ch + 'px';
    // HUD layer sits exactly on the canvas (the canvas is centered in #screen)
    Object.assign(document.getElementById('hud').style, { width: cw + 'px', height: ch + 'px', left: (r.width - cw) / 2 + 'px', top: (r.height - ch) / 2 + 'px' });
    // One crisp type scale (src/uirules.js): sizes whose device pixels are multiples of 8
    const fs = fontScale(window.innerWidth, window.innerHeight, dpr), root = document.documentElement.style;
    root.setProperty('--f1', fs.f1 + 'px'); root.setProperty('--f2', fs.f2 + 'px'); root.setProperty('--fd', fs.fd + 'px');
  }
  window.Layout = { check() { if (keyFor() !== key) fit(); }, normal() { plain = true; if (key) fit(); plain = false; } };
  new ResizeObserver(fit).observe(screenEl);
  window.addEventListener('resize', fit);
  fit();
  window.addEventListener('keydown', e => {
    if ((e.key === 'f' || e.key === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey) {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });
})();
