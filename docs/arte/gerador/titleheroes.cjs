// Generates src/titleheroes.js: Aldo and Lyra on the ruin of the title scene (src/titlebg.js), seen from behind,
// in the colors of their portraits with an outline of their own color (docs/arte/estilo.md).
// Aldo stands and points at Erukh; Lyra sits on the edge of the stone with her staff.
// Run: node docs/arte/gerador/titleheroes.cjs
const fs = require('fs');
const { Painter, toDef, mat } = require('./paint.cjs');

const M = {
  hairA: mat(['#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  skinA: mat(['#f0c090', '#d09868', '#a8704a'], '#6a3020'),
  tunic: mat(['#f0b050', '#d08a30', '#a0601c'], '#5a2a08'),
  pants: mat(['#7a4a24', '#6a3020', '#4e2c14'], '#2a140c'),
  boots: mat(['#6a3a1a', '#4a2610', '#2a1408'], '#1e140a'),
  rimG: mat(['#f0d860', '#e8b840', '#c89c38'], '#8a5418'),
  shield: mat(['#8ac0f0', '#3a78c8', '#1a2a5a'], '#151e4e'),
  steel: mat(['#cbd8ec', '#a2a2ac', '#7a7a82'], '#55555e'),
  grip: mat(['#9a6232', '#8a5418', '#6a3a1a'], '#2a1408'),
  gold: mat(['#f0d860', '#e8b840', '#c89c38'], '#8a5418'),
  hairL: mat(['#fff6c0', '#f0d860', '#c89c38'], '#8a5418'),
  skinL: mat(['#f4cca0', '#d8a478', '#b07c58'], '#8a5418'),
  cape: mat(['#c880e0', '#a050c0', '#72308e'], '#40145a'),
  robe: mat(['#a050c0', '#72308e', '#40145a'], '#3a1448'),
  bootsL: mat(['#72308e', '#40145a', '#3a1448'], '#26202e'),
  wood: mat(['#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  gem: mat(['#40e0d8', '#205e54', '#1a5048'], '#103630'),
};

// Aldo in front of the city, on his feet: round shield on the back, the sword hilt over the right shoulder, the left
// arm pointing at Erukh with the finger out. Frame 1 breathes (head, shoulders and arms up one pixel).
function aldo(f) {
  const P = Painter(40, 54), b = f ? 1 : 0, Y = y => y + 3 - b;
  P.path([[34, Y(4)], [30, Y(13)]], M.grip, 2);                                  // sword grip, behind everything
  P.ellipse(34.5, Y(3.5), 1.6, 1.6, M.gold);                                   // pommel
  P.rect(15, 35, 4, 12, M.pants); P.rect(21, 35, 4, 12, M.pants);              // legs, a little apart
  P.ellipse(16.5, 48, 2.8, 2, M.boots); P.ellipse(23.5, 48, 2.8, 2, M.boots);
  const torso = P.poly([[12, Y(15)], [28, Y(15)], [27, 36], [13, 36]], M.tunic);
  P.ellipse(13, Y(17), 3.6, 3, M.tunic, { into: torso }); P.ellipse(27, Y(17), 3.6, 3, M.tunic, { into: torso });
  P.fill(13, 34, 15, 1, '#6a3a1a'); P.px(20, 34, '#e8b840');                    // belt and buckle
  P.path([[26, Y(12)], [33, Y(15)]], M.gold, 2);                                // crossguard over the shoulder
  P.ellipse(20, Y(24), 7.4, 7.4, M.rimG, { line: true });                        // shield: gold rim, blue face, steel boss
  P.ellipse(20, Y(24), 5.6, 5.6, M.shield, { line: true });
  P.ellipse(20, Y(24), 2, 2, M.steel, { line: true });
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) P.px(20 + dx, Y(24) + dy, '#f0d860');
  P.rect(17, Y(11), 6, 5, M.skinA);                                             // neck
  P.ellipse(20, Y(6.5), 7.2, 6.6, M.hairA, { line: true });                      // head
  for (const tri of [[[13, Y(4)], [15, Y(-2)], [18, Y(2)]], [[17, Y(1)], [21, Y(-3)], [23, Y(1)]], [[22, Y(2)], [27, Y(-1)], [26, Y(5)]]]) P.poly(tri, M.hairA);
  for (const [x, y, h] of [[13, 10, 4], [16, 12, 3], [19, 12, 4], [23, 12, 3], [26, 10, 3]]) P.rect(x, Y(y), 2, h, M.hairA); // locks at the nape
  P.ellipse(12.8, Y(8.5), 1.4, 2, M.skinA);                                     // left ear
  P.path([[13, Y(17)], [8, Y(13)], [4, Y(10)]], M.tunic, 3, { line: true });     // pointing arm
  P.ellipse(3.5, Y(9.5), 2, 1.7, M.skinA);
  P.path([[2, Y(8)], [0, Y(7)]], M.skinA, 1);                                   // the finger towards Erukh
  P.path([[27, Y(17)], [29, Y(24)], [29, Y(30)]], M.tunic, 3, { line: true });   // the other arm at his side
  P.ellipse(29, Y(31.5), 1.8, 1.7, M.skinA);
  return P.finish('#2a1408');
}

// Lyra sits on the edge of the ruin, the legs hanging down the stone, one hand on the stone and the staff upright in
// the other; hair in three tones, loose strands in the wind (frame 1). The seat is row SEAT of the untrimmed grid.
const SEAT = 34;
function lyra(f) {
  const P = Painter(44, 50), w = f ? 1 : 0;
  P.line(34, 6, 34, 44, M.wood, 2);                                             // staff
  P.ellipse(34.5, 4, 2.4, 3, M.gem); P.px(34, 3, '#ffffff');
  P.path([[15, 35], [14, 42]], M.robe, 4); P.path([[22, 35], [21, 42]], M.robe, 4); // the robe over the hanging legs
  P.ellipse(13.5, 44.5, 2.6, 1.8, M.bootsL); P.ellipse(20.5, 44.5, 2.6, 1.8, M.bootsL);
  P.ellipse(20, SEAT - 1, 10.5, 3, M.robe);                                     // sitting on the stone
  for (let x = 11; x < 30; x += 3) P.px(x, SEAT + 1, '#e8b840');
  P.poly([[13, 17], [26, 17], [29 + w, 34], [11, 34]], M.cape, { line: true });  // the cape on her back
  P.ellipse(19.5, 18.5, 7.5, 3, M.cape, { line: true });                         // shoulders
  P.poly([[13, 10], [26, 10], [27, 28], [23, 30], [19, 28], [15, 30], [12, 28]], M.hairL, { line: true }); // long hair down the back
  P.ellipse(19.5, 10, 7, 7.5, M.hairL, { line: true });                          // head
  const pen = (pts, col) => { for (let k = 0; k + 1 < pts.length; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) P.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col); } };
  for (let a = 200; a <= 285; a += 6) { const r = a * Math.PI / 180; P.px(Math.round(19.5 + Math.cos(r) * 5), Math.round(10 + Math.sin(r) * 5.5), '#ffffff'); } // shine on the crown
  pen([[17, 6], [15, 11], [15, 18], [14, 27]], '#c89c38'); pen([[22, 6], [23, 12], [23, 19], [24, 26]], '#c89c38'); pen([[19, 12], [19, 20], [18, 28]], '#c89c38'); // locks
  pen([[16, 14], [17, 21], [16, 26]], '#fff6c0'); pen([[21, 13], [21, 21], [21, 26]], '#fff6c0');
  const strands = w ? [[[26, 8], [29, 6], [31, 5]], [[26, 14], [29, 13], [31, 14]], [[13, 6], [10, 4], [7, 4]]]
    : [[[26, 8], [29, 8], [31, 10]], [[26, 14], [29, 16], [30, 18]], [[13, 6], [10, 5], [8, 6]]];
  for (const st of strands) P.path(st, M.hairL, 1);
  P.path([[13, 20], [10, 27], [10, 32]], M.cape, 3, { line: true });            // the hand on the stone
  P.ellipse(10, 33, 2, 1.5, M.skinL);
  P.path([[26, 20], [30, 24], [33, 27]], M.cape, 3, { line: true });            // the other holds the staff
  P.ellipse(34, 27.5, 2, 2, M.skinL);
  return P.finish('#3a1448');
}

// both frames on one canvas, trimmed together; the seat row moves with the trim
const q = s => `'${s}'`;
const a = toDef([aldo(0), aldo(1)]), lf = [lyra(0), lyra(1)], l = toDef(lf);
const top = Math.min(...lf.map(g => g.findIndex(r => r.some(Boolean))));
const lit = (name, d) => `  ${name}: {\n    pal: { ${Object.entries(d.pal).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} },\n    frames: [\n` +
  d.frames.map(rows => `      [\n${rows.map(r => `        ${q(r)},`).join('\n')}\n      ],\n`).join('') + '    ],\n  },\n';
const out = `// Generated by docs/arte/gerador/titleheroes.cjs: Aldo (standing, pointing at Erukh) and Lyra (sitting on the
// edge of the ruin) for the title scene (src/titlebg.js). Two frames each; colors of their portraits.
const TITLE_HEROES = {\n${lit('aldo', a)}${lit('lyra', l)}};
const TITLE_SEAT = ${SEAT - top}; // Lyra's row that rests on the top of the stone

if (typeof module !== 'undefined') module.exports = { TITLE_HEROES, TITLE_SEAT };
`;
fs.writeFileSync('/home/dani/games/dungeon-rpg/src/titleheroes.js', out);
console.log('aldo', a.frames[0][0].length, 'x', a.frames[0].length, 'lyra', l.frames[0][0].length, 'x', l.frames[0].length, 'seat', SEAT - top);
