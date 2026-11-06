// ===== Tela de título: o amanhecer sobre Erukh =====
// Aldo e Lyra, de costas, numa ruína no alto de um morro, olham Erukh, a capital de Imladrin, no fim do vale:
// é para lá que o grupo parte no fim do Capítulo 1. Tudo em pixel art da paleta mestre (docs/arte/estilo.md):
// céu em faixas com pontilhado ordenado entre elas, sem degradê, sem transparência, escala inteira.
// Base 320x180. Telas mais largas ou mais altas estendem céu e colinas; a ruína fica presa à direita e Erukh perto
// do centro. O layout (titleLayout) é puro e serve ao desenho, ao HTML do título e aos testes.

// Toda cor desta cena (um teste confere que todas estão na paleta mestre)
const TITLE_C = {
  sky: ['#151e4e', '#1c2860', '#2c3c80', '#72308e', '#c89c38', '#e8b840', '#f0d860', '#fff6c0'], // noite, mistério, luz
  stars: ['#e8eff8', '#8ac0f0', '#fff6c0'],
  cloudHi: ['#40145a', '#c89c38'], cloudLo: ['#a84ad8', '#f0d860'],                  // corpo, borda de baixo acesa
  mount: ['#a4b8da', '#7488b8', '#e8eff8', '#cbd8ec', '#f0d860'],                      // lado aceso, sombra, neve, neve na sombra, ouro
  far: ['#90e0b0', '#7ac09a', '#4a8a6a'], mid: ['#4ad08a', '#3a9a6a'], near: ['#3a9a6a', '#2a5440'],
  city: { wall: '#4a5a8c', shade: '#2c3c80', dark: '#1c2860', rim: '#f0d860', win: '#e8b840', dome: '#7488b8', domeLit: '#cbd8ec', banner: '#a8323e', gold: '#e8b840' },
  river: ['#3a78c8', '#8ac0f0', '#f0d860', '#fff6c0'], road: ['#d8a478', '#b07c58'],
  ruin: { light: '#a2a2ac', top: '#7a7a82', face: '#55555e', deep: '#26202e', moss: '#3a9a6a', moss2: '#2a5440' },
  grass: ['#4ad08a', '#2a5440'], flowers: ['#f0a8f8', '#fff6c0'], bird: '#26202e',
};

// A estrela dourada do título, agora no céu acima de Erukh: a luz de Elun guiando o caminho (15x15, dois quadros)
const TITLE_STAR = {
  frames: [
    ['.......a.......', '.......a.......', '......cac......', '...a..cbc..a...', '....a.cbc.a....', '.....acbca.....', '..ccccbgbcccc..',
      'aaabbbgwgbbbaaa', '..ccccbgbcccc..', '.....acbca.....', '....a.cbc.a....', '...a..cbc..a...', '......cac......', '.......a.......', '.......a.......'],
    ['...............', '.......a.......', '......cac......', '......cbc......', '....a.cbc.a....', '.....acbca.....', '...cccbgbccc...',
      '.aabbbgwgbbbaa.', '...cccbgbccc...', '.....acbca.....', '....a.cbc.a....', '......cbc......', '......cac......', '.......a.......', '...............'],
  ],
  pal: { a: '#f0d860', b: '#fff6c0', c: '#c89c38', g: '#8ac0f0', w: '#ffffff' },
};

