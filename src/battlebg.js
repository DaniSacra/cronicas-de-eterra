// ===== Battle backdrops: the place of the fight seen from the heroes, in pseudo 3D =====
// A back layer (sky, wall, houses) down to the horizon and a ground plane that recedes to a vanishing point, with
// props that shrink with distance. Painted once per fight in pixel art of the master palette (docs/arte/estilo.md):
// flat bands with Bayer dither, no outline on scenery, light from the top left. Painted at the enemies' pixel size
// (u) and scaled by whole numbers, so every pixel in the battle has the same size.

// Every color of these scenes (a test checks that all of them are in the master palette)
const BATTLE_BG_C = {
  night: ['#151e4e', '#1c2860', '#2c3c80'],
  dusk: ['#151e4e', '#1c2860', '#2c3c80', '#72308e'],
  stars: ['#e8eff8', '#8ac0f0'],
  moon: ['#e8eff8', '#cbd8ec', '#a4b8da'],
  snow: ['#4a5a8c', '#7488b8', '#a4b8da', '#cbd8ec', '#e8eff8'],
  stone: ['#a2a2ac', '#7a7a82', '#55555e'],
  dirt: ['#6a3a1a', '#9a6232', '#b07c58'],
  wood: ['#d8a478', '#b07c58', '#9a6232', '#6a3a1a'],
  fire: ['#fff6c0', '#f0d860', '#e8b840', '#a8323e'],
  dark: '#26202e',
  tree: ['#1c2860', '#26202e'],
  crypt: { hi: '#4a5a8c', face: '#2c3c80', deep: '#1c2860', mortar: '#151e4e', floor: ['#4a5a8c', '#2c3c80'], moss: ['#3a9a6a', '#2a5440'], glow: ['#90e0b0', '#4ad08a'] },
  altar: { hi: '#72308e', face: '#40145a', deep: '#3a1448', mortar: '#26202e', floor: ['#55555e', '#40145a'], moss: ['#a84ad8', '#72308e'], glow: ['#f0a8f8', '#a84ad8'] },
  glass: ['#1c2860', '#3a78c8'],
  bottle: ['#3a9a6a', '#a8323e', '#3a78c8'],
  house: { wall: ['#d8a478', '#b07c58'], beam: '#6a3a1a', roof: ['#a8323e', '#7a1a24'], win: ['#f0d860', '#e8b840'] },
};
const BATTLE_PLACES = ['cemiterio', 'taverna', 'cripta', 'altar', 'vila'];
const BATTLE_HORIZON = 0.4;

// Which backdrop a fight uses: the boss room, the dungeon floor (its own `battle` or the crypt), or the town area
function battlePlace({ mode, area, boss, floor }) {
  if (boss) return 'altar';
  if (mode !== 'town') return BATTLE_PLACES.includes(floor) ? floor : 'cripta';
  return BATTLE_PLACES.includes(area) ? area : 'vila';
}

