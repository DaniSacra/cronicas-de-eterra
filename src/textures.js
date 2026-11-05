// ===== Texturas procedurais 64x64 (RGB + máscara emissiva) =====

function makeTextures(pal, seed) {
  const S = 64;
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, sc) {
    const fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const wrap = S / sc;
    const h = (a, b) => hash(((a % wrap) + wrap) % wrap, ((b % wrap) + wrap) % wrap);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  const fbm = (x, y) => vnoise(x, y, 16) * 0.5 + vnoise(x, y, 8) * 0.3 + vnoise(x, y, 4) * 0.2;
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function tex(fn) {
    const d = new Uint8Array(S * S * 3), e = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = fn(x, y), i = y * S + x;
      d[i * 3] = clamp(r[0]); d[i * 3 + 1] = clamp(r[1]); d[i * 3 + 2] = clamp(r[2]);
      e[i] = r[3] ? 1 : 0;
    }
    return { d, e };
  }

  // Pedra de cripta: blocos talhados à mão, de alturas e larguras irregulares, gastos nos cantos e úmidos.
  // As fileiras somam 64 e as juntas são calculadas módulo 64, então a textura emenda sem costura.
  const ROWS = [12, 10, 13, 9, 11, 9];
  const rowOf = y => { let t = 0; for (let r = 0; r < ROWS.length; r++) { if (y < t + ROWS[r]) return [r, y - t, ROWS[r]]; t += ROWS[r]; } return [0, 0, ROWS[0]]; };
  const joints = ROWS.map((_, r) => { const j = []; let x = Math.floor(hash(r, 99) * 20); while (j.length < 6) { j.push(x % 64); x += 12 + Math.floor(hash(r, j.length + 7) * 14); if (x - j[0] >= 64) break; } return j.sort((p, q) => p - q); });
  function stoneAt(x, y) {
    const [r, ly, h] = rowOf(y), j = joints[r];
    let k = j.length - 1; for (let i = 0; i < j.length; i++) if (x >= j[i]) k = i;
    const x0 = j[k], x1 = k + 1 < j.length ? j[k + 1] : j[0] + 64;
    const lx = ((x - x0) % 64 + 64) % 64, w = ((x1 - x0) % 64 + 64) % 64 || 64;
    return { r, k, lx, ly, w, h };
  }
  function brick(x, y, variant) {
    const st = stoneAt(x, y), n = fbm(x, y), grain = vnoise(x, y, 2);
    // juntas fundas e cantos lascados (o canto do bloco é arredondado por distância)
    const cx = Math.min(st.lx, st.w - 1 - st.lx), cy = Math.min(st.ly, st.h - 1 - st.ly);
    const chip = 2 + hash(st.r * 13 + st.k, 5) * 2;
    const corner = cx < chip && cy < chip && (chip - cx) ** 2 + (chip - cy) ** 2 > chip * chip * 0.9;
    if (st.lx === 0 || st.ly === 0 || corner) return mul(pal.mortar, 0.55 + n * 0.5);
    const tone = 0.7 + hash(st.r * 31 + st.k, 17 + variant) * 0.32;
    let k = tone + (n - 0.5) * 0.4 + (grain - 0.5) * 0.18;
    if (st.ly === 1 || st.lx === 1) k *= 1.18;                 // aresta que pega luz
    if (st.ly === st.h - 1 || st.lx === st.w - 1) k *= 0.62;   // aresta na sombra
    if (hash(x, y) < 0.04) k *= 0.6;                            // poros da pedra
    let c = mul(pal.stone, k);
    // escorrido de umidade e musgo, mais forte embaixo
    const damp = vnoise(x * 3, y * 0.4, 8);
    if (damp > 0.62) c = mul(c, 1 - (damp - 0.62) * 0.9);
    const moss = fbm(x * 1.2 + 40, y * 1.2 + 9) + y / 160;
    if (moss > (variant === 1 ? 0.62 : 0.86)) c = mix(c, pal.accent, Math.min(0.8, (moss - 0.6) * 2.4));
    if (variant === 1) {
      // rachadura que atravessa os blocos
      const crx = 30 + Math.sin(y * 0.3) * 5 + (y > 28 ? (y - 28) * 0.45 : 0);
      if (y > 3 && y < 56 && Math.abs(x - crx) < 0.8) c = mul(pal.mortar, 0.45);
      // teia no canto de cima
      const wx = x, wy = y, d = Math.hypot(wx, wy), ang = Math.atan2(wy, wx);
      if (d < 22 && (Math.abs(Math.sin(ang * 5)) < 0.12 || Math.abs(d % 7 - 3.5) < 0.45)) c = mix(c, [200, 200, 196], 0.55);
    }
    return c;
  }

  // Nicho de ossário: arco escavado na parede com caveiras empilhadas
  function ossuary(x, y) {
    const ax = x - 31.5, top = 14, bot = 54, half = 17;
    const inArch = Math.abs(ax) < half && y < bot && (y >= top + half || Math.hypot(ax, y - (top + half)) < half);
    const rim = Math.abs(ax) < half + 2 && y < bot + 2 && (y >= top + half || Math.hypot(ax, y - (top + half)) < half + 2);
    if (!rim) return brick(x, y, 0);
    if (!inArch) return mul(pal.stone, 0.95 + fbm(x, y) * 0.3);                // moldura de pedra lisa
    let c = mul(pal.mortar, 0.35 + fbm(x, y) * 0.2);                           // fundo escuro do nicho
    const skulls = [[20, 32], [32, 31], [44, 32], [26, 43], [38, 43], [14, 45], [50, 45]];
    for (const [sx, sy] of skulls) {
      const dx = x - sx, dy = y - sy;
      if (dx * dx / 30 + dy * dy / 26 < 1 || (Math.abs(dx) < 3.5 && dy >= 3 && dy < 6)) {
        let b = 0.85 + fbm(x * 2, y * 2) * 0.25 - Math.max(0, dy) * 0.03 - Math.max(0, dx) * 0.02;
        c = mul([214, 204, 176], b);
        if ((Math.abs(dx + 2) < 1.2 || Math.abs(dx - 2) < 1.2) && dy > -1 && dy < 2) c = [20, 16, 14];   // órbitas
        if (Math.abs(dx) < 0.6 && dy >= 2 && dy < 3.5) c = [40, 32, 28];                                // nariz
        if (dy >= 4 && dy < 6 && x % 2 === 0) c = mul(c, 0.6);                                            // dentes
      }
    }
    if (y > bot - 4) c = mix(c, [190, 180, 150], (y - bot + 4) / 6 * (hash(x, 3) > 0.5 ? 0.6 : 0.2));  // ossos no chão do nicho
    return c;
  }

  function torch(x, y) {
    let c = brick(x, y, 0);
    const dx = x - 32 + 0.5, dy = y - 28;
    const dist = Math.sqrt(dx * dx + dy * dy * 0.6);
    const glow = Math.max(0, 1 - dist / 30);
    c = [c[0] + glow * glow * 150, c[1] + glow * glow * 90, c[2] + glow * glow * 25];
    let emit = glow > 0.45;
    // suporte
    if (y >= 36 && y <= 41 && Math.abs(dx) <= 6 - (y - 36) * 0.7) { c = y === 36 ? [120, 100, 70] : [70, 58, 44]; emit = false; }
    if (y > 41 && y <= 52 && Math.abs(dx) <= 1.5) { c = [56, 46, 36]; emit = false; }
    // chama
    if (y >= 14 && y < 36) {
      const t = (y - 14) / 22;
      const hw = 6 * Math.sin(Math.pow(t, 0.8) * Math.PI * 0.92);
      const ax = Math.abs(dx);
      if (ax < hw) {
        const core = 1 - ax / hw;
        const heat = core * 0.7 + t * 0.5;
        c = heat > 0.95 ? [255, 250, 220] : heat > 0.7 ? [255, 220, 90] : heat > 0.45 ? [255, 150, 40] : [220, 70, 20];
        emit = true;
      }
    }
    return [...c, emit];
  }

  function floorT(x, y) {
    // lajes gastas de tamanhos diferentes, terra nas juntas e um ou outro osso
    const sy = y < 22 ? 0 : y < 46 ? 1 : 2, h = [22, 24, 18][sy], ly = y - [0, 22, 46][sy];
    const off = [0, 13, 27][sy], cut = [21, 40, 18, 35, 26, 44][sy * 2 + (((x + off) % 64) < 32 ? 0 : 1)] % 32;
    const lx = (x + off) % 32, edge = lx < 1 || ly < 1 || lx === cut;
    const n = fbm(x, y);
    if (edge) return mul(pal.floorJ, 0.8 + n * 0.5);
    let k = 0.72 + hash(sy * 5 + ((x + off) >> 5) + (lx > cut ? 3 : 0), 41) * 0.3 + (n - 0.5) * 0.5 + (vnoise(x, y, 2) - 0.5) * 0.15;
    if (ly === 1) k *= 1.12;
    if (ly === h - 1) k *= 0.75;
    let c = mul(pal.floor, k);
    const dirt = fbm(x + 300, y + 77);
    if (dirt > 0.6) c = mix(c, pal.floorJ, (dirt - 0.6) * 1.6);
    if (hash((x >> 3) + 50, (y >> 3) + 60) < 0.05 && Math.abs((x % 8) - (y % 8)) < 1) c = mul([150, 142, 122], 0.8 + n * 0.3);   // lasca de osso
    return c;
  }

  function ceilT(x, y) {
    // abóbada escura com nervuras de pedra a cada 32 px
    const n = fbm(x + 100, y + 100);
    let k = 0.5 + n * 0.5;
    const rib = Math.min(y % 32, 32 - (y % 32));
    if (rib < 3) k = 0.85 + (3 - rib) * 0.12 + n * 0.2;
    else if (rib < 5) k *= 0.6;
    if (x % 16 === 0 && rib >= 5) k *= 0.75;
    return mul(pal.ceil, k);
  }

  function stairsT(x, y) {
    const fr = 7;
    if (x < fr || y < fr || x >= S - fr || y >= S - fr) {
      const edge = (x === fr - 1 || y === fr - 1 || x === S - fr || y === S - fr) ? 1.25 : 1;
      return mul(pal.stone, (0.75 + fbm(x, y) * 0.35) * edge);
    }
    const iy = y - fr, step = Math.floor(iy / 7);
    let k = Math.max(0.05, 0.75 - step * 0.12);
    if (iy % 7 === 0) k *= 1.5;
    const side = Math.min(x - fr, S - fr - 1 - x);
    if (side < 4) k *= 0.5 + side * 0.12;
    return mul(pal.floor, k * (0.85 + fbm(x, y) * 0.3));
  }

  return {
    walls: [tex((x, y) => brick(x, y, 0)), tex((x, y) => brick(x, y, 1)), tex(torch), tex(ossuary)],
    floor: tex(floorT),
    ceil: tex(ceilT),
    stairs: tex(stairsT),
  };
}
