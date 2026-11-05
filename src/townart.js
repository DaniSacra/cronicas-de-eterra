// ===== Arte da vila (16 bits, vista 3/4): chão, árvores, enfeites e prédios =====
// Tudo gerado por código e desenhado uma vez só, numa camada em cache (drawTownLayer em town.js).
// Luz de cima à esquerda; sombras para baixo e para a direita; contorno escuro, nunca preto puro.
const TownArt = (() => {
  // ---------- Ruído determinístico (a vila é sempre a mesma) ----------
  const hash = (x, y, s = 0) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const smooth = t => t * t * (3 - 2 * t);
  const noise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const P = cols => cols.map(rgb);
  const canvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };

  // Desenha um sprite escrito como texto: cada letra é uma cor da paleta, '.' é transparente
  function pix(c, x, y, rows, pal) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (col) { c.fillStyle = col; c.fillRect(x + i, y + j, 1, 1); } } });
  }
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

  // ---------- Chão (pixel a pixel, uma vez) ----------
  const GRASS = P(['#3a8c35', '#47a03c', '#55b345', '#63c04d']);
  const GR_DARK = rgb('#2f7a2e');
  const STONES = P(['#e2d6bc', '#d4c6a8', '#eae1cc', '#cbbd9c']);
  const ST_LIGHT = rgb('#f8f2e2'), ST_DARK = rgb('#ad9c7c'), MORTAR = rgb('#8c7654'), PATH_EDGE = rgb('#5e6a32');
  const DIRT = P(['#b08a58', '#9a7648', '#c49c68']);
  const WATER = P(['#2860c2', '#3274d6', '#4a8ce6', '#8ec8f4', '#dcf4ff']);
  const BANK = P(['#3e2a1a', '#6e4c2e', '#8a6440']);
  const ROCK = P(['#3c3630', '#6c6256', '#968a78', '#bcb09a']);
  const CLIFF_LIP = rgb('#24501f'), SHORE = rgb('#2a5a24');

  const tileAt = (A, x, y) => (x >= 0 && y >= 0 && x < A.W && y < A.H) ? A.g[y * A.W + x] : null;
  const pathLike = t => t === TILE.PATH || t === TILE.GATE || t === TILE.DOOR;

  // Distância (px) até a borda do tile que encosta num vizinho diferente (fora do mapa conta como igual)
  function edgeDist(A, x, y, lx, ly, same) {
    let d = 99;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const t = tileAt(A, x + dx, y + dy);
      if (t === null || same(t)) continue;
      const ex = dx < 0 ? lx : 15 - lx, ey = dy < 0 ? ly : 15 - ly;
      d = Math.min(d, dx && dy ? Math.max(ex, ey) : dx ? ex : ey);
    }
    return d;
  }

  // Seixos: pontos espalhados numa grade; o mais perto decide a pedra, a diferença das distâncias faz o rejunte
  function cobble(gx, gy, cell) {
    const ci = Math.floor(gx / cell), cj = Math.floor(gy / cell);
    let d1 = 1e9, d2 = 1e9, id = 0, bx = 0, by = 0;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      const px = i * cell + cell * (0.15 + 0.7 * hash(i, j, 11)), py = j * cell + cell * (0.15 + 0.7 * hash(i, j, 12));
      const dx = gx + 0.5 - px, dy = gy + 0.5 - py, d = Math.hypot(dx, dy * 1.15);
      if (d < d1) { d2 = d1; d1 = d; id = hash(i, j, 13); bx = dx; by = dy; } else if (d < d2) d2 = d;
    }
    return { gap: d2 - d1, id, dx: bx, dy: by };
  }

  function grassAt(gx, gy) {
    const n = noise(gx / 15, gy / 15, 1) * 0.75 + noise(gx / 4, gy / 4, 2) * 0.25;
    let b = n * 4 - 0.5; const f = b - Math.floor(b); b = Math.floor(b);
    if (f > 0.7 && ((gx + gy) & 1)) b++;
    b = Math.max(0, Math.min(3, b));
    const r = hash(gx, gy, 3);
    if (r < 0.06) return b > 0 ? GRASS[b - 1] : GR_DARK;
    if (r > 0.975) return GRASS[Math.min(3, b + 1)];
    return GRASS[b];
  }
  const dirtAt = (gx, gy) => { const r = hash(gx, gy, 4); return r < 0.1 ? DIRT[1] : r > 0.92 ? DIRT[2] : DIRT[0]; };

  function groundPixel(A, t, x, y, gx, gy, lx, ly, valmor) {
    if (t === TILE.WATER) {
      const north = tileAt(A, x, y - 1);
      if (north !== null && north !== TILE.WATER) { if (ly === 0) return BANK[0]; if (ly < 3) return BANK[ly]; if (ly === 3) return WATER[4]; }
      const d = edgeDist(A, x, y, lx, ly, u => u === TILE.WATER);
      if (d < 1) return WATER[4];
      if (d < 2 + (noise(gx / 3, gy / 3, 21) > 0.55 ? 1 : 0)) return WATER[3];
      if (d < 4) return WATER[2];
      const w = noise(gx / 7, gy / 2.5, 22);
      return w > 0.68 ? WATER[2] : w < 0.32 ? WATER[0] : WATER[1];
    }
    if (t === TILE.CLIFF) {
      // borda norte: barranco de pedra com grama em cima
      if (ly < 3) return grassAt(gx, gy);
      if (ly === 3 || ly === 15) return ly === 3 ? CLIFF_LIP : ROCK[0];
      const cb = cobble(gx, gy + 3, 7);
      if (cb.gap < 1.1) return ROCK[0];
      if (cb.gap < 2.2) return cb.dy > 0 ? ROCK[1] : ROCK[3];
      return ly < 6 ? ROCK[3] : ROCK[2];
    }
    if (pathLike(t)) {
      const d = edgeDist(A, x, y, lx, ly, pathLike);
      const bite = noise(gx / 3, gy / 3, 5) * 3.4;
      if (d < bite - 0.6) return grassAt(gx, gy);          // tufos de grama mordendo a borda
      if (d < bite + 0.4) return PATH_EDGE;
      const dirtZone = !valmor || (y === 10 && x >= 9 && x <= 11) || noise(gx / 11, gy / 11, 7) < 0.24;
      const cb = cobble(gx, gy, 7);
      if (dirtZone && cb.id > 0.3) return dirtAt(gx, gy);  // terra batida, com uma pedra aqui e ali
      if (cb.gap < 1.2) return dirtZone ? DIRT[1] : MORTAR;
      if (cb.gap < 2.3) return cb.dy > 0.3 ? ST_DARK : cb.dy < -0.3 ? ST_LIGHT : STONES[Math.floor(cb.id * 4)];
      return STONES[Math.floor(cb.id * 4)];
    }
    if ((lx === 15 && tileAt(A, x + 1, y) === TILE.WATER) || (lx === 0 && tileAt(A, x - 1, y) === TILE.WATER) || (ly === 0 && tileAt(A, x, y - 1) === TILE.WATER)) return SHORE;
    return grassAt(gx, gy);
  }

  // ---------- Copas, arbustos e pedras: bolhas sombreadas com contorno ----------
  // blobs: [cx, cy, r], de trás para a frente; pal: [contorno, escuro, médio, claro, brilho]
  const SPR = {};
  function blobSprite(key, w, h, blobs, pal, extra) {
    if (SPR[key]) return SPR[key];
    const cv = canvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h);
    const own = new Int8Array(w * h).fill(-1), cols = P(pal);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      for (let i = blobs.length - 1; i >= 0; i--) { const [cx, cy, r] = blobs[i]; if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) { own[y * w + x] = i; break; } }
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : own[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = own[y * w + x]; if (o < 0) continue;
      const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      let k;
      if (nb.includes(-1)) k = 0;
      else if (nb.some(n => n > o) && (at(x, y - 1) > o || at(x + 1, y) > o || at(x - 1, y) > o)) k = 1; // sombra sob o cacho da frente
      else {
        const [cx, cy, r] = blobs[o], lx = (x + 0.5 - cx) / r, ly = (y + 0.5 - cy) / r;
        const L = -(lx * 0.5 + ly * 0.85) * 0.65 - ((x - w / 2) / w * 0.5 + (y - h / 2) / h * 0.9) * 0.7;
        const dith = ((x + y) & 1) ? 0.06 : -0.06;
        k = L + dith > 0.5 ? 4 : L + dith > 0.12 ? 3 : L + dith > -0.32 ? 2 : 1;
      }
      const p = (y * w + x) * 4, col = cols[k];
      img.data[p] = col[0]; img.data[p + 1] = col[1]; img.data[p + 2] = col[2]; img.data[p + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    if (extra) extra(c);
    return (SPR[key] = cv);
  }

  const LEAF = ['#16341c', '#256a2a', '#3a8a34', '#5aaa44', '#9ad468'];
  const LEAF_Y = ['#1c3416', '#2e6a22', '#4a922e', '#6cb440', '#b4de6c'];
  const PINE = ['#10301e', '#1d5a38', '#2c7a46', '#469a56', '#80c070'];
  const fruit = spots => c => { for (const [x, y] of spots) { R(c, x, y, 2, 2, '#d8282a'); R(c, x, y, 1, 1, '#ff9a8a'); R(c, x + 1, y + 1, 1, 1, '#7a1010'); } };
  const TREES = {
    round: () => blobSprite('round', 22, 20, [[11, 6, 6], [6, 9, 5.5], [16, 9, 5.5], [8, 4.5, 4], [14.5, 4.5, 4], [5.5, 13.5, 5], [16.5, 13.5, 5], [11, 13, 6]], LEAF),
    fruit: () => blobSprite('fruit', 22, 20, [[11, 7, 6.5], [5.5, 10, 5], [16.5, 10, 5], [10, 4, 4.5], [6, 14, 4.5], [16, 14, 4.5], [11, 13.5, 5.5]], LEAF_Y,
      fruit([[6, 9], [15, 7], [11, 12], [9, 4], [17, 12], [4, 13]])),
    pine: () => blobSprite('pine', 22, 22, [[11, 3.5, 3.2], [11, 7, 4.6], [11, 11, 6], [11, 15.5, 7.2]], PINE),
  };
  const BUSHES = {
    bush: () => blobSprite('bush', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], ['#16341c', '#2a742c', '#43963a', '#66b84a', '#a8dc70']),
    berry: () => blobSprite('berry', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], ['#16341c', '#2a742c', '#43963a', '#66b84a', '#a8dc70'],
      fruit([[5, 6], [10, 4], [11, 8], [7, 9]])),
    grim: () => blobSprite('grim', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], ['#18241c', '#2a4430', '#3a5c40', '#50744e', '#6a8a60']),
    rock: () => blobSprite('rock', 16, 13, [[11.5, 6, 2.8], [6.5, 6.5, 3.6], [5, 9.5, 3.2], [10, 9.5, 3.6], [13, 10, 2.4]], ['#34343e', '#62646e', '#8a8c98', '#b0b2bc', '#d6d8e0'],
      c => { R(c, 4, 4, 2, 1, '#5a8a3a'); R(c, 5, 3, 2, 1, '#78a848'); }),
  };

  // Sombra oval em degraus, para baixo e para a direita
  function shadow(c, cx, cy, rx, ry, a = 0.3) {
    c.fillStyle = `rgba(14,36,14,${a})`;
    for (let yy = -ry; yy <= ry; yy++) { const half = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)); c.fillRect(cx - half, cy + yy, half * 2, 1); }
  }

  function drawTree(c, X, Y, kind) {
    const o = '#3a2414';
    R(c, X + 5, Y + 8, 6, 7, o); R(c, X + 6, Y + 8, 4, 6, '#6a4022'); R(c, X + 6, Y + 8, 1, 6, '#8e5a30'); R(c, X + 9, Y + 9, 1, 5, '#4e2e18');
    R(c, X + 3, Y + 14, 3, 1, o); R(c, X + 10, Y + 14, 3, 1, o); R(c, X + 4, Y + 13, 2, 1, '#6a4022'); R(c, X + 10, Y + 13, 2, 1, '#5a361c');
    const s = TREES[kind]();
    c.drawImage(s, X - 3, Y - (kind === 'pine' ? 11 : 8));
  }

  // ---------- Enfeites feitos à mão ----------
  const STUMP = { o: '#3a2414', T: '#e2c080', t: '#b88a50', b: '#7a4a24', B: '#a06632', d: '#55321a' };
  const STUMP_ROWS = [
    '...oooooo...',
    '.ooTTTTTToo.',
    'oTTttttttTTo',
    'oTtTTttTTtTo',
    'oTTtttttTTto',
    'obTTTTTTTTdo',
    'oBbbbdbbbbdo',
    'oBbdbbbbdbdo',
    'oBbbbbdbbddo',
    'ooBdooooodoo',
    'o.oo.....oo.',
  ];
  const MUSH = { o: '#4a1410', R: '#e03a30', r: '#a82418', w: '#fff4e8', h: '#ff8a70', s: '#f2e4c8', S: '#c8b490' };
  const MUSH_BIG = ['..ooooo..', '.oRhwRRo.', 'oRhRRRwRo', 'oRwRRRRro', 'orrRwRrro', '.ooooooo.', '..osSso..', '..osSso..', '..ooooo..'];
  const MUSH_SMALL = ['.ooo.', 'oRwRo', 'orRro', '.oso.', '.ooo.'];
  const WOOD = { o: '#3a2010', w: '#b07a3a', W: '#d4a056', d: '#7a4a20', b: '#a0602c', B: '#c8823e', i: '#5a5a66', I: '#9a9aa8', k: '#2a1a10' };
  const CRATE = ['ooooooooo', 'oWWWWWWWo', 'owdwwwdwo', 'owwdwdwwo', 'owwwdwwwo', 'owwdwdwwo', 'owdwwwdwo', 'odddddddo', 'ooooooooo'];
  const BARREL = ['.oooooo.', 'obBBBBbo', 'okkkkkko', 'oBbbbbdo', 'oIIIIIIo', 'oBbbbbdo', 'oBbbbbdo', 'oIIIIIIo', 'oBbbbbdo', '.oooooo.'];
  const WELL = { o: '#2a2a34', s: '#a8aec0', S: '#d0d6e2', d: '#6e7488', w: '#1a2a5a', W: '#4a6ab0', p: '#7a4620', P: '#a86c32', r: '#c0402c', R: '#ec6c4a', k: '#7a2418', y: '#d8c090', b: '#8a5428' };
  const WELL_ROWS = [
    '...oooooooooo...',
    '..okRRRRRRRRko..',
    '.okrRRrRRrRRrko.',
    'okrrrrrrrrrrrrko',
    'oooooooooooooooo',
    '..op....y...po..',
    '..oP....y...Po..',
    '..oP....y...Po..',
    '..oP...obo..Po..',
    '..oP...obo..Po..',
    '.ooPoooooooPPoo.',
    'oSSSSSSSSSSSSSSo',
    'oSdwwwwwwwwwwdSo',
    'oSdwWWwwwwWwwdSo',
    'oSSSSSSSSSSSSSSo',
    'osSsdsSsdsSsdsso',
    'osdssSdssSdsssdo',
    'osSsdsSsdsSsdsso',
    'oddddddddddddddo',
    '.oooooooooooooo.',
  ];
  const SCARE = { o: '#2a1a10', h: '#c8a050', H: '#ecd078', k: '#8a3a20', P: '#f08a20', p: '#c86414', q: '#9a4a10', e: '#3a1a08', c: '#7a4aa0', C: '#9a6ac0', x: '#e0c040', w: '#7a4a22', y: '#f0d870' };
  const SCARE_ROWS = [
    '.....oooooo.....',
    '....ohHHHHho....',
    '..oohhhhhhhhoo..',
    '.ohhhkkkkkkhhho.',
    '..oooPPPPPPooo..',
    '...oPPePPPePpo..',
    '...oPeePPeePpo..',
    '...oPPPPPPPPpo..',
    '...opPeeeeePqo..',
    '....oqqqqqqqo...',
    '.y..ooCCCcoo..y.',
    'yywwwCCxCccwwwyy',
    '.y.oooCCCccooo.y',
    '.....oCCxcco....',
    '.....oCCCcco....',
    '......oyoyo.....',
    '.......owo......',
    '.......owo......',
    '.......owo......',
    '.......owo......',
    '.......owo......',
    '......ooooo.....',
  ];

  function drawStump(c, X, Y) { shadow(c, X + 9, Y + 14, 7, 2); pix(c, X + 2, Y + 4, STUMP_ROWS, STUMP); }
  function drawMushrooms(c, X, Y) { shadow(c, X + 8, Y + 14, 6, 1); pix(c, X + 2, Y + 5, MUSH_BIG, MUSH); pix(c, X + 10, Y + 9, MUSH_SMALL, MUSH); pix(c, X + 11, Y + 3, MUSH_SMALL, MUSH); }
  function drawCrates(c, X, Y) {
    shadow(c, X + 9, Y + 14, 8, 2);
    pix(c, X + 1, Y + 6, CRATE, WOOD); pix(c, X + 3, Y - 1, CRATE, WOOD); pix(c, X + 9, Y + 5, BARREL, WOOD);
  }
  function drawBarrels(c, X, Y) {
    shadow(c, X + 9, Y + 14, 8, 2);
    pix(c, X + 1, Y + 1, BARREL, WOOD); pix(c, X + 7, Y + 5, BARREL, WOOD); pix(c, X + 1, Y + 7, CRATE, WOOD);
  }

  // ---------- Detalhes pequenos do chão (sem ocupar o tile) ----------
  const FLOWERS = ['#ff7aa8', '#ffd84a', '#f8f8f0', '#c890f0', '#ff7aa8', '#f8f8f0'];
  function flower(c, x, y, col) {
    R(c, x, y + 2, 1, 1, '#2a6a24');
    R(c, x, y - 1, 1, 1, col); R(c, x - 1, y, 1, 1, col); R(c, x + 1, y, 1, 1, col); R(c, x, y + 1, 1, 1, col);
    R(c, x, y, 1, 1, col === '#ffd84a' ? '#e8702a' : '#ffe680');
  }
  function tuft(c, x, y) {
    for (const [a, b] of [[1, 2], [2, 1], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [0, 3], [4, 3]]) R(c, x + a, y + b, 1, 1, '#2f7a2c');
    for (const [a, b] of [[2, 0], [0, 2], [4, 2]]) R(c, x + a, y + b, 1, 1, '#86d460');
  }
  function groundDetail(c, A, t, x, y, valmor) {
    const X = x * TS, Y = y * TS;
    if (t === TILE.WATER && hash(x, y, 30) < 0.3 && [[0, -1], [1, 0], [0, 1], [-1, 0]].every(([a, b]) => tileAt(A, x + a, y + b) === TILE.WATER)) {
      const px = X + 3 + Math.floor(hash(x, y, 31) * 6), py = Y + 4 + Math.floor(hash(x, y, 32) * 6);
      pix(c, px, py, ['.oooo.', 'oGGgGo', 'oGg.oo', '.oooo.'], { o: '#1e5a2a', G: '#4aa848', g: '#7ccc60' });
      if (hash(x, y, 33) < 0.5) pix(c, px + 4, py - 1, ['.p.', 'pPp'], { p: '#ff8ab0', P: '#fff0f4' });
      return;
    }
    if (t !== TILE.GRASS && t !== TILE.FLOWER) return;
    const n = Math.floor(hash(x, y, 31) * 3);
    for (let i = 0; i < n; i++) tuft(c, X + Math.floor(hash(x, y, 40 + i) * 11), Y + Math.floor(hash(x, y, 50 + i) * 11));
    if (hash(x, y, 33) < 0.12) { const px = X + 2 + Math.floor(hash(x, y, 34) * 11), py = Y + 3 + Math.floor(hash(x, y, 35) * 10); R(c, px, py, 3, 2, '#8a8c98'); R(c, px, py, 1, 1, '#d0d2dc'); R(c, px, py + 2, 3, 1, '#3e5a2a'); }
    if (!valmor) return;
    if (t === TILE.FLOWER) {
      const k = 4 + Math.floor(hash(x, y, 36) * 3);
      for (let i = 0; i < k; i++) flower(c, X + 2 + Math.floor(hash(x, y, 60 + i) * 12), Y + 2 + Math.floor(hash(x, y, 70 + i) * 11), FLOWERS[Math.floor(hash(x, y, 80 + i) * FLOWERS.length)]);
    } else if (hash(x, y, 37) < 0.22) flower(c, X + 3 + Math.floor(hash(x, y, 38) * 10), Y + 3 + Math.floor(hash(x, y, 39) * 10), FLOWERS[Math.floor(hash(x, y, 41) * FLOWERS.length)]);
    else if (hash(x, y, 42) < 0.05) pix(c, X + 4 + Math.floor(hash(x, y, 43) * 8), Y + 4 + Math.floor(hash(x, y, 44) * 8), MUSH_SMALL, MUSH);
  }

  // ---------- Prédios ----------
  const ROOFS = {
    red:   ['#4a1612', '#8e2a1c', '#c03e2a', '#e2603e', '#ff9a6a'],
    blue:  ['#1a1c48', '#2c4488', '#3c62b8', '#5a8ad8', '#a0c4f4'],
    green: ['#14341c', '#286a32', '#38893e', '#56aa4e', '#9ad478'],
    gold:  ['#4a2e0c', '#9c6614', '#cc9426', '#eebc3c', '#fff0a0'],
    slate: ['#1c1c26', '#383c50', '#50566c', '#6c748e', '#a6aec6'],
    teal:  ['#0e3036', '#1c6466', '#288682', '#42aaa0', '#90e0d0'],
    brown: ['#341c0e', '#663818', '#8c5226', '#b0703a', '#e0a868'],
    ruin:  ['#1a1620', '#2e2a3a', '#433e52', '#5a546a', '#7e7890'],
  };
  const STONE = ['#3a3e4c', '#5e6476', '#8e96aa', '#b4bccc'];
  const RUIN_STONE = ['#26222a', '#4a4650', '#66626a', '#86828a'];
  const OUT = '#2e1e16';

  // Telhado de telhas em fileiras: cumeeira escura em cima, cada telha com luz em cima e sombra embaixo
  function drawRoof(c, x0, x1, top, bot, pal, keep = () => true) {
    const [o, d, m, l, h] = pal, w = x1 - x0;
    for (let y = top; y < bot; y++) {
      const ry = y - top, ins = ry < 3 ? 3 - ry : 0, lo = x0 + ins, hi = x1 - ins;
      for (let x = lo; x < hi; x++) {
        if (!keep(x, y)) continue;
        const rx = x - x0;
        let col;
        if (x === lo || x === hi - 1 || ry === 0 || y === bot - 1) col = o;
        else if (ry < 4) col = ry === 1 ? l : ry === 2 ? (rx % 4 ? d : m) : o;
        else {
          const row = Math.floor((ry - 4) / 4), ty = (ry - 4) % 4, tx = (rx + (row % 2) * 3) % 6;
          if (ty === 3) col = d;
          else if (tx === 0) col = ty === 0 ? m : d;
          else col = ty === 0 ? h : ty === 1 ? l : (tx === 1 || tx === 5) ? d : m;   // telha com a ponta arredondada
          if (rx > w * 0.7) col = col === h ? l : col === l ? m : col;   // lado direito mais escuro
          if (x === lo + 1 || x === hi - 2) col = d;                      // beiral
        }
        R(c, x, y, 1, 1, col);
      }
    }
  }

  // Fileiras de pedra (base das casas, paredes de pedra, chaminés)
  function stones(c, x0, x1, y0, y1, pal, seed = 0) {
    const [o, d, m, l] = pal;
    R(c, x0, y0, x1 - x0, y1 - y0, d);
    for (let y = y0, row = 0; y < y1; y += 3, row++) {
      let x = x0 - (row % 2) * 3;
      while (x < x1) {
        const sw = 4 + Math.floor(hash(x, y, 90 + seed) * 3), a = Math.max(x, x0), b = Math.min(x + sw - 1, x1);
        if (b > a) { R(c, a, y, b - a, Math.min(2, y1 - y), m); R(c, a, y, Math.min(2, b - a), 1, l); R(c, a, y + 1, b - a, 1, hash(x, y, 91 + seed) < 0.25 ? d : m); }
        x += sw;
      }
    }
  }

  function windowAt(c, x, y, o = {}) {
    const glass = o.glow ? ['#fff0a0', '#f0b040', '#d07820'] : ['#a8d8f8', '#4a74b8', '#2c4a88'];
    pix(c, x, y, [
      'ooooooooo', 'oFFFFFFFo', 'oFgbFbbFo', 'oFbbFbBFo', 'oFFFFFFFo', 'oFbbFbBFo', 'oFbBFBBFo', 'oFFFFFFFo', 'ooooooooo',
    ], { o: OUT, F: '#a46c34', g: glass[0], b: glass[1], B: glass[2] });
    if (o.shutter) { R(c, x - 2, y, 2, 9, OUT); R(c, x + 9, y, 2, 9, OUT); R(c, x - 2, y + 1, 1, 7, o.shutter); R(c, x + 10, y + 1, 1, 7, o.shutter); R(c, x - 1, y + 1, 1, 7, shadeHex(o.shutter, 0.7)); R(c, x + 9, y + 1, 1, 7, shadeHex(o.shutter, 0.7)); }
    if (o.flowers) {
      R(c, x - 1, y + 8, 11, 3, OUT); R(c, x, y + 9, 9, 1, '#a0602c'); R(c, x, y + 8, 9, 1, '#3a8a34');
      for (let i = 0; i < 4; i++) { const col = ['#ff6a8a', '#ffd84a', '#ff6a8a', '#f8f8f0'][i]; R(c, x + 1 + i * 2, y + 7, 1, 1, col); }
    }
  }

  // Porta de madeira em arco com batente de pedra; x = canto esquerdo (12 px de largura)
  function door(c, x, y, h, dark) {
    for (let r = 0; r < h; r++) {
      const ins = r === 0 ? 3 : r === 1 ? 1 : 0;
      for (let i = ins; i < 12 - ins; i++) {
        let col;
        if (i === ins || i === 11 - ins || r === 0) col = OUT;
        else if (i === ins + 1 || i === 10 - ins || r === 1 || (r === 2 && (i < 3 || i > 8))) col = r < 3 || i < 6 ? '#d0d6e2' : '#a8aec0';
        else if (dark) col = r < 5 ? '#141018' : '#0c0a10';
        else { const k = (i - 2) % 3; col = k === 0 ? '#5e3418' : k === 1 ? '#b47038' : '#8e5428'; if (r === 4 || r === h - 3) col = '#3c3c48'; }
        R(c, x + i, y + r, 1, 1, col);
      }
    }
    if (!dark) R(c, x + 8, y + Math.floor(h / 2) + 1, 1, 1, '#f0c040');
    R(c, x + 1, y + h, 10, 1, '#b8bcc8'); R(c, x + 1, y + h + 1, 10, 1, '#6e7282');   // degrau
  }

  function chimney(c, x, top, glow) {
    R(c, x, top, 8, 13, OUT); stones(c, x + 1, x + 7, top + 3, top + 12, STONE, 5);
    R(c, x - 1, top, 10, 3, OUT); R(c, x, top + 1, 8, 1, '#b4bccc'); R(c, x + 2, top, 4, 1, glow ? '#ff9a30' : '#1a1418');
  }

  function dormer(c, x, y, pal) {
    // janelinha no telhado (sótão), com telhadinho próprio
    R(c, x, y + 4, 12, 9, OUT); R(c, x + 1, y + 5, 10, 7, '#f2e2bc');
    pix(c, x + 3, y + 6, ['oooooo', 'obbgbo', 'obbbbo', 'oooooo'], { o: OUT, b: '#4a74b8', g: '#a8d8f8' });
    drawRoof(c, x - 1, x + 13, y - 1, y + 6, pal);
  }

  function hangSign(c, x, y, icon) {
    R(c, x, y, 13, 1, '#3c3c48'); R(c, x + 2, y + 1, 1, 2, '#3c3c48'); R(c, x + 10, y + 1, 1, 2, '#3c3c48');
    R(c, x, y + 3, 13, 10, OUT); R(c, x + 1, y + 4, 11, 8, '#b07a3a'); R(c, x + 1, y + 4, 11, 1, '#d4a056'); R(c, x + 1, y + 11, 11, 1, '#7a4a20');
    pix(c, x + 3, y + 5, icon.rows, icon.pal);
  }
  const ICONS = {
    mug: { rows: ['.www..', 'wWWWw.', 'oyyyoo', 'oyYyo.o', 'oyYyoo', 'oyyyo.', '.ooo..'], pal: { w: '#ffffff', W: '#e8e8e0', o: '#4a2a10', y: '#f0b030', Y: '#ffe070' } },
    potion: { rows: ['..oo...', '..oo...', '.oRRo..', 'oRhRRo.', 'oRRRro.', '.oooo..'], pal: { o: '#2a1010', R: '#e03a40', r: '#901820', h: '#ffb0b0' } },
    anvil: { rows: ['ooooooo', 'oIIIIIo', '.oIiio.', '..oio..', '.ooooo.'], pal: { o: '#1a1a22', I: '#a0a8b8', i: '#5a6070' } },
  };

  const HOUSES = {
    tavern:  { roof: 'red', wallH: 22, beams: true, chimneys: [0.18, 0.82], dormers: [0.3, 0.7], glow: true, sign: 'mug', signCol: -1 },
    chapel:  { roof: 'blue', wallH: 22, white: true },
    elder:   { roof: 'green', wallH: 22, beams: true, chimneys: [0.8], dormers: [0.28, 0.6], shutter: '#c84a32', flowers: true },
    shop:    { roof: 'gold', wallH: 18, beams: true, awning: true, sign: 'potion', signCol: 1 },
    smith:   { roof: 'slate', wallH: 18, stoneWall: true, chimneys: [0.72], glow: true, chimGlow: true, sign: 'anvil', signCol: -1 },
    sara:    { roof: 'teal', wallH: 18, beams: true, chimneys: [0.25], shutter: '#2a7a8a', flowers: true },
    joaquim: { roof: 'brown', wallH: 18, beams: true, chimneys: [0.75], shutter: '#7a8a3a' },
  };

  function houseShadow(c, b) {
    const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS;
    c.fillStyle = 'rgba(14,36,14,.3)';
    c.fillRect(X + W + 2, Y + 2, 4, H + 1); c.fillRect(X + 3, Y + H, W + 3, 3);
  }

  function drawHouse(c, b) {
    if (b.id === 'crypt') return drawRuin(c, b);
    const s = HOUSES[b.id] || HOUSES.joaquim, pal = ROOFS[s.roof];
    const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS, dx = (b.door.x - b.x) * TS + X;
    const bot = Y + H - s.wallH, wy1 = Y + H, base = 6;
    // Paredes
    R(c, X + 1, bot, W - 2, wy1 - bot, OUT);
    if (s.stoneWall) stones(c, X + 2, X + W - 2, bot, wy1 - 1, STONE, b.x);
    else {
      const pl = s.white ? ['#f6f4ec', '#d6d2c6', '#e8e4d8'] : ['#f2e2bc', '#d2bc90', '#e4d0a6'];
      R(c, X + 2, bot, W - 4, wy1 - bot - 1, pl[0]);
      for (let i = 0; i < W * 0.6; i++) R(c, X + 3 + Math.floor(hash(b.x, i, 92) * (W - 6)), bot + 3 + Math.floor(hash(b.y, i, 93) * (s.wallH - 9)), 1, 1, pl[2]);
      stones(c, X + 2, X + W - 2, wy1 - base, wy1 - 1, STONE, b.y);
      R(c, X + 2, wy1 - base - 1, W - 4, 1, '#5e6476');
      if (s.beams) {
        const beam = (x) => { R(c, x, bot, 3, wy1 - base - bot, OUT); R(c, x + 1, bot, 1, wy1 - base - bot - 1, '#7a4620'); };
        beam(X + 2); beam(X + W - 5);
        for (let k = 1; k < b.w; k++) if (X + k * TS !== dx && X + k * TS !== dx + TS) beam(X + k * TS - 1);
        R(c, X + 2, bot + 2, W - 4, 2, OUT); R(c, X + 2, bot + 2, W - 4, 1, '#7a4620');
      }
    }
    R(c, X + 2, bot, W - 4, 2, 'rgba(40,20,10,.35)');           // sombra do beiral
    // Janelas em todas as colunas, menos a da porta
    for (let cx = 0; cx < b.w; cx++) {
      const tx = X + cx * TS; if (tx === dx) continue;
      if (s.sign && tx === dx + s.signCol * TS) { hangSign(c, tx + 1, bot + (s.wallH > 20 ? 5 : 3), ICONS[s.sign]); if (s.sign === 'mug') lantern(c, dx + 15, bot + 4); continue; }
      if (b.id === 'chapel') { stainedGlass(c, tx + 4, bot + 4); continue; }
      windowAt(c, tx + 4, bot + (s.wallH > 20 ? 6 : 4), { shutter: s.shutter, flowers: s.flowers, glow: s.glow });
    }
    if (s.awning) awning(c, X + 2, dx, bot + 2, dx);
    door(c, dx + 2, wy1 - (s.wallH > 20 ? 14 : 13), s.wallH > 20 ? 14 : 13);
    // Telhado, chaminés, sótão
    for (const f of s.chimneys || []) chimney(c, Math.round(X + W * f) - 4, Y - 12, s.chimGlow);
    drawRoof(c, X - 2, X + W + 2, Y - 6, bot + 1, pal);
    for (const f of s.chimneys || []) { const cx = Math.round(X + W * f) - 4; R(c, cx, Y - 6, 8, 5, OUT); stones(c, cx + 1, cx + 7, Y - 6, Y - 2, STONE, 6); }
    for (const f of s.dormers || []) dormer(c, Math.round(X + W * f) - 6, Y + 2, pal);
    if (b.id === 'chapel') chapelTower(c, X, Y, W, pal);
    if (b.id === 'chapel') rose(c, dx + 4, bot + 2);
  }

  function awning(c, x0, x1, y, dx) {
    for (let x = x0; x < x1; x++) {
      if (x >= dx && x < dx + TS) continue;
      const red = Math.floor((x - x0) / 3) % 2 === 0;
      R(c, x, y, 1, 4, red ? '#d83a3a' : '#f6f0e0'); R(c, x, y, 1, 1, red ? '#ff7a6a' : '#ffffff');
      R(c, x, y + 4, 1, (x - x0) % 3 === 1 ? 1 : 0, red ? '#a02020' : '#c8c0b0');
      R(c, x, y + 4 + ((x - x0) % 3 === 1 ? 1 : 0), 1, 1, 'rgba(40,20,10,.35)');
    }
  }
  function lantern(c, x, y) {
    R(c, x, y, 4, 1, '#3c3c48'); R(c, x + 3, y, 1, 3, '#3c3c48');
    pix(c, x + 1, y + 3, ['.oo.', 'oyYo', 'oYyo', '.oo.'], { o: '#2a2a34', y: '#ffd040', Y: '#fff4b0' });
  }
  function stainedGlass(c, x, y) {
    pix(c, x, y, [
      '..ooooo..', '.oRRbRRo.', 'oRbYYYbRo', 'obYbGbYbo', 'oYbRRRbYo', 'obYbGbYbo', 'oRbYYYbRo', 'obRbGbRbo', 'oRbRbRbRo', 'ooooooooo',
    ], { o: '#2a2a40', R: '#d8384a', b: '#3a5ac0', Y: '#f8d048', G: '#4ab060' });
  }
  function rose(c, x, y) {
    pix(c, x, y, ['.ooo.', 'oRYRo', 'oYbYo', 'oRYRo', '.ooo.'], { o: '#2a2a40', R: '#d8384a', Y: '#f8d048', b: '#3a5ac0' });
  }
  function chapelTower(c, X, Y, W, pal) {
    const tx = X + W / 2 - 7;
    R(c, tx, Y - 14, 14, 20, OUT); R(c, tx + 1, Y - 13, 12, 18, '#f6f4ec'); R(c, tx + 10, Y - 13, 3, 18, '#d6d2c6');
    // abertura do sino
    R(c, tx + 4, Y - 10, 6, 9, OUT); R(c, tx + 5, Y - 9, 4, 7, '#1a1830'); R(c, tx + 5, Y - 10, 4, 1, OUT);
    pix(c, tx + 5, Y - 8, ['.yy.', 'yYyy', 'yyyy', '.o..'], { y: '#e0a830', Y: '#fff0a0', o: '#6a4a14' });
    // agulha azul e cruz dourada
    for (let r = 0; r < 10; r++) { const half = Math.round(1 + r * 0.75); R(c, tx + 7 - half - 1, Y - 24 + r, half * 2 + 2, 1, pal[0]); R(c, tx + 7 - half, Y - 24 + r, half * 2, 1, r % 3 === 0 ? pal[4] : r % 3 === 1 ? pal[3] : pal[2]); R(c, tx + 7, Y - 24 + r, half, 1, r % 3 === 2 ? pal[1] : pal[2]); }
    R(c, tx - 1, Y - 15, 16, 2, pal[0]);
    R(c, tx + 5, Y - 33, 4, 10, '#6a4a14'); R(c, tx + 2, Y - 30, 10, 4, '#6a4a14');
    R(c, tx + 6, Y - 32, 2, 8, '#ffd23f'); R(c, tx + 3, Y - 29, 8, 2, '#ffd23f'); R(c, tx + 6, Y - 32, 1, 1, '#fff8c0');
  }

  // A igreja velha: pedra escura com musgo, torre do sino à esquerda, metade do telhado caída
  // com as vigas à mostra, hera, janela quebrada, porta escura da cripta e pedras caídas.
  function drawRuin(c, b) {
    const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS, dx = (b.door.x - b.x) * TS + X;
    const bot = Y + 20, wy1 = Y + H, pal = ROOFS.ruin;
    // fundo escuro do salão sem telhado
    R(c, X + 1, Y - 2, W - 2, bot - Y + 4, OUT); R(c, X + 2, Y - 1, W - 4, bot - Y + 2, '#1a1620');
    // paredes de pedra rachada
    R(c, X + 1, bot, W - 2, wy1 - bot, OUT);
    stones(c, X + 2, X + W - 2, bot + 1, wy1 - 1, RUIN_STONE, 7);
    // musgo sobre as pedras
    for (let i = 0; i < 26; i++) { const mx = X + 3 + Math.floor(hash(i, 1, 94) * (W - 7)), my = bot + 2 + Math.floor(hash(i, 2, 94) * (H - 24)); R(c, mx, my, 2, 1, i % 3 ? '#4a6a3a' : '#6a8a4a'); }
    // empena da parede direita, quebrada
    R(c, X + W - 6, bot - 9, 5, 10, OUT); stones(c, X + W - 5, X + W - 2, bot - 8, bot, RUIN_STONE, 8);
    // telhado: só a metade esquerda ficou (corte em diagonal)
    const cut = (x, y) => x < X + W * 0.52 + (y - Y) * 0.35 - hash(x, y, 95) * 3;
    drawRoof(c, X - 2, X + W + 2, Y - 6, bot + 1, pal, cut);
    // vigas à mostra e telhas soltas
    c.fillStyle = OUT;
    for (const [x0, y0, x1, y1] of [[0.6, -2, 0.98, 18], [0.78, -4, 0.98, 8], [0.62, 6, 0.95, 19]]) {
      const ax = X + W * x0, bx = X + W * x1, n = Math.max(Math.abs(bx - ax), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) { const px = Math.round(ax + (bx - ax) * i / n), py = Math.round(Y + y0 + (y1 - y0) * i / n); R(c, px, py, 2, 2, OUT); R(c, px, py, 1, 1, '#7a5230'); }
    }
    R(c, X + W * 0.6 + 1, Y + 2, 2, bot - Y - 2, OUT); R(c, X + W * 0.6 + 1, Y + 2, 1, bot - Y - 3, '#6a4a2a');
    for (const [tx, ty] of [[0.7, 12], [0.84, 3], [0.9, 14]]) { R(c, X + W * tx, Y + ty, 4, 3, pal[0]); R(c, X + W * tx + 1, Y + ty, 2, 1, pal[3]); R(c, X + W * tx + 1, Y + ty + 1, 2, 1, pal[2]); }
    // torre do sino
    const tx = X + 1;
    R(c, tx, Y - 20, 14, 40, OUT); stones(c, tx + 1, tx + 13, Y - 19, Y + 19, RUIN_STONE, 9);
    R(c, tx + 10, Y - 19, 3, 38, 'rgba(10,8,16,.35)');
    // ameias quebradas
    for (const [ax, h] of [[0, 4], [5, 2], [10, 5]]) { R(c, tx + ax, Y - 20 - h, 4, h + 1, OUT); R(c, tx + ax + 1, Y - 19 - h, 2, h, RUIN_STONE[2]); R(c, tx + ax + 1, Y - 19 - h, 2, 1, RUIN_STONE[3]); }
    R(c, tx + 3, Y - 15, 8, 11, OUT); R(c, tx + 4, Y - 14, 6, 9, '#0c0a10'); R(c, tx + 4, Y - 15, 6, 1, OUT);
    pix(c, tx + 4, Y - 13, ['..o...', '.yyyy.', 'yYyyyy', 'yyyyyo', 'oyyyyo', '..o...'], { y: '#b8862a', Y: '#e8c060', o: '#5a3a10' });
    // janela quebrada e rachaduras
    pix(c, X + W - 16, bot + 4, ['.ooooo.', 'okkgkko', 'okgkkko', 'okkkkgo', 'okgkkko', 'okkkkko', 'ooooooo'], { o: OUT, k: '#0c0a10', g: '#8aa0c0' });
    c.fillStyle = '#16121a';
    for (const [x, y] of [[-10, 3], [-11, 4], [-11, 5], [-12, 6], [-12, 7], [-11, 8], [-10, 9], [-10, 10], [-9, 11]]) c.fillRect(X + W + x, bot + y + 10, 1, 1);
    // porta da cripta, escura
    door(c, dx + 2, wy1 - 15, 15, true);
    // hera subindo pela torre e pela parede
    const ivy = (x, y, n, seed) => { for (let i = 0; i < n; i++) { const ix = x + Math.round(Math.sin(i * 1.3 + seed) * 2), iy = y - i * 2; R(c, ix, iy, 3, 2, '#244a24'); R(c, ix, iy, 2, 1, hash(i, seed, 96) < 0.5 ? '#4a8a3a' : '#6aaa48'); } };
    ivy(tx + 2, Y + 30, 14, 1); ivy(tx + 11, Y + 26, 8, 2); ivy(X + W - 5, wy1 - 3, 9, 3); ivy(dx - 1, wy1 - 3, 5, 4);
    // pedras caídas
    for (const [rx, ry, rw] of [[W - 9, H - 3, 5], [W - 4, H - 2, 3], [16, H - 2, 3], [W * 0.75, H - 26, 4]]) { R(c, X + rx, Y + ry, rw, 3, OUT); R(c, X + rx + 1, Y + ry, rw - 2, 2, RUIN_STONE[2]); R(c, X + rx + 1, Y + ry, 1, 1, RUIN_STONE[3]); }
  }

  // ---------- Objetos por tile ----------
  const BORDER = (A, x, y) => x === 0 || y <= 2 || x === A.W - 1 || y === A.H - 1;
  // Enfeites fixos da vila, só sobre tiles que já são obstáculo
  const SPOTS = { '24,9': 'well', '28,4': 'crates', '19,15': 'barrels', '8,8': 'scarecrow' };

  function treeKind(A, x, y) {
    const r = hash(x, y, 20);
    if (BORDER(A, x, y)) return r < 0.3 ? 'pine' : 'round';
    return r < 0.3 ? 'fruit' : r < 0.55 ? 'pine' : 'round';
  }
  function objShadow(c, A, t, x, y, valmor) {
    const X = x * TS, Y = y * TS, spot = valmor && SPOTS[`${x},${y}`];
    if (spot === 'scarecrow') return shadow(c, X + 9, Y + 15, 5, 1);
    if (spot === 'well') return shadow(c, X + 10, Y + 15, 9, 2);
    if (t === TILE.TREE) shadow(c, X + 10, Y + 14, 8, 2, 0.32);
    else if (t === TILE.BUSH && !spot) shadow(c, X + 9, Y + 13, 7, 2);
  }
  function drawObject(c, A, t, x, y, valmor) {
    const X = x * TS, Y = y * TS;
    if (t >= TILE.GATE) return drawGraveTile(c, t, X, Y, x, y, (px, py, col) => R(c, px, py, 1, 1, col), () => 0.5);
    const spot = valmor && SPOTS[`${x},${y}`];
    if (spot === 'well') return pix(c, X, Y - 4, WELL_ROWS, WELL);
    if (spot === 'crates') return drawCrates(c, X, Y);
    if (spot === 'barrels') return drawBarrels(c, X, Y);
    if (spot === 'scarecrow') return pix(c, X, Y - 7, SCARE_ROWS, SCARE);
    if (t === TILE.TREE) return drawTree(c, X, Y, treeKind(A, x, y));
    if (t === TILE.BUSH) {
      if (!valmor) return c.drawImage(BUSHES.grim(), X, Y + 2);
      const r = hash(x, y, 21);
      if (r < 0.45) return c.drawImage((hash(x, y, 22) < 0.5 ? BUSHES.berry : BUSHES.bush)(), X, Y + 2);
      if (r < 0.62) return drawStump(c, X, Y);
      if (r < 0.8) return drawMushrooms(c, X, Y);
      return c.drawImage(BUSHES.rock(), X, Y + 2);
    }
  }

  // Mata fechada para além da borda do mapa (padrão 32x32 que se repete sem emenda)
  function forestTile() {
    const cv = canvas(32, 32), c = cv.getContext('2d');
    R(c, 0, 0, 32, 32, '#2a6a2a');
    const trees = [[0, 0, 'round'], [16, 8, 'pine'], [0, 16, 'round'], [16, 24, 'round'], [8, 12, 'round'], [24, 28, 'pine']].sort((a, b) => a[1] - b[1]);
    for (const oy of [-32, 0, 32]) for (const [x, y, k] of trees) for (const ox of [-32, 0, 32]) {
      const s = TREES[k](); c.drawImage(s, x + ox - 3, y + oy - 8);
    }
    R(c, 0, 0, 32, 32, 'rgba(0,0,0,.45)');
    return cv;
  }

  // ---------- Camada completa de uma área ----------
  function layer(A) {
    const W = A.W * TS, H = A.H * TS, cv = canvas(W, H), c = cv.getContext('2d');
    const valmor = A === AREAS.valmor;
    const img = c.createImageData(W, H), data = img.data;
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
      const t = A.g[y * A.W + x];
      if (isInterior(t)) continue;
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) {
        const gx = x * TS + lx, gy = y * TS + ly, col = groundPixel(A, t, x, y, gx, gy, lx, ly, valmor), p = (gy * W + gx) * 4;
        data[p] = col[0]; data[p + 1] = col[1]; data[p + 2] = col[2]; data[p + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    // Interiores (taverna): o desenho de sempre
    const rng = mulberry32(77);
    const speckle = (X, Y, cols, n) => { for (let i = 0; i < n; i++) R(c, X + Math.floor(rng() * TS), Y + Math.floor(rng() * TS), 1, 1, cols[i % cols.length]); };
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) { const t = A.g[y * A.W + x]; if (isInterior(t)) drawInteriorTile(c, t, x * TS, y * TS, x, y, speckle); }
    // Detalhes do chão e sombras
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) groundDetail(c, A, A.g[y * A.W + x], x, y, valmor);
    for (const b of A.buildings) houseShadow(c, b);
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) objShadow(c, A, A.g[y * A.W + x], x, y, valmor);
    // Objetos de trás para a frente; cada prédio entra depois da sua última fileira
    for (let y = 0; y < A.H; y++) {
      for (let x = 0; x < A.W; x++) drawObject(c, A, A.g[y * A.W + x], x, y, valmor);
      for (const b of A.buildings) if (b.y + b.h - 1 === y) drawHouse(c, b);
    }
    if (A.outside === TILE.TREE) A.edgeTile = forestTile();
    return cv;
  }

  return { layer, hash };
})();
