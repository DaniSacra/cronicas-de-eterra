// Story NPC portraits as 32x32 grids in the style of the hero faces (src/herofaces.js).
// Layers, back to front: back hair, clothes, neck, face, front hair, beard, hat. Each layer is a mask drawn
// with simple shapes and auto-shaded with 4 tones (light from the top left) plus an outline in its own darkest tone.
// Run: node docs/arte/gerador/faces.cjs  (rewrites src/npcfaces.js)
const fs = require('fs');
const W = 32, H = 32;

const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const grid = () => Array.from({ length: H }, () => Array(W).fill(null));
const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const any = (...fs) => (x, y) => fs.some(f => f(x, y));
const not = (f, g) => (x, y) => f(x, y) && !g(x, y);
const trap = (y0, y1, xa0, xa1, xb0, xb1) => (x, y) => { if (y < y0 || y > y1) return false; const k = (y - y0) / Math.max(1, y1 - y0); return x >= Math.round(xa0 + (xb0 - xa0) * k) && x <= Math.round(xa1 + (xb1 - xa1) * k); };

// Face: eyes, nose and mouth in the hero layout (rows 12-21 follow Aldo's face)
const FACE_ROWS = {
  7: '...........ssssssssst...........',
  8: '..........ssssssssssst..........',
  9: '.........sssssssssssstt.........',
  10: '.........sssssssssssstt.........',
  11: '.........sssssssssssstt.........',
  12: '.........sstnnnssssnnnt.........',
  13: '.........swwfessssefwwt.........',
  14: '.........swefessssefewt.........',
  15: '.........sssggssssssggst........',
  16: '.........sstsssssssststo........',
  17: '.........osssssstssssto.........',
  18: '.........ossssssutsssto.........',
  19: '..........osssmmmsstto..........',
  20: '...........osssssstto...........',
  21: '............osssstto............',
};
const OLD_EYES = { 13: '.........stfffssssfffst.........', 14: '.........sssssssssssstt.........', 15: '.........sttsssssssstto........' };
const NECK = rect(13, 21, 18, 25);

function shadeLayer(mask, letters, opt = {}) {
  // letters: [light, base, shade, outline]
  const cells = grid();
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask(x, y)) { cells[y][x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const out = grid();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!cells[y][x]) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= W || Y >= H || !cells[Y][X]; });
    if (edge && !opt.noOutline) { out[y][x] = letters[3]; continue; }
    const nx = (x - x0) / Math.max(1, x1 - x0) - 0.5, ny = (y - y0) / Math.max(1, y1 - y0) - 0.5;
    let L = -(nx * 0.9 + ny * 1.1) + (((x + y) & 1) ? 0.06 : -0.06);
    if (opt.strands && (x + Math.floor(y / 3)) % 4 === 0) L -= 0.35; // mechas
    out[y][x] = letters[L > 0.45 ? 0 : L > -0.25 ? 1 : 2];
  }
  return out;
}
const over = (dst, src) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src[y][x]) dst[y][x] = src[y][x]; };

const FACE_SET = new Set('stunwefgmoP');
function build(d) {
  const img = grid();
  const hair = ['H', 'h', 'i', 'k'], cloth = ['b', 'c', 'd', 'q'], hat = ['A', 'B', 'C', 'D'];
  if (d.backHair) over(img, shadeLayer(d.backHair, hair, { strands: true }));
  over(img, shadeLayer(d.clothes, cloth));
  if (d.trim) for (const [y, x, s] of d.trim) for (let i = 0; i < s.length; i++) if (s[i] !== '.') img[y][x + i] = s[i];
  // neck in the shade of the chin
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (NECK(x, y) && !(y >= 24 && img[y][x])) img[y][x] = x >= 17 ? 'u' : 't';
  if (d.bald) over(img, shadeLayer(not(ell(15.5, 9.5, 7.8, 7.6), rect(0, 12, 31, 31)), ['S', 's', 't', 'o'])); // careca: o alto da cabeça é pele
  const rows = Object.assign({}, FACE_ROWS, d.old ? OLD_EYES : {});
  for (const [y, row] of Object.entries(rows)) for (let x = 0; x < W; x++) if (row[x] !== '.') img[+y][x] = row[x];
  if (d.blush) { img[16][10] = img[16][11] = 'P'; img[16][20] = img[16][21] = 'P'; }
  if (d.frontHair) over(img, shadeLayer(d.frontHair, hair, { strands: true }));
  if (d.beard) over(img, shadeLayer(d.beard, hair, { strands: true }));
  if (d.hat) over(img, shadeLayer(d.hat, hat));
  if (d.marks) for (const [y, x, s] of d.marks) for (let i = 0; i < s.length; i++) if (s[i] !== '.') img[y][x + i] = s[i];
  const rowsOut = img.map(r => r.map(c => c || '.').join(''));
  const used = new Set(rowsOut.join(''));
  const pal = {};
  for (const [k, v] of Object.entries(d.pal)) if (used.has(k)) pal[k] = v;
  for (const ch of used) if (ch !== '.' && !pal[ch]) throw new Error(`${d.id}: letter ${ch} has no color`);
  return { pal, rows: rowsOut };
}