// Aldo sentado na borda (escudo redondo e espada nas costas) e Lyra em pé apontando para Erukh, os dois de costas.
// Mesmas cores dos retratos; contorno da própria cor. Quadros: Aldo respira; cabelo e capa da Lyra ao vento.
const TITLE_HEROES = {
  aldo: {
    pal: { k: '#2a1408', h: '#6a3a1a', j: '#9a6232', i: '#4a2610', s: '#f0c090', t: '#d09868', b: '#f0b050', c: '#d08a30', d: '#a0601c', g: '#8ac0f0', e: '#3a78c8', f: '#1a2a5a', y: '#e8b840', r: '#8a5418', l: '#6a3020', m: '#cbd8ec' },
    frames: [
      [
        '........k.kjkkjkkhkhk.......',
        '.......khkkkjjjjjkkkhk......',
        '.......kkhjjjjjjjhhkkhk.....',
        '......khkjjjjhhhhhhhkkhk....',
        '.......khjjhhhhhhhhhhkk.k...',
        '......kkjjhhhhhhhhhhik.kyk..',
        '.....khjjjhhhhhhhhhiiikmk...',
        '......khjjhhhhhhhhiiiikjk...',
        '......kstjhhhhhhhiiiiikjk...',
        '......ksjhhhhhhhiiiiikjk....',
        '......kttihhhhhiiiiiikjk....',
        '.......kkihhhhiiiiiikykkk...',
        '........kkiiiiiiiiiyyyyyyk..',
        '.......kbbbciiiiidddkkkkk...',
        '......kbbbcyyygyyydddk......',
        '....kkbbbcygggggeeydddkk....',
        '...kcbdbbygggeeeeeeyddcdk...',
        '...kcbdbyyggeeeeeeeyrdcdk...',
        '...kcbdbyygeeeyeeefrrdcdk...',
        '...kcbdbyggeeyyyefffrdcdk...',
        '...kcbdbyygeeeyefffrrdcdk...',
        '...kcbdbyrfeeeeffffrrdcdk...',
        '...kcbdbbrffeefffffrddcdk...',
        '....kkkkkkrfffffffrkkkkk....',
        '...kcbdbbbcrrrfrrrddddcdk...',
        '...kssdkbbbcrrrrrdddkdttk...',
        '...kssdlllyllllyllllydttk...',
        '....kkllllllllllllllllkk....',
        '.....kllllllllllllllllk.....',
        '......kkkkkkkkkkkkkkkk......',
      ],
      [
        '.........khkkhkkhk.k........',
        '........k.kjkkjkkhkhk.......',
        '.......khkkkjjjjjkkkhk......',
        '.......kkhjjjjjjjhhkkhk.....',
        '......khkjjjjhhhhhhhkkhk....',
        '.......khjjhhhhhhhhhhkk.k...',
        '......kkjjhhhhhhhhhhik.kyk..',
        '.....khjjjhhhhhhhhhiiikmk...',
        '......khjjhhhhhhhhiiiikjk...',
        '......kstjhhhhhhhiiiiikjk...',
        '......ksjhhhhhhhiiiiikjk....',
        '......kttihhhhhiiiiiikjk....',
        '.......kkihhhhiiiiiikykkk...',
        '........kkiiiiiiiiiyyyyyyk..',
        '.......kbbbciiiiidddkkkkk...',
        '......kbbbcyyygyyydddk......',
        '....kkbbbcygggggeeydddkk....',
        '...kcbdbbygggeeeeeeyddcdk...',
        '...kcbdbyyggeeeeeeeyrdcdk...',
        '...kcbdbyygeeeyeeefrrdcdk...',
        '...kcbdbyggeeyyyefffrdcdk...',
        '...kcbdbyygeeeyefffrrdcdk...',
        '...kcbdbyrfeeeeffffrrdcdk...',
        '...kcbdbbrffeefffffrddcdk...',
        '...kcbdbbbrfffffffrdddcdk...',
        '...kssdkbbbrrrfrrrddkdttk...',
        '...kssdlllylrrrrrlllydttk...',
        '....kkllllllllllllllllkk....',
        '.....kllllllllllllllllk.....',
        '......kkkkkkkkkkkkkkkk......',
      ],
    ],
  },
  lyra: {
    pal: { o: '#8a5418', h: '#f0d860', j: '#fff6c0', i: '#c89c38', x: '#e8b840', q: '#40145a', b: '#c880e0', c: '#a050c0', d: '#72308e', s: '#f4cca0', t: '#d8a478', w: '#9a6232', v: '#40e0d8', a: '#ffffff', n: '#3a1448' },
    frames: [
      [
        '..................................',
        '..............ooooo...............',
        '............oojjjjjoo.............',
        '...........ojjjjjjhhho...q........',
        '..........ojjjhhhhhhhho.qaq.......',
        '.........ojjjhhhhhhhhhhqvvvq......',
        '.........ojjhxxxxxxxxhiavvvvq.....',
        '.........oxxxhhhhhhhhxxqvvvq......',
        '........ojjjhhhhhhhhiiiiqvq.......',
        '........osjjhhhhhhhiiiioqwq.......',
        '........osjhhhhhhhiiiiioqwq.......',
        '.........otihhhhhiiiiiioqwq.......',
        '..........oihhhhiiiiiio.qwq.......',
        '.o........ojiihiiiiiio..qwq.......',
        'osooqq....ojjhiiiiiiiqq.qwq.......',
        '.ossbbqqq.ojjihhihiiinnqqwq.......',
        '..otccbbbqojjihhihiiinnqqwq.......',
        '...oqqcccbbjjihhihiiinnnqwq.......',
        '......qqqccjjihhihiiidnnnwq.......',
        '.........qqjjihhihiiicnnnwq.......',
        '..........ojjihhihiiidcnsso.......',
        '..........ojjihhihiiidncnwq.......',
        '..........ojjihhihiiidnnnwq.......',
        '..........ojjihhihiiidnnnwqq......',
        '..........qbjjihhiihddddnwnnq.....',
        '.........qbbjjihhiiidddnnwnq......',
        '.........qbbjjihhiiidddnnwnq......',
        '.........qbbjjihhiiiddddnwnnq.....',
        '.........qbbbjhihiihddddnwnnq.....',
        '........qbbbcjhihiiddddddwnnnq....',
        '........qbbbcjhihiiddddddwnnnnq...',
        '........qbbbcjhihiiddddddwnnnq....',
        '........qbbbcccccccddddddwnnnnq...',
        '........qbbbcccccccddddddwnnnnq...',
        '.......qbbbcccccccccdddddwnnnnnq..',
        '.......qbbbcccccccccdddddwnnnnnq..',
        '.......qbbbcccccccccdddddwdnnnnnq.',
        '.......qbbbcccccccccdddddwdnnnnnq.',
        '......qbbbbcccccccccdddddwdnnnnnq.',
        '......qbbbbcccccccccdddddwddnnnnnq',
        '......qbbbbcccccccccdddddwddnnnnnq',
        '......qbbbbcccccccccdddddwqqqqqqq.',
        '......qbbbbcxccxccxcdddddwq.......',
        '.......qqqqqqqqoqqqqqqqqqwq.......',
        '.........................q........',
        '..................................',
      ],
      [
        '..................................',
        '..............ooooo...............',
        '............oojjjjjoo.............',
        '...........ojjjjjjhhho...q........',
        '..........ojjjhhhhhhhho.qaq.......',
        '.........ojjjhhhhhhhhhhqvvvq......',
        '.........ojjhxxxxxxxxhiavvvvq.....',
        '.........oxxxhhhhhhhhxxqvvvq......',
        '........ojjjhhhhhhhhiiiiqvq.......',
        '........osjjhhhhhhhiiiioqwq.......',
        '........osjhhhhhhhiiiiioqwq.......',
        '.........otihhhhhiiiiiioqwq.......',
        '..........oihhhhiiiiiio.qwq.......',
        '.o........ojiihiiiiiio..qwq.......',
        'osooqq....ojjhiiiiiiiqq.qwq.......',
        '.ossbbqqq.ojjihhihiiinnqqwq.......',
        '..otccbbbqojjihhihiiinnqqwq.......',
        '...oqqcccbbjjihhihiiidnnnwq.......',
        '......qqqccjjihhihiiinnnqwq.......',
        '.........qqjjihhihiiicnnnwq.......',
        '..........ojjihhihiiidcnsso.......',
        '..........qbjjihhihhiiicnwq.......',
        '..........qbjjihhihhiiinnwq.......',
        '..........qbjjihhihhiiinnwnq......',
        '..........qbbjjihhihihdnnwnq......',
        '.........qbbbjjihhihiiddnwnnq.....',
        '.........qbbbjjihhihiiddnwnnq.....',
        '.........qbbbjjihhihiidddwnnnq....',
        '.........qbbbcjjihhiihdddwnnnqq...',
        '........qbbbccjjihhiiddddwnnnnnq..',
        '........qbbbccjjihhiiddddwnnnnq...',
        '........qbbbccjjihhiiddddwnnnnq...',
        '........qbbbcccccccddddddwnnnnnq..',
        '........qbbbcccccccddddddwnnnnnq..',
        '.......qbbbcccccccccdddddwdnnnnnq.',
        '.......qbbbcccccccccdddddwddnnnnnq',
        '.......qbbbcccccccccdddddwdnnnnnq.',
        '.......qbbbcccccccccdddddwddnnnnnq',
        '......qbbbbcccccccccdddddwddnnnnnq',
        '......qbbbbcccccccccdddddwddnnnnnn',
        '......qbbbbcccccccccdddddwddnnnnnn',
        '......qbbbbcccccccccdddddwqqqqqqqq',
        '......qbbbbcxccxccxcdddddwq.......',
        '.......qqqqqqqqoqqqqqqqqqwq.......',
        '.........................q........',
        '..................................',
      ],
    ],
  },
};

