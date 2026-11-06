// Generates src/titleheroes.js: Aldo and Lyra for the title scene, version B (docs/arte/estilo.md).
// Seen from behind against the dawn: one or two tones darker than the portraits; the gold rim on the sun side
// (top and left) is added at runtime by rimLit (src/titlebg2.js), so it always follows the silhouette.
// Run: node docs/arte/gerador/titleheroes.cjs
const fs = require('fs');
const { Painter, toDef, mat } = require('./paint.cjs');

const M = {
  hairA: mat(['#6a3a1a', '#4a2610', '#2a1408'], '#140c06'),
  skinA: mat(['#d09868', '#a8704a', '#6a3020'], '#4a2610'),
  tunic: mat(['#d08a30', '#a0601c', '#5a2a08'], '#2a1408'),
  pants: mat(['#6a3020', '#4e2c14', '#2a140c'], '#140c06'),
  boots: mat(['#4a2610', '#2a1408', '#1e140a'], '#140c06'),
  rimG: mat(['#c89c38', '#8a5418', '#5a2a08'], '#2a1408'),
  shield: mat(['#3a78c8', '#2c3c80', '#1c2860'], '#151e4e'),
  steel: mat(['#a2a2ac', '#7a7a82', '#55555e'], '#26262e'),
  grip: mat(['#8a5418', '#6a3a1a', '#4a2610'], '#2a1408'),
  gold: mat(['#e8b840', '#c89c38', '#8a5418'], '#5a2a08'),
  hairL: mat(['#e8b840', '#c89c38', '#8a5418'], '#5a2a08'),
  skinL: mat(['#d8a478', '#b07c58', '#9a6232'], '#6a3a1a'),
  cape: mat(['#a050c0', '#72308e', '#40145a'], '#3a1448'),
  robe: mat(['#72308e', '#40145a', '#3a1448'], '#26202e'),
  wood: mat(['#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  gem: mat(['#40e0d8', '#205e54', '#1a5048'], '#103630'),
};

// Aldo sits on the left corner of the ruin, turned a little towards Erukh: one leg hangs past the edge, the other
// down the stone; the left forearm rests on the knee; round shield on the back, the sword hilt over the right shoulder.
// The seat (top of the stone) is row SEAT of the untrimmed grid; frame 1 breathes (head and shoulders up one pixel).
const SEAT = 33;
function aldo(f) {
  const P = Painter(40, 50), b = f ? 1 : 0, Y = y => y + 3 - b;
  P.path([[33, Y(4)], [29, Y(13)]], M.grip, 2);                                  // sword grip, behind everything
  P.ellipse(33.5, Y(3.5), 1.6, 1.6, M.gold);                                   // pommel
  P.path([[10, 34], [9, 43]], M.pants, 4); P.path([[16, 34], [15, 43]], M.pants, 4); // lower legs hanging
  P.ellipse(8.5, 45, 3.2, 2, M.boots); P.ellipse(14.5, 45, 3.2, 2, M.boots);
  P.ellipse(20, 32.5, 9.5, 2.6, M.pants);                                       // hips on the stone
  const torso = P.poly([[10, Y(15)], [30, Y(15)], [29, 32], [11, 32]], M.tunic);
  P.ellipse(11, Y(17), 4, 3, M.tunic, { into: torso }); P.ellipse(29, Y(17), 4, 3, M.tunic, { into: torso });
  P.path([[25, Y(12)], [32, Y(15)]], M.gold, 2);                                // crossguard peeking over the shoulder
  P.ellipse(20, Y(23), 8.2, 8.2, M.rimG, { line: true });                        // shield: gold rim, blue face, steel boss
  P.ellipse(20, Y(23), 6.2, 6.2, M.shield, { line: true });
  P.ellipse(20, Y(23), 2.2, 2.2, M.steel, { line: true });
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) P.px(20 + dx, Y(23) + dy, '#e8b840');
  P.rect(17, Y(11), 6, 5, M.skinA);                                             // neck
  P.ellipse(20, Y(6.5), 7.2, 6.6, M.hairA, { line: true });                      // head
  for (const tri of [[[13, Y(4)], [15, Y(-2)], [18, Y(2)]], [[17, Y(1)], [21, Y(-3)], [23, Y(1)]], [[22, Y(2)], [27, Y(-1)], [26, Y(5)]]]) P.poly(tri, M.hairA);
  for (const [x, y, h] of [[13, 10, 4], [16, 12, 3], [19, 12, 4], [23, 12, 3], [26, 10, 3]]) P.rect(x, Y(y), 2, h, M.hairA); // locks at the nape
  P.ellipse(12.8, Y(8.5), 1.4, 2, M.skinA);                                     // left ear
  P.path([[11, Y(17)], [6, Y(24)], [9, 30]], M.tunic, 4, { line: true });        // left arm, forearm on the knee
  P.ellipse(9.5, 31, 2.2, 1.6, M.skinA);
  P.path([[29, Y(17)], [31.5, Y(24)], [31, 30]], M.tunic, 4, { line: true });    // right arm, hand on the stone
  P.ellipse(31, 31.5, 2.2, 1.6, M.skinA);
  return P.finish('#140c06');
}

// Lyra stands beside him and points at Erukh: thick sleeve and an open hand with the finger out; hair in three
// tones with loose strands that blow in the wind (frame 1), and the cape hem moving with them
function lyra(f) {
  const P = Painter(44, 50), w = f ? 1 : 0;
  P.line(35, 6, 35, 46, M.wood, 2);                                             // staff
  P.ellipse(35.5, 4, 2.4, 3, M.gem); P.px(35, 3, '#ffffff');
  P.poly([[14, 22], [25, 22], [29, 46], [10, 46]], M.robe);                       // robe, the hem shows under the cape
  for (let x = 11; x < 29; x += 3) P.px(x, 45, '#c89c38');
  P.poly([[13, 15], [26, 15], [30 + w, 43], [27, 44 - w], [8, 43]], M.cape, { line: true });
  P.ellipse(19.5, 17, 7.5, 3, M.cape, { line: true });                           // shoulders
  P.poly([[13, 9], [26, 9], [27, 27], [23, 29], [19, 27], [15, 29], [12, 27]], M.hairL, { line: true }); // long hair down the back
  P.ellipse(19.5, 9, 7, 7.5, M.hairL, { line: true });                           // head
  const pen = (pts, col) => { for (let k = 0; k + 1 < pts.length; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) P.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col); } };
  for (let a = 200; a <= 285; a += 6) { const r = a * Math.PI / 180; P.px(Math.round(19.5 + Math.cos(r) * 5), Math.round(9 + Math.sin(r) * 5.5), '#f0d860'); } // shine on the crown
  pen([[17, 5], [15, 10], [15, 17], [14, 26]], '#8a5418'); pen([[22, 5], [23, 11], [23, 18], [24, 25]], '#8a5418'); pen([[19, 11], [19, 19], [18, 27]], '#8a5418'); // locks
  pen([[16, 13], [17, 20], [16, 25]], '#e8b840'); pen([[21, 12], [21, 20], [21, 25]], '#e8b840');
  const strands = w ? [[[26, 7], [29, 5], [31, 4]], [[26, 13], [29, 12], [31, 13]], [[13, 5], [10, 3], [7, 3]]]
    : [[[26, 7], [29, 7], [31, 9]], [[26, 13], [29, 15], [30, 17]], [[13, 5], [10, 4], [8, 5]]];
  for (const st of strands) P.path(st, M.hairL, 1);
  P.path([[14, 17], [9, 13], [5, 10]], M.cape, 3, { line: true });              // pointing arm, sleeve
  P.ellipse(4.5, 9.5, 2.2, 1.8, M.skinL);                                       // hand
  P.path([[3, 8], [1, 7]], M.skinL, 1);                                        // finger towards Erukh
  P.path([[26, 17], [31, 22], [34, 25]], M.cape, 3, { line: true });            // the other arm holds the staff
  P.ellipse(35, 25.5, 2, 2, M.skinL);
  return P.finish('#26202e');
}

