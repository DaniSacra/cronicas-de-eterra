// Generates src/herobody.js: the four heroes full body (48x64, front view), two idle frames and a fallen pose,
// as grids with one letter per color. Colors come from each hero's portrait (src/herofaces.js).
// Run: node docs/arte/gerador/herobody.cjs [preview.png]
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const W = 48, H = 64;

// Letters: s t u skin (light, base, shade), K skin outline; j h i hair (light, base, dark), o hair outline;
// w e f eye (white, iris, dark), n brow and mouth; b c d clothes, q clothes outline; l m legs, p legs outline;
// r boots, z boots outline; a A B cape, C cape outline; g G x metal, X metal outline; v V wood; y gold;
// E F gem or orb; T Y trim; Q belt; P blush
const HEROES = {
  aldo: { hair: 'spiky', cape: true, robe: false, weapon: 'sword',
    pal: { s: '#f0c090', t: '#d09868', u: '#a8704a', K: '#6a3020', j: '#9a6232', h: '#6a3a1a', i: '#4a2610', o: '#2a1408',
      w: '#ffffff', e: '#3a78c8', f: '#1a2a5a', n: '#2a140c', b: '#f0b050', c: '#d08a30', d: '#a0601c', q: '#5a2a08',
      l: '#7a4a24', m: '#4e2c14', p: '#2a140c', r: '#4a2610', z: '#1e140a', a: '#3a78c8', A: '#2c3c80', B: '#1c2860', C: '#151e4e',
      g: '#a2a2ac', G: '#7a7a82', x: '#55555e', X: '#26262e', v: '#6a3a1a', V: '#4a2610', y: '#e8b840', Q: '#4a2610', T: '#e8b840', Y: '#a0601c' } },
  lyra: { hair: 'long', cape: true, robe: true, weapon: 'staff',
    pal: { s: '#f4cca0', t: '#d8a478', u: '#b07c58', K: '#8a5418', j: '#fff6c0', h: '#f0d860', i: '#c89c38', o: '#8a5418',
      w: '#ffffff', e: '#a84ad8', f: '#40145a', n: '#3a1448', b: '#c880e0', c: '#a050c0', d: '#72308e', q: '#40145a',
      l: '#72308e', m: '#40145a', p: '#3a1448', r: '#40145a', z: '#3a1448', a: '#a84ad8', A: '#72308e', B: '#40145a', C: '#3a1448',
      g: '#e8eff8', G: '#a2a2ac', x: '#7a7a82', X: '#26262e', v: '#9a6232', V: '#6a3a1a', y: '#e8b840', E: '#40e0d8', F: '#ffffff',
      Q: '#e8b840', T: '#e8b840', Y: '#c89c38', P: '#f8a0a0' } },
  teo: { hair: 'messy', cape: false, robe: true, weapon: 'mace',
    pal: { s: '#e8b888', t: '#c89464', u: '#a07048', K: '#6a3a22', j: '#6a5034', h: '#3a2a1a', i: '#24180c', o: '#140c06',
      w: '#ffffff', e: '#3a9a6a', f: '#14402a', n: '#1e140a', b: '#ffffff', c: '#e8f0e8', d: '#b0bcc4', q: '#4a5a6a',
      l: '#4a8a6a', m: '#2a5440', p: '#14402a', r: '#6a3a22', z: '#2a140c', a: '#7ac09a', A: '#4a8a6a', B: '#2a5440', C: '#14402a',
      g: '#e8eff8', G: '#a2a2ac', x: '#7a7a82', X: '#26262e', v: '#9a6232', V: '#6a3a1a', y: '#e8c050', Q: '#4a8a6a', T: '#4a8a6a', Y: '#2a5440' } },
  andilla: { hair: 'bob', cape: true, robe: false, weapon: 'dagger',
    pal: { s: '#e8c0a0', t: '#c89878', u: '#a07458', K: '#5a2a24', j: '#5c5a7e', h: '#26202e', i: '#141018', o: '#060408',
      w: '#ffffff', e: '#a8323e', f: '#4a0c14', n: '#120c14', b: '#a2a2ac', c: '#7a7a82', d: '#55555e', q: '#26262e',
      l: '#26262e', m: '#141018', p: '#060408', r: '#4a2610', z: '#1e140a', a: '#a2a2ac', A: '#7a7a82', B: '#55555e', C: '#26262e',
      g: '#e8eff8', G: '#a2a2ac', x: '#7a7a82', X: '#26262e', v: '#7a1a24', V: '#4a0c14', y: '#f0c850', Q: '#4a2610', T: '#a8323e', Y: '#7a1a24' } },
};
// outline letter for each filled letter (the darkest tone of its own family, never black)
const OUT = { s: 'K', t: 'K', u: 'K', j: 'o', h: 'o', i: 'o', b: 'q', c: 'q', d: 'q', T: 'q', Y: 'q', Q: 'q', l: 'p', m: 'p',
  r: 'z', a: 'C', A: 'C', B: 'C', g: 'X', G: 'X', x: 'X', y: 'X', v: 'X', V: 'X', E: 'X', F: 'X', w: 'K', e: 'K', f: 'K', n: 'K', P: 'K' };