// ---------- Layout (pixels lógicos) ----------
// W, H: tamanho lógico da tela; px: pixels de CSS por pixel lógico; f1, f2: letras pequena e média da interface (CSS).
// Devolve os retângulos do logo, do menu, de Erukh, da estrela, da ruína e dos dois irmãos, e a linha do horizonte.
function titleLayout({ W, H, px, f1, f2 }) {
  const m = f2 / px, t = f1 / px, pad = 10 / px;
  const menu = { w: Math.ceil(17 * m + 2 * pad), h: Math.ceil(3 * 2.3 * m + 1.6 * t + 2 * pad) };
  Object.assign(menu, { x: 4, y: H - 4 - menu.h });
  const L = H >= 300 && W >= 240 ? 16 : 8;                       // letras do logo, em pixels lógicos (sempre nítidas)
  // logo em duas linhas, subtítulo e crédito, com meia letra de espaço entre eles
  const logo = { w: Math.ceil(Math.max(9 * L, 39 * t)), h: Math.ceil(2 * 1.3 * L + L / 2 + 1.3 * L / 2 + L / 2 + 1.6 * t), y: 4, L };
  logo.x = Math.round((W - logo.w) / 2);
  // horizonte: Erukh fica sempre acima do menu; em pé, sobe para pouco além do meio e leva a ruína junto
  const hy = H > W ? Math.round(H * 0.55) : Math.min(H - 62, menu.y - 6);
  const cx = Math.round(W * 0.44);
  const erukh = { x: cx - 32, y: hy - 14 - 44, w: 64, h: 44 };
  const ry = Math.min(H - 58, hy + 40), ruin = { x: W - 118, y: ry, w: 118, h: H - ry };
  const aldo = { x: ruin.x + 26, y: ruin.y - 28, w: 28, h: 30 };
  const lyra = { x: ruin.x + 56, y: ruin.y - 44, w: 34, h: 46 };
  const star = { x: cx - 7, y: Math.max(Math.round((logo.y + logo.h + erukh.y) / 2) - 7, erukh.y - 34), w: 15, h: 15 };
  return { W, H, hy, cx, logo, menu, erukh, ruin, aldo, lyra, star };
}
const rectsCross = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Descida de câmera da abertura: do céu até a cena em cerca de 2 s; qualquer entrada pula para o fim
const TITLE_DESCENT_MS = 2000;
function makeDescent(t0, dur = TITLE_DESCENT_MS) {
  let skipped = false;
  return {
    at(now) { if (skipped) return 1; const k = Math.min(1, Math.max(0, (now - t0) / dur)); return 1 - (1 - k) ** 3; },
    done(now) { return this.at(now) >= 1; },
    skip() { skipped = true; },
  };
}

