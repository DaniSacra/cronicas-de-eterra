// ===== Tela cheia: resolução lógica acompanha a janela, escala inteira em pixels do aparelho =====
(() => {
  const screenEl = document.getElementById('screen');
  function fit() {
    const r = screenEl.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const bw = r.width * dpr, bh = r.height * dpr;
    const s = Math.max(1, Math.floor(Math.min(bw / 288, bh / 180)));
    let w = Math.min(512, Math.max(288, Math.ceil(bw / s))), h = Math.min(900, Math.max(180, Math.ceil(bh / s)));
    w += w & 1; h += h & 1;
    resizeView(w, h);
    view.style.width = (w * s / dpr) + 'px'; view.style.height = (h * s / dpr) + 'px';
  }
  new ResizeObserver(fit).observe(screenEl);
  window.addEventListener('resize', fit);
  fit();
  window.addEventListener('keydown', e => {
    if ((e.key === 'f' || e.key === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey) {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });
})();