function grid() {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const set = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
  const get = (x, y) => (g[y] || [])[x];
  // horizontal span shaded light (left) to dark (right)
  const span = (y, x0, x1, [L, B, D], lk = 0.22, dk = 0.72) => {
    x0 = Math.round(x0); x1 = Math.round(x1);
    for (let x = x0; x <= x1; x++) { const k = (x - x0) / Math.max(1, x1 - x0); set(x, y, k < lk ? L : k > dk ? D : B); }
  };
  const ell = (cx, cy, rx, ry, [L, B, D], keep = () => true) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny;
      if (r > 1 || !keep(x, y)) continue;
      set(x, y, nx + ny < -0.55 && r > 0.3 ? L : nx + ny > 0.55 || (r > 0.72 && nx > 0.1) ? D : B);
    }
  };
  const outline = () => {
    const src = g.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y][x] !== '.') continue;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const n = (src[y + dy] || [])[x + dx];
        if (n && n !== '.' && OUT[n]) { g[y][x] = OUT[n]; break; }
      }
    }
  };
  return { g, set, get, span, ell, outline, rows: () => g.map(r => r.join('')) };
}

function body(id, frame) {
  const D = HEROES[id], G = grid(), up = frame ? 1 : 0, wind = frame; // breathing: the upper body sinks one pixel
  const U = y => y + up; // upper body rows
  // cape behind the body, a little wider at the hem; the hem moves with the wind
  if (D.cape) for (let y = 26; y <= 57; y++) { const k = (y - 26) * 0.22; G.span(U(y), 13 - k, 34 + k + (y > 50 ? wind : 0), ['a', 'A', 'B'], 0.18, 0.6); }
  // long hair behind the shoulders (Lyra)
  if (D.hair === 'long') for (let y = 12; y <= 44; y++) G.span(U(y), 13 - (y > 30 ? 1 : 0), 34 + (y > 36 ? wind : 0), ['j', 'h', 'i'], 0.2, 0.75);
  // legs and boots, or the robe with the boots peeking out
  if (D.robe) {
    for (let y = 41; y <= 59; y++) { const half = 8 + Math.floor((y - 41) * 0.25); G.span(y, 23.5 - half, 23.5 + half, ['b', 'c', 'd']); }
    for (let x = 16; x <= 31; x++) if (x % 3 === 1) G.set(x, 59, 'T'); // hem trim
    for (const x0 of [18, 26]) for (let y = 60; y <= 62; y++) G.span(y, x0, x0 + 3, ['r', 'r', 'z'], 0, 0.8);
  } else {
    for (const x0 of [18, 25]) for (let y = 43; y <= 56; y++) G.span(y, x0, x0 + 4, ['l', 'l', 'm'], 0, 0.6);
    for (const x0 of [17, 25]) for (let y = 56; y <= 62; y++) G.span(y, x0, x0 + 5 + (y > 59 ? 1 : 0), ['r', 'r', 'z'], 0, 0.8);
  }
  // torso: round shoulders, narrower waist
  for (let y = 26; y <= 42; y++) { const half = y === 26 ? 6 : y === 27 ? 7.5 : y < 37 ? 8.5 : 7.5; G.span(U(y), 23.5 - half, 23.5 + half, ['b', 'c', 'd'], 0.25, 0.7); }
  for (let x = 16; x <= 31; x++) { G.set(x, U(41), 'Q'); G.set(x, U(42), 'Q'); } // belt
  G.set(23, U(41), 'y'); G.set(24, U(41), 'y'); G.set(23, U(42), 'y'); G.set(24, U(42), 'y'); // buckle
  // identity details on the chest
  if (id === 'aldo') for (let i = 0; i < 13; i++) G.set(17 + i, U(28 + i), 'Y'); // the strap of the scabbard
  if (id === 'teo') for (let y = 27; y <= 46; y++) for (const x of [20, 21, 26, 27]) G.set(x, U(y), x % 2 ? 'B' : 'A'); // green stole
  if (id === 'lyra') for (let x = 19; x <= 28; x++) G.set(x, U(27), x % 2 ? 'T' : 'Y'); // gold collar
  if (id === 'andilla') { for (let y = 26; y <= 30; y++) G.span(U(y), 18 + (y - 26) * 0.5, 29 - (y - 26) * 0.5, ['T', 'T', 'Y']); } // red scarf
  // arms: the left one lit, the right one in shade, hands in skin
  for (let y = 28; y <= 39; y++) { G.span(U(y), 13, 15, ['b', 'c', 'c']); G.span(U(y), 32, 34, ['c', 'd', 'd']); }
  for (let y = 40; y <= 42; y++) { G.span(U(y), 13, 15, ['s', 't', 't']); G.span(U(y), 32, 34, ['t', 't', 'u']); }
  // neck
  for (let y = 23; y <= 26; y++) G.span(U(y), 22, 25, ['t', 't', 'u']);
  // head: the face first, then the hair over it
  G.ell(23.5, U(15), 8.6, 9.4, ['s', 's', 't']);
  for (let y = 18; y <= 22; y++) G.set(31, U(y), 'u'); // cheek shade on the right
  const hair = ['j', 'h', 'i'];
  G.ell(23.5, U(11.5), 10, 8.2, hair, (x, y) => y <= U(12)); // crown
  if (D.hair === 'spiky') {
    for (const [x, y] of [[15, 3], [18, 1], [22, 0], [26, 1], [30, 2], [33, 5], [13, 7]]) { G.set(x, U(y), 'h'); G.set(x + 1, U(y + 1), 'h'); G.set(x, U(y + 1), 'j'); }
    for (let x = 15; x <= 32; x++) { const d = [2, 3, 1, 2, 3, 2][x % 6]; for (let y = 12; y <= 12 + d; y++) G.set(x, U(y), x < 20 ? 'h' : 'i'); }
    for (let y = 12; y <= 19; y++) { G.set(14, U(y), 'h'); G.set(15, U(y), 'h'); G.set(32, U(y), 'i'); G.set(33, U(y), 'i'); }
  } else if (D.hair === 'long') {
    for (let x = 15; x <= 32; x++) { const d = x === 23 || x === 24 ? 0 : x % 4 === 0 ? 2 : 1; for (let y = 12; y <= 12 + d; y++) G.set(x, U(y), x < 22 ? 'j' : 'h'); }
    for (let y = 12; y <= 34; y++) { G.span(U(y), 13, 15, ['j', 'h', 'h']); G.span(U(y), 32, 34 + (y > 28 ? wind : 0), ['h', 'h', 'i']); }
    for (let x = 15; x <= 32; x++) G.set(x, U(10), 'y'); // circlet
    G.set(23, U(10), 'E'); G.set(24, U(10), 'E'); G.set(23, U(9), 'F');
  } else if (D.hair === 'messy') {
    for (const [x, y] of [[17, 3], [21, 2], [25, 2], [29, 3]]) { G.set(x, U(y), 'h'); G.set(x + 1, U(y), 'j'); }
    for (let x = 15; x <= 32; x++) { const d = [1, 2, 3, 1, 2][x % 5]; for (let y = 12; y <= 12 + d; y++) G.set(x, U(y), x < 20 ? 'j' : 'h'); }
    for (let y = 12; y <= 17; y++) { G.set(15, U(y), 'h'); G.set(32, U(y), 'i'); }
  } else { // bob swept to one side, down to the jaw
    for (let x = 15; x <= 32; x++) { const d = Math.max(0, Math.round(4 - (x - 15) * 0.3)); for (let y = 12; y <= 12 + d; y++) G.set(x, U(y), x < 20 ? 'j' : 'h'); }
    for (let y = 12; y <= 23; y++) { G.span(U(y), 13, 15, ['j', 'h', 'h']); G.span(U(y), 32, 34, ['h', 'i', 'i']); }
    G.set(32, U(24), 'y'); G.set(33, U(22), 'y'); // earring
  }
  // eyes: dark lid, iris with a white glint at the top left; brows; nose and mouth
  for (const x0 of [18, 27]) {
    G.set(x0, U(16), 'f'); G.set(x0 + 1, U(16), 'f'); G.set(x0 + 2, U(16), 'f');
    G.set(x0, U(17), 'w'); G.set(x0 + 1, U(17), 'e'); G.set(x0 + 2, U(17), 'f');
    G.set(x0, U(18), 'e'); G.set(x0 + 1, U(18), 'e'); G.set(x0 + 2, U(18), 'f');
  }
  G.set(24, U(20), 'u'); G.set(23, U(22), 'n'); G.set(24, U(22), 'n');
  if (id === 'lyra') { G.set(17, U(20), 'P'); G.set(30, U(20), 'P'); }
  if (id === 'andilla') { G.set(22, U(22), 'n'); G.set(25, U(21), 'n'); } // half smile
  // weapon in the hand on the right
  const hy = U(41);
  if (D.weapon === 'sword') {
    for (let y = hy - 22; y <= hy - 2; y++) { G.set(36, y, 'g'); G.set(37, y, 'G'); }
    G.set(36, hy - 23, 'g');
    for (let x = 33; x <= 40; x++) G.set(x, hy - 1, 'y');
    for (let y = hy; y <= hy + 2; y++) { G.set(36, y, 'v'); G.set(37, y, 'V'); }
    G.set(36, hy + 3, 'y'); G.set(37, hy + 3, 'y');
  } else if (D.weapon === 'staff') {
    for (let y = 14; y <= 62; y++) { G.set(36, y, 'v'); G.set(37, y, 'V'); }
    G.ell(36.5, 10, 3.2, 3.2, ['F', 'E', 'E']);
    G.set(36, 14, 'y'); G.set(37, 14, 'y');
  } else if (D.weapon === 'mace') {
    for (let y = hy - 8; y <= hy + 6; y++) { G.set(36, y, 'v'); G.set(37, y, 'V'); }
    G.ell(36.5, hy - 11, 3.4, 3, ['g', 'G', 'x']);
    for (let x = 34; x <= 39; x++) G.set(x, hy - 8, 'y');
  } else {
    for (let y = hy - 1; y <= hy + 2; y++) { G.set(36, y, 'v'); G.set(37, y, 'V'); }
    for (let x = 34; x <= 39; x++) G.set(x, hy + 3, 'y');
    for (let y = hy + 4; y <= hy + 11; y++) { G.set(36, y, 'g'); G.set(37, y, y > hy + 9 ? '.' : 'G'); }
  }
  // the hand closes over the grip
  for (let y = 40; y <= 42; y++) G.span(U(y), 34, 36, ['t', 't', 'u']);
  G.outline();
  return G.rows();
}

