// ===== Fundo da tela de título: Eterra à noite =====
// Céu em faixas, estrelas piscando, lua, nuvens, três cordilheiras em paralaxe e um castelo com janelas acesas
// num morro, com a estrada descendo até a beira da tela. Tudo gerado por código, em pixel art.

const TitleBG = (() => {
  let cache = null; // camadas pré-desenhadas para o tamanho atual da tela

  // Números pseudoaleatórios com semente (o mesmo céu em toda partida)
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // Cordilheira: linha de cumes somando senoides, desenhada numa faixa que se repete na horizontal
  function ridge(w, h, base, amp, seed, top, bottom, snow) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), r = rng(seed);
    const f = [r() * 6, r() * 6, r() * 6], k = [2, 5, 11].map(n => (n * Math.PI * 2) / w);
    for (let x = 0; x < w; x++) {
      const y = Math.round(base - amp * (0.55 * Math.sin(x * k[0] + f[0]) + 0.3 * Math.sin(x * k[1] + f[1]) + 0.15 * Math.sin(x * k[2] + f[2])));
      for (let yy = y; yy < h; yy++) {
        const t = (yy - y) / (h - y + 1);
        c.fillStyle = t < 0.5 ? top : bottom; c.fillRect(x, yy, 1, 1);
      }
      if (snow && y < base - amp * 0.45) { c.fillStyle = snow; c.fillRect(x, y, 1, 2); }
    }
    return cv;
  }

  function build(W, H) {
    const r = rng(7);
    const stars = Array.from({ length: Math.round(W * H / 260) }, () => ({ x: r() * W, y: r() * H * 0.62, b: r(), p: r() * 6 }));
    const clouds = Array.from({ length: 5 }, (_, i) => ({ x: r() * W * 2, y: H * (0.12 + r() * 0.3), w: 30 + r() * 50, s: 0.004 + r() * 0.006 }));
    const layers = [
      { cv: ridge(W * 2, H, H * 0.62, H * 0.16, 11, '#2a2a5a', '#22224a', '#8a8ab8'), speed: 0.002 },
      { cv: ridge(W * 2, H, H * 0.72, H * 0.12, 23, '#1c1c3e', '#161632', null), speed: 0.005 },
      { cv: ridge(W * 2, H, H * 0.84, H * 0.07, 41, '#101026', '#0c0c1c', null), speed: 0.01 },
    ];
    return { W, H, stars, clouds, layers };
  }

  // Castelo de Eterra no morro (silhueta original: torre central alta, duas torres laterais, muralha com ameias)
  function castle(c, cx, gy, s, now) {
    const ink = '#07071a';
    c.fillStyle = ink;
    // morro
    for (let x = -60 * s; x <= 60 * s; x++) { const h = Math.round(18 * s * Math.cos((x / (60 * s)) * Math.PI / 2)); c.fillRect(cx + x, gy - h, 1, h + 40); }
    const top = gy - 18 * s;
    const rect = (x, y, w, h) => c.fillRect(Math.round(cx + x * s), Math.round(top - y * s), Math.round(w * s), Math.round(h * s));
    rect(-26, 14, 52, 14);                       // muralha
    for (let i = -26; i < 26; i += 6) rect(i, 17, 3, 3); // ameias
    rect(-30, 30, 10, 30); rect(20, 30, 10, 30);  // torres laterais
    rect(-7, 46, 14, 46);                         // torre central
    for (const [x, y] of [[-30, 33], [20, 33], [-7, 49]]) for (let i = 0; i < 3; i++) rect(x + i * (x === -7 ? 5 : 4), y, 2, 3);
    // pontas das torres
    for (const [x, w, y] of [[-30, 10, 30], [20, 10, 30], [-7, 14, 46]])
      for (let i = 0; i < 6; i++) rect(x + i * w / 12, y + i * 2 + 2, w - i * w / 6, 2);
    // janelas acesas, piscando devagar
    const win = (x, y, k) => { c.fillStyle = Math.sin(now / 700 + k) > -0.6 ? '#ffd23f' : '#a0601a'; rect(x, y, 2, 3); };
    win(-27, 22, 1); win(23, 22, 2); win(-2, 36, 3); win(2, 28, 4); win(-16, 8, 5); win(12, 8, 6); win(-1, 18, 7);
    // estandarte no alto da torre central
    c.fillStyle = '#c8a040'; rect(0, 64, 1, 8); c.fillStyle = '#e8e0c0';
    const wave = Math.round(Math.sin(now / 300) * 1);
    rect(1, 63 + wave * 0.5, 5, 3);
  }

  function draw(c, now) {
    const W = VW, H = VH;
    if (!cache || cache.W !== W || cache.H !== H) cache = build(W, H);
    // céu em faixas duras (sem degradê suave, como nos consoles)
    const bands = ['#0a0a24', '#101030', '#16163c', '#1e1a48', '#2a1e52', '#3a2458', '#4c2a5a', '#6a3458'];
    bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.floor(H * 0.7 * i / bands.length), W, Math.ceil(H * 0.7 / bands.length) + 1); });
    c.fillStyle = bands[bands.length - 1]; c.fillRect(0, Math.floor(H * 0.7), W, H);
    // estrelas
    for (const s of cache.stars) {
      const tw = Math.sin(now / 500 + s.p * 10);
      if (tw < -0.85) continue;
      c.fillStyle = s.b > 0.85 ? '#ffffff' : s.b > 0.5 ? '#c8c8f0' : '#7878b0';
      c.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      if (s.b > 0.95 && tw > 0.6) { c.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 1); c.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3); }
    }
    // estrela cadente de tempos em tempos
    const sc = (now % 9000) / 9000;
    if (sc < 0.08) {
      const k = sc / 0.08, x0 = W * 0.75 - k * W * 0.35, y0 = H * 0.08 + k * H * 0.18;
      for (let i = 0; i < 10; i++) { c.fillStyle = i < 2 ? '#ffffff' : '#9090d0'; c.fillRect(Math.round(x0 + i * 2), Math.round(y0 - i), 1, 1); }
    }
    // lua
    const mx = Math.round(W * 0.2), my = Math.round(H * 0.2), mr = Math.max(8, Math.round(H * 0.06));
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d = x * x + y * y;
      if (d > mr * mr) continue;
      c.fillStyle = d > (mr - 1) * (mr - 1) ? '#c8c0a0' : (x + y) % 7 === 0 && d < mr * mr * 0.5 ? '#d8d0b0' : '#f4ecd0';
      c.fillRect(mx + x, my + y, 1, 1);
    }
    // nuvens finas passando pela lua
    for (const cl of cache.clouds) {
      const x = ((cl.x + now * cl.s) % (W * 2)) - W * 0.5;
      c.fillStyle = 'rgba(120,100,160,.35)'; c.fillRect(Math.round(x), Math.round(cl.y), Math.round(cl.w), 2);
      c.fillRect(Math.round(x + cl.w * 0.2), Math.round(cl.y) - 2, Math.round(cl.w * 0.5), 2);
    }
    // cordilheiras em paralaxe
    cache.layers.forEach((l, i) => {
      const off = Math.round((now * l.speed) % (W * 2));
      c.drawImage(l.cv, -off, 0); c.drawImage(l.cv, W * 2 - off, 0);
      if (i === 1) castle(c, Math.round(W * 0.72), Math.round(H * 0.8), Math.max(1, Math.round(Math.min(W, H) / 210)), now);
    });
    // estrada clara serpenteando até o castelo
    c.fillStyle = '#2a2440';
    for (let y = Math.round(H * 0.84); y < H; y++) {
      const k = (y - H * 0.84) / (H * 0.16);
      const x = W * 0.72 + Math.sin(k * 3) * W * 0.08 - k * W * 0.25, w = 2 + k * 14;
      c.fillRect(Math.round(x - w / 2), y, Math.round(w), 1);
    }
  }
  return { draw };
})();
