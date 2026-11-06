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
    let L = -(nx * 0.9 + ny * 1.1) + (opt.smooth ? 0 : ((x + y) & 1) ? 0.06 : -0.06); // big flat shapes skip the dither seam
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
  if (d.clothes) over(img, shadeLayer(d.clothes, cloth));
  if (d.trim) for (const [y, x, s] of d.trim) for (let i = 0; i < s.length; i++) if (s[i] !== '.') img[y][x + i] = s[i];
  // neck in the shade of the chin
  if (!d.noFace) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (NECK(x, y) && !(y >= 24 && img[y][x])) img[y][x] = x >= 17 ? 'u' : 't';
  if (d.bald) over(img, shadeLayer(not(ell(15.5, 9.5, 7.8, 7.6), rect(0, 12, 31, 31)), ['S', 's', 't', 'o'])); // careca: o alto da cabeça é pele
  const rows = Object.assign({}, FACE_ROWS, d.old ? OLD_EYES : {});
  if (!d.noFace) for (const [y, row] of Object.entries(rows)) for (let x = 0; x < W; x++) if (row[x] !== '.') img[+y][x] = row[x];
  if (d.blush) { img[16][10] = img[16][11] = 'P'; img[16][20] = img[16][21] = 'P'; }
  if (d.frontHair) over(img, shadeLayer(d.frontHair, hair, { strands: true }));
  if (d.beard) over(img, shadeLayer(d.beard, hair, { strands: true }));
  if (d.hat) over(img, shadeLayer(d.hat, hat, d.hatOpt));
  // flat fills (a shadowed hood opening): [mask, letter]
  for (const [mask, ch] of d.fills || []) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask(x, y)) img[y][x] = ch;
  // extra layers over the hat (veil band, skull, crown, bell): [mask, 4 letters, options]
  for (const [mask, letters, opt] of d.top || []) over(img, shadeLayer(mask, letters, opt));
  for (const [mask, ch] of d.post || []) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask(x, y)) img[y][x] = ch;
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

// The rest of the cast. Ramps go light to dark; R spreads one over four letters.
const R = (letters, ramp) => Object.fromEntries([...letters].map((l, i) => [l, ramp[i]]));
const SK = {
  fair: { s: '#f4cca0', t: '#d8a478', u: '#b07c58', o: '#6a3a1a', g: '#d8a478', S: '#ffffff' },
  warm: { s: '#f0c090', t: '#d09868', u: '#a8704a', o: '#6a3020', g: '#d8a478', S: '#f4cca0' },
  ruddy: { s: '#e8b888', t: '#c89464', u: '#a07048', o: '#6a3a22', g: '#c89878', S: '#f4cca0' },
  tan: { s: '#d8a478', t: '#b07c58', u: '#9a6232', o: '#4a2610', g: '#b07c58', S: '#f0c090' },
  old: { s: '#e8c0a0', t: '#c89878', u: '#a07458', o: '#6a3a22', g: '#c89878', S: '#f4cca0' },
};
const FACE = { w: '#ffffff', f: '#1e140a', m: '#8a3a2a', P: '#f8a0a0' };
const HR = { white: ['#ffffff', '#e8f0e8', '#b0bcc4', '#7a7a82'], brown: ['#a87040', '#7a4a24', '#4e2c14', '#2a1408'],
  dark: ['#4e2c14', '#2a1408', '#24180c', '#060408'], orange: ['#f0b050', '#d08a30', '#a0601c', '#5a2a08'],
  auburn: ['#a8704a', '#8a3a2a', '#5a2a24', '#2a140c'] };
const CL = { green: ['#4ad08a', '#3a9a6a', '#2a5440', '#14402a'], blue: ['#8ac0f0', '#3a78c8', '#2c3c80', '#1c2860'],
  navy: ['#3a78c8', '#2c3c80', '#1c2860', '#151e4e'], red: ['#e86a7a', '#a8323e', '#7a1a24', '#4a0c14'],
  lilac: ['#f0a8f8', '#c880e0', '#a050c0', '#72308e'], purple: ['#a84ad8', '#72308e', '#40145a', '#3a1448'],
  gold: ['#f0d860', '#e8b840', '#c89c38', '#8a5418'], brown: ['#b07c58', '#9a6232', '#6a3a1a', '#4a2610'],
  gray: ['#a2a2ac', '#7a7a82', '#55555e', '#26262e'], white: ['#ffffff', '#e8f0e8', '#b0bcc4', '#7a7a82'],
  shadow: ['#5c5a7e', '#3a1a40', '#26202e', '#120c14'], bone: ['#ffffff', '#e8f0e8', '#b0bcc4', '#55555e'],
  sun: ['#fff6c0', '#f0d860', '#e8b840', '#8a5418'], paper: ['#fff6c0', '#f4cca0', '#d8a478', '#9a6232'],
  stone: ['#b0bcc4', '#a2a2ac', '#7a7a82', '#55555e'] };
