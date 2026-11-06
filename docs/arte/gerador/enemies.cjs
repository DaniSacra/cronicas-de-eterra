// Chapter 1 enemies, painted on the grid with master palette colors only
const { Painter, toDef, mat } = require('./paint.cjs');

const C = { // master palette picks
  white: '#ffffff', cream: '#fff6c0', gold: '#f0d860', goldM: '#e8b840', goldD: '#c89c38', goldDD: '#8a5418',
  ink: '#26202e', ink2: '#141018', void: '#120c14',
  red: '#e86a7a', redM: '#a8323e', redD: '#7a1a24', pink: '#f8a0a0', ice: '#8ac0f0', blue: '#3a78c8',
  bone: '#e8f0e8', boneM: '#b0bcc4', stone: '#a2a2ac', stoneM: '#7a7a82', stoneD: '#55555e', stoneDD: '#26262e',
};
const M = {
  slime: mat(['#90e0b0', '#4ad08a', '#3a9a6a', '#2a5440'], '#14402a'),
  slimeIn: mat(['#3a9a6a', '#2a5440', '#2a5440'], '#14402a'),
  fur: mat(['#b07c58', '#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  furD: mat(['#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  skin: mat(['#f8a0a0', '#e86a7a', '#a8323e'], '#4a0c14'),
  bat: mat(['#a84ad8', '#72308e', '#40145a', '#3a1448'], '#26202e'),
  wing: mat(['#72308e', '#40145a', '#3a1448'], '#26202e'),
  bone: mat(['#e8f0e8', '#b0bcc4', '#a2a2ac', '#7a7a82'], '#55555e'),
  boneD: mat(['#b0bcc4', '#a2a2ac', '#7a7a82'], '#55555e'),
  rust: mat(['#d8a478', '#b07c58', '#9a6232', '#6a3a1a'], '#3a2010'),
  wood: mat(['#9a6232', '#6a3a1a', '#4a2610'], '#2a1408'),
  sash: mat(['#3a78c8', '#2c3c80', '#1c2860'], '#151e4e'),
  spider: mat(['#72308e', '#40145a', '#3a1448', '#26202e'], '#141018'),
  spiderLeg: mat(['#40145a', '#3a1448', '#26202e'], '#141018'),
  cloak: mat(['#a2a2ac', '#7a7a82', '#55555e', '#26262e'], '#141018'),
  steel: mat(['#e8f0e8', '#b0bcc4', '#7a7a82'], '#55555e'),
  robe: mat(['#2c3c80', '#1c2860', '#151e4e', '#26202e'], '#141018'),
  robeLit: mat(['#e8b840', '#c89c38', '#8a5418', '#4a2610'], '#2a1408'),
  bronze: mat(['#f0d860', '#e8b840', '#c89c38', '#8a5418'], '#5a2a08'),
  rope: mat(['#d8a478', '#b07c58', '#9a6232'], '#4e2c14'),
  stole: mat(['#c89c38', '#8a5418', '#6a3a1a'], '#3a2010'),
  iron: mat(['#7a7a82', '#55555e', '#26262e'], '#141018'),
};

// ---------- Gosma: engraçada, mas apronta ----------
function slime(f) {
  const P = Painter(52, 44), sq = f ? 1 : 0; // quadro 2: amassa um pouco (respira)
  const body = P.ellipse(26, 27 + sq, 23 + sq, 21 - sq, M.slime);
  P.erase(0, 37, 52, 7);
  P.rect(3 - sq, 30, 46 + 2 * sq, 8, M.slime, { into: body }); // lados retos até o chão
  for (const [x, h] of [[8, 2], [17, 3], [33, 2], [42, 3]]) P.rect(x, 38, 2, h - (f && x === 17 ? 1 : 0), M.slime, { into: body }); // pingos
  // interior translúcido: um osso que ela comeu, e uma moeda
  P.ellipse(37, 31, 8, 4, M.slimeIn);
  P.path([[32, 33], [41, 29]], M.bone, 2); P.fill(30, 32, 2, 2, C.bone); P.fill(31, 34, 2, 1, C.boneM); P.fill(41, 27, 2, 2, C.bone); P.fill(43, 28, 1, 2, C.boneM);
  P.fill(9, 29, 4, 4, '#f0d860'); P.fill(10, 28, 2, 1, '#f0d860'); P.fill(10, 33, 2, 1, '#c89c38'); P.fill(12, 30, 1, 3, '#c89c38'); P.px(10, 30, '#fff6c0');
  // brilho no alto à esquerda
  const hy = 9 + sq;
  P.fill(11, hy + 2, 2, 3, C.white); P.fill(13, hy, 3, 2, C.white); P.px(17, hy + 1, '#90e0b0');
  // olhos grandes, olhar malandro de lado
  const ey = 15 + sq;
  for (const ex of [14, 30]) {
    P.fill(ex, ey + 1, 7, 6, C.white); P.fill(ex + 1, ey, 5, 8, C.white);
    P.fill(ex + 3, ey + 2, 3, 4, C.ink); P.px(ex + 3, ey + 2, C.white);
  }
  // sobrancelhas em V
  for (let i = 0; i < 6; i++) { P.fill(13 + i, ey - 4 + Math.floor(i / 2), 1, 2, '#14402a'); P.fill(37 - i, ey - 4 + Math.floor(i / 2), 1, 2, '#14402a'); }
  // sorriso torto, aberto, com um dente
  const my = 25 + sq;
  P.fill(19, my, 15, 2, C.ink); P.fill(21, my + 2, 10, 1, C.ink); P.fill(34, my - 1, 2, 2, C.ink); P.px(36, my - 2, C.ink); P.px(18, my - 1, C.ink);
  P.fill(23, my, 2, 2, C.cream); P.fill(24, my + 2, 5, 1, '#a8323e');
  return P.finish('#14402a');
}

// ---------- Rato: sarnento, olhos vermelhos, rabo pelado ----------
function rat(f) {
  const P = Painter(60, 44), b = f ? 1 : 0;
  P.path([[13, 34], [7, 33], [4, 29], [4, 23], [7, 19], [6, 15]], M.skin, 2); // rabo pelado
  P.rect(18, 36, 4, 5, M.furD); P.rect(36, 36, 4, 5, M.furD);
  P.ellipse(28, 28 + b, 17, 11 - b, M.fur);
  P.ellipse(44, 25 + b, 10, 8, M.fur, { line: true });
  P.poly([[50, 21 + b], [58, 26 + b], [51, 31 + b]], M.fur);
  P.ellipse(38, 16 + b, 4, 5, M.fur); P.ellipse(38, 16 + b, 2, 3, M.skin); // orelha
  // patas e garras
  P.fill(17, 41, 6, 1, '#f8a0a0'); P.fill(35, 41, 6, 1, '#f8a0a0');
  // sarna: falhas de pelo com pele à mostra e tufos
  P.fill(22, 23 + b, 3, 2, '#e86a7a'); P.fill(30, 30 + b, 2, 2, '#e86a7a'); P.px(26, 19 + b, '#2a1408'); P.px(28, 18 + b, '#2a1408'); P.px(33, 20 + b, '#2a1408');
  P.px(15, 25 + b, '#b07c58'); P.px(19, 19 + b, '#b07c58');
  // olho vermelho brilhando, nariz rosa, dentões
  P.fill(46, 21 + b, 3, 3, '#e86a7a'); P.px(47, 22 + b, '#fff6c0'); P.fill(46, 20 + b, 3, 1, '#2a1408');
  P.fill(57, 25 + b, 2, 2, '#f8a0a0');
  P.fill(52, 30 + b, 2, 3, C.cream); P.px(53, 32 + b, '#d8a478');
  P.px(56, 23 + b, '#d8a478'); P.px(57, 22 + b, '#d8a478'); // bigodes
  return P.finish('#2a1408');
}

// ---------- Morcego: asas rasgadas, presas, olhos amarelos ----------
function bat(f) {
  const P = Painter(62, 44), up = f === 0;
  for (const s of [-1, 1]) {
    const X = x => 31 + s * x, wy = up ? -6 : 4;
    P.poly([[X(5), 18], [X(12), 8 + wy], [X(29), 6 + wy], [X(27), 16 + wy / 2], [X(30), 25], [X(22), 22], [X(18), 31], [X(11), 25]], M.wing);
    P.line(X(12), 9 + wy, X(22), 22, M.bat, 1, { line: true }); P.line(X(12), 9 + wy, X(27), 16 + wy / 2, M.bat, 1, { line: true });
    // rasgos na asa
    P.eraseEllipse(X(24), 20 + wy / 3, 1.6, 2.2); P.erase(Math.round(X(17)), Math.round(14 + wy / 2), 1, 2);
  }
  P.ellipse(31, 22, 9, 11, M.bat, { line: true });
  P.poly([[25, 14], [26, 5], [29, 13]], M.bat); P.poly([[37, 14], [36, 5], [33, 13]], M.bat); // orelhas
  P.fill(26, 18, 4, 3, '#f0d860'); P.fill(33, 18, 4, 3, '#f0d860'); P.px(27, 19, C.ink); P.px(34, 19, C.ink); P.px(26, 18, C.cream); P.px(33, 18, C.cream);
  P.fill(26, 17, 4, 1, '#26202e'); P.fill(33, 17, 4, 1, '#26202e'); // cenho bravo
  P.fill(28, 25, 7, 2, '#4a0c14'); P.fill(28, 27, 2, 3, C.cream); P.fill(33, 27, 2, 3, C.cream); // presas
  P.fill(28, 33, 2, 2, '#40145a'); P.fill(33, 33, 2, 2, '#40145a'); // pezinhos
  return P.finish('#26202e');
}

// ---------- Ossada: esqueleto sério, brasa nos olhos, espada enferrujada ----------
function skeleton(f) {
  const P = Painter(44, 62), b = f ? 1 : 0;
  // espada enferrujada erguida
  P.line(35, 6 + b, 35, 34 + b, M.rust, 2); P.px(36, 5 + b, '#d8a478');
  P.rect(31, 33 + b, 9, 2, M.iron); P.rect(34, 35 + b, 3, 4, M.wood);
  // pernas e pélvis
  P.path([[17, 40], [15, 49], [15, 58]], M.bone, 2); P.path([[25, 40], [27, 49], [27, 58]], M.bone, 2);
  P.rect(12, 58, 6, 2, M.boneD); P.rect(25, 58, 6, 2, M.boneD);
  P.ellipse(21, 39 + b, 7, 3, M.bone);
  // coluna e costelas
  P.line(21, 22 + b, 21, 38 + b, M.boneD, 2);
  for (let i = 0; i < 4; i++) P.ellipse(21, 25 + b + i * 3, 8 - i, 1.5, M.bone, { line: true });
  P.eraseEllipse(21, 31 + b, 2, 6); P.line(21, 22 + b, 21, 38 + b, M.boneD, 2);
  // faixa funerária azul e dourada, rasgada: foi enterrado com honras
  P.poly([[13, 24 + b], [16, 23 + b], [27, 36 + b], [24, 37 + b]], M.sash, { line: true });
  P.px(20, 30 + b, '#f0d860'); P.px(19, 29 + b, '#e8b840'); P.erase(25, 36 + b, 1, 1);
  // braços: um caído, um segurando a espada
  P.path([[13, 23 + b], [9, 31 + b], [11, 40 + b]], M.bone, 2, { line: true });
  P.path([[29, 23 + b], [32, 29 + b], [34, 33 + b]], M.bone, 2, { line: true });
  // crânio
  P.ellipse(21, 13 + b, 8, 8, M.bone);
  P.rect(16, 18 + b, 10, 4, M.bone);
  // órbitas inclinadas (cenho fechado) com brasa vermelha no fundo
  P.fill(15, 11 + b, 5, 4, C.void); P.fill(23, 11 + b, 5, 4, C.void);
  P.px(19, 11 + b, '#b0bcc4'); P.px(18, 11 + b, '#b0bcc4'); P.px(23, 11 + b, '#b0bcc4'); P.px(24, 11 + b, '#b0bcc4');
  P.fill(17, 12 + b, 2, 2, f ? '#e86a7a' : '#a8323e'); P.px(18, 13 + b, '#f0d860');
  P.fill(24, 12 + b, 2, 2, f ? '#e86a7a' : '#a8323e'); P.px(24, 13 + b, '#f0d860');
  P.fill(20, 16 + b, 2, 2, C.void);
  P.fill(16, 19 + b, 10, 1, C.void); // mandíbula entreaberta
  for (let x = 17; x <= 25; x += 2) { P.px(x, 20 + b, '#55555e'); P.px(x - 1, 18 + b, '#7a7a82'); }
  P.px(14, 9 + b, '#7a7a82'); P.px(15, 8 + b, '#7a7a82'); P.px(16, 7 + b, '#7a7a82'); // rachadura
  // lâmina: fio de aço com ferrugem e dentes
  for (let y = 6; y <= 32; y++) { P.px(35, y + b, y % 7 === 3 ? '#9a6232' : '#b0bcc4'); P.px(36, y + b, y % 5 === 1 ? '#b0bcc4' : y % 3 ? '#9a6232' : '#b07c58'); }
  P.px(35, 5 + b, '#e8f0e8'); P.erase(37, 14 + b, 1, 2); P.erase(37, 24 + b, 1, 1);
  return P.finish('#55555e');
}

// ---------- Aranha: corpo escuro com marca vermelha, muitos olhos ----------
function spider(f) {
  const P = Painter(64, 46), b = f ? 1 : 0;
  const LEGS = [[[18, 5], [30, 30]], [[23, 11], [31, 41]], [[21, 22], [26, 44]], [[14, 29], [17, 44]]]; // joelho, pé
  for (const s of [-1, 1]) LEGS.forEach(([[kx, ky], [fx, fy]], i) => {
    const lift = f && i % 2 ? 2 : 0;
    P.path([[32 + s * 9, 17 + i * 3], [32 + s * kx, ky - lift], [32 + s * fx, fy - lift]], M.spiderLeg, 2);
  });
  P.ellipse(32, 20 + b, 14, 12, M.spider);
  P.ellipse(32, 33, 9, 7, M.spider, { line: true });
  // marca vermelha (ampulheta)
  P.poly([[28, 14 + b], [36, 14 + b], [32, 20 + b]], { tones: ['#e86a7a', '#a8323e', '#a8323e'], outline: '#4a0c14' });
  P.poly([[28, 26 + b], [36, 26 + b], [32, 20 + b]], { tones: ['#e86a7a', '#a8323e', '#a8323e'], outline: '#4a0c14' });
  // muitos olhos brilhando
  for (const [x, y, s] of [[29, 30, 2], [34, 30, 2], [27, 33, 1], [37, 33, 1], [31, 33, 1], [33, 33, 1], [25, 31, 1], [39, 31, 1]]) {
    P.fill(x, y, s, s, f && s === 1 ? '#a8323e' : '#e86a7a'); if (s === 2) P.px(x, y, C.cream);
  }
  P.fill(29, 38, 2, 3, C.cream); P.fill(33, 38, 2, 3, C.cream); // quelíceras
  return P.finish('#141018');
}

// ---------- Encapuzado: capuz sem rosto, olhos acesos, lâmina curva ----------
function hooded(f) {
  const P = Painter(48, 62), b = f ? 1 : 0;
  P.poly([[22, 4 + b], [13, 12 + b], [11, 30], [5, 59], [39, 59], [33, 30], [31, 12 + b]], M.cloak);
  P.line(15, 33, 10, 57, M.cloak, 1, { line: true }); P.line(29, 33, 34, 57, M.cloak, 1, { line: true }); // dobras
  for (let x = 6; x < 39; x += 5) P.erase(x, 59 - (x % 2), 2, 1); // barra rasgada
  // braço com a lâmina curva
  P.poly([[31, 30], [38, 38], [35, 42], [29, 36]], M.cloak, { line: true });
  P.path([[37, 41], [42, 34], [44, 26], [43, 18]], M.steel, 2);
  P.rect(35, 40, 3, 3, M.wood);
  // rosto: só sombra e dois olhos acesos
  P.ellipse(22, 19 + b, 6, 7, mat(['#141018', '#141018', '#141018'], '#141018'));
  P.fill(18, 19 + b, 3, 2, '#e86a7a'); P.fill(24, 19 + b, 3, 2, '#e86a7a'); P.px(19, 19 + b, '#fff6c0'); P.px(25, 19 + b, '#fff6c0');
  if (f) { P.px(17, 19 + b, '#a8323e'); P.px(27, 19 + b, '#a8323e'); }
  // emblema bordado no peito: um olho cortado
  P.fill(19, 38, 7, 3, '#a8323e'); P.fill(21, 38, 3, 3, '#26202e'); P.px(22, 39, '#e86a7a');
  P.px(18, 42, '#26202e'); P.px(20, 41, '#26202e'); P.px(22, 40, '#e8f0e8'); P.px(24, 39, '#26202e'); P.px(26, 38, '#26202e');
  return P.finish('#141018');
}

// ---------- O Sineiro: chefe, caveira no capuz, sino, corda, lanterna que ilumina por baixo ----------
function bellringer(f) {
  const P = Painter(96, 96), b = f ? 1 : 0;
  // corda que desce do alto e se enrola no braço direito
  P.path([[74, 0], [74, 22], [70, 34], [73, 44]], M.rope, 2);
  // batina: corpo largo, barra rasgada
  P.poly([[48, 22 + b], [30, 34 + b], [22, 92], [74, 92], [66, 34 + b]], M.robe);
  for (let x = 23; x < 74; x += 6) P.erase(x + (f ? 1 : 0), 91 - (x % 3), 3, 2);
  // reflexo quente da lanterna na batina (luz de baixo)
  // estola desbotada
  P.path([[42, 36 + b], [40, 86]], M.stole, 3); P.path([[54, 36 + b], [56, 86]], M.stole, 3);
  // braço esquerdo erguendo o sino
  P.poly([[33, 36 + b], [18, 52 + b], [24, 58 + b], [37, 46 + b]], M.robe, { line: true });
  P.path([[19, 56 + b], [16, 60 + b]], M.bone, 2);
  // sino de bronze
  const by = 58 + b * 2;
  P.poly([[10, by + 18], [12, by + 6], [16, by + 1], [22, by + 1], [26, by + 6], [28, by + 18], [31, by + 21], [7, by + 21]], M.bronze);
  P.fill(9, by + 17, 20, 1, '#fff6c0'); P.fill(17, by - 1, 4, 2, '#8a5418');
  P.fill(18, by + 22, 3, 2, '#5a2a08'); // badalo
  // braço direito com a corda enrolada e a lanterna pendurada
  P.poly([[63, 36 + b], [78, 50 + b], [72, 56 + b], [59, 46 + b]], M.robe, { line: true });
  for (let i = 0; i < 4; i++) P.line(64 + i * 3, 41 + i * 3 + b, 68 + i * 3, 38 + i * 3 + b, M.rope, 1, { line: true });
  P.path([[76, 54 + b], [78, 57 + b]], M.bone, 2);
  P.line(78, 58 + b, 78, 63 + b, M.iron, 1);
  P.rect(74, 63 + b, 9, 12, M.iron);
  P.fill(76, 65 + b, 5, 8, '#f0d860'); P.fill(77, 66 + b, 3, 5, '#fff6c0');
  P.fill(78, 67 + b - (f ? 1 : 0), 1, 3, '#e8b840'); // chama tremendo
  P.fill(73, 75 + b, 11, 1, '#55555e');
  // capuz
  P.poly([[48, 6 + b], [34, 14 + b], [30, 36 + b], [66, 36 + b], [62, 14 + b]], M.robe);
  P.poly([[48, 3 + b], [44, 7 + b], [52, 7 + b]], M.robe);
  // caveira no escuro do capuz, iluminada por baixo pela lanterna (luz quente embaixo, fria em cima)
  // rosto desenhado à mão: crânio comprido que some na sombra do capuz, órbitas fundas e inclinadas,
  // pupilas de luz fria, queixo aberto iluminado de baixo pela lanterna
  const SKULL = [
    '....hhhhhhhhh....',
    '..hhhDDDDDDDhhh..',
    '.hhDDDDDDDDDDDhh.',
    '.hDDDDDDDDDDDDDh.',
    'hDDDDDDDDDDDDDDDh',
    'hDDvvvDDDDDvvvDDh',
    'hDvvvvvDDDvvvvvDh',
    'hDvvEevDDDveEvvDh',
    'hgvvbvvgDgvvbvvgh',
    'hgcvvvggDggvvvcgh',
    'hgccgggvvvgggccgh',
    '.gcccgcvvvcgcccg.',
    '.gcccccvcvcccccg.',
    '..gcwccccccccwcg.',
    '..vvvvvvvvvvvvv..',
    '..wvwvwvwvwvwvw..',
    '..vwvwvwvwvwvwv..',
    '...cwwwwwwwwwc...',
    '....cwwwwwwwc....',
    '.....ccccccc.....',
  ];
  const SK = { h: '#151e4e', D: '#26262e', g: '#7a7a82', c: '#f4cca0', w: '#fff6c0', v: C.void, e: f ? '#ffffff' : '#8ac0f0', E: f ? '#8ac0f0' : '#e8f0e8', b: '#3a78c8' };
  SKULL.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') P.px(40 + x, 13 + b + y, SK[ch]); }));
  P.fill(45, 33 + b, 7, 1, '#e8b840'); // reflexo da lanterna sob o queixo
  return P.finish('#141018').slice(3, 94); // 96x91: sem linhas vazias, cabe entre a fila de turnos e os comandos
}

const SPRITES = { slime, rat, bat, skeleton, spider, hooded, bellringer };
module.exports = { SPRITES, build: name => toDef([SPRITES[name](0), SPRITES[name](1)]) };