// Fallen: the same body kneeling (thighs folded away, everything sinks 8 rows), in the greys of the palette
const GREYS = ['#e8eff8', '#a2a2ac', '#7a7a82', '#55555e', '#26262e'];
const luma = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const grey = hex => GREYS[Math.min(4, Math.max(1, Math.round((1 - luma(hex)) * 4.4)))]; // never the lightest: a fallen hero looks dim
function fallen(rows) {
  const cut = rows.slice(0, 45).concat(rows.slice(53));
  return Array(8).fill('.'.repeat(W)).concat(cut);
}

const out = {};
for (const id of Object.keys(HEROES)) {
  const pal = HEROES[id].pal, f0 = body(id, 0), f1 = body(id, 1);
  out[id] = { frames: [f0, f1], pal };
  out[id + 'Ko'] = { rows: fallen(f0), pal: Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, grey(v)])) };
}

const js = `// ===== Heroes full body (48x64, front view), for the Heroes screen (src/equipview.js) =====
// GENERATED by docs/arte/gerador/herobody.cjs: change the generator, not this file.
// Two idle frames (breathing, cape and hair in the wind) and a fallen pose (kneeling, in grey).
const HERO_BODY = {
${Object.entries(out).map(([k, d]) => `  ${k}: {\n    pal: ${JSON.stringify(d.pal)},\n    ${d.frames ? `frames: [\n${d.frames.map(f => '      [\n' + f.map(r => `        '${r}',`).join('\n') + '\n      ],').join('\n')}\n    ]` : `rows: [\n${d.rows.map(r => `      '${r}',`).join('\n')}\n    ]`},\n  },`).join('\n')}
};

// What the equipment found changes on the sprite: a swap of colors, never a new grid (docs/arte/estilo.md)
const GEAR_LOOK = {
  espadaFerro:  { g: '#e8eff8', G: '#a2a2ac', x: '#7a7a82' },
  espadaPrata:  { g: '#ffffff', G: '#cbd8ec', x: '#a4b8da', y: '#f0d860' },
  cotaMalha:    { b: '#cbd8ec', c: '#a4b8da', d: '#7488b8', q: '#4a5a8c' },
  cajadoRunico: { E: '#f0a8f8', F: '#ffffff', v: '#72308e', V: '#40145a' },
  mantoSagrado: { a: '#f0d860', A: '#e8b840', B: '#c89c38', T: '#e8b840' },
};

if (typeof module !== 'undefined') module.exports = { HERO_BODY, GEAR_LOOK };
`;
fs.writeFileSync(path.join(__dirname, '../../../src/herobody.js'), js);