// Shared shapes
const SHOULDERS = trap(24, 31, 9, 22, 1, 30);
const SKULL = ell(15.5, 9.5, 8.6, 7.6);
const fringe = (yBase, teeth) => (x, y) => x >= 8 && x <= 23 && y >= 3 && y <= yBase + (((x + teeth) % 3) === 0 ? 1 : 0) - (x > 13 && x < 18 ? 1 : 0);

const NPCS = {
  // Berta, a taverneira: coque ruivo, bochechas coradas, vestido vermelho e avental branco
  berta: {
    pal: { H: '#e0a030', h: '#a0601c', i: '#6a3020', k: '#3a2010', s: '#f0c090', t: '#d09868', u: '#a8704a', o: '#6a3020', n: '#6a3020',
      w: '#ffffff', e: '#9a6232', f: '#2a140c', g: '#d8a478', m: '#8a3a2a', P: '#f8a0a0', b: '#e86a7a', c: '#a8323e', d: '#7a1a24', q: '#4a0c14',
      x: '#ffffff', y: '#e8f0e8', v: '#b0bcc4' },
    backHair: any(ell(15.5, 2.6, 4.2, 3.2), ell(15.5, 9.5, 9.2, 8)),
    clothes: SHOULDERS,
    trim: [[24, 10, 'x'], [24, 21, 'x'], [25, 10, 'x'], [25, 21, 'x'], [26, 10, 'x'], [26, 21, 'x'], [27, 11, 'xxxxxxxxxx'], [28, 11, 'xyyyyyyyyx'], [29, 11, 'xyyyyyyyyv'], [30, 11, 'xyyyyyyyyv'], [31, 11, 'xyyyyyyyyv']],
    frontHair: any(not(SKULL, rect(9, 11, 22, 31)), fringe(9, 0), rect(7, 9, 9, 15), rect(22, 9, 24, 15)),
    blush: 1,
  },
  // Clara, a moça do livro: cabelo castanho comprido preso com fita amarela, olhos azuis, vestido azul de gola branca
  clara: {
    pal: { H: '#a87040', h: '#7a4a24', i: '#4e2c14', k: '#2a1408', s: '#f4cca0', t: '#d8a478', u: '#b07c58', o: '#6a3a1a', n: '#4e2c14',
      w: '#ffffff', e: '#3a78c8', f: '#1a2a5a', g: '#8ac0f0', m: '#9a3a40', P: '#f8a0a0', b: '#8ac0f0', c: '#3a78c8', d: '#2c3c80', q: '#1c2860',
      x: '#e8f0e8', y: '#b0bcc4', v: '#f0d860' },
    backHair: any(rect(6, 9, 9, 28), rect(22, 9, 25, 28), ell(15.5, 9.5, 9.6, 8.4)),
    clothes: SHOULDERS,
    trim: [[24, 11, 'xx......xx'], [25, 10, 'xxxx....xxxx'], [26, 11, 'yxx..xxy'.padEnd(10, '.')], [26, 14, 'vvvv'], [27, 15, 'vv']],
    frontHair: any(not(SKULL, rect(9, 11, 22, 31)), fringe(10, 1), rect(8, 10, 9, 18), rect(22, 10, 23, 18)),
    marks: [[8, 23, 'vv'], [9, 23, 'v']],
    blush: 1,
  },
  // Hugo, o guarda: elmo de ferro com pluma vermelha, bigode grisalho, sobrancelhas grossas, cota de malha
  hugo: {
    pal: { H: '#b0bcc4', h: '#a2a2ac', i: '#7a7a82', k: '#55555e', s: '#e8b888', t: '#c89464', u: '#a07048', o: '#6a3a22', n: '#55555e',
      w: '#ffffff', e: '#6a5034', f: '#1e140a', g: '#c89878', m: '#8a4a3a', b: '#b0bcc4', c: '#7a7a82', d: '#55555e', q: '#26262e',
      A: '#e8f0e8', B: '#a2a2ac', C: '#7a7a82', D: '#26262e', x: '#a8323e', y: '#7a1a24', v: '#e8b840' },
    clothes: SHOULDERS,
    trim: [[24, 13, 'xxxxxx'], [25, 12, 'xyyyyyyx'], [26, 12, 'xyyvvyyx'], [27, 12, 'xyyyyyyx'], [28, 12, 'xyyyyyyx'], [29, 12, 'xyyyyyyx'], [30, 12, 'xyyyyyyx'], [31, 12, 'xyyyyyyx']],
    frontHair: any(rect(8, 11, 9, 15), rect(22, 11, 23, 15)),
    beard: any(rect(12, 18, 19, 18), rect(11, 19, 13, 19), rect(18, 19, 20, 19)),
    hat: any(not(ell(15.5, 9, 9.4, 8), rect(0, 11, 31, 31)), rect(7, 10, 24, 11), rect(7, 12, 9, 16), rect(22, 12, 24, 16), rect(15, 0, 16, 2)),
    marks: [[0, 14, 'xxxx'], [1, 13, 'xxxxxx'], [2, 14, 'yyyy'], [11, 11, 'nnnn'], [11, 17, 'nnnn']],
  },
  // O ancião Bertoldo: careca de sobrancelhas brancas, barba longa, túnica verde com gola dourada
  bertoldo: {
    pal: { H: '#ffffff', h: '#e8f0e8', i: '#b0bcc4', k: '#7a7a82', s: '#e8c0a0', t: '#c89878', u: '#a07458', o: '#6a3a22', n: '#b0bcc4',
      w: '#ffffff', e: '#3a9a6a', f: '#1e140a', g: '#c89878', m: '#a07458', b: '#3a9a6a', c: '#2a5440', d: '#14402a', q: '#103630',
      x: '#e8b840', y: '#c89c38', v: '#f0d860', S: '#f4cca0' },
    clothes: SHOULDERS,
    trim: [[24, 10, 'x..........x'], [25, 9, 'xy..........yx'], [26, 8, 'xyy..........yyx'.slice(0, 16)], [27, 7, 'vy'], [27, 23, 'yv']],
    frontHair: any(ell(8.5, 13, 2.2, 3.6), ell(22.5, 13, 2.2, 3.6)),
    beard: any(ell(15.5, 23, 5.6, 6.8), rect(12, 18, 19, 19)),
    old: 1, bald: 1,
    // rugas na testa e sobrancelhas brancas e grossas
    marks: [[9, 12, 'tttt'], [10, 14, 'tttt'], [12, 11, 'nnnn'], [12, 17, 'nnnn'], [11, 10, 'nn'], [11, 20, 'nn']],
  },
};

const BG = { berta: ['#62202e', '#541a28', '#461622', '#38111c'], clara: ['#2c3c80', '#243270', '#1c2860', '#151e4e'],
  hugo: ['#4a5a6a', '#26262e', '#26262e', '#141018'], bertoldo: ['#432c78', '#38246a', '#2e1e5a', '#24184a'] };

const q = s => `'${s}'`;
let out = `// Story NPC portraits, 32x32 grids in the hero-face style. Generated by docs/arte/gerador/faces.cjs: edit there, then rerun.
const NPC_FACES = {\n`;
for (const [id, d] of Object.entries(NPCS)) {
  const f = build(Object.assign({ id }, d));
  out += `  ${id}: {\n    pal: { ${Object.entries(f.pal).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} },\n    bg: [${BG[id].map(q).join(', ')}],\n    rows: [\n${f.rows.map(r => `      ${q(r)},`).join('\n')}\n    ],\n  },\n`;
}
out += `};\n\nif (typeof module !== 'undefined') module.exports = { NPC_FACES };\n`;
fs.writeFileSync(__dirname + '/../../../src/npcfaces.js', out);
console.log('ok', Object.keys(NPCS).join(' '));