const BGS = { blue: ['#2c3c80', '#243270', '#1c2860', '#151e4e'], purple: ['#432c78', '#38246a', '#2e1e5a', '#24184a'],
  wine: ['#62202e', '#541a28', '#461622', '#38111c'], sea: ['#205e54', '#1a5048', '#15433c', '#103630'],
  steel: ['#5c5a7e', '#4a5a6a', '#26262e', '#141018'], earth: ['#6a3a22', '#5a2a24', '#4a2610', '#3a2010'],
  moss: ['#2a5440', '#1a5048', '#15433c', '#103630'], ice: ['#7488b8', '#4a5a8c', '#2c3c80', '#1c2860'],
  night: ['#1a2a5a', '#1c2860', '#151e4e', '#141018'], dusk: ['#40145a', '#3a1448', '#3a1a40', '#24184a'],
  ember: ['#8a5418', '#5a2a08', '#4a2610', '#3a2010'], dark: ['#38111c', '#26202e', '#141018', '#060408'],
  tomb: ['#14402a', '#103630', '#120c14', '#060408'], deep: ['#1c2860', '#151e4e', '#141018', '#060408'] };
// skin + hair + clothes (+ hat) + iris, brows in the hair shade
const look = (skin, hair, cloth, iris, ...more) => Object.assign({}, FACE, SK[skin], R('Hhik', HR[hair]), R('bcdq', CL[cloth]),
  { n: HR[hair][2], e: iris }, ...more);
const SHORT = fy => any(not(SKULL, rect(9, 11, 22, 31)), fringe(fy, 2), rect(8, 9, 9, 14), rect(22, 9, 23, 14));
const LONG_BACK = any(rect(6, 9, 9, 28), rect(22, 9, 25, 28), ell(15.5, 9.5, 9.6, 8.4));
const LONG_FRONT = any(not(SKULL, rect(9, 11, 22, 31)), fringe(10, 1), rect(8, 10, 9, 18), rect(22, 10, 23, 18));
const BUN_BACK = any(ell(15.5, 2.6, 4.2, 3.2), ell(15.5, 9.5, 9.2, 8));
const BUN_FRONT = any(not(SKULL, rect(9, 11, 22, 31)), fringe(9, 0), rect(7, 9, 9, 15), rect(22, 9, 24, 15));
const SIDES = any(rect(8, 11, 9, 15), rect(22, 11, 23, 15));
const MUSTACHE = any(rect(12, 18, 19, 18), rect(11, 19, 13, 19), rect(18, 19, 20, 19));
const col = (x0, x1, y0, y1, ch) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [y0 + i, x0, ch.repeat(x1 - x0 + 1)]);
// a skull under a hood: the face opening is shadow, then bone, sockets, eyes, nose and teeth
const SKULL_FACE = any(ell(15.5, 13.5, 5.6, 6.2), rect(12, 18, 19, 21));
const skullFills = () => [[any(rect(11, 12, 14, 14), rect(17, 12, 20, 14)), 'Z'], [any(rect(12, 13, 13, 13), rect(18, 13, 19, 13)), 'E'],
  [any(rect(15, 16, 16, 17)), 'Z'], [(x, y) => y === 20 && x >= 12 && x <= 19 && x % 2 === 0, 'Z']];
const hood = (cy, open) => not(any(ell(15.5, cy, 10.5, 11), trap(18, 31, 5, 26, 2, 29)), open);