const TitleBG = (() => {
  let cache = null, descent = null, t0 = 0;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const canvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; return { cv, c }; };

  // Erukh: muralha, torres de telhado pontudo, casas, a grande cúpula do templo e estandartes; borda acesa pelo sol
  function city() {
    const { cv, c } = canvas(64, 44), K = TITLE_C.city, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const roof = (x, w, y, h) => { for (let i = 0; i < h; i++) { const k = Math.round((w / 2) * (i + 1) / h); R(x + Math.floor(w / 2) - k, y + i, k, 1, K.dome); R(x + Math.floor(w / 2), y + i, k, 1, K.dark); } };
    // casas atrás da muralha
    for (const [x, w, h] of [[10, 5, 9], [18, 6, 11], [40, 6, 11], [48, 5, 9]]) { R(x, 34 - h, w, h, K.wall); R(x + w - 2, 34 - h, 2, h, K.shade); roof(x - 1, w + 2, 34 - h - 4, 4); R(x + 2, 34 - h + 3, 1, 2, K.win); }
    // templo e cúpula
    R(24, 22, 16, 13, K.wall); R(36, 22, 4, 13, K.shade);
    for (const x of [26, 30, 34]) R(x, 24, 1, 9, K.dome);
    for (let y = 0; y <= 8; y++) { const half = Math.round(9 * Math.sqrt(1 - (y / 8.5) ** 2)); R(32 - half, 22 - y, half, 1, y > 5 ? K.domeLit : K.dome); R(32, 22 - y, half, 1, K.dome); R(32 + half - 2, 22 - y, 2, 1, K.shade); }
    R(31, 9, 2, 5, K.gold); R(30, 10, 4, 1, K.gold); R(31, 7, 2, 2, K.rim);
    // torres com estandartes
    for (const [x, w, h, flag] of [[2, 7, 24, 1], [14, 5, 17, 0], [45, 5, 17, 0], [55, 7, 24, 1]]) {
      R(x, 44 - h, w, h, K.wall); R(x + w - 2, 44 - h, 2, h, K.shade); roof(x - 1, w + 2, 44 - h - 6, 6);
      R(x + 2, 44 - h + 4, 1, 2, K.win); R(x + 2, 44 - h + 10, 1, 2, K.win);
      if (flag) { R(x + 3, 44 - h - 12, 1, 6, K.dark); R(x + 4, 44 - h - 12, 3, 2, K.banner); }
    }
    // muralha com ameias e portão
    R(0, 34, 64, 10, K.wall); R(0, 41, 64, 3, K.shade);
    for (let x = 0; x < 64; x += 4) R(x, 32, 2, 2, K.wall);
    R(29, 37, 6, 7, K.dark); R(30, 36, 4, 1, K.dark);
    for (const x of [6, 12, 21, 42, 51, 58]) R(x, 37, 1, 1, K.win);
    // contorno de luz: o que dá para o céu, em cima e à esquerda, brilha em dourado
    const img = c.getImageData(0, 0, 64, 44), d = img.data, on = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44 && d[(y * 64 + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < 44; y++) for (let x = 0; x < 64; x++) if (on(x, y) && (!on(x, y - 1) || !on(x - 1, y))) edge.push([x, y]);
    for (const [x, y] of edge) R(x, y, 1, 1, K.rim);
    return cv;
  }

  // Céu, cordilheira, colinas, Erukh, rio, estrada e a ruína: uma imagem só, da altura da tela mais a da descida
  function build(L) {
    const { W, H, hy, cx } = L, D = Math.round(H * 0.75), CH = H + D, r = rng(7);
    const { cv, c } = canvas(W, CH), img = c.createImageData(W, CH), px = img.data;
    const put = (x, y, hex) => { x = Math.round(x); y = Math.round(y) + D; if (x < 0 || y < 0 || x >= W || y >= CH) return; const n = parseInt(hex.slice(1), 16), i = (y * W + x) * 4; px[i] = n >> 16; px[i + 1] = (n >> 8) & 255; px[i + 2] = n & 255; px[i + 3] = 255; };
    // céu: nível contínuo do alto (noite) ao horizonte (luz), mais o brilho atrás de Erukh; faixas chapadas e
    // pontilhado Bayer só no último quarto de cada faixa
    const S = TITLE_C.sky, n = S.length - 1, sx = cx - 6, sy = hy - 22, rx = W * 0.24, ry = 46;
    for (let y = -D; y < H; y++) for (let x = 0; x < W; x++) {
      const t = Math.min(1, Math.max(0, (y + D) / (hy + D)));
      const glow = Math.max(0, 1 - Math.hypot((x - sx) / rx, (y - sy) / ry));
      const lv = Math.min(n, t ** 2.2 * (n - 1.6) + glow * 2.6), base = Math.floor(lv), f = lv - base;
      const step = f > 0.7 && (f - 0.7) / 0.3 > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0;
      put(x, y, S[Math.min(n, base + step)]);
    }
    // cordilheira distante, clara e azulada, neve nos cumes; o lado voltado para o sol fica aceso
    const M = TITLE_C.mount, mb = hy - 2, mh = x => 16 + 11 * Math.sin(x * 0.043 + 1) + 6 * Math.sin(x * 0.11 + 2) + 3 * Math.sin(x * 0.27);
    for (let x = 0; x < W; x++) {
      const h = Math.round(mh(x)), lit = x < sx ? mh(x) < mh(x - 1) : mh(x) > mh(x - 1);
      for (let y = mb - h; y < mb + 4; y++) {
        const k = y - (mb - h), snow = h > 22 && k < 3 + (x % 3 === 0 ? 1 : 0);
        put(x, y, snow ? (k === 0 && lit ? M[4] : lit ? M[2] : M[3]) : lit ? M[0] : M[1]);
      }
    }
    // colinas: longe mais claras e azuladas, perto mais escuras; o morro de Erukh sobe no meio
    const hill = x => { const d = Math.abs(x - cx); return d < 34 ? 15 : d < 62 ? 15 * Math.cos((d - 34) / 28 * Math.PI / 2) : 0; }; // morro com o alto plano sob a cidade
    const layer = (top, [edge, body, deep]) => { for (let x = 0; x < W; x++) { const y0 = Math.round(top(x)); for (let y = y0; y < H; y++) put(x, y, y === y0 ? edge : deep && y > y0 + 3 && (x + y) % 9 === 0 ? deep : body); } };
    layer(x => hy - 4 + 2 * Math.sin(x * 0.06 + 1) - hill(x), TITLE_C.far);
    // Erukh no alto do morro
    const ccv = city(), cimg = ccv.getContext('2d').getImageData(0, 0, 64, 44).data, ex = cx - 32, ey = hy - 14 - 44;
    for (let y = 0; y < 44; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; if (cimg[i + 3]) put(ex + x, ey + y, '#' + [0, 1, 2].map(k => cimg[i + k].toString(16).padStart(2, '0')).join('')); }
    layer(x => hy + 9 + 4 * Math.sin(x * 0.035 + 2), TITLE_C.mid);
    layer(x => hy + 26 + 3 * Math.sin(x * 0.05), TITLE_C.near);
    // estrada de terra e rio em S, do primeiro plano até o portão de Erukh
    const river = [], ys = hy, x0 = W * 0.28;
    const path = y => { const k = (y - ys) / (H - ys); return { x: cx + (x0 - cx) * k + Math.sin(k * Math.PI * 2) * W * 0.07 * k, w: 1 + k * k * 22, k }; };
    for (let y = ys; y < H; y++) {
      const p = path(y), rw = Math.max(1, p.w * 0.35), rd = p.x + p.w / 2 + 2 + p.k * 6;
      for (let x = Math.round(rd); x < rd + rw; x++) put(x, y, x === Math.round(rd) ? TITLE_C.road[1] : TITLE_C.road[0]);
      for (let x = Math.round(p.x - p.w / 2); x <= Math.round(p.x + p.w / 2); x++) {
        const edgeX = x === Math.round(p.x - p.w / 2) || x === Math.round(p.x + p.w / 2), mid = Math.abs(x - p.x) < p.w * 0.18;
        put(x, y, edgeX ? TITLE_C.river[1] : mid && (x + y) % 3 ? TITLE_C.river[2] : TITLE_C.river[0]);
        if (mid) river.push([x, y]);
      }
    }
    // a ruína do primeiro plano: pedra escura com musgo, borda gasta e um entalhe antigo, sem contorno
    const U = TITLE_C.ruin, R = L.ruin, top = x => R.y + Math.max(0, R.x + 8 - x) + (x > R.x + 92 && x < R.x + 101 ? 3 : 0);
    for (let x = R.x; x < W; x++) {
      const y0 = top(x);
      for (let y = y0; y < H; y++) {
        const k = y - y0, brick = (y - R.y) % 10 === 9 || ((x - R.x + (Math.floor((y - R.y) / 10) % 2) * 8) % 16 === 0 && k > 3);
        put(x, y, k === 0 ? U.light : k < 4 ? U.top : y > H - 8 ? U.deep : brick ? U.deep : U.face);
      }
      if (r() < 0.45) { put(x, y0, U.moss); if (r() < 0.4) for (let k = 1; k < 2 + r() * 5; k++) put(x, y0 + k, U.moss2); }
    }
    const gx = R.x + 64, gy = R.y + 28; // o entalhe: um anel com quatro raios, gasto pelo tempo
    for (let a = 0; a < 40; a++) { const ang = a / 40 * Math.PI * 2; if (a % 7 !== 3) { put(gx + Math.cos(ang) * 6, gy + Math.sin(ang) * 6, U.deep); put(gx + Math.cos(ang) * 6, gy + Math.sin(ang) * 6 + 1, U.top); } }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 2; i < 10; i++) if (i !== 6 && !(dx < 0 && i === 8)) put(gx + dx * i, gy + dy * i, U.deep);
    c.putImageData(img, 0, 0);
    // dinâmicos: estrelas, nuvens, tufos de grama na beira da ruína
    const stars = Array.from({ length: Math.round(W * (hy + D) / 300) }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * (hy * 0.45 + D)) - D, p: r() * 6, col: TITLE_C.stars[Math.floor(r() * 3)], life: r() < 0.3 ? Infinity : 6000 + r() * 40000 }));
    const clouds = Array.from({ length: Math.max(4, Math.round(W / 70)) }, (_, i) => ({ x: r() * W * 1.5, y: hy - 60 - Math.floor(r() * 50) + (i % 2) * 18, w: 18 + Math.floor(r() * 30), lo: i % 2, s: 0.0015 + r() * 0.002 }));
    const tufts = Array.from({ length: 14 }, (_, i) => ({ x: R.x + 6 + i * 8 + Math.floor(r() * 4), h: 2 + Math.floor(r() * 3), flower: r() < 0.3 ? TITLE_C.flowers[i % 2] : null }))
      .filter(t => t.x < W - 2 && !(t.x > L.aldo.x - 2 && t.x < L.lyra.x + L.lyra.w));
    return { L, D, bg: cv, river, stars, clouds, tufts, top };
  }

  function layoutNow() {
    const view = document.getElementById('view'), cs = getComputedStyle(document.documentElement);
    const px = (parseFloat(view.style.width) || VW) / VW;
    return titleLayout({ W: VW, H: VH, px, f1: parseFloat(cs.getPropertyValue('--f1')) || 8, f2: parseFloat(cs.getPropertyValue('--f2')) || 16 });
  }

  function draw(c, now) {
    const L = layoutNow();
    if (!cache || cache.L.W !== L.W || cache.L.H !== L.H || cache.L.menu.h !== L.menu.h) cache = build(L);
    const { D } = cache, p = descent ? descent.at(now) : 1, oy = Math.round(D * (1 - p)), T = now - t0;
    c.imageSmoothingEnabled = false;
    c.drawImage(cache.bg, 0, -D + oy);
    const put = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y) + oy, 1, 1); };
    // estrelas piscando e indo embora com o dia
    for (const s of cache.stars) if (T < s.life && Math.sin(now / 500 + s.p * 10) > -0.7) put(s.x, s.y, s.col);
    // nuvens em duas camadas, com a borda de baixo acesa em dourado
    for (const cl of cache.clouds) {
      const [body, lit] = cl.lo ? TITLE_C.cloudLo : TITLE_C.cloudHi, x = Math.round(((cl.x + now * cl.s) % (L.W + 60)) - 50);
      c.fillStyle = body; c.fillRect(x + 4, cl.y + oy, cl.w - 8, 2); c.fillRect(x, cl.y + 2 + oy, cl.w, 3); c.fillRect(x + Math.round(cl.w * 0.3), cl.y - 2 + oy, Math.round(cl.w * 0.4), 2);
      c.fillStyle = lit; c.fillRect(x + 1, cl.y + 5 + oy, cl.w - 2, 1);
    }
    // um bando de três pássaros, de vez em quando
    const bt = now % 14000;
    if (bt < 6000) {
      const k = bt / 6000, flap = Math.floor(now / 200) % 2;
      for (const [dx, dy] of [[0, 0], [7, 3], [13, -2]]) {
        const x = L.W + 10 - k * (L.W + 40) + dx, y = L.hy - 70 + dy + Math.sin(k * 6) * 3;
        put(x, y + flap, TITLE_C.bird); put(x + 1, y + 1 - flap, TITLE_C.bird); put(x + 2, y + flap, TITLE_C.bird);
      }
    }
    // brilho no rio: as cores giram em ciclo
    const ph = Math.floor(now / 260);
    for (let i = 0; i < cache.river.length; i += 3) { const [x, y] = cache.river[i]; if ((x + y * 3 + ph) % 7 === 0) put(x, y, TITLE_C.river[1 + (ph + i) % 3]); }
    // a estrela de Elun sobre Erukh
    const st = L.star, wind = Math.floor(now / 650) % 2;
    c.drawImage(GridSprite.render(TITLE_STAR, Math.floor(now / 900) % 2), st.x, st.y + oy);
    // os irmãos e a grama da beira, balançando junto com a capa da Lyra
    c.drawImage(GridSprite.render(TITLE_HEROES.aldo, Math.floor(now / 1100) % 2), L.aldo.x, L.aldo.y + oy);
    c.drawImage(GridSprite.render(TITLE_HEROES.lyra, wind), L.lyra.x, L.lyra.y + oy);
    for (const t of cache.tufts) {
      const y0 = cache.top(t.x) - 1;
      for (let i = 0; i < t.h; i++) put(t.x + (i === t.h - 1 ? wind : 0), y0 - i, i ? TITLE_C.grass[0] : TITLE_C.grass[1]);
      put(t.x + 1, y0, TITLE_C.grass[0]);
      if (t.flower) put(t.x + wind, y0 - t.h, t.flower);
    }
  }

  // Abertura: começa a descida; resolve quando ela termina ou quando o jogador aperta algo
  function intro() {
    t0 = performance.now(); descent = makeDescent(t0);
    return new Promise(res => {
      const skip = () => descent.skip();
      const evs = ['keydown', 'pointerdown'];
      evs.forEach(e => window.addEventListener(e, skip, { once: true }));
      const tick = () => { if (descent.done(performance.now())) { evs.forEach(e => window.removeEventListener(e, skip)); res(); } else requestAnimationFrame(tick); };
      tick();
    });
  }
  return { draw, intro, layout: layoutNow };
})();

if (typeof module !== 'undefined') module.exports = { TITLE_C, TITLE_STAR, TITLE_HEROES, titleLayout, rectsCross, makeDescent, TITLE_DESCENT_MS };