// optional preview, 6x: the four heroes, both frames and fallen
const prev = process.argv[2];
if (prev) {
  const S = 6, defs = Object.keys(HEROES).flatMap(id => [[out[id], 0], [out[id], 1], [out[id + 'Ko'], 0]]);
  const PW = defs.length * (W + 4), PH = H;
  const raw = Buffer.alloc((PW * S * 4 + 1) * PH * S);
  for (let Y = 0; Y < PH * S; Y++) {
    raw[Y * (PW * S * 4 + 1)] = 0;
    for (let X = 0; X < PW * S; X++) {
      const x = Math.floor(X / S), y = Math.floor(Y / S), i = Math.floor(x / (W + 4)), lx = x % (W + 4);
      let c = [70, 60, 110];
      if (lx < W && defs[i]) { const [d, f] = defs[i], ch = (d.frames ? d.frames[f] : d.rows)[y][lx]; if (ch !== '.') { const n = parseInt(d.pal[ch].slice(1), 16); c = [n >> 16, (n >> 8) & 255, n & 255]; } }
      raw.set([...c, 255], Y * (PW * S * 4 + 1) + 1 + X * 4);
    }
  }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let r = 0xffffffff; for (const v of b) r = crcT[(r ^ v) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(PW * S, 0); ih.writeUInt32BE(PH * S, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync(prev, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