Object.assign(NPCS, {
  // Ana, a fiandeira: lenço dourado amarrado no queixo, cabelo branco escapando, vestido marrom
  ana: { bg: BGS.earth, old: 1, pal: look('old', 'white', 'brown', '#9a6232', R('ABCD', CL.gold), { x: '#e8b840' }),
    clothes: SHOULDERS, trim: [[24, 12, 'x......x'], [25, 11, 'x........x']],
    frontHair: any(rect(10, 10, 12, 11), rect(19, 10, 21, 11)),
    hat: any(not(ell(15.5, 9, 9.2, 8.2), rect(0, 10, 31, 31)), rect(7, 9, 9, 18), rect(22, 9, 24, 18), rect(13, 22, 18, 23)) },
  // Rui, o lavrador: chapéu de palha com fita vermelha, barba por fazer, camisa verde e suspensório azul
  rui: { bg: BGS.moss, pal: look('tan', 'dark', 'green', '#6a3a1a', R('ABCD', CL.sun), { x: '#a8323e', y: '#3a78c8', z: '#9a6232' }),
    clothes: SHOULDERS, frontHair: SIDES,
    trim: [...col(11, 12, 25, 31, 'y'), ...col(19, 20, 25, 31, 'y')],
    hat: any(ell(15.5, 8.5, 13.5, 2.3), not(ell(15.5, 7, 7.2, 6.5), rect(0, 8, 31, 31))),
    marks: [[6, 10, 'xxxxxxxxxxxx'], [17, 10, 'z'], [17, 21, 'z'], [19, 11, 'z.z'], [19, 18, 'z.z'], [20, 12, 'z.z.z.z']] },
  // Bruno, soldado de folga: careca, bigode, colete cinza sobre a camisa clara
  bruno: { bg: BGS.steel, bald: 1, pal: look('ruddy', 'brown', 'gray', '#6a5034', { x: '#e8f0e8', y: '#b0bcc4' }),
    clothes: SHOULDERS, frontHair: any(rect(8, 12, 9, 14), rect(22, 12, 23, 14)), beard: MUSTACHE,
    trim: [[24, 13, 'xxxxxx'], ...col(13, 14, 25, 31, 'x'), ...col(15, 18, 25, 31, 'y')] },
  // Caio, soldado de folga: cabelo curto escuro, túnica azul com a insígnia dourada
  caio: { bg: BGS.night, pal: look('tan', 'dark', 'navy', '#4e2c14', { v: '#f0d860', x: '#c89c38' }),
    clothes: SHOULDERS, frontHair: SHORT(9), trim: [[27, 14, 'vvvv'], [28, 14, 'xvvx'], [29, 15, 'xx']] },
  // Tobias, o mensageiro: pálido, atadura na testa com sangue, camisa branca e alça da bolsa
  tobias: { bg: BGS.ice, pal: look('fair', 'brown', 'white', '#3a78c8', { x: '#ffffff', y: '#cbd8ec', v: '#a8323e', r: '#9a6232' }),
    clothes: SHOULDERS, frontHair: SHORT(9),
    trim: [[24, 20, 'rr'], [25, 19, 'rr'], [26, 18, 'rr'], [27, 17, 'rr'], [28, 16, 'rr'], [29, 15, 'rr'], [30, 14, 'rr'], [31, 13, 'rr']],
    marks: [[8, 10, 'xxxxxxxxxxxx'], [9, 9, 'yxxxxxxxvvxxy'], [10, 17, 'v']] },
  // O encapuzado: capuz cinza, o rosto é sombra, só os olhos vermelhos e a marca no peito
  hooded: { hatOpt: { smooth: 1 }, bg: BGS.dark, noFace: 1, pal: Object.assign(R('bcdq', CL.gray), R('ABCD', CL.gray), { Z: '#120c14', E: '#e86a7a', G: '#a8323e', x: '#a8323e' }),
    clothes: SHOULDERS, hat: hood(12, ell(15.5, 14.5, 5.6, 6.6)),
    fills: [[ell(15.5, 14.5, 5.6, 6.6), 'Z'], [any(rect(12, 13, 13, 13), rect(18, 13, 19, 13)), 'E'], [any(rect(12, 14, 13, 14), rect(18, 14, 19, 14)), 'G']],
    trim: [[27, 15, 'xx'], [28, 14, 'xxxx'], [29, 15, 'xx']] },
  // Lia: menina de tranças ruivas com laços brancos, vestido rosa e avental
  lia: { bg: BGS.wine, blush: 1, pal: look('fair', 'orange', 'red', '#3a9a6a', { x: '#ffffff', y: '#e8f0e8', v: '#b0bcc4' }),
    backHair: any(ell(15.5, 9.5, 9.2, 8), rect(4, 12, 6, 25), rect(25, 12, 27, 25)), clothes: SHOULDERS,
    frontHair: any(not(SKULL, rect(9, 11, 22, 31)), fringe(10, 1), rect(8, 10, 9, 15), rect(22, 10, 23, 15)),
    trim: [[27, 11, 'xxxxxxxxxx'], [28, 11, 'xyyyyyyyyx'], [29, 11, 'xyyyyyyyyv'], [30, 11, 'xyyyyyyyyv'], [31, 11, 'xyyyyyyyyv']],
    marks: [[21, 3, 'xxxxx'], [22, 4, 'xvx'], [21, 24, 'xxxxx'], [22, 25, 'xvx']] },
  // Dona Marta: coque branco, xale lilás sobre o vestido roxo
  marta: { bg: BGS.dusk, old: 1, pal: look('old', 'white', 'lilac', '#72308e', { x: '#40145a', y: '#3a1448' }),
    backHair: BUN_BACK, clothes: SHOULDERS, frontHair: BUN_FRONT,
    trim: [[24, 14, 'xxxx'], [25, 14, 'xyyx'], [26, 15, 'xx']] },
  // Tomé, o pescador: gorro vermelho, barba cheia escura, colete azul sobre a camisa
  tome: { bg: BGS.sea, pal: look('tan', 'dark', 'blue', '#4e2c14', R('ABCD', CL.red), { x: '#e8f0e8', y: '#b0bcc4', M: '#8a3a2a' }),
    clothes: SHOULDERS, frontHair: SIDES,
    beard: any(ell(15.5, 19.5, 6.6, 4.4), rect(9, 14, 10, 19), rect(21, 14, 22, 19)),
    hat: any(not(ell(15.5, 9, 8.8, 7.4), rect(0, 10, 31, 31)), rect(7, 9, 24, 10), ell(23.5, 3, 2.2, 2)),
    trim: [...col(14, 15, 25, 31, 'x'), ...col(16, 17, 25, 31, 'y')], marks: [[19, 14, 'MMM']] },
  // Nino: menino de cabelo preto espetado, camisa amarela
  nino: { bg: BGS.ember, blush: 1, pal: look('warm', 'dark', 'gold', '#6a3a1a'),
    clothes: SHOULDERS,
    frontHair: any(not(ell(15.5, 9.5, 9, 7.8), rect(9, 11, 22, 31)), fringe(10, 1), rect(8, 10, 9, 14), rect(22, 10, 23, 14),
      rect(9, 1, 10, 3), rect(14, 0, 16, 2), rect(20, 1, 21, 3), rect(6, 6, 8, 8), rect(23, 6, 25, 8)) },
  // Irmã Irene: véu azul com faixa branca emoldurando o rosto, hábito claro
  irene: { bg: BGS.blue, pal: look('fair', 'brown', 'white', '#3a78c8', Object.assign(R('ABCD', CL.navy), R('JKLM', CL.white))),
    clothes: SHOULDERS, hat: not(any(ell(15.5, 11, 10, 10.5), trap(16, 31, 6, 25, 3, 28)), ell(15.5, 14.5, 6.2, 7.4)),
    top: [[(x, y) => y <= 13 && ell(15.5, 14.5, 8, 9.4)(x, y) && !ell(15.5, 14.5, 6.2, 7.4)(x, y), 'JKLM', { noOutline: 1 }]] },
  // Dora, a mercadora: cabelo castanho avermelhado solto, vestido dourado, brincos
  dora: { bg: BGS.purple, blush: 1, pal: look('warm', 'auburn', 'gold', '#3a9a6a', { x: '#ffffff', v: '#4ad08a' }),
    backHair: LONG_BACK, clothes: SHOULDERS, frontHair: LONG_FRONT,
    trim: [[24, 12, 'xxxxxxxx'], [25, 13, 'x....x']], marks: [[17, 8, 'v'], [17, 23, 'v']] },
  // O Sineiro: crânio no capuz da batina escura, sino de bronze e a corda
  sineiro: { hatOpt: { smooth: 1 }, bg: BGS.deep, noFace: 1,
    pal: Object.assign(R('bcdq', CL.shadow), R('ABCD', CL.shadow), R('JKLM', CL.bone), R('TUVW', CL.gold), { Z: '#120c14', E: '#8ac0f0', r: '#9a6232' }),
    clothes: SHOULDERS, hat: hood(13, ell(15.5, 14.5, 6.6, 8)),
    fills: [[ell(15.5, 14.5, 6.6, 8), 'Z']],
    top: [[SKULL_FACE, 'JKLM'], [any(trap(23, 29, 4, 6, 1, 9), rect(4, 21, 6, 22)), 'TUVW']],
    post: skullFills(), marks: [...col(27, 27, 0, 15, 'r'), [30, 4, 'WWW']] },
  // Bigode, o gato da vila: cara laranja listrada, olhos verdes, bigodes brancos
  cat: { hatOpt: { smooth: 1 }, bg: BGS.purple, noFace: 1,
    pal: Object.assign(R('ABCD', HR.orange), { P: '#f8a0a0', E: '#4ad08a', f: '#1e140a', w: '#ffffff' }),
    hat: any(trap(4, 12, 7, 8, 5, 13), trap(4, 12, 23, 24, 18, 26), ell(15.5, 18, 11.5, 9.5), rect(7, 27, 24, 31)),
    marks: [[8, 7, 'P'], [9, 7, 'PP'], [10, 7, 'PPP'], [8, 24, 'P'], [9, 23, 'PP'], [10, 22, 'PPP'],
      [10, 13, 'C.C.C'], [11, 13, 'C.C.C'], [12, 14, 'C.C'],
      [15, 9, 'EEEE'], [16, 9, 'EEfE'], [17, 9, 'EEfE'], [15, 18, 'EEEE'], [16, 18, 'EfEE'], [17, 18, 'EfEE'],
      [20, 15, 'PP'], [21, 14, 'f..f'], [22, 15, 'ff'], [19, 1, 'wwwwww'], [21, 2, 'wwwww'], [19, 25, 'wwwwww'], [21, 25, 'wwwww']] },
  // Bilhete ou carta: rolo de papel com linhas e lacre
  scroll: { hatOpt: { smooth: 1 }, bg: BGS.earth, noFace: 1, pal: Object.assign(R('ABCD', CL.paper), R('JKLM', CL.brown), { r: '#9a6232', x: '#e86a7a', y: '#a8323e' }),
    hat: rect(6, 7, 25, 24), top: [[rect(4, 4, 27, 7), 'JKLM'], [rect(4, 24, 27, 27), 'JKLM']],
    marks: [[11, 9, 'rrrrrrrrrrrrrr'], [14, 9, 'rrrrrrrrrrrrr'], [17, 9, 'rrrrrrrr'], [20, 9, 'rrrrrr'],
      [18, 19, '.xx.'], [19, 18, 'xxyy'], [20, 18, 'xyyy'], [21, 19, '.yy.']] },
  // Lápide: pedra arredondada com o nome gravado, musgo e grama na base
  stone: { hatOpt: { smooth: 1 }, bg: BGS.night, noFace: 1, pal: Object.assign(R('ABCD', CL.stone), { z: '#55555e', v: '#3a9a6a', g: '#2a5440' }),
    hat: any(not(ell(15.5, 12, 9.5, 8.5), rect(0, 12, 31, 31)), rect(6, 12, 25, 29)),
    marks: [[8, 13, 'zzzzzz'], [12, 10, 'zzzzzzzzzzzz'], [15, 11, 'zzzzzzzzzz'], [18, 10, 'zzzzzzzzzzzz'], [21, 12, 'zzzzzzzz'],
      [25, 7, 'vv'], [26, 7, 'vvv'], [27, 7, 'vvvv.......vv'], [28, 7, 'vvvvv....vvvvv'],
      [30, 0, 'gvgvvgvgvgvvgvgvvgvgvgvvgvgvvgvg'], [31, 0, 'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv']] },
});

const BG = { berta: ['#62202e', '#541a28', '#461622', '#38111c'], clara: ['#2c3c80', '#243270', '#1c2860', '#151e4e'],
  hugo: ['#4a5a6a', '#26262e', '#26262e', '#141018'], bertoldo: ['#432c78', '#38246a', '#2e1e5a', '#24184a'] };

const q = s => `'${s}'`;
let out = `// Story NPC portraits, 32x32 grids in the hero-face style. Generated by docs/arte/gerador/faces.cjs: edit there, then rerun.
const NPC_FACES = {\n`;
for (const [id, d] of Object.entries(NPCS)) {
  const f = build(Object.assign({ id }, d));
  out += `  ${id}: {\n    pal: { ${Object.entries(f.pal).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} },\n    bg: [${(d.bg || BG[id]).map(q).join(', ')}],\n    rows: [\n${f.rows.map(r => `      ${q(r)},`).join('\n')}\n    ],\n  },\n`;
}
out += `};\n\nif (typeof module !== 'undefined') module.exports = { NPC_FACES };\n`;
fs.writeFileSync(__dirname + '/../../../src/npcfaces.js', out);
console.log('ok', Object.keys(NPCS).join(' '));
