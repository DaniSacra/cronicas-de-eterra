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

  // ---------- Inverno: o mesmo desenho com outras cores (docs/arte/estilo.md, família neve) ----------
  const SNOW = { hi: '#ffffff', lt: '#e8eff8', md: '#cbd8ec', sh: '#a4b8da', dk: '#7488b8', ou: '#4a5a8c' };
  const SNOWG = P([SNOW.md, SNOW.lt, SNOW.hi]);
  const ICE = P([SNOW.hi, SNOW.lt, SNOW.md, SNOW.sh, SNOW.dk]);
  const DEEP = P(['#2c3c80', '#3a78c8', '#1c2860']);
  const W_EDGE = rgb(SNOW.sh), W_MORTAR = rgb(SNOW.md), W_LIP = rgb(SNOW.dk);
  const LEAF_W = ['#14402a', '#2a5440', '#3a9a6a', '#4ad08a', '#90e0b0'];
  const PINE_W = ['#103630', '#15433c', '#205e54', '#3a9a6a', '#7ac09a'];
  let snow = false;            // ligado por layer(A) enquanto desenha uma área de inverno
  let LIGHTS = [], SMOKE = [], EMIT = []; // poças de luz, chaminés e o que emite luz (redesenhado por cima da poça)
  const emit = (x, y, rows, pal) => EMIT.push({ x, y, rows, pal });
  const wpal = (pal, swap) => snow ? Object.assign({}, pal, swap) : pal;   // o mesmo enfeite com neve em cima
  const shade = a => snow ? `rgba(44,60,128,${a})` : `rgba(14,36,14,${a})`;

  const tileAt = (A, x, y) => (x >= 0 && y >= 0 && x < A.W && y < A.H) ? A.g[y * A.W + x] : null;
  const pathLike = t => t === TILE.PATH || t === TILE.GATE || t === TILE.DOOR;
  const wet = t => t === TILE.WATER || t === TILE.FORD; // a ford is the same river, shallow enough to wade

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

  // Neve: quase toda clara, montes com sombra azul suave e um brilho aqui e ali
  function snowAt(gx, gy) {
    const n = noise(gx / 15, gy / 15, 1) * 0.75 + noise(gx / 4, gy / 4, 2) * 0.25, odd = (gx + gy) & 1;
    if (hash(gx, gy, 3) > 0.985) return SNOWG[2];
    if (n < 0.33 || (n < 0.39 && odd)) return SNOWG[0];
    return n > 0.74 && odd ? SNOWG[2] : SNOWG[1];
  }
  function grassAt(gx, gy) {
    if (snow) return snowAt(gx, gy);
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
    if (t >= TILE.ICE) return fieldGround(A, t, x, y, gx, gy, lx, ly);
    if (wet(t) && snow && !A.river) {
      // lago congelando: gelo claro nas bordas, água funda e escura no meio
      const d = edgeDist(A, x, y, lx, ly, wet), rim = 3 + noise(gx / 5, gy / 5, 23) * 5;
      if (d < 1) return ICE[3];
      if (d < rim) { const k = noise(gx / 2.5, gy / 2.5, 24); return hash(gx, gy, 25) < 0.025 ? ICE[4] : k > 0.62 ? ICE[0] : k < 0.3 ? ICE[2] : ICE[1]; }
      if (d < rim + 1) return ICE[3];
      const w = noise(gx / 7, gy / 2.5, 22);
      return w > 0.7 ? DEEP[1] : w < 0.3 ? DEEP[2] : DEEP[0];
    }
    if (wet(t)) {
      const north = tileAt(A, x, y - 1);
      if (north !== null && !wet(north)) { if (ly === 0) return BANK[0]; if (ly < 3) return BANK[ly]; if (ly === 3) return WATER[4]; }
      const d = edgeDist(A, x, y, lx, ly, wet);
      if (d < 1) return WATER[4];
      if (d < 2 + (noise(gx / 3, gy / 3, 21) > 0.55 ? 1 : 0)) return WATER[3];
      if (d < 4) return WATER[2];
      const w = noise(gx / 7, gy / 2.5, 22);
      return w > 0.68 ? WATER[2] : w < 0.32 ? WATER[0] : WATER[1];
    }
    if (t === TILE.CLIFF) {
      // borda norte: barranco de pedra com grama em cima
      if (ly < 3) return grassAt(gx, gy);
      if (ly === 3 || ly === 15) return ly === 3 ? (snow ? W_LIP : CLIFF_LIP) : ROCK[0];
      const cb = cobble(gx, gy + 3, 7);
      if (cb.gap < 1.1) return ROCK[0];
      if (cb.gap < 2.2) return cb.dy > 0 ? ROCK[1] : ROCK[3];
      return ly < 6 ? ROCK[3] : ROCK[2];
    }
    if (pathLike(t)) {
      const d = edgeDist(A, x, y, lx, ly, pathLike);
      const bite = noise(gx / 3, gy / 3, 5) * 3.4;
      if (d < bite - 0.6) return grassAt(gx, gy);          // tufos de grama mordendo a borda
      if (d < bite + 0.4) return snow ? W_EDGE : PATH_EDGE;
      const dirtZone = !valmor || (y === 10 && x >= 9 && x <= 11) || noise(gx / 11, gy / 11, 7) < 0.24;
      const cb = cobble(gx, gy, 7);
      if (dirtZone && cb.id > 0.3) return dirtAt(gx, gy);  // terra batida, com uma pedra aqui e ali
      if (cb.gap < 1.2) return dirtZone ? DIRT[1] : snow ? W_MORTAR : MORTAR;   // no inverno, neve entre as pedras
      if (cb.gap < 2.3) return cb.dy > 0.3 ? ST_DARK : cb.dy < -0.3 ? ST_LIGHT : STONES[Math.floor(cb.id * 4)];
      return STONES[Math.floor(cb.id * 4)];
    }
    if ((lx === 15 && wet(tileAt(A, x + 1, y))) || (lx === 0 && wet(tileAt(A, x - 1, y))) || (ly === 0 && wet(tileAt(A, x, y - 1)))) return snow ? W_EDGE : SHORE;
    return grassAt(gx, gy);
  }

  // ---------- Copas, arbustos e pedras: bolhas sombreadas com contorno ----------
  // blobs: [cx, cy, r], de trás para a frente; pal: [contorno, escuro, médio, claro, brilho]
  const SPR = {};
  // No inverno cada cacho ganha um gorro de neve no alto (luz do alto à esquerda: brilho à esquerda, sombra à direita)
  function blobSprite(key, w, h, blobs, pal, extra) {
    key += snow ? ':w' : '';
    if (SPR[key]) return SPR[key];
    const cv = canvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h);
    const own = new Int8Array(w * h).fill(-1), cols = P([...pal, SNOW.dk, SNOW.md, SNOW.lt, SNOW.hi]);
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
      if (snow) {
        const [cx, cy, r] = blobs[o], sx = (x + 0.5 - cx) / r, sy = (y + 0.5 - cy) / r, edge = -0.4 + (hash(x, o, 97) - 0.5) * 0.3;
        if (sy < edge) k = k === 0 ? 5 : sy < edge - 0.3 && sx < 0.1 ? 8 : sx > 0.35 ? 6 : 7;
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
    round: () => blobSprite('round', 22, 20, [[11, 6, 6], [6, 9, 5.5], [16, 9, 5.5], [8, 4.5, 4], [14.5, 4.5, 4], [5.5, 13.5, 5], [16.5, 13.5, 5], [11, 13, 6]], snow ? LEAF_W : LEAF),
    fruit: () => blobSprite('fruit', 22, 20, [[11, 7, 6.5], [5.5, 10, 5], [16.5, 10, 5], [10, 4, 4.5], [6, 14, 4.5], [16, 14, 4.5], [11, 13.5, 5.5]], snow ? LEAF_W : LEAF_Y,
      snow ? null : fruit([[6, 9], [15, 7], [11, 12], [9, 4], [17, 12], [4, 13]])),
    pine: () => blobSprite('pine', 22, 22, [[11, 3.5, 3.2], [11, 7, 4.6], [11, 11, 6], [11, 15.5, 7.2]], snow ? PINE_W : PINE),
  };
  const BUSHES = {
    bush: () => blobSprite('bush', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], snow ? PINE_W : ['#16341c', '#2a742c', '#43963a', '#66b84a', '#a8dc70']),
    berry: () => blobSprite('berry', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], snow ? PINE_W : ['#16341c', '#2a742c', '#43963a', '#66b84a', '#a8dc70'],
      fruit([[5, 6], [10, 4], [11, 8], [7, 9]])),
    grim: () => blobSprite('grim', 16, 13, [[8, 5, 4.5], [4.5, 7.5, 4], [11.5, 7.5, 4], [8, 9, 4.5]], ['#18241c', '#2a4430', '#3a5c40', '#50744e', '#6a8a60']),
    rock: () => blobSprite('rock', 16, 13, [[11.5, 6, 2.8], [6.5, 6.5, 3.6], [5, 9.5, 3.2], [10, 9.5, 3.6], [13, 10, 2.4]], ['#34343e', '#62646e', '#8a8c98', '#b0b2bc', '#d6d8e0'],
      c => { R(c, 4, 4, 2, 1, '#5a8a3a'); R(c, 5, 3, 2, 1, '#78a848'); }),
  };

  // Sombra oval em degraus, para baixo e para a direita
  function shadow(c, cx, cy, rx, ry, a = 0.3) {
    c.fillStyle = shade(a);
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

  // Lampião de rua: poste de ferro, vidro aceso, gorro de neve no inverno (cores da paleta mestre)
  const LAMP_ROWS = [
    '...ooo...', '..oSSSo..', '.oSSSSSo.', 'ooIIIIIoo', '.oyYYYyo.', '.oYWWWYo.', '.oYWWWYo.', '.oyYWYyo.', '.oyyyyyo.', 'ooIIIIIoo',
    '...oio...', '...oIo...', '...oIo...', '...oIo...', '...oIo...', '...oIo...', '...oIo...', '...oIo...', '...oIo...',
    '..ooIoo..', '..oiIIo..', '.ooooooo.',
  ];
  function drawLamp(c, X, Y) {
    const pal = { o: '#26202e', I: '#55555e', i: '#7a7a82', S: snow ? SNOW.lt : '#55555e', y: '#e8b840', Y: '#f0d860', W: '#fff6c0' };
    pix(c, X + 3, Y - 6, LAMP_ROWS, pal); emit(X + 3, Y - 6, LAMP_ROWS.slice(0, 10), pal); // the head shines over its own pool
    LIGHTS.push({ x: X + 8, y: Y + 6, r: 30 });
  }
  // Inverno: capim seco furando a neve e pedrinhas com neve em cima
  function stalks(c, x, y) {
    for (const [a, h] of [[0, 2], [1, 3], [3, 2]]) { R(c, x + a, y + 3 - h, 1, h, '#c89c38'); R(c, x + a, y + 3 - h, 1, 1, '#f0d860'); }
    R(c, x - 1, y + 3, 6, 1, SNOW.md);
  }

  function drawStump(c, X, Y) { shadow(c, X + 9, Y + 14, 7, 2); pix(c, X + 2, Y + 4, STUMP_ROWS, wpal(STUMP, { T: SNOW.hi, t: SNOW.lt })); }
  function drawMushrooms(c, X, Y) { shadow(c, X + 8, Y + 14, 6, 1); pix(c, X + 2, Y + 5, MUSH_BIG, MUSH); pix(c, X + 10, Y + 9, MUSH_SMALL, MUSH); pix(c, X + 11, Y + 3, MUSH_SMALL, MUSH); }
  function drawCrates(c, X, Y) {
    shadow(c, X + 9, Y + 14, 8, 2);
    const w = wpal(WOOD, { W: SNOW.lt });
    pix(c, X + 1, Y + 6, CRATE, w); pix(c, X + 3, Y - 1, CRATE, w); pix(c, X + 9, Y + 5, BARREL, w);
  }
  function drawBarrels(c, X, Y) {
    shadow(c, X + 9, Y + 14, 8, 2);
    const w = wpal(WOOD, { W: SNOW.lt });
    pix(c, X + 1, Y + 1, BARREL, w); pix(c, X + 7, Y + 5, BARREL, w); pix(c, X + 1, Y + 7, CRATE, w);
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
    if (t === TILE.FORD) {   // flat stones just under the water mark the shallow crossing
      for (const [sx, sy] of [[2, 3], [9, 2], [5, 9], [11, 10]]) { R(c, x * TS + sx, y * TS + sy + 1, 4, 2, '#1c2860'); R(c, x * TS + sx, y * TS + sy, 4, 2, '#7a7a82'); R(c, x * TS + sx, y * TS + sy, 2, 1, '#a2a2ac'); }
      return;
    }
    const X = x * TS, Y = y * TS;
    if (t === TILE.WATER && !snow && hash(x, y, 30) < 0.3 && [[0, -1], [1, 0], [0, 1], [-1, 0]].every(([a, b]) => tileAt(A, x + a, y + b) === TILE.WATER)) {
      const px = X + 3 + Math.floor(hash(x, y, 31) * 6), py = Y + 4 + Math.floor(hash(x, y, 32) * 6);
      pix(c, px, py, ['.oooo.', 'oGGgGo', 'oGg.oo', '.oooo.'], { o: '#1e5a2a', G: '#4aa848', g: '#7ccc60' });
      if (hash(x, y, 33) < 0.5) pix(c, px + 4, py - 1, ['.p.', 'pPp'], { p: '#ff8ab0', P: '#fff0f4' });
      return;
    }
    if (t !== TILE.GRASS && t !== TILE.FLOWER) return;
    if (snow) {
      const k = t === TILE.FLOWER ? 3 : hash(x, y, 31) < 0.3 ? 1 : 0;
      for (let i = 0; i < k; i++) stalks(c, X + 1 + Math.floor(hash(x, y, 40 + i) * 11), Y + 1 + Math.floor(hash(x, y, 50 + i) * 11));
      if (hash(x, y, 33) < 0.1) { const px = X + 2 + Math.floor(hash(x, y, 34) * 11), py = Y + 3 + Math.floor(hash(x, y, 35) * 10); R(c, px, py, 3, 2, '#7a7a82'); R(c, px, py, 3, 1, SNOW.lt); R(c, px, py + 2, 3, 1, SNOW.sh); }
      return;
    }
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
        if (snow) {
          // manto de neve sobre as telhas, borda de baixo ondulada; as últimas fileiras ficam à mostra
          const e = Math.round((bot - top) * 0.55) - Math.floor(noise(x / 3, top, 98) * 3);
          if (ry < e && col !== o) col = ry === e - 1 ? SNOW.sh : rx > w * 0.7 ? SNOW.md : ry === 1 || (ry < 4 && hash(x, y, 99) < 0.3) ? SNOW.hi : SNOW.lt;
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
    const glow = o.glow || snow;   // no inverno toda casa tem gente dentro, perto do fogo
    if (glow) LIGHTS.push({ x: x + 4, y: y + 12, r: 13 });
    const glass = glow ? ['#fff0a0', '#f0b040', '#d07820'] : ['#a8d8f8', '#4a74b8', '#2c4a88'];
    const rows = ['ooooooooo', 'oFFFFFFFo', 'oFgbFbbFo', 'oFbbFbBFo', 'oFFFFFFFo', 'oFbbFbBFo', 'oFbBFBBFo', 'oFFFFFFFo', 'ooooooooo'];
    const wpal = { o: OUT, F: '#a46c34', g: glass[0], b: glass[1], B: glass[2] };
    pix(c, x, y, rows, wpal); if (glow) emit(x, y, rows, wpal);
    if (o.shutter) { R(c, x - 2, y, 2, 9, OUT); R(c, x + 9, y, 2, 9, OUT); R(c, x - 2, y + 1, 1, 7, o.shutter); R(c, x + 10, y + 1, 1, 7, o.shutter); R(c, x - 1, y + 1, 1, 7, shadeHex(o.shutter, 0.7)); R(c, x + 9, y + 1, 1, 7, shadeHex(o.shutter, 0.7)); }
    if (o.flowers && snow) { R(c, x - 1, y + 8, 11, 3, OUT); R(c, x, y + 9, 9, 1, '#a0602c'); R(c, x, y + 8, 9, 1, SNOW.lt); }
    else if (snow) R(c, x + 1, y + 8, 7, 1, SNOW.lt);
    else if (o.flowers) {
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
    if (snow) { R(c, x - 1, top - 1, 3, 1, SNOW.lt); R(c, x + 6, top - 1, 3, 1, SNOW.md); R(c, x, top + 1, 8, 1, SNOW.lt); }
    SMOKE.push({ x: x + 4, y: top - 1, seed: SMOKE.length });
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
    shoe: { rows: ['o....o', 'Io..oI', 'Io..oI', 'Io..oI', 'IIooII', '.IIII.'], pal: { o: '#26202e', I: '#b0bcc4' } },
    book: { rows: ['.RRRRR.', 'RrYYYRw', 'RrRRRRw', 'RrYYRRw', 'RrRRRRw', '.qqqqqq'], pal: { R: '#a8323e', r: '#7a1a24', Y: '#f0d860', w: '#ffffff', q: '#4a0c14' } },
    anvil: { rows: ['ooooooo', 'oIIIIIo', '.oIiio.', '..oio..', '.ooooo.'], pal: { o: '#1a1a22', I: '#a0a8b8', i: '#5a6070' } },
  };

  const HOUSES = {
    tavern:  { roof: 'red', wallH: 22, beams: true, chimneys: [0.18, 0.82], dormers: [0.3, 0.7], glow: true, sign: 'mug', signCol: -1 },
    chapel:  { roof: 'blue', wallH: 22, white: true },
    elder:   { roof: 'green', wallH: 22, beams: true, chimneys: [0.8], dormers: [0.28, 0.6], shutter: '#c84a32', flowers: true },
    shop:    { roof: 'gold', wallH: 18, beams: true, awning: true, sign: 'potion', signCol: 1 },
    smith:   { roof: 'slate', wallH: 18, stoneWall: true, chimneys: [0.72], glow: true, chimGlow: true, sign: 'anvil', signCol: -1 },
    sara:    { roof: 'teal', wallH: 18, beams: true, chimneys: [0.25], shutter: '#2a7a8a', flowers: true },
    school:  { roof: 'blue', wallH: 18, beams: true, chimneys: [0.82], shutter: '#c8a040', sign: 'book', signCol: -1 },
    joaquim: { roof: 'brown', wallH: 18, beams: true, chimneys: [0.75], shutter: '#7a8a3a' },
    // Capítulo 1: the inn of the ford and Gervásio's stable
    inn:     { roof: 'teal', wallH: 22, beams: true, chimneys: [0.8], dormers: [0.35], glow: true, sign: 'mug', signCol: -1 },
    stable:  { roof: 'red', wallH: 18, beams: true, shutter: '#7a4620', sign: 'shoe', signCol: 1 },
  };

  function houseShadow(c, b) {
    const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS;
    c.fillStyle = shade(0.3);
    c.fillRect(X + W + 2, Y + 2, 4, H + 1); c.fillRect(X + 3, Y + H, W + 3, 3);
  }

  function drawHouse(c, b) {
    if (b.id === 'crypt') return drawRuin(c, b);
    const s = HOUSES[b.style || b.id] || HOUSES.joaquim, pal = ROOFS[s.roof];
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
    if (snow) icicles(c, X - 1, X + W + 1, bot + 1);
    for (const f of s.chimneys || []) { const cx = Math.round(X + W * f) - 4; R(c, cx, Y - 6, 8, 5, OUT); stones(c, cx + 1, cx + 7, Y - 6, Y - 2, STONE, 6); }
    for (const f of s.dormers || []) dormer(c, Math.round(X + W * f) - 6, Y + 2, pal);
    if (b.id === 'chapel') chapelTower(c, X, Y, W, pal);
    if (b.id === 'chapel') rose(c, dx + 4, bot + 2);
  }

  function icicles(c, x0, x1, y) {
    for (let x = x0; x < x1; x++) { const r = hash(x, y, 99); if (r < 0.18) { R(c, x, y, 1, 1 + Math.floor(r * 17), SNOW.md); R(c, x, y, 1, 1, SNOW.lt); } }
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
    const lrows = ['.oo.', 'oyYo', 'oYyo', '.oo.'], lpal = { o: '#2a2a34', y: '#ffd040', Y: '#fff4b0' };
    pix(c, x + 1, y + 3, lrows, lpal); emit(x + 1, y + 3, lrows, lpal);
    LIGHTS.push({ x: x + 2, y: y + 10, r: 22 });
  }
  function stainedGlass(c, x, y) {
    if (snow) LIGHTS.push({ x: x + 4, y: y + 12, r: 12 });
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
    if (A.trees) return A.trees;   // the southern road and the pasture: only pines
    if (BORDER(A, x, y)) return r < 0.3 ? 'pine' : 'round';
    return r < 0.3 ? 'fruit' : r < 0.55 ? 'pine' : 'round';
  }
  const lampAt = (A, x, y) => !!A.lamps && A.lamps.some(([a, b]) => a === x && b === y);
  function objShadow(c, A, t, x, y, valmor) {
    const X = x * TS, Y = y * TS, spot = valmor && SPOTS[`${x},${y}`];
    if (lampAt(A, x, y)) return shadow(c, X + 9, Y + 15, 4, 1);
    if (spot === 'scarecrow') return shadow(c, X + 9, Y + 15, 5, 1);
    if (spot === 'well') return shadow(c, X + 10, Y + 15, 9, 2);
    if (t === TILE.TREE) shadow(c, X + 10, Y + 14, 8, 2, 0.32);
    else if (t === TILE.BUSH && !spot) shadow(c, X + 9, Y + 13, 7, 2);
  }
  function drawObject(c, A, t, x, y, valmor) {
    const X = x * TS, Y = y * TS;
    if (t >= TILE.GATE && t <= TILE.DEADTREE) return drawGraveTile(c, t, X, Y, x, y, (px, py, col) => R(c, px, py, 1, 1, col), () => 0.5);
    const spot = valmor && SPOTS[`${x},${y}`];
    if (lampAt(A, x, y)) return drawLamp(c, X, Y);
    if (t === TILE.FIRE) {   // campfire: a ring of stones and charred logs; the flame is animated over it, the light pools from here
      for (const [sx, sy] of [[1, 8], [3, 12], [11, 12], [13, 8], [7, 13]]) { R(c, X + sx, Y + sy, 3, 2, '#26202e'); R(c, X + sx, Y + sy, 2, 1, '#7a7a82'); }
      R(c, X + 3, Y + 10, 10, 2, '#4e2c14'); R(c, X + 4, Y + 10, 8, 1, '#6a3a1a');
      LIGHTS.push({ x: X + 8, y: Y + 10, r: 56 });
      return;
    }
    if (spot === 'well') return pix(c, X, Y - 4, WELL_ROWS, wpal(WELL, { R: SNOW.lt }));
    if (spot === 'crates') return drawCrates(c, X, Y);
    if (spot === 'barrels') return drawBarrels(c, X, Y);
    if (spot === 'scarecrow') return pix(c, X, Y - 7, SCARE_ROWS, wpal(SCARE, { H: SNOW.lt }));
    if (t === TILE.TREE) return drawTree(c, X, Y, treeKind(A, x, y));
    if (t === TILE.BUSH) {
      if (!valmor) return c.drawImage(BUSHES.grim(), X, Y + 2);
      const r = hash(x, y, 21);
      if (r < 0.45) return c.drawImage((hash(x, y, 22) < 0.5 ? BUSHES.berry : BUSHES.bush)(), X, Y + 2);
      if (r < 0.62) return drawStump(c, X, Y);
      if (r < 0.8) return snow ? drawStump(c, X, Y) : drawMushrooms(c, X, Y);   // cogumelo não nasce na neve
      return c.drawImage(BUSHES.rock(), X, Y + 2);
    }
  }


  // ---------- Interior da taverna: a mesma régua da vila (contorno, luz do alto à esquerda, paleta mestre) ----------
  const IN = {
    out: '#24180c', deep: '#140c06',
    plank: P(['#9a6232', '#a07048', '#a8704a', '#9a6232']), plankHi: rgb('#b07c58'), seam: rgb('#6a3a1a'), knot: rgb('#7a4a24'),
    plaster: '#d8a478', plaster2: '#c89464', beam: '#4e2c14', beamHi: '#7a4a24', wains: '#6a3a1a', wainsDk: '#4e2c14', rail: '#8a5418', railHi: '#c89c38',
    cap: '#3a2010', capHi: '#6a3a1a',
    stone: ['#26262e', '#55555e', '#7a7a82', '#a2a2ac', '#b0bcc4'],
    top: '#a87040', topHi: '#c89464', front: '#7a4a24', frontDk: '#6a3a1a', leg: '#4e2c14',
    rug: '#a8323e', rugDk: '#7a1a24', rugGold: '#e8b840', rugFringe: '#f4cca0',
  };
  const BARREL_IN = ['..oooooooo..', '.oBBBBBBBBo.', 'oBkkkkkkkkbo', 'oBbbbbbbbbdo', 'oIIIIIIIIIIo', 'oBbbbbbbbbdo', 'oBbbbbbbbbdo',
    'oBbbbbbbbbdo', 'oIIIIIIIIIIo', 'oBbbbbbbbbdo', '.oBbbbbbbdo.', '..oooooooo..'];
  const BARREL_PAL = { o: IN.out, B: '#b07c58', b: '#9a6232', d: '#6a3a1a', k: '#4e2c14', I: '#7a7a82' };
  const MUG = ['.ww.', 'oyyo', 'oyYoo', 'oyyo', '.oo.'], MUG_PAL = { w: '#ffffff', o: IN.out, y: '#c89c38', Y: '#e8b840' };
  const CANDLE = ['.f.', '.F.', 'oWo', 'oWo', 'ooo'], CANDLE_PAL = { f: '#f0d860', F: '#fff6c0', W: '#e8f0e8', o: IN.out };
  const BOTTLES = [['#3a9a6a', '#2a5440'], ['#a050c0', '#72308e'], ['#3a78c8', '#2c3c80'], ['#a8323e', '#7a1a24']];
  const HORSESHOE = ['o...o', 'Io.oI', 'Io.oI', 'IIoII', '.III.'], SHOE_PAL = { o: IN.out, I: '#b0bcc4' };

  function plankPixel(gx, gy) {
    const row = Math.floor(gy / 5), ly = gy % 5;   // tábuas de 4 px e uma fresta
    if (ly === 4) return IN.seam;
    const off = Math.floor(hash(row, 0, 120) * 24), seg = Math.floor((gx + off) / 22);
    if ((gx + off) % 22 === 0) return IN.seam;                       // emenda das tábuas, desencontrada a cada fileira
    if (ly === 0 && hash(seg, row, 121) < 0.3) return IN.plankHi;     // a luz pega a borda de cima
    if (hash(gx >> 1, row, 122) < 0.012) return IN.knot;              // nó da madeira
    return IN.plank[Math.floor(hash(seg, row, 123) * IN.plank.length)];
  }
  const inT = (A, x, y, t) => tileAt(A, x, y) === t;

  function backWall(c, A) {
    const W = A.W * TS;
    R(c, 0, 0, W, 2, IN.beam); R(c, 0, 2, W, 1, IN.beamHi);                 // viga do teto
    R(c, 0, 3, W, 8, IN.plaster);
    for (let x = 0; x < W; x++) for (let y = 3; y < 11; y++) if (hash(x, y, 124) < 0.12) R(c, x, y, 1, 1, IN.plaster2);
    R(c, 0, 11, W, 1, IN.railHi); R(c, 0, 12, W, 1, IN.rail);                // corrimão e lambri
    R(c, 0, 13, W, 3, IN.wains); for (let x = 2; x < W; x += 4) R(c, x, 13, 1, 3, IN.wainsDk);
    for (const px of [16 * 5 - 2, 16 * 9 - 2]) { R(c, px, 0, 4, 16, IN.beam); R(c, px, 0, 1, 16, IN.beamHi); }   // pilares
    // Janela: noite de neve lá fora
    const wx = 16 * 6 + 2, wy = 3;
    pix(c, wx, wy, ['oooooooooooo', 'oFFFFFFFFFFo', 'oFnnNnFnnnFo', 'oFnsnnFnNnFo', 'oFFFFFFFFFFo', 'oFnnnsFnnsFo', 'oFSSSSFSSSFo', 'oFFFFFFFFFFo', 'oooooooooooo'],
      { o: IN.out, F: IN.wains, n: '#1c2860', N: '#2c3c80', s: '#ffffff', S: '#e8eff8' });
    pix(c, 16 * 7 + 10, 4, HORSESHOE, SHOE_PAL);   // a ferradura da Poney Saltitante, para dar sorte
    // Prateleira atrás do balcão, com garrafas
    const sx = 16 * 9 + 4, sw = 16 * 4 - 8;
    R(c, sx, 9, sw, 2, IN.front); R(c, sx, 9, sw, 1, IN.topHi); R(c, sx, 11, sw, 1, IN.out);
    for (let i = 0; i * 5 < sw - 4; i++) {
      const [lt, dk] = BOTTLES[Math.floor(hash(i, 1, 125) * BOTTLES.length)], bx = sx + 2 + i * 5, h = 4 + Math.floor(hash(i, 2, 125) * 2);
      R(c, bx, 9 - h, 3, h, dk); R(c, bx, 9 - h, 1, h, lt); R(c, bx + 1, 9 - h - 2, 1, 2, dk);
    }
  }
  // Paredes do lado e da frente: vistas de cima, como o topo de um muro cortado
  function wallCap(c, A, x, y) {
    const X = x * TS, Y = y * TS;
    R(c, X, Y, TS, TS, IN.cap);
    for (let i = 0; i < 6; i++) R(c, X + Math.floor(hash(x, y, 126 + i) * 15), Y + Math.floor(hash(x, y, 136 + i) * 15), 1, 1, IN.out);
    if (x === 0) { R(c, X + 13, Y, 2, TS, IN.capHi); R(c, X + 15, Y, 1, TS, IN.out); }
    if (x === A.W - 1) { R(c, X, Y, 1, TS, IN.out); R(c, X + 1, Y, 2, TS, IN.capHi); }
    if (y === A.H - 1) { R(c, X, Y, TS, 1, IN.out); R(c, X, Y + 1, TS, 2, IN.capHi); }
  }
  function hearth(c, x0, y0, w) {
    const X = x0 * TS - 2, Y = y0 * TS, W = w * TS + 4, [o, d, m, l, h] = IN.stone;
    LIGHTS.push({ x: X + W / 2, y: Y + 22, r: 46 });
    R(c, X + 4, Y - 16, W - 8, 16, o); stones(c, X + 5, X + W - 5, Y - 15, Y, [o, d, m, l], 3);          // chaminé na parede
    R(c, X, Y - 1, W, 17, o); stones(c, X + 1, X + W - 1, Y, Y + 15, [o, d, m, l], 4);
    R(c, X - 1, Y - 2, W + 2, 3, IN.out); R(c, X, Y - 2, W, 2, IN.front); R(c, X, Y - 2, W, 1, IN.topHi);  // consolo de madeira
    for (const cx of [X + 6, X + W - 9]) { pix(c, cx, Y - 7, CANDLE, CANDLE_PAL); emit(cx, Y - 7, CANDLE, CANDLE_PAL); }
    R(c, X + 5, Y + 4, W - 10, 12, o); R(c, X + 6, Y + 5, W - 12, 11, IN.deep);                           // boca do fogo
    R(c, X + 6, Y + 5, W - 12, 1, h);
    R(c, X - 2, Y + 15, W + 4, 2, d); R(c, X - 2, Y + 15, W + 4, 1, l);                                   // pedra do chão
  }
  function counterTile(c, A, x, y) {
    const X = x * TS, Y = y * TS, C = TILE.COUNTER, up = inT(A, x, y - 1, C), dn = inT(A, x, y + 1, C), lf = inT(A, x - 1, y, C), rt = inT(A, x + 1, y, C);
    const top0 = up ? Y : Y + 2, top1 = dn ? Y + TS : Y + 10;
    shadow(c, X + 8, Y + 16, 9, 2, 0.3);
    R(c, X, top0, TS, top1 - top0, IN.top);
    if (!up) { R(c, X, top0 - 1, TS, 1, IN.out); R(c, X, top0, TS, 1, IN.topHi); }
    if (!lf) { R(c, X, top0, 1, top1 - top0 + (dn ? 0 : 6), IN.out); R(c, X + 1, top0, 1, top1 - top0, IN.topHi); }
    if (!rt) { R(c, X + 15, top0, 1, top1 - top0 + (dn ? 0 : 6), IN.out); R(c, X + 13, top0, 2, top1 - top0, IN.front); }
    if (!dn) {
      R(c, X + (lf ? 0 : 1), Y + 10, TS - (lf ? 0 : 1) - (rt ? 0 : 1), 5, IN.front);
      for (let i = X + 3; i < X + TS - 1; i += 5) R(c, i, Y + 11, 1, 4, IN.frontDk);
      R(c, X, Y + 15, TS, 1, IN.out);
    }
    if (hash(x, y, 127) < 0.55) pix(c, X + 3 + Math.floor(hash(x, y, 128) * 8), (up ? Y + 4 : Y + 1), MUG, MUG_PAL);
    if (!dn && !lf) { pix(c, X + 9, Y - 2, CANDLE, CANDLE_PAL); emit(X + 9, Y - 2, CANDLE, CANDLE_PAL); LIGHTS.push({ x: X + 10, y: Y + 6, r: 22 }); }   // lamparina na ponta do balcão
  }
  function tableAt(c, x, y) {   // mesa comprida de dois tiles, com velas, canecas e pão
    const X = x * TS + 1, Y = y * TS, W = 30;
    shadow(c, X + 15, Y + 15, 15, 2, 0.32);
    R(c, X + 2, Y + 11, 2, 4, IN.leg); R(c, X + W - 4, Y + 11, 2, 4, IN.leg);
    R(c, X, Y + 2, W, 10, IN.out); R(c, X + 1, Y + 3, W - 2, 6, IN.top); R(c, X + 1, Y + 3, W - 2, 1, IN.topHi);
    R(c, X + 1, Y + 9, W - 2, 2, IN.front);
    for (let i = X + 6; i < X + W - 2; i += 8) R(c, i, Y + 4, 1, 5, IN.front);   // tábuas do tampo
    pix(c, X + 3, Y, MUG, MUG_PAL); pix(c, X + 22, Y + 1, MUG, MUG_PAL);
    pix(c, X + 9, Y + 4, ['.ooo.', 'oBbbo', '.ooo.'], { o: IN.out, B: '#d8a478', b: '#9a6232' });   // pão
    pix(c, X + 15, Y - 1, CANDLE, CANDLE_PAL); emit(X + 15, Y - 1, CANDLE, CANDLE_PAL); LIGHTS.push({ x: X + 16, y: Y + 8, r: 20 });
  }
  function rug(c, x0, y0, x1, y1) {
    R(c, x0, y0, x1 - x0, y1 - y0, IN.rugGold); R(c, x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, IN.rug);
    for (let y = y0 + 4; y < y1 - 4; y++) for (let x = x0 + 4; x < x1 - 4; x++) if (((x - x0) + (y - y0)) % 8 === 0 || ((x - x0) - (y - y0) + 800) % 8 === 0) R(c, x, y, 1, 1, IN.rugDk);
    for (let x = x0; x < x1; x += 2) { R(c, x, y0 - 1, 1, 1, IN.rugFringe); R(c, x, y1, 1, 1, IN.rugFringe); }
  }
  function drawInterior(c, A) {
    rug(c, 16 * 5 + 4, 16 * 4 + 6, 16 * 9 + 12, 16 * 7 + 12);
    backWall(c, A);
    for (let x = 1; x < A.W - 1; x++) if (!inT(A, x, 1, TILE.WALL)) R(c, x * TS, 16, TS, 1, 'rgba(20,12,6,.45)');   // sombra da parede no chão
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) if (inT(A, x, y, TILE.WALL) && (y > 0 || x === 0 || x === A.W - 1)) wallCap(c, A, x, y);
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
      const t = tileAt(A, x, y);
      if (t === TILE.HEARTH && !inT(A, x - 1, y, TILE.HEARTH)) { let w = 1; while (inT(A, x + w, y, TILE.HEARTH)) w++; hearth(c, x, y, w); }
      else if (t === TILE.COUNTER) counterTile(c, A, x, y);
      else if (t === TILE.TABLE && inT(A, x + 1, y, TILE.TABLE) && !inT(A, x - 1, y, TILE.TABLE)) tableAt(c, x, y);
      else if (t === TILE.BARREL) { shadow(c, X(x) + 8, y * TS + 15, 7, 2); pix(c, X(x) + 2, y * TS + 2, BARREL_IN, BARREL_PAL); }
      else if (t === TILE.DOOR) {   // soleira: a porta aberta para a neve, com capacho
        const DX = x * TS, DY = y * TS;
        R(c, DX, DY, TS, TS, IN.deep); R(c, DX + 1, DY + 9, 14, 7, SNOW.md); R(c, DX + 1, DY + 9, 14, 1, SNOW.sh);
        R(c, DX - 1, DY, 1, TS, IN.out); R(c, DX + TS, DY, 1, TS, IN.out);
        R(c, DX + 2, DY - 3, 12, 4, IN.rugDk); R(c, DX + 3, DY - 2, 10, 2, IN.rug);
      }
    }
  }
  const X = x => x * TS;
  function interiorEdge() { const t = canvas(TS, TS); R(t.getContext('2d'), 0, 0, TS, TS, IN.deep); return t; }
  const INTERIOR_COLORS = [IN.out, IN.deep, IN.plaster, IN.plaster2, IN.beam, IN.beamHi, IN.wains, IN.wainsDk, IN.rail, IN.railHi, IN.cap, IN.capHi,
    ...IN.stone, IN.top, IN.topHi, IN.front, IN.frontDk, IN.leg, IN.rug, IN.rugDk, IN.rugGold, IN.rugFringe, '#9a6232', '#a07048', '#a8704a',
    '#b07c58', '#7a4a24', '#6a3a1a', ...Object.values(BARREL_PAL), ...Object.values(MUG_PAL), ...Object.values(CANDLE_PAL), ...BOTTLES.flat(),
    ...Object.values(SHOE_PAL), '#1c2860', '#2c3c80', '#ffffff', '#e8eff8', '#d8a478', SNOW.md, SNOW.sh];

  // Mata fechada para além da borda do mapa (padrão 32x32 que se repete sem emenda)
  function forestTile() {
    const cv = canvas(32, 32), c = cv.getContext('2d');
    R(c, 0, 0, 32, 32, '#2a6a2a');
    const trees = [[0, 0, 'round'], [16, 8, 'pine'], [0, 16, 'round'], [16, 24, 'round'], [8, 12, 'round'], [24, 28, 'pine']].sort((a, b) => a[1] - b[1]);
    for (const oy of [-32, 0, 32]) for (const [x, y, k] of trees) for (const ox of [-32, 0, 32]) {
      const s = TREES[k](); c.drawImage(s, x + ox - 3, y + oy - 8);
    }
    R(c, 0, 0, 32, 32, snow ? 'rgba(21,30,78,.45)' : 'rgba(0,0,0,.45)');
    return cv;
  }

  // ---------- Exploration ground (src/explore.js): ice, bridge, ravine, avalanche, ramp, wheel ruts ----------
  const PLANK = P(['#b07c58', '#9a6232', '#6a3a1a', '#d8a478']), ABYSS = P(['#151e4e', '#1c2860', '#26202e', '#2c3c80']);
  const STONE_W = P(['#a2a2ac', '#7a7a82', '#55555e', '#26202e']);
  function iceAt(gx, gy) {
    const crack = Math.abs(noise(gx / 6, gy / 6, 61) - 0.5) < 0.02;          // thin cracks
    if (crack) return ICE[3];
    if (hash(gx, gy, 62) < 0.012) return ICE[0];                              // a glint
    const n = noise(gx / 9, gy / 4, 63);
    return n > 0.68 ? ICE[0] : n < 0.3 ? ICE[2] : ICE[1];
  }
  function fieldGround(A, t, x, y, gx, gy, lx, ly) {
    if (t === TILE.ICE) {
      const d = edgeDist(A, x, y, lx, ly, u => u === TILE.ICE);
      return d < 1 ? ICE[4] : d < 2 ? ICE[3] : iceAt(gx, gy);
    }
    if (t === TILE.BRIDGE) {
      // planks across the way, a dark rail at each side; over water the river shows between them
      if (lx < 2 || lx > 13) return lx === 0 || lx === 15 ? PLANK[2] : PLANK[1];
      if (ly % 4 === 3) return PLANK[2];
      if (ly % 4 === 0) return PLANK[3];
      return hash(gx >> 2, gy >> 2, 64) < 0.5 ? PLANK[0] : PLANK[1];
    }
    if (t === TILE.CHASM) {
      const north = tileAt(A, x, y - 1), south = tileAt(A, x, y + 1);
      if (north !== TILE.CHASM && north !== TILE.BRIDGE) { if (ly < 2) return SNOWG[1]; if (ly < 4) return rgb(SNOW.ou); if (ly < 7) return STONE_W[1 + (hash(gx, gy, 65) < 0.3 ? 1 : 0)]; }
      if (south !== TILE.CHASM && south !== TILE.BRIDGE && ly > 12) return ly > 14 ? STONE_W[0] : STONE_W[2];
      const n = noise(gx / 5, gy / 5, 66);
      return n > 0.7 ? ABYSS[3] : n > 0.45 ? ABYSS[1] : ((gx + gy) & 1) && n > 0.4 ? ABYSS[1] : ABYSS[0];
    }
    if (t === TILE.SNOWPILE) {
      // a heap of snow: bright on the upper left of each lump, blue shade low on the right
      const lump = noise(gx / 6, gy / 5, 67), sh = (lx + ly) / 30 + (1 - lump) * 0.5;
      if (hash(gx, gy, 68) < 0.02) return SNOWG[2];
      return sh < 0.45 ? SNOWG[2] : sh < 0.75 ? SNOWG[1] : sh < 0.95 ? SNOWG[0] : rgb(SNOW.sh);
    }
    if (t === TILE.RAMP) {
      // steps cut into the rock, snow on each tread
      const step = ly % 5;
      if (lx < 2 || lx > 13) return ROCK[lx === 0 || lx === 15 ? 0 : 1];
      return step === 0 ? SNOWG[2] : step === 1 ? SNOWG[1] : step === 4 ? ROCK[1] : ROCK[2];
    }
    if (t === TILE.RUTS) {
      // two deep grooves of a heavy wheel along the old road
      const g = ly === 4 || ly === 11, gl = ly === 5 || ly === 12;
      return g ? rgb(SNOW.dk) : gl ? rgb(SNOW.sh) : snowAt(gx, gy);
    }
    return snowAt(gx, gy);
  }

  // ---------- Field objects (drawn per frame, src/explore.js): each kind with its state, in grid rows ----------

  // ---------- Vistas past the edge of a map (panVista in src/explore.js) ----------
  // A painted view in flat bands, light from the upper left, a Bayer row at the edge of each sky band.
  // 'vale': from the lookout, the valley of the Vau (the river shining, the lights of the village, the dark mass of the
  // Purple Forest far north). 'valmor': Valmor down below, windows lit, smoke rising straight in the cold.
  const BAYER2 = [[0, 2], [3, 1]];
  function bands(c, w, y0, y1, cols) {
    const n = cols.length, hh = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const top = Math.round(y0 + i * hh), bot = Math.round(y0 + (i + 1) * hh);
      R(c, 0, top, w, bot - top, cols[i]);
      if (i + 1 < n) for (let x = 0; x < w; x++) if (BAYER2[0][x & 1] < 2) R(c, x, bot - 1, 1, 1, cols[i + 1]);
    }
  }
  function ridge(c, w, base, amp, seed, col, top = null) {
    for (let x = 0; x < w; x++) {
      const y = Math.round(base - amp * noise(x / 23, 0.5, seed) - amp * 0.4 * noise(x / 7, 1.5, seed + 1));
      R(c, x, y, 1, 400, col);
      if (top) R(c, x, y, 1, 1, top);
    }
  }
  function pineRow(c, w, base, h, col, seed) {
    for (let x = -4; x < w; x += 5 + Math.floor(hash(x, 0, seed) * 4)) {
      const th = h + Math.floor(hash(x, 1, seed) * h * 0.5);
      for (let j = 0; j < th; j++) { const half = Math.floor((j / th) * 4); R(c, x + 3 - half, base - th + j, half * 2 + 1, 1, col); }
      R(c, x + 3, base - th, 1, 1, SNOW.lt);
    }
  }
  function vista(c, w, h, kind) {
    if (kind === 'vale') {
      bands(c, w, 0, Math.round(h * 0.5), ['#151e4e', '#1c2860', '#2c3c80', '#3a78c8', '#8ac0f0']);
      for (let i = 0; i < 24; i++) R(c, Math.floor(hash(i, 2, 90) * w), Math.floor(hash(i, 3, 90) * h * 0.3), 1, 1, i % 5 ? '#e8eff8' : '#fff6c0');
      ridge(c, w, h * 0.5, h * 0.12, 91, '#4a5a8c', '#cbd8ec');          // far mountains, snow on top
      ridge(c, w, h * 0.56, h * 0.05, 93, '#40145a', '#72308e');          // the Purple Forest, a dark mass far north
      ridge(c, w, h * 0.64, h * 0.04, 95, '#7488b8', '#a4b8da');          // snowy hills of the valley
      R(c, 0, Math.round(h * 0.66), w, h, '#a4b8da');
      // the river in an S, shining
      for (let y = Math.round(h * 0.66); y < h; y++) {
        const k = (y - h * 0.66) / (h * 0.34), cx = Math.round(w * (0.5 + 0.18 * Math.sin(k * 4.2)) ), half = 1 + Math.round(k * 4);
        R(c, cx - half, y, half * 2, 1, '#3a78c8'); if (y % 3 === 0) R(c, cx - half + 1, y, Math.max(1, half - 1), 1, '#8ac0f0');
      }
      // the village of the ford: roofs and lit windows by the river
      const vx = Math.round(w * 0.62), vy = Math.round(h * 0.76);
      for (let i = 0; i < 7; i++) { const x = vx + (i - 3) * 6 + Math.floor(hash(i, 4, 92) * 3), y = vy + Math.floor(hash(i, 5, 92) * 6); R(c, x, y, 5, 3, '#55555e'); R(c, x, y - 1, 5, 1, '#e8eff8'); R(c, x + 2, y + 1, 1, 1, '#f0d860'); }
      pineRow(c, w, h, Math.round(h * 0.14), '#14402a', 94);
      return;
    }
    // Valmor down below at dusk
    bands(c, w, 0, Math.round(h * 0.42), ['#151e4e', '#1c2860', '#2c3c80', '#3a78c8']);
    ridge(c, w, h * 0.44, h * 0.1, 81, '#4a5a8c', '#cbd8ec');
    R(c, 0, Math.round(h * 0.5), w, h, '#cbd8ec');
    ridge(c, w, h * 0.52, h * 0.03, 83, '#a4b8da', '#e8eff8');
    const vx = Math.round(w * 0.45), vy = Math.round(h * 0.6);
    for (let i = 0; i < 11; i++) {
      const x = vx + (i - 5) * 9 + Math.floor(hash(i, 6, 82) * 4), y = vy + Math.floor(hash(i, 7, 82) * 14), big = i === 5;
      R(c, x, y, big ? 9 : 7, big ? 6 : 4, '#9a6232'); R(c, x - 1, y - 2, big ? 11 : 9, 2, '#e8eff8'); R(c, x + 2, y + 2, 1, 1, '#f0d860');
      if (big) { R(c, x + 3, y - 7, 3, 5, '#e8eff8'); R(c, x + 4, y - 9, 1, 2, '#c89c38'); }   // the chapel tower
      if (i % 3 === 0) for (let k = 1; k < 7; k++) R(c, x + 3 + (k > 4 ? 1 : 0), y - 2 - k * 2, 1, 1, k % 2 ? '#a4b8da' : '#cbd8ec');   // smoke straight up
    }
    pineRow(c, w, h, Math.round(h * 0.18), '#14402a', 84);
  }
  const FALLS_ROWS = ['oWWlWWWlWWWWlWWo', 'oWlLWWlLWWWlLWWo', 'oWlLWlLLWWlLLWlo', 'oWlLWlLWWWlLWWlo', 'oWWLWlLWWlLLWWlo', 'oWlLWWLWWlLWWlLo',
    'oWlLWWLWWlLWWlLo', 'oWlWWlLWWlLWlLLo', 'oWlWWlLWWWLWlLWo', 'oWlWlLWWlWLWlLWo', 'oWWWlLWWlWWWlWWo', 'oWlWlWWWlWWlLWWo', 'oWlWWWlWWWlLWlWo', 'oWWlWWlWlWWLWWlo', 'oWWWWWWWWWWWWWWo', 'oooooooooooooooo'];
  const CAVE_ROWS = ['....oooooooo....', '..ooDDDDDDDDoo..', '.oDDKKKKKKKKDDo.', 'oDDKKKKKKKKKKDDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo',
    'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo', 'oDKKKKKKKKKKKKDo'];
  const FSPR = {};
  const sprite = (key, w, h, draw) => FSPR[key] || (FSPR[key] = (() => { const cv = canvas(w, h); draw(cv.getContext('2d')); return cv; })());
  const LAMP_OFF = { o: '#26202e', I: '#55555e', i: '#7a7a82', S: SNOW.lt, y: '#1c2860', Y: '#2c3c80', W: '#3a78c8' };
  const LAMP_ON = { o: '#26202e', I: '#55555e', i: '#7a7a82', S: SNOW.lt, y: '#e8b840', Y: '#f0d860', W: '#fff6c0' };
  const LOG_ROWS = ['..SSSSSSSSSSSS..', '.oSSLSSSSSLSSSo.', 'oBbbBbbbbBbbbBwo', 'obBbbbBbbbbBbbWo', 'obbbBbbbbbbbBbwo', 'odbbbbbdbbbbbbwo', '.oddddddddddddo.', '..oooooooooooo..'];
  const LOG_PAL = { o: '#6a3a1a', B: '#b07c58', b: '#9a6232', d: '#6a3a1a', w: '#d8a478', W: '#f4cca0', S: SNOW.lt, L: '#ffffff' };
  const POST_ROWS = ['.SSSSSSSSSSSS...', 'oBbbbBbbbbbBbwo.', 'obbbbbbbbbbbbWo.', '.oddddddddddddo.', '..ooooooooooo...'];
  const ROCK_ROWS = ['....SSSSSS....', '..SSLLSSSSSS..', '.oSLSSSSSSSSo.', 'oGGgGGGGgGGGdo', 'oGgGGGGGGGGddo', 'oGGGGgGGGGdddo', 'oGGGGGGGGdddDo', '.oGGGGGddddDo.', '..ooDDDDDDoo..', '....oooooo....'];
  const ROCK_PAL = { o: '#26202e', G: '#a2a2ac', g: '#7a7a82', d: '#7a7a82', D: '#55555e', S: SNOW.lt, L: '#ffffff' };
  const CHEST_ROWS = ['.oooooooooooo.', 'oyBBBBBBBBBByo', 'oBbbbbbbbbbbBo', 'oyyyyyyKyyyyyo', 'oBbbbbbkbbbbBo', 'oBbbbbbbbbbbBo', 'oBbbbbbbbbbbdo', 'oyddddddddddyo', '.oooooooooooo.'];
  const CHEST_OPEN = ['.oooooooooooo.', 'oddddddddddddo', 'oyyyyyyyyyyyyo', 'oBbbbbbbbbbbBo', 'oBbbbbbbbbbbBo', 'oBbbbbbbbbbbdo', 'oyddddddddddyo', '.oooooooooooo.'];
  const CHEST_PAL = { o: '#26202e', B: '#b07c58', b: '#9a6232', d: '#6a3a1a', y: '#c89c38', K: '#7a7a82', k: '#26202e' };
  const CAIRN_ROWS = ['.....ooo......', '....oGGgo.....', '...ooggDoo....', '..oGGGgggDo...', '..ooDDooDDo...', '.oGGgggGGGgo..', '.oGgggggggDDo.', 'ooDDooooDDDooo', 'oGGGgoGGgggDDo', 'oGgggDoGgggDDo', 'oDDDDDoDDDDDDo', '.oooooooooooo.'];
  const CAIRN_PAL = { o: '#26202e', G: '#a2a2ac', g: '#7a7a82', D: '#55555e' };
  const SIGN_ROWS = ['..oooooo..', '.oGGGGGGo.', 'oGGgYgGGGo', 'oGgYYYgGDo', 'oGGgYgGGDo', 'oGGgYgGDDo', 'oGGGGGGDDo', '.oDDDDDDo.', '..oooooo..'];
  const ICICLE_ROWS = ['oooooooooooooooo', 'oWWWWWWWWWWWWWWo', 'oLWLLWLLWLLWLLWo', '.oLo.oLo.oLLo.o.', '.oLo.oLo..oLo.o.', '..o..oLo..oLo...', '.....oLo...o....', '......o.........'];
  const ICE_PAL = { o: '#7488b8', W: '#e8eff8', L: '#a4b8da', l: '#cbd8ec', D: '#4a5a8c' };
  const BLOCK_ROWS = ['.oooooooooooooo.', 'oWWWWWWWWWWWWWlo', 'oWlllllllllllllo', 'oWlKKKKKKKKKllLo', 'oWlKyyyyyyyKllLo', 'oWlKbbbbbbbKllLo', 'oWlKyyyyyyyKllLo', 'oWlKbbbbbbbKllLo', 'oWlKKKKKKKKKllLo', 'oWlllllllllllLLo', 'oLLLLLLLLLLLLLLo', '.oooooooooooooo.'];
  const BLOCK_PAL = { o: '#7488b8', W: '#e8eff8', l: '#cbd8ec', L: '#a4b8da', K: '#4a5a8c', y: '#c89c38', b: '#7a7a82' };
  const ROPE_ROWS = ['o..............o', 'Bo............oB', 'b.o..........o.b', 'b..oPPPPPPPPo..b', 'b...PppppppP...b', 'b...oPPPPPPo....', '.....PppppP.....', '.....oPPPPo.....', '......PppP......'];
  const ROPE_PAL = { o: '#9a6232', B: '#b07c58', b: '#6a3a1a', P: '#9a6232', p: '#6a3a1a' };
  const BEAM_ROWS = Array.from({ length: 16 }, (_, i) => i % 6 === 2 ? '......oBdo......' : '......oBbo......');
  const BEAM_PAL = { o: '#6a3a1a', B: '#b07c58', b: '#9a6232', d: '#6a3a1a' };
  const FIRE_STONES = [[1, 8], [3, 12], [11, 12], [13, 8], [7, 13]];
  function fieldSprite(kind, done, now, o) {
    const f = Math.floor(now / 160) % 2;
    switch (kind) {
      case 'lamp': return sprite('lamp' + !!done, 9, 22, c => pix(c, 0, 0, LAMP_ROWS, done ? LAMP_ON : LAMP_OFF));
      case 'fire': return sprite('fire' + !!done + (done ? f : ''), 16, 16, c => {
        for (const [sx, sy] of FIRE_STONES) { R(c, sx, sy, 3, 2, '#26202e'); R(c, sx, sy, 2, 1, '#7a7a82'); }
        R(c, 3, 10, 10, 2, '#4e2c14'); R(c, 4, 10, 8, 1, '#6a3a1a');
        if (done) { R(c, 4, 2 + f, 8, 9 - f, '#a8323e'); R(c, 5, 4 + f, 6, 7 - f, '#e8b840'); R(c, 7, 6, 2, 4, '#fff6c0'); }
      });
      case 'log': return sprite('log', 16, 8, c => pix(c, 0, 0, LOG_ROWS, LOG_PAL));
      case 'post': return sprite('post', 16, 5, c => pix(c, 0, 0, POST_ROWS, LOG_PAL));
      case 'rock': return sprite('rock', 14, 10, c => pix(c, 0, 0, ROCK_ROWS, ROCK_PAL));
      case 'chest': return sprite('chest' + !!done, 14, 9, c => pix(c, 0, done ? 1 : 0, done ? CHEST_OPEN : CHEST_ROWS, CHEST_PAL));
      case 'rune': return sprite('rune' + !!done, 14, 12, c => { pix(c, 0, 0, CAIRN_ROWS, CAIRN_PAL); if (done) { R(c, 5, 9, 1, 2, '#f0d860'); R(c, 7, 9, 2, 1, '#f0d860'); R(c, 7, 10, 1, 1, '#f0d860'); } });
      case 'sign': return sprite('sign', 10, 9, c => pix(c, 0, 0, SIGN_ROWS, { o: '#26202e', G: '#a2a2ac', g: '#7a7a82', D: '#55555e', Y: '#26202e' }));
      case 'icicles': return sprite('icicles', 16, 8, c => pix(c, 0, 0, ICICLE_ROWS, ICE_PAL));
      case 'iceBlock': return sprite('iceBlock', 16, 12, c => pix(c, 0, 0, BLOCK_ROWS, BLOCK_PAL));
      case 'rope': return sprite('rope', 16, 9, c => pix(c, 0, 0, ROPE_ROWS, ROPE_PAL));
      case 'beam': return sprite('beam', 16, 16, c => pix(c, 0, 0, BEAM_ROWS, BEAM_PAL));
      case 'falls': return sprite('falls' + f, 16, 16, c => { pix(c, 0, 0, FALLS_ROWS, ICE_PAL); R(c, 3 + f * 8, 2 + f * 5, 1, 2, '#ffffff'); });
      case 'cave': return sprite('cave', 16, 16, c => pix(c, 0, 0, CAVE_ROWS, { o: '#26202e', D: '#55555e', K: '#151e4e' }));
      default: return sprite('none', 1, 1, () => {});
    }
  }

  // ---------- Camada completa de uma área ----------
  function layer(A) {
    const W = A.W * TS, H = A.H * TS, cv = canvas(W, H), c = cv.getContext('2d');
    const valmor = A === AREAS.valmor;
    snow = !!A.winter; LIGHTS = []; SMOKE = []; EMIT = [];
    const img = c.createImageData(W, H), data = img.data;
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
      const t = A.g[y * A.W + x];
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) {
        const gx = x * TS + lx, gy = y * TS + ly, col = isInterior(t) ? plankPixel(gx, gy) : groundPixel(A, t, x, y, gx, gy, lx, ly, valmor), p = (gy * W + gx) * 4;
        data[p] = col[0]; data[p + 1] = col[1]; data[p + 2] = col[2]; data[p + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    if (A.g.some(isInterior)) { drawInterior(c, A); A.edgeTile = interiorEdge(); }   // taverna: assoalho, paredes e móveis
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
    A.lights = LIGHTS; A.smoke = SMOKE; A.emit = EMIT; snow = false;
    return cv;
  }

  // ---------- Luz e clima (por quadro, por cima dos personagens) ----------
  // Poças de luz em degraus: cada anel tira um pouco do anoitecer e põe um pouco de âmbar. Sem degradê suave.
  // the outer ring only lifts the dusk (amber there turns the snow grey); indoors the amber is softer, so the tables stay readable
  const lightRings = (r, cozy = false) => [{ r, cut: 0.25, warm: cozy ? 0.08 : 0 }, { r: Math.round(r * 0.68), cut: 0.4, warm: cozy ? 0.14 : 0.22 }, { r: Math.round(r * 0.38), cut: 0.55, warm: cozy ? 0.2 : 0.32 }]; // poça dourada, não holofote creme
  const DUSK = 'rgba(28,40,96,.48)';   // noite #1c2860
  function disc(c, cx, cy, r) {
    const ry = Math.round(r * 0.7);    // achatada: chão em 3/4
    for (let yy = -ry; yy <= ry; yy++) { const half = Math.round(r * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)); c.fillRect(cx - half, cy + yy, half * 2, 1); }
  }
  function lightLayer(A, veil = DUSK) {
    const cv = canvas(A.W * TS, A.H * TS), c = cv.getContext('2d');
    c.fillStyle = veil; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'destination-out';
    for (const l of A.lights) for (const g of lightRings(l.r)) { c.fillStyle = `rgba(0,0,0,${g.cut})`; disc(c, l.x, l.y, g.r); }
    c.globalCompositeOperation = 'source-over';
    const cozy = veil !== DUSK;
    for (const l of A.lights) for (const g of lightRings(l.r, cozy)) if (g.warm) { c.fillStyle = `rgba(232,184,64,${g.warm})`; disc(c, l.x, l.y, g.r); }
    // what gives the light is drawn again on top, with a bright core: the source stays brighter than its pool
    for (const e of A.emit || []) {
      pix(c, e.x, e.y, e.rows, e.pal);
      c.fillStyle = '#fff6c0'; c.fillRect(e.x + (e.rows[0].length >> 1), e.y + (e.rows.length >> 1), 1, 1);
    }
    return cv;
  }

  // Fumaça de chaminé: uma coluna de baforadas sobe e vão para a direita (vento), clareiam e somem
  const PUFFS = 6;
  function smokePuff(k, now, seed) {
    const t = (now / 3000 + k / PUFFS + seed * 0.37) % 1;
    if (t > 0.92) return null;
    return { dx: Math.round(t * 10 + Math.sin(t * 6 + seed) * 1.5), dy: -Math.round(t * 30), s: t < 0.15 ? 2 : t < 0.4 ? 3 : t < 0.7 ? 4 : 5,
      thin: t > 0.65 };   // no fim fica rala (pontilhada) e some
  }
  // Floco de neve i, em coordenadas de tela; cai devagar e balança
  function flake(i, now, w, h) {
    const sp = 0.6 + hash(i, 1, 61) * 0.8, mod = (v, m) => ((v % m) + m) % m;
    return { x: Math.floor(mod(hash(i, 2, 61) * w + now * 0.004 * sp + Math.sin(now / 900 + i) * 5, w)),
      y: Math.floor(mod(hash(i, 3, 61) * h + now * 0.018 * sp, h)), s: hash(i, 4, 61) > 0.8 ? 2 : 1, col: sp > 1 ? SNOW.hi : SNOW.lt };
  }
  // Baforada redonda: brilho no alto à esquerda, sombra embaixo à direita
  function puff(c, cx, cy, r, thin) {
    for (let y = -r; y < r; y++) for (let x = -r; x < r; x++) {
      const d = (x + 0.5) ** 2 + (y + 0.5) ** 2;
      if (d > r * r || (thin && ((x + y + cx + cy) & 1))) continue;
      const l = x + y;
      c.fillStyle = l <= -r ? SNOW.hi : l >= r - 1 || d > (r - 0.8) ** 2 && l > 0 ? '#a2a2ac' : SNOW.lt;   // sombra cinza neutra: não some na neve azulada
      c.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  function weather(c, A, now, camX, camY, vw, vh) {
    if (A.cozy) { if (!A.light) A.light = lightLayer(A, A.cozy); c.drawImage(A.light, -camX, -camY); return; }   // interior: penumbra e luz de fogo
    if (!A.winter) return;
    for (const sm of A.smoke || []) for (let k = 0; k < PUFFS; k++) {
      const p = smokePuff(k, now, sm.seed); if (!p) continue;
      puff(c, sm.x + p.dx - camX, sm.y + p.dy - camY - p.s, p.s, p.thin);
    }
    if (A.dusk) { if (!A.light) A.light = lightLayer(A); c.drawImage(A.light, -camX, -camY); }
    for (let i = 0; i < 40; i++) { const f = flake(i, now, vw, vh); c.fillStyle = f.col; c.fillRect(f.x, f.y, f.s, f.s); }
  }

  // Toda cor nova do inverno (o teste confere que estão na paleta mestre)
  const WINTER_COLORS = [...Object.values(SNOW), ...LEAF_W, ...PINE_W, '#2c3c80', '#3a78c8', '#1c2860', '#26202e', '#55555e', '#7a7a82',
    '#a2a2ac', '#e8b840', '#f0d860', '#fff6c0', '#c89c38'];
  return { layer, hash, weather, lightRings, disc, fieldSprite, vista, smokePuff, flake, SNOW, WINTER_COLORS, INTERIOR_COLORS, PUFFS };
})();

if (typeof module !== 'undefined') module.exports = { TownArt };