const BattleBG = (() => {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h >>> 8) / 16777216; };
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const ABGR = {};
  const abgr = hex => ABGR[hex] || (ABGR[hex] = (() => { const n = parseInt(hex.slice(1), 16); return (0xff000000 | (n & 255) << 16 | (n & 0xff00) | (n >> 16)) >>> 0; })());

  // The painting kit for one scene: low resolution w x h, horizon hy, ground height gh, center cx
  function kit(w, h, seed) {
    const d = new Uint32Array(w * h), hy = Math.round(h * BATTLE_HORIZON), gh = h - hy, cx = w / 2;
    const put = (x, y, hex) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = abgr(hex); };
    const rect = (x, y, rw, rh, hex) => { x = Math.round(x); y = Math.round(y); for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, hex); };
    // vertical bands from cols[0] (top) to the last; dither only in the last 40% of each band
    const vgrad = (x0, x1, y0, y1, cols, ease = 1) => {
      const n = cols.length - 1;
      for (let y = y0; y < y1; y++) {
        const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) ** ease * n, b = Math.min(n, Math.floor(t)), f = t - b;
        for (let x = x0; x < x1; x++) put(x, y, cols[Math.min(n, b + (f > 0.6 && (f - 0.6) / 0.4 > bay(x, y) ? 1 : 0))]);
      }
    };
    // ground point (X in screen widths at the bottom row, Z = 1 at the bottom, bigger is farther) -> pixel and size
    const at = (X, Z) => ({ x: Math.round(cx + X * w / Z), y: Math.round(hy + gh / Z), s: 1 / Z });
    // the ground plane, row by row: pick(x, y, X, Z, k, seam) with k = 0 at the horizon and 1 at the bottom;
    // tiles tw wide and tz deep (world units), seam = true on the tile edges (none near the horizon)
    const ground = (tw, tz, stagger, pick) => {
      const id = (x, y) => { const k = (y - hy) / gh, Z = 1 / k, r = Math.floor(Z / tz), X = (x - cx) / (w * k); return [Math.floor(X / tw + (stagger && r % 2 ? 0.5 : 0)), r, X, Z, k]; };
      for (let y = hy; y < h; y++) for (let x = 0; x < w; x++) {
        if (y === hy) { put(x, y, pick(x, y, 0, 99, 0, false, 0, 0)); continue; }
        const [c, r, X, Z, k] = id(x, y), [c1] = id(x - 1, y), up = y > hy + 1 ? id(x, y - 1) : null;
        const seam = k > 0.12 && (c !== c1 || (up && up[1] !== r));
        put(x, y, pick(x, y, X, Z, k, seam, c, r));
      }
    };
    // dither between two colors: f = 0 gives a, 1 gives b; only the last 30% of the way is dithered, so the bands stay flat
    const mix = (x, y, a, b, f) => ((f - 0.7) / 0.3 > bay(x, y) ? b : a);
    // t from 0 to cols.length - 1 across flat bands with dithered edges
    const band = (x, y, cols, t) => { const n = cols.length - 1, b = Math.max(0, Math.min(n, Math.floor(t))); return b >= n ? cols[n] : mix(x, y, cols[b], cols[b + 1], t - b); };
    return { d, w, h, hy, gh, cx, put, rect, vgrad, at, ground, mix, band, r: rng(seed), hash, bay };
  }

  // ---------- props ----------
  // bare winter tree: trunk and forked branches, one color (scenery has no outline)
  function bareTree(K, x, base, ht, col) {
    const { put, r } = K, tw = Math.max(1, Math.round(ht / 14));
    for (let y = 0; y < ht; y++) for (let i = 0; i < tw; i++) put(x + i, base - y, col);
    const branch = (bx, by, len, dir, depth) => {
      let px = bx, py = by;
      for (let i = 0; i < len; i++) { px += dir; if (i % 2 === 0) py--; put(px, py, col); }
      if (depth > 0) { branch(px, py, Math.round(len * 0.6), dir, depth - 1); branch(px, py, Math.round(len * 0.5), -dir, depth - 1); }
    };
    for (let i = 0; i < 3 + (ht > 30 ? 2 : 0); i++) branch(x + (i % 2 ? tw - 1 : 0), base - Math.round(ht * (0.45 + i * 0.13)), Math.round(ht * (0.28 - i * 0.03)), i % 2 ? 1 : -1, ht > 30 ? 2 : 1);
    for (let y = 0; y < Math.round(ht * 0.2); y++) put(x + (tw >> 1), base - ht - y, col);
  }
  // gravestone on the snow: lit left and top, shade on the right, a snow cap and a footprint of shadow
  function grave(K, x, base, s, cross) {
    const { rect, put } = K, S = BATTLE_BG_C.stone, gw = Math.max(3, Math.round(18 * s)), gh = Math.max(4, Math.round(22 * s));
    const x0 = x - (gw >> 1), top = base - gh;
    rect(x0 - 1, base, gw + 3, Math.max(1, Math.round(2 * s)), BATTLE_BG_C.night[2]);
    if (cross && gw >= 6) {
      const bw = Math.max(2, Math.round(gw / 3)), bx = x - (bw >> 1), arm = Math.round(gh * 0.3);
      rect(bx, top, bw, gh, S[1]); rect(x0, top + arm, gw, bw, S[1]);
      rect(bx, top, 1, gh, S[0]); rect(x0, top + arm, gw, 1, S[0]); rect(bx + bw - 1, top + 1, 1, gh - 1, S[2]); rect(x0 + 1, top + arm + bw - 1, gw - 1, 1, S[2]);
      rect(bx, top, bw, 1, BATTLE_BG_C.snow[4]); rect(x0, top + arm, gw, 1, BATTLE_BG_C.snow[3]);
      return;
    }
    for (let y = 0; y < gh; y++) {
      const cut = y === 0 ? Math.ceil(gw / 4) : y === 1 && gw > 6 ? 1 : 0; // rounded top
      for (let i = cut; i < gw - cut; i++) put(x0 + i, top + y, i === cut || y === 0 ? S[0] : i === gw - cut - 1 ? S[2] : S[1]);
    }
    rect(x0 + Math.ceil(gw / 4), top, gw - 2 * Math.ceil(gw / 4), 1, BATTLE_BG_C.snow[4]);
    if (gw >= 7) { rect(x0 + 2, top + Math.round(gh * 0.35), gw - 4, 1, S[2]); rect(x0 + 2, top + Math.round(gh * 0.55), gw - 4, 1, S[2]); }
  }
  // an open grave seen from the front: a dark hole lying on the ground, its far lip lit, the dug dirt heaped on one side
  function openGrave(K, x, base, s) {
    const { rect, put } = K, D = BATTLE_BG_C.dirt, N = BATTLE_BG_C.snow, hw = Math.max(5, Math.round(22 * s)), hd = Math.max(3, Math.round(9 * s)), x0 = x - (hw >> 1);
    for (let j = 0; j < hd; j++) { const cut = j === 0 || j === hd - 1 ? 1 : 0; rect(x0 + cut, base - hd + j, hw - 2 * cut, 1, j < 2 ? D[0] : BATTLE_BG_C.dark); }
    rect(x0 + 1, base - hd - 1, hw - 2, 1, N[2]); // the snow on the far lip catches the moon
    const mw = Math.max(4, Math.round(14 * s)), mh = Math.max(3, Math.round(8 * s)), mx = x0 + hw - 1;
    for (let j = 0; j < mh; j++) {
      const half = Math.max(1, Math.round((mw / 2) * Math.sqrt(1 - (j / mh) ** 2)));
      for (let i = -half; i < half; i++) put(mx + (mw >> 1) + i, base - j, i < -half + 2 || j === mh - 1 ? D[1] : i > half - 3 ? D[0] : D[1] === D[0] ? D[0] : (i + j) % 5 ? D[0] : D[1]);
    }
    put(mx + (mw >> 1) - 1, base - mh, N[3]); put(mx + (mw >> 1) + 1, base - mh + 1, N[3]);
  }
  function barrel(K, x, base, s) {
    const { rect } = K, W = BATTLE_BG_C.wood, bw = Math.round(16 * s), bh = Math.round(20 * s), x0 = x - (bw >> 1), top = base - bh;
    rect(x0 + 1, top, bw - 2, bh, W[2]); rect(x0, top + 2, bw, bh - 4, W[2]);
    rect(x0, top + 2, 2, bh - 4, W[1]); rect(x0 + 2, top, 2, bh, W[1]); rect(x0 + bw - 3, top + 1, 3, bh - 2, W[3]);
    rect(x0 + 1, top, bw - 2, 2, W[0]);
    for (const k of [0.22, 0.75]) rect(x0, top + Math.round(bh * k), bw, Math.max(1, Math.round(2 * s)), BATTLE_BG_C.stone[2]);
    rect(x0 - 1, base, bw + 2, 2, BATTLE_BG_C.dark);
  }
  function candle(K, x, base, col) {
    const { rect, put } = K, F = BATTLE_BG_C.fire;
    for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2; for (const rr of [4, 5]) if ((a + rr) % 2) put(x + Math.cos(ang) * rr, base - 6 + Math.sin(ang) * rr, col); }
    rect(x - 1, base - 4, 2, 4, BATTLE_BG_C.snow[4]); put(x, base - 5, F[2]); put(x, base - 6, F[1]); put(x, base - 7, F[0]);
  }

  // ---------- scenes ----------
  const SCENES = {
    // night over the snowy graves: the chapel and bare trees behind the wall, a moon, low mist on the far rows, open graves,
    // and big stones close to the heroes at the sides; the enemies stand among the graves, never on the horizon
    cemiterio(K) {
      const { w, h, hy, gh, put, rect, vgrad, at, ground, band, r, hash, bay } = K, C = BATTLE_BG_C, N = C.snow, BIG = 2.4;
      vgrad(0, w, 0, hy, C.night, 1.4);
      for (let i = 0; i < Math.round(w * hy / 80); i++) put(r() * w, r() * hy * 0.7, C.stars[r() < 0.7 ? 0 : 1]);
      const mx = Math.round(w * 0.82), my = Math.round(hy * 0.5), mr = Math.max(4, Math.round(h / 26));
      for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr) put(mx + x, my + y, (x - 2) ** 2 + (y - 2) ** 2 > mr * mr ? C.moon[0] : x + y > mr ? C.moon[2] : C.moon[1]);
      put(mx - 2, my - 1, C.moon[1]); put(mx - 1, my - 1, C.moon[1]); put(mx + 1, my + 2, C.moon[2]);
      // the chapel on the left, dark against the sky, one warm window
      const chx = Math.round(w * 0.2), chw = Math.round(w * 0.11), chh = Math.round(hy * 0.3), chb = hy - 5;
      rect(chx, chb - chh, chw, chh, C.night[1]);
      for (let i = 0; i < chw / 2 + 2; i++) { rect(chx - 2 + i, chb - chh - i * 0.6, chw + 4 - 2 * i, 1, C.night[0]); put(chx - 2 + i, chb - chh - i * 0.6, N[1]); }
      const tx = chx + Math.round(chw * 0.05), tw = Math.round(chw * 0.3), th = Math.round(chh * 1.1);
      rect(tx, chb - chh - th, tw, th, C.night[1]);
      for (let i = 0; i < tw / 2 + 1; i++) rect(tx - 1 + i, chb - chh - th - i * 1.4, tw + 2 - 2 * i, 2, C.night[0]);
      rect(chx + chw - 5, chb - chh + 4, 2, 4, C.house.win[1]); rect(tx + (tw >> 1), chb - chh - th + 3, 1, 3, C.house.win[0]);
      // bare trees behind the wall
      for (let i = 0; i < Math.round(w / 40); i++) { const x = Math.round((i + r() * 0.6) * 40); if (x > chx - 8 && x < chx + chw + 8) continue; bareTree(K, x, hy - 4, Math.round(hy * (0.25 + r() * 0.2)), C.tree[0]); }
      // the low stone wall along the horizon, snow on top
      for (let y = hy - 7; y < hy; y++) for (let x = 0; x < w; x++) {
        const row = Math.floor((y - hy + 7) / 3), mortar = (y - hy + 7) % 3 === 2 || (x + row * 4) % 8 === 0;
        put(x, y, mortar ? C.night[2] : y === hy - 7 ? N[1] : N[0]);
      }
      for (let x = 0; x < w; x++) { put(x, hy - 8, N[4]); put(x, hy - 7, N[3]); if (hash(x, 3) < 0.25) put(x, hy - 6, N[3]); }
      // ground: night snow, dark far away and a little lighter close by, with a few glints
      ground(0.5, 0.6, false, (x, y, X, Z, k) => hash(x * 7, y) < 0.015 * k ? N[3] : band(x, y, N, 0.1 + k * 1.9));
      // what stands on the ground, far first: big stones (BIG times the old size), crosses and open graves
      const g = rng(11), xAt = (X, Z) => at(X, Z).x, props = [];
      for (const Z of [8, 6.5, 5.2, 4.3, 3.6, 3, 2.5, 2, 1.6, 1.3]) for (let X = -1.1; X <= 1.1; X += 0.26) {
        const x = X + (g() - 0.5) * 0.12, z = Z + g() * 0.25, sx = xAt(x, z), roll = g();
        if (roll < 0.4) continue;
        if (Z < 2.7 && sx > w * 0.14 && sx < w * 0.86) continue; // nothing between the heroes and the enemies but at the edges
        props.push({ x, z, kind: Z > 2.4 && Z < 6.6 && roll > 0.88 ? 'open' : roll > 0.78 ? 'cross' : 'stone' });
      }
      const mist = () => { // low mist over the far rows: dithered, thin at the edges of the band
        for (let y = hy - 4; y < hy + Math.round(gh * 0.16); y++) for (let x = 0; x < w; x++) {
          const t = 1 - Math.abs(y - hy - 3) / 9, wave = 0.5 + 0.5 * Math.sin(x / 23 + y / 5);
          if (t > 0 && bay(x, y) < t * (0.08 + 0.17 * wave)) put(x, y, N[2]);
        }
      };
      let misted = false;
      for (const p of props) {
        if (!misted && p.z < 4.6) { mist(); misted = true; }
        const q = at(p.x, p.z);
        if (p.kind === 'open') openGrave(K, q.x, q.y, q.s * BIG);
        else grave(K, q.x, q.y, q.s * BIG, p.kind === 'cross');
      }
      if (!misted) mist();
      bareTree(K, Math.round(w * 0.015), Math.round(hy + gh * 0.75), Math.round(Math.min(h * 0.62, w * 0.35)), C.tree[1]);
    },

    // inside the Poney Saltitante: plank wall, the fireplace, a window on the snow, shelves of mugs, barrels and a table
    taverna(K) {
      const { w, h, hy, gh, cx, put, rect, ground, mix, at } = K, C = BATTLE_BG_C, W = C.wood, F = C.fire, S = C.stone;
      const beam = Math.round(hy * 0.14);
      for (let y = 0; y < hy; y++) for (let x = 0; x < w; x++) {
        const p = x % 9, base = p === 0 ? W[3] : p === 1 ? W[1] : W[2];
        put(x, y, y < beam ? (y === beam - 1 ? W[2] : W[3]) : y > hy - 5 ? (y === hy - 4 ? W[2] : W[3]) : y < beam + 3 && K.bay(x, y) < 0.5 ? W[3] : base);
      }
      // window with snow outside
      const wx = Math.round(w * 0.58), wy = Math.round(hy * 0.22), ww = 16, wh = 14;
      rect(wx - 2, wy - 2, ww + 4, wh + 4, W[3]);
      for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) put(wx + x, wy + y, (x + y) % 11 === 0 ? C.glass[1] : K.hash(x, y) < 0.06 ? C.snow[3] : C.glass[0]);
      rect(wx + (ww >> 1) - 1, wy, 2, wh, W[3]); rect(wx, wy + (wh >> 1) - 1, ww, 2, W[3]); rect(wx - 2, wy + wh + 2, ww + 4, 1, C.snow[4]);
      // fireplace on the left with fire and logs
      const fx = Math.round(w * 0.12), fw = Math.round(w * 0.16), ft = hy - Math.round(hy * 0.5);
      for (let y = ft; y < hy; y++) for (let x = fx; x < fx + fw; x++) {
        const row = Math.floor((y - ft) / 5), mortar = (y - ft) % 5 === 4 || (x - fx + (row % 2) * 4) % 8 === 0;
        put(x, y, mortar ? S[2] : (y - ft) % 5 === 0 || x === fx ? S[0] : S[1]);
      }
      rect(fx - 3, ft - 3, fw + 6, 3, W[2]); rect(fx - 3, ft - 3, fw + 6, 1, W[0]);
      const ox = fx + 5, ow = fw - 10, oh = Math.round(hy * 0.3);
      rect(ox, hy - oh, ow, oh, C.dark);
      for (let i = 0; i < ow; i++) {
        const fh = Math.round(oh * (0.35 + 0.45 * Math.abs(Math.sin(i * 0.9 + 1)))), fx0 = ox + i;
        for (let y = 0; y < fh; y++) put(fx0, hy - 3 - y, F[y < fh * 0.3 ? 3 : y < fh * 0.6 ? 2 : y < fh * 0.85 ? 1 : 0]);
      }
      rect(ox + 1, hy - 3, ow - 2, 2, W[3]);
      // shelves of mugs and bottles on the right, a lantern under the beam
      const sx = Math.round(w * 0.68), sw = Math.round(w * 0.2);
      for (const sy of [Math.round(hy * 0.4), Math.round(hy * 0.7)]) {
        for (let i = 3; i < sw - 3; i += 5) {
          const k = (i * 7 + sy) % 3;
          if (k === 0) { rect(sx + i, sy - 4, 3, 4, S[1]); put(sx + i, sy - 4, S[0]); put(sx + i + 3, sy - 3, S[1]); }
          else { const b = C.bottle[(i + sy) % 3]; rect(sx + i, sy - 5, 2, 5, b); put(sx + i, sy - 7, b); put(sx + i, sy - 6, b); put(sx + i, sy - 5, C.snow[3]); }
        }
        rect(sx, sy, sw, 2, W[3]); rect(sx, sy, sw, 1, W[1]);
      }
      const lx = Math.round(w * 0.36);
      rect(lx, beam, 1, 5, S[2]); rect(lx - 2, beam + 5, 5, 6, S[2]); rect(lx - 1, beam + 6, 3, 4, F[1]); put(lx, beam + 7, F[0]);
      // plank floor converging to the back wall, warm light near the fire
      const fire = at(-0.36, 1.6);
      ground(0.08, 1.4, true, (x, y, X, Z, k, seam, c) => {
        if (seam) return W[3];
        const base = c % 2 ? W[1] : W[2], warm = Math.max(0, 1 - Math.hypot((x - fire.x) / (w * 0.22), (y - fire.y) / (gh * 0.3)));
        return warm > 0.35 ? mix(x, y, base, W[0], (warm - 0.35) * 2) : k < 0.25 ? mix(x, y, W[3], base, k * 4) : base;
      });
      rect(0, hy, w, 1, W[3]);
      for (const [X, Z] of [[-0.42, 2], [-0.33, 1.85]]) { const b = at(X, Z); barrel(K, b.x, b.y, b.s); }
      // table on the right with a mug
      const t = at(0.4, 1.9), tw = Math.round(36 * t.s), th = Math.round(14 * t.s), tx = t.x - (tw >> 1);
      rect(tx + 2, t.y - th, 2, th, W[3]); rect(tx + tw - 4, t.y - th, 2, th, W[3]);
      rect(tx, t.y - th - 3, tw, 3, W[2]); rect(tx, t.y - th - 3, tw, 1, W[0]); rect(tx, t.y, tw, 1, C.dark);
      rect(tx + 5, t.y - th - 8, 4, 5, S[1]); put(tx + 5, t.y - th - 8, S[0]); put(tx + 9, t.y - th - 6, S[1]);
    },

    cripta(K) { cryptRoom(K, BATTLE_BG_C.crypt, false); },
    altar(K) { cryptRoom(K, BATTLE_BG_C.altar, true); },

    // a street of Valmor at dusk: timber houses with snow on the roofs and warm windows, a lamp post
    vila(K) {
      const { w, hy, put, rect, vgrad, ground, mix, band, at, hash } = K, C = BATTLE_BG_C, H = C.house, N = C.snow;
      vgrad(0, w, 0, hy, C.dusk, 1.2);
      let x = -6;
      while (x < w) {
        const hw = 34 + Math.floor(K.r() * 16), ht = Math.round(hy * (0.28 + K.r() * 0.12)), top = hy - ht;
        for (let y = top; y < hy; y++) for (let i = 0; i < hw; i++) put(x + i, y, i === 0 || i === hw - 1 || (y - top) % 9 === 0 ? H.beam : i < 3 ? H.wall[0] : H.wall[1]);
        for (let i = 0; i < hw / 2 + 3; i++) { const y = top - 1 - Math.round(i * 0.7); rect(x - 3 + i, y, hw + 6 - 2 * i, 1, i < hw / 4 ? H.roof[0] : H.roof[1]); put(x - 3 + i, y, N[4]); put(x + hw + 2 - i, y, N[3]); }
        for (const wxk of [0.25, 0.65]) { const wx = x + Math.round(hw * wxk), wy = top + 4; rect(wx, wy, 5, 6, H.win[1]); rect(wx + 1, wy + 1, 3, 4, H.win[0]); rect(wx + 2, wy, 1, 6, H.beam); rect(wx - 1, wy + 6, 7, 1, N[4]); }
        x += hw + 4;
      }
      ground(0.09, 0.9, true, (x, y, X, Z, k, seam) => {
        if (Math.abs(X) < 0.16) return seam ? C.stone[2] : k < 0.3 ? mix(x, y, C.stone[2], C.stone[1], k / 0.3) : C.stone[1];
        return hash(x, y * 3) < 0.02 * k ? N[4] : band(x, y, N, 1 + k * 2.4);
      });
      const l = at(-0.4, 1.3), lh = Math.round(60 * l.s);
      rect(l.x, l.y - lh, 2, lh, C.dark); rect(l.x - 3, l.y - lh - 6, 8, 6, C.dark); rect(l.x - 2, l.y - lh - 5, 6, 4, C.fire[1]); rect(l.x - 1, l.y - lh - 4, 4, 2, C.fire[0]);
      rect(l.x - 4, l.y - lh - 8, 10, 2, N[4]);
    },
  };

  // stone hall: brick wall with three arches, candles and glowing mushrooms, pillars at the sides, flagstones;
  // the boss room adds the altar
  function cryptRoom(K, P, boss) {
    const { w, h, hy, cx, put, rect, ground, mix, r } = K;
    for (let y = 0; y < hy; y++) for (let x = 0; x < w; x++) {
      const row = Math.floor(y / 7), off = (row % 2) * 7, mortar = y % 7 === 0 || (x + off) % 14 === 0;
      const brick = mortar ? P.mortar : y % 7 === 1 || (x + off) % 14 === 1 ? P.hi : K.hash(Math.floor((x + off) / 14), row) < 0.2 ? P.deep : P.face;
      put(x, y, y < hy * 0.1 ? mix(x, y, P.mortar, brick, y / (hy * 0.1)) : brick);
    }
    // three arches: dark recess, lit stones on the rim; candles in the side ones
    const arches = [0.2, 0.5, 0.8].map(k => Math.round(w * k)), aw = Math.round(w * 0.12), ah = Math.round(hy * 0.62);
    for (const ax of arches) {
      const rad = aw / 2;
      for (let y = hy - ah; y < hy; y++) for (let x = ax - rad - 2; x <= ax + rad + 2; x++) {
        const dy = y - (hy - ah + rad), dx = x - ax, d = dy < 0 ? Math.hypot(dx, dy) : Math.abs(dx);
        if (d <= rad) put(x, y, d > rad - 3 ? P.deep : P.mortar);
        else if (d <= rad + 2) put(x, y, dx < 0 || dy < 0 ? P.hi : P.face);
      }
    }
    if (!boss) for (const ax of [arches[0], arches[2]]) { rect(ax - 5, hy - 12, 11, 2, P.hi); candle(K, ax - 2, hy - 12, P.hi); candle(K, ax + 3, hy - 12, P.hi); }
    // moss and glowing mushrooms along the foot of the wall
    for (let x = 0; x < w; x++) if (K.hash(x, 5) < 0.18) { const len = 1 + Math.floor(K.hash(x, 6) * 6); for (let j = 0; j < len; j++) put(x, hy - 1 - j * (K.hash(x, j) < 0.5 ? 1 : 2), P.moss[j % 2]); }
    for (let i = 0; i < 6; i++) { const x = Math.round(r() * w), base = hy - 1; rect(x, base - 2, 1, 2, P.moss[1]); rect(x - 1, base - 4, 3, 2, P.glow[1]); put(x - 1, base - 4, P.glow[0]); }
    if (boss) {
      // the altar under the middle arch
      const bx = Math.round(cx);
      const at0 = hy - 10, atw = Math.round(w * 0.2);
      rect(bx - (atw >> 1), at0, atw, 10, BATTLE_BG_C.stone[1]); rect(bx - (atw >> 1), at0, atw, 2, BATTLE_BG_C.stone[0]); rect(bx + (atw >> 1) - 3, at0 + 2, 3, 8, BATTLE_BG_C.stone[2]);
      candle(K, bx - (atw >> 1) + 4, at0, P.hi); candle(K, bx + (atw >> 1) - 4, at0, P.hi);
    }
    // flagstones, darker far away
    ground(0.13, 0.75, true, (x, y, X, Z, k, seam, c, rr) => {
      if (seam) return P.mortar;
      const base = (c + rr) % 3 === 0 ? P.floor[1] : P.floor[0];
      return k < 0.3 ? mix(x, y, P.deep, base, k / 0.3) : base;
    });
    // pillars at both sides, full height
    const pw = Math.max(8, Math.round(w * 0.05));
    for (const px of [0, w - pw]) {
      for (let y = 0; y < h; y++) for (let x = 0; x < pw; x++) put(px + x, y, x === 0 ? P.hi : x === pw - 1 || x === pw - 2 ? P.deep : (y % 24 === 0 ? P.mortar : P.face));
      rect(px - 1, Math.round(hy * 0.12), pw + 2, 3, P.hi);
    }
  }

  // The backdrop of one fight at the view size, painted at u view pixels per art pixel
  function paint(place, W, H, u = 1) {
    u = Math.max(1, Math.floor(u));
    const w = Math.ceil(W / u), h = Math.ceil(H / u), K = kit(w, h, BATTLE_PLACES.indexOf(place) * 97 + 13);
    (SCENES[place] || SCENES.cripta)(K);
    const low = document.createElement('canvas'); low.width = w; low.height = h;
    const lc = low.getContext('2d'), img = lc.createImageData(w, h);
    new Uint32Array(img.data.buffer).set(K.d); lc.putImageData(img, 0, 0);
    if (u === 1) return low;
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const oc = out.getContext('2d'); oc.imageSmoothingEnabled = false; oc.drawImage(low, 0, 0, w * u, h * u);
    return out;
  }
  return { paint };
})();

if (typeof module !== 'undefined') module.exports = { BATTLE_BG_C, BATTLE_PLACES, BATTLE_HORIZON, battlePlace };
