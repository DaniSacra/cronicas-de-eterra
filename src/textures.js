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

  function brick(x, y, variant) {
    const row = Math.floor(y / 16), off = (row % 2) * 16;
    const bx = Math.floor((x + off) / 32) % 2, lx = (x + off) % 32, ly = y % 16;
    const n = fbm(x, y);
    if (ly < 2 || lx < 2) return mul(pal.mortar, 0.8 + n * 0.4);
    const bh = hash(bx * 7 + row * 3 + variant * 31, row * 11 + bx);
    let k = 0.72 + bh * 0.38 + (n - 0.5) * 0.45;
    if (ly === 2 || lx === 2) k *= 1.22;
    if (ly === 15 || lx === 31) k *= 0.68;
    let c = mul(pal.stone, k);
    if (variant === 1) {
      const m = fbm(x * 1.3 + 50, y * 1.3 + 9);
      if (m > 0.5 && y > 24) c = mix(c, pal.accent, Math.min(0.85, (m - 0.5) * 3.5));
      // rachadura
      const cx = 22 + Math.sin(y * 0.35) * 4 + (y > 30 ? (y - 30) * 0.5 : 0);
      if (y > 4 && y < 50 && Math.abs(x - cx) < 0.9) c = mul(pal.mortar, 0.6);
    }
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
    const sx = Math.floor(x / 32), sy = Math.floor(y / 32);
    const off = (sy % 2) * 16;
    const lx = (x + off) % 32, ly = y % 32;
    const n = fbm(x, y);
    if (lx < 1 || ly < 1) return mul(pal.floorJ, 0.9 + n * 0.3);
    const h = hash(Math.floor((x + off) / 32) % 2 + 9, sy + 3);
    let k = 0.78 + h * 0.3 + (n - 0.5) * 0.5;
    if (lx === 1 || ly === 1) k *= 1.15;
    if (lx === 31 || ly === 31) k *= 0.8;
    return mul(pal.floor, k);
  }

  function ceilT(x, y) {
    const n = fbm(x + 100, y + 100);
    let k = 0.65 + n * 0.55;
    if (y % 32 < 4) k *= 0.55 + (y % 32) * 0.08;
    if (x % 32 === 0) k *= 0.7;
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
    walls: [tex((x, y) => brick(x, y, 0)), tex((x, y) => brick(x, y, 1)), tex(torch)],
    floor: tex(floorT),
    ceil: tex(ceilT),
    stairs: tex(stairsT),
  };
}