// both frames on one canvas, trimmed together; the seat row moves with the trim
const q = s => `'${s}'`;
const a = toDef([aldo(0), aldo(1)]), l = toDef([lyra(0), lyra(1)]);
const top = Math.min(...[aldo(0), aldo(1)].map(g => g.findIndex(r => r.some(Boolean))));
const lit = (name, d) => `  ${name}: {\n    pal: { ${Object.entries(d.pal).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} },\n    frames: [\n` +
  d.frames.map(rows => `      [\n${rows.map(r => `        ${q(r)},`).join('\n')}\n      ],\n`).join('') + '    ],\n  },\n';
const out = `// Generated by docs/arte/gerador/titleheroes.cjs: Aldo and Lyra for the title scene, version B.
// Darker than the portraits (backlit); the gold rim comes from rimLit in src/titlebg2.js.
const TITLE2_HEROES = {\n${lit('aldo', a)}${lit('lyra', l)}};
const TITLE2_SEAT = ${SEAT - top}; // Aldo's row that rests on the top of the stone

if (typeof module !== 'undefined') module.exports = { TITLE2_HEROES, TITLE2_SEAT };
`;
fs.writeFileSync('/home/dani/games/dungeon-rpg/src/titleheroes.js', out);
console.log('aldo', a.frames[0][0].length, 'x', a.frames[0].length, 'lyra', l.frames[0][0].length, 'x', l.frames[0].length, 'seat', SEAT - top);
