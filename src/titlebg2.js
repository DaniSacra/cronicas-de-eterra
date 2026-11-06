// ===== Tela de título, versão B: o mesmo amanhecer sobre Erukh, com acabamento de arte =====
// Contraluz (irmãos e ruína mais escuros, contorno dourado do lado do sol), Erukh distante e azulada atrás de um
// morro, halo irregular, nuvens de grade, vale com campos, bosques, fazenda e ponte, rio em perspectiva e uma ruína
// de pedras gastas. A versão A (src/titlebg.js) continua; o botão A/B da abertura escolhe (TitleScene, no fim).
// Usa de src/titlebg.js: TITLE_C, TITLE_STAR, titleLayout, cloudY, TITLE_BAYER, titleRng, titleCanvas, titleMetrics,
// TitleCam e titleBirds; e de src/titleheroes.js os irmãos desenhados pelo gerador.

const TITLE2_C = {
  rim: '#f0d860',                                                                       // o contorno do sol
  halo: ['#e8b840', '#f0d860', '#fff6c0'],
  cloud: { hi: { t: '#40145a', m: '#72308e', b: '#c89c38', y: '#e8b840' }, lo: { t: '#72308e', m: '#a84ad8', b: '#e8b840', y: '#f0d860' } },
  mount: { lit: '#a4b8da', shade: '#7488b8', edge: '#4a5a8c', snow: '#e8eff8', snowS: '#a4b8da' },
  far: { body: '#7ac09a', deep: '#4a8a6a', cold: '#7488b8' },
  inter: { body: '#4a8a6a', deep: '#3a9a6a', cold: '#4a5a8c' },
  mid: { fields: ['#4ad08a', '#3a9a6a', '#7ac09a', '#3a9a6a', '#c89c38', '#4a8a6a', '#4ad08a'], hedge: '#2a5440', cold: '#2c3c80' },
  near: { fields: ['#3a9a6a', '#2a5440', '#4a8a6a', '#3a9a6a', '#8a5418', '#4a8a6a'], hedge: '#14402a', cold: '#1c2860' },
  tree: { lit: '#3a9a6a', body: '#2a5440', dark: '#14402a', trunk: '#4a2610' },
  farm: { wall: '#d8a478', shade: '#b07c58', roof: '#a8323e', roofD: '#7a1a24', win: '#e8b840', fence: '#6a3a1a' },
  bridge: { deck: '#9a6232', arch: '#6a3a1a', shadow: '#2c3c80' },
  river: { far: '#8ac0f0', body: '#3a78c8', bank: '#8ac0f0', gold: '#f0d860', gold2: '#e8b840', glint: '#fff6c0' },
  road: ['#d8a478', '#b07c58'],
  city: { wall: '#8ac0f0', shade: '#3a78c8', dark: '#2c3c80', roof: '#a4b8da', roofS: '#7488b8', dome: '#cbd8ec', domeLit: '#e8eff8', domeS: '#a4b8da', win: '#e8b840', banner: '#a8323e' },
  house: { wall: '#8ac0f0', shade: '#3a78c8', roof: '#4a5a8c', win: '#e8b840' },
  smoke: ['#cbd8ec', '#a4b8da'], fountain: ['#fff6c0', '#8ac0f0'],
  ruin: { top: '#7a7a82', face: '#55555e', shade: '#26262e', deep: '#26202e', relief: '#c89c38', moss: '#2a5440', moss2: '#14402a', mossLit: '#3a9a6a', leaf: '#3a9a6a' },
  grass: ['#3a9a6a', '#14402a', '#c89c38'], flowers: ['#f0a8f8', '#fff6c0', '#e86a7a'],
};

// Nuvens fofas: três formas reaproveitadas (t topo roxo, m corpo, b base dourada, y brilho da base), no máximo 8 linhas
const TITLE2_CLOUDS = [
  ['..........tttt....ttt.........', '.....ttt.tmmmmt..tmmmt........', '...ttmmmtmmmmmmttmmmmmtt......', '..tmmmmmmmmmmmmmmmmmmmmmtt.tt.',
    '.tmmmmmmmmmmmmmmmmmmmmmmmmtmmt', 'tmmmbbmmmmmmbbbmmmmmmbbbmmmmmb', '.bbbbbbbbybbbbbbbbbyybbbbbbbb.', '...yyyyyy...yyyyyy.....yyyy...'],
  ['.......ttt....tt......', '....ttmmmt..ttmmt.....', '..ttmmmmmmttmmmmmtt...', '.tmmmmmmmmmmmmmmmmmtt.',
    'tmmmbbmmmmmmmbbmmmmmmt', '.bbbbbbbbybbbbbbbbbbb.', '...yyyyy....yyyyy.....'],
  ['....ttt.......', '..ttmmmtttt...', '.tmmmmmmmmmtt.', 'tmbbbmmmmbbbmt', '.bbyybbbbyybb.'],
];
const titleCloud = (shape, layer) => ({ rows: TITLE2_CLOUDS[shape], pal: TITLE2_C.cloud[layer] });

// Contraluz: o pixel que dá para o céu em cima, ou à esquerda na parte de cima da figura, vira o contorno do sol
function rimLit(def, color, upper = 0.65) {
  const frames = (def.frames || [def.rows]).map(rows => rows.map((r, y) => [...r].map((ch, x) => {
    if (ch === '.') return ch;
    const open = (yy, xx) => yy < 0 || xx < 0 || rows[yy][xx] === '.';
    return open(y - 1, x) || (y < rows.length * upper && open(y, x - 1)) ? 'O' : ch;
  }).join('')));
  return { pal: Object.assign({}, def.pal, { O: color }), frames };
}
const TITLE2_LIT = { aldo: rimLit(TITLE2_HEROES.aldo, TITLE2_C.rim), lyra: rimLit(TITLE2_HEROES.lyra, TITLE2_C.rim) };

// ---------- Layout B: o de A, com Erukh menor, a ruína menor, o crédito no canto e o botão A/B ----------
function titleLayout2(o) {
  const A = titleLayout(o), { W, H, hy, cx } = A, t = o.f1 / o.px, L = A.logo.L;
  // logo sem o crédito; o subtítulo um pouco maior (três quartos da letra do título)
  const logo = { w: Math.ceil(Math.max(9 * L, 16 * 0.75 * L)), h: Math.ceil(2 * 1.3 * L + L / 2 + 1.3 * 0.75 * L), y: 4, L, sub: 0.75 };
  logo.x = Math.round((W - logo.w) / 2);
  const erukh = { x: cx - 26, y: hy - 17 - 36, w: 52, h: 36 };
  const ry = Math.min(H - 44, hy + 42), ruin = { x: W - 88, y: ry, w: 88, h: H - ry };
  const size = def => ({ w: def.frames[0][0].length, h: def.frames[0].length });
  const aldo = Object.assign({ x: ruin.x - 12, y: ruin.y - TITLE2_SEAT }, size(TITLE2_HEROES.aldo));
  const ls = size(TITLE2_HEROES.lyra), lyra = Object.assign({ x: ruin.x + 30, y: ruin.y - ls.h + 1 }, ls);
  // crédito em duas linhas, pequeno, no canto de baixo à direita; o botão A/B no canto de cima
  const foot = { w: Math.ceil(23 * t), h: Math.ceil(2 * 1.3 * t) };
  Object.assign(foot, { x: W - 3 - foot.w, y: H - 2 - foot.h });
  const menu = rectsCross(A.menu, foot) ? Object.assign({}, A.menu, { y: foot.y - 2 - A.menu.h }) : A.menu; // em pé, o menu sobe acima do crédito
  const ab = { w: Math.ceil(5 * t + 4), h: Math.ceil(1.3 * t + 4), y: 2 };
  ab.x = W - 2 - ab.w;
  const star = { x: cx - 7, y: Math.max(Math.round((logo.y + logo.h + erukh.y) / 2) - 7, erukh.y - 30), w: 15, h: 15 };
  const clouds = { y0: logo.y + logo.h + 4, y1: erukh.y - 2 };
  return Object.assign({}, A, { logo, menu, erukh, ruin, aldo, lyra, star, clouds, foot, ab });
}

const TitleBG2 = (() => {
  let cache = null;
  const C = TITLE2_C, BAYER = TITLE_BAYER;

  // Erukh ao longe: clara e azulada, a cúpula do templo mais alta e mais clara que tudo, o alto aceso em dourado
  function city() {
    const { cv, c } = titleCanvas(52, 36), K = C.city, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const roof = (x, w, y, h) => { for (let i = 0; i < h; i++) { const k = Math.round((w / 2) * (i + 1) / h); R(x + Math.floor(w / 2) - k, y + i, k, 1, K.roof); R(x + Math.floor(w / 2), y + i, k, 1, K.roofS); } };
    for (const [x, w, h] of [[8, 4, 7], [14, 5, 9], [33, 5, 9], [40, 4, 7]]) { R(x, 28 - h, w, h, K.wall); R(x + w - 1, 28 - h, 1, h, K.shade); roof(x - 1, w + 2, 28 - h - 3, 3); R(x + 1, 28 - h + 3, 1, 1, K.win); }
    R(19, 19, 14, 10, K.wall); R(30, 19, 3, 10, K.shade);                         // o templo
    for (const x of [21, 24, 27]) R(x, 21, 1, 7, K.domeS);
    for (let y = 0; y <= 10; y++) { const half = Math.round(7.5 * Math.sqrt(1 - (y / 10.5) ** 2)); R(26 - half, 19 - y, half, 1, y > 6 ? K.domeLit : K.dome); R(26, 19 - y, half, 1, K.dome); R(26 + half - 2, 19 - y, 2, 1, K.domeS); }
    R(25, 4, 2, 5, K.domeLit); R(24, 5, 4, 1, K.domeLit);                          // a lanterna e o símbolo no alto
    for (const [x, w, h, flag] of [[1, 6, 20, 1], [11, 4, 14, 0], [37, 4, 14, 0], [45, 6, 20, 1]]) {
      R(x, 36 - h, w, h, K.wall); R(x + w - 1, 36 - h, 1, h, K.shade); roof(x - 1, w + 2, 36 - h - 5, 5);
      R(x + 2, 36 - h + 3, 1, 1, K.win); R(x + 2, 36 - h + 8, 1, 1, K.win);
      if (flag) { R(x + 3, 36 - h - 10, 1, 5, K.dark); R(x + 4, 36 - h - 10, 2, 2, K.banner); }
    }
    R(0, 28, 52, 8, K.wall); R(0, 34, 52, 2, K.shade);                             // muralha, ameias e portão
    for (let x = 0; x < 52; x += 3) R(x, 27, 2, 1, K.wall);
    R(23, 30, 6, 6, K.dark);
    for (const x of [5, 10, 17, 35, 41, 47]) R(x, 31, 1, 1, K.win);
    const img = c.getImageData(0, 0, 52, 36), d = img.data, on = (x, y) => x >= 0 && y >= 0 && x < 52 && y < 36 && d[(y * 52 + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < 36; y++) for (let x = 0; x < 52; x++) if (on(x, y) && (!on(x, y - 1) || !on(x - 1, y))) edge.push([x, y]);
    for (const [x, y] of edge) R(x, y, 1, 1, C.rim);
    return cv;
  }

  function build(L) {
    const { W, H, hy, cx } = L, D = Math.round(H * 0.75), CH = H + D, r = titleRng(11);
    const { cv, c } = titleCanvas(W, CH), img = c.createImageData(W, CH), px = img.data;
    const put = (x, y, hex) => { x = Math.round(x); y = Math.round(y) + D; if (x < 0 || y < 0 || x >= W || y >= CH) return; const n = parseInt(hex.slice(1), 16), i = (y * W + x) * 4; px[i] = n >> 16; px[i + 1] = (n >> 8) & 255; px[i + 2] = n & 255; px[i + 3] = 255; };
    const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
    // céu e halo: o halo é irregular e se abre ao longo do horizonte; entre os tons, faixas largas de pontilhado
    const S = TITLE_C.sky, n = S.length - 1, sx = cx - 6, sy = hy - 22, rx = W * 0.22, ry = 44;
    const halo = (x, y) => {
      const spread = y > sy ? 1 + (y - sy) / 12 : 1, wob = 1 + 0.14 * Math.sin(x * 0.07) + 0.08 * Math.sin(x * 0.19 + 1) + 0.05 * Math.sin(x * 0.43);
      return Math.max(0, 1 - Math.hypot((x - sx) / (rx * spread * wob), (y - sy) / ry));
    };
    for (let y = -D; y < H; y++) for (let x = 0; x < W; x++) {
      const t = Math.min(1, Math.max(0, (y + D) / (hy + D)));
      const lv = Math.min(n, t ** 2.2 * (n - 1.6) + halo(x, y) * 2.8), base = Math.floor(lv), f = lv - base;
      put(x, y, S[Math.min(n, base + (f > 0.5 && (f - 0.5) / 0.5 > bay(x, y) ? 1 : 0))]);
    }
    // a encosta virada para o sol (sx) ganha o contorno dourado; a do outro lado fica azulada
    const facing = (top, x) => { const d = top(x + 0.5) - top(x - 0.5); return Math.abs(d) < 0.05 ? 0 : (x < sx ? d > 0 : d < 0) ? 1 : -1; };
    const M = C.mount, mb = hy - 2, mh = x => 16 + 11 * Math.sin(x * 0.043 + 1) + 6 * Math.sin(x * 0.11 + 2) + 3 * Math.sin(x * 0.27);
    const mtop = x => mb - mh(x);
    for (let x = 0; x < W; x++) {
      const y0 = Math.round(mtop(x)), side = facing(mtop, x) || (x < sx ? 1 : -1), h = mb - y0;
      for (let y = y0; y < mb + 4; y++) {
        const k = y - y0, snow = h > 22 && k < 3 + (x % 3 === 0 ? 1 : 0);
        put(x, y, k === 0 ? (side > 0 ? C.rim : M.edge) : snow ? (side > 0 ? M.snow : M.snowS) : side > 0 ? M.lit : M.shade);
      }
    }
    // camadas de colina; body(x, y, y0) pinta o miolo (campos, por exemplo)
    const layer = (top, edgeCold, body) => {
      for (let x = 0; x < W; x++) {
        const y0 = Math.round(top(x)), side = facing(top, x);
        for (let y = y0; y < H; y++) put(x, y, y === y0 && side > 0 ? C.rim : y === y0 && side < 0 ? edgeCold : body(x, y, y0));
      }
    };
    const hill = x => { const d = Math.abs(x - cx); return d < 28 ? 15 : d < 56 ? 15 * Math.cos((d - 28) / 28 * Math.PI / 2) : 0; };
    const farTop = x => hy - 4 + 2 * Math.sin(x * 0.06 + 1) - hill(x);
    layer(farTop, C.far.cold, (x, y, y0) => (y > y0 + 2 && (x * 7 + y * 3) % 11 === 0 ? C.far.deep : C.far.body));
    // Erukh no alto do morro, e as casas descendo a encosta abaixo da muralha
    const ccv = city(), cimg = ccv.getContext('2d').getImageData(0, 0, 52, 36).data, E = L.erukh;
    for (let y = 0; y < 36; y++) for (let x = 0; x < 52; x++) { const i = (y * 52 + x) * 4; if (cimg[i + 3]) put(E.x + x, E.y + y, '#' + [0, 1, 2].map(k => cimg[i + k].toString(16).padStart(2, '0')).join('')); }
    const H2 = C.house, smoke = [];
    for (let row = 0; row < 3; row++) for (let x = cx - 30 - row * 6; x < cx + 30 + row * 6; x += 3 + Math.floor(r() * 4)) {
      if (r() < 0.35) continue;
      const w = 2 + (r() < 0.4 ? 1 : 0), y = Math.round(Math.max(E.y + 36, farTop(x)) + 1 + row * 3 + r() * 1.5);
      for (let i = 0; i < w; i++) { put(x + i, y, H2.roof); put(x + i, y + 1, i === w - 1 ? H2.shade : H2.wall); }
      if (r() < 0.45) put(x, y + 1, H2.win);
    }
    for (const dx of [-17, 4, 15]) smoke.push({ x: cx + dx, y: E.y + 18 + (dx === 4 ? -2 : 6), p: r() * 6 });
    // o morro do meio esconde o pé de Erukh
    layer(x => hy - 9 + 2.5 * Math.sin(x * 0.05 + 0.5) + Math.abs(x - cx) * 0.04, C.inter.cold, (x, y, y0) => (y > y0 + 3 && (x + y * 2) % 13 === 0 ? C.inter.deep : C.inter.body));
    // campos em perspectiva: faixas mais altas perto, cercas vivas entre elas
    // campos em perspectiva: faixas que crescem para perto e divisas que convergem para Erukh, com cercas vivas
    const vy = hy - 8, cell = (x, y) => { const k = (y - vy) / (H - vy), band = Math.floor(Math.sqrt(k) * 9), u = (x - cx) / (y - vy); return [band, Math.floor(u * 2.2 + band * 0.43)]; };
    const fields = pal => (x, y, y0) => {
      if (y < y0 + 2) return pal.fields[1];
      const [b, col] = cell(x, y), [b2] = cell(x, y - 1), [, c2] = cell(x - 1, y);
      if (b !== b2 || col !== c2) return pal.hedge;
      return pal.fields[Math.abs((b * 7 + col * 13) ^ (b * col)) % pal.fields.length];
    };
    const midTop = x => hy + 9 + 4 * Math.sin(x * 0.035 + 2), nearTop = x => hy + 26 + 3 * Math.sin(x * 0.05);
    layer(midTop, C.mid.cold, fields(C.mid));
    // bosques, árvores sozinhas e a fazenda, no vale do meio
    const T = C.tree, tree = (x, y, rr) => {
      for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) {
        if (xx * xx + yy * yy > rr * rr + rr) continue;
        const edge = (xx - 1) ** 2 + (yy - 1) ** 2 > rr * rr + rr || (xx) ** 2 + (yy - 1) ** 2 > rr * rr + rr;
        put(x + xx, y + yy - rr, edge && xx + yy < 0 ? C.rim : xx + yy < -rr * 0.6 ? T.lit : xx + yy > rr * 0.6 ? T.dark : T.body);
      }
      put(x, y + 1, T.trunk);
    };
    const groves = [[0.08, 16, 5], [0.62, 12, 4], [0.86, 18, 4]], lone = [[0.2, 22], [0.5, 30], [0.36, 13], [0.74, 26]];
    for (const [fx, dy, k] of groves) for (let i = 0; i < k; i++) { const x = Math.round(W * fx + i * 4 - k * 2 + r() * 2), y = Math.round(midTop(x) + dy + (i % 2) * 2); if (y < H) tree(x, y, 2 + (i % 2)); }
    for (const [fx, dy] of lone) { const x = Math.round(W * fx), y = Math.round(midTop(x) + dy); if (y < H) tree(x, y, 2); }
    const F = C.farm, fx = Math.round(W * 0.3), fy = Math.round(midTop(fx) + 12);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) put(fx + x, fy + y, x > 4 ? F.shade : F.wall);
    for (let y = 0; y < 3; y++) for (let x = -1 - y; x < 8 + y - 0; x++) put(fx + x, fy - 3 + y, x < 3 ? F.roof : F.roofD);
    for (let x = -1 - 0; x < 4; x++) put(fx + x, fy - 4, C.rim);
    put(fx + 2, fy + 1, F.win); put(fx + 5, fy + 2, F.fence);
    for (let x = fx + 9; x < fx + 22; x++) { put(x, fy + 3, F.fence); if (x % 3 === 0) put(x, fy + 2, F.fence); }
    layer(nearTop, C.near.cold, fields(C.near));
    // o rio: nasce fino perto de Erukh, se abre muito no primeiro plano e reflete o ouro do céu no meio
    const Rv = C.river, river = [], ys = hy - 6, x0 = W * 0.24;
    const path = y => { const k = (y - ys) / (H - ys); return { x: cx + (x0 - cx) * k + Math.sin(k * Math.PI * 1.6) * W * 0.06 * k, w: 0.6 + k * k * W * 0.3, k }; };
    const by = Math.round(ys + (H - ys) * 0.42);
    for (let y = ys; y < H; y++) {
      const p = path(y), a = Math.round(p.x - p.w / 2), b = Math.round(p.x + p.w / 2);
      const rw = Math.max(1, p.w * 0.12), rd = b + 2 + Math.round(p.k * 5);                // a estrada de terra ao lado
      if (y > by) for (let x = rd; x < rd + rw; x++) put(x, y, x === rd ? C.road[1] : C.road[0]);
      for (let x = a; x <= b; x++) {
        const mid = Math.abs(x - p.x) < p.w * 0.16, far = p.k < 0.12;
        put(x, y, far ? Rv.far : x === a || x === b ? Rv.bank : mid ? ((x + y) % 2 && p.k > 0.3 ? Rv.gold2 : Rv.gold) : Rv.body);
        if (mid && p.k > 0.12) river.push([x, y]);
      }
    }
    // a pontezinha de madeira, com a estrada saindo dela
    const bp = path(by), ba = Math.round(bp.x - bp.w / 2) - 2, bb = Math.round(bp.x + bp.w / 2) + 2;
    for (let x = ba; x <= bb; x++) {
      const arc = Math.round(2 * Math.sin((x - ba) / (bb - ba) * Math.PI));
      put(x, by - 1 - arc, C.rim); put(x, by - arc, C.bridge.deck); put(x, by + 1 - arc, C.bridge.arch); put(x, by + 2, C.bridge.shadow);
    }
    // a ruína do primeiro plano: pedras grandes e gastas, cantos quebrados, rachaduras, musgo e trepadeiras
    const U = C.ruin, R = L.ruin, stone = new Set(), key = (x, y) => x + y * 4096;
    // fiadas de alturas diferentes; algumas pedras ocupam duas fiadas
    const stub = { x0: R.x + 70, x1: R.x + 82, y: R.y - 10 };                     // um toco de coluna quebrado à direita
    const blocks = [], busy = {};
    const chs = Array.from({ length: 64 }, () => 7 + Math.floor(r() * 4));
    for (let k = 0, y0 = R.y; y0 < H; k++) {
      const ch = chs[k], left = R.x - (k >= 2 ? 3 : 0) - (k >= 4 ? 3 : 0);
      for (let x = left; x < W; ) {
        if ((busy[x] || 0) > y0) { x++; continue; }
        let w = 11 + Math.floor(r() * 12), tall = k > 0 && r() < 0.25;
        for (let i = 1; i < w; i++) if ((busy[x + i] || 0) > y0) { w = i; break; }
        const y1 = Math.min(H, y0 + ch + (tall ? chs[k + 1] : 0)) - 1;
        blocks.push({ x0: x, x1: Math.min(W - 1, x + w - 1), y0, y1, k });
        for (let i = 0; i < w; i++) busy[x + i] = y1 + 1;
        x += w;
      }
      y0 += ch;
    }
    blocks.push({ x0: stub.x0, x1: stub.x1, y0: stub.y, y1: R.y - 1, k: -1 });
    for (const B of blocks) {
      const exposed = B.k <= 0, cut = exposed ? 1 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2), cutR = exposed ? Math.floor(r() * 3) : Math.floor(r() * 2);
      for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
        const dx = x - B.x0, dr = B.x1 - x, dy = y - B.y0;
        if (dx + dy < cut || dr + dy < cutR) { if (!exposed) put(x, y, U.deep); continue; }    // canto quebrado
        if (B.k === -1 && dy < 3 && ((x * 5) % 7 < dy * 3 - 2 + (x % 3))) continue;       // o alto partido do toco
        stone.add(key(x, y));
        put(x, y, dy === 0 ? U.top : y === B.y1 || x === B.x1 ? U.deep : dr < 2 || dy > B.y1 - B.y0 - 2 ? U.shade : r() < 0.06 ? U.shade : U.face);
      }
      // uma rachadura
      if (r() < 0.6) { let x = B.x0 + 3 + Math.floor(r() * (B.x1 - B.x0 - 5)), y = B.y0 + 1; for (let i = 0; i < 6 && y < B.y1; i++) { put(x, y, U.deep); y++; x += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; } }
    }
    const has = (x, y) => stone.has(key(x, y)), tops = {};
    // o símbolo antigo: uma espada em pé dentro de um círculo, em baixo-relevo com a borda dourada, gasto
    const gx = R.x + 50, gy = R.y + 21, rel = (x, y, litSide) => { if (!has(x, y)) return; if ((x * 3 + y * 5) % 11 === 0) return; put(x, y, litSide ? U.relief : U.top); if (has(x + 1, y + 1)) put(x + 1, y + 1, U.deep); };
    for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t); rel(gx + Math.round(cs * 6), gy + Math.round(sn * 6), cs + sn < 0); }
    for (let y = -5; y <= 4; y++) rel(gx, gy + y, true);
    for (let x = -2; x <= 2; x++) rel(gx + x, gy - 2, x <= 0);
    rel(gx, gy - 6 + 0, true);
    // contorno do sol na pedra: o alto de cada coluna e a face esquerda de cima
    for (let x = 0; x < W; x++) { for (let y = R.y - 12; y < H; y++) if (has(x, y)) { tops[x] = y; put(x, y, C.rim); break; } }
    for (let y = R.y; y < R.y + 14; y++) for (let x = R.x - 8; x < R.x + 4; x++) if (has(x, y) && !has(x - 1, y)) { put(x, y, C.rim); break; }
    // musgo no alto, escorrendo; trepadeiras descendo a face
    for (const x of Object.keys(tops).map(Number)) {
      if (r() < 0.35) { put(x, tops[x] + 1, U.mossLit); if (r() < 0.5) for (let k = 2; k < 2 + r() * 4; k++) if (has(x, tops[x] + k)) put(x, tops[x] + k, U.moss); }
    }
    for (const fx2 of [0.12, 0.44, 0.93]) {
      let x = Math.round(R.x + R.w * fx2); const y0 = tops[x] ?? R.y, len = 9 + Math.floor(r() * 8);
      for (let i = 0; i < len; i++) { const xx = x + Math.round(Math.sin(i * 0.7) * 1.2); if (!has(xx, y0 + i)) break; put(xx, y0 + i, U.moss2); if (i % 3 === 1) put(xx + (i % 2 ? 1 : -1), y0 + i, U.leaf); }
    }
    c.putImageData(img, 0, 0);
    // dinâmicos: estrelas, nuvens, tufos de grama e flores nas juntas do alto
    const stars = Array.from({ length: Math.round(W * (hy + D) / 300) }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * (hy * 0.45 + D)) - D, p: r() * 6, col: TITLE_C.stars[Math.floor(r() * 3)], life: r() < 0.3 ? Infinity : 6000 + r() * 40000 }));
    const clouds = Array.from({ length: Math.max(4, Math.round(W / 60)) }, (_, i) => { const lo = i % 2; return { x: r() * W * 1.5, y: cloudY(L.clouds, r()), sp: titleCloud(lo ? i % 4 === 1 ? 0 : 1 : 2, lo ? 'lo' : 'hi'), s: lo ? 0.003 : 0.0015 + r() * 0.001 }; }).filter(cl => cl.y !== null);
    const joints = blocks.filter(B => B.k === 0).map(B => B.x0).concat(Array.from({ length: 6 }, () => R.x + Math.floor(r() * R.w)));
    const tufts = joints.map((x, i) => ({ x, h: 2 + Math.floor(r() * 3), flower: r() < 0.45 ? C.flowers[i % 3] : null }))
      .filter(t => tops[t.x] !== undefined && t.x < W - 2 && !(t.x > L.aldo.x + 8 && t.x < L.lyra.x + L.lyra.w - 4));
    const fountains = [[cx - 7, E.y + 26], [cx + 5, E.y + 25]];
    return { L, D, bg: cv, river, stars, clouds, tufts, tops, smoke, fountains };
  }

  const layoutNow = () => titleLayout2(titleMetrics());

  function draw(c, now) {
    const L = layoutNow();
    if (!cache || cache.L.W !== L.W || cache.L.H !== L.H || cache.L.menu.h !== L.menu.h) cache = build(L);
    const { D } = cache, oy = Math.round(D * (1 - TitleCam.at(now))), T = now - TitleCam.t0;
    c.imageSmoothingEnabled = false;
    c.drawImage(cache.bg, 0, -D + oy);
    const put = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y) + oy, 1, 1); };
    for (const s of cache.stars) if (T < s.life && Math.sin(now / 500 + s.p * 10) > -0.7) put(s.x, s.y, s.col);
    for (const cl of cache.clouds) c.drawImage(GridSprite.render(cl.sp), Math.round(((cl.x + now * cl.s) % (L.W + 60)) - 50), cl.y - 2 + oy);
    titleBirds(put, L, now);
    // fumaça fina subindo das casas de Erukh, e as fontes da praça cintilando
    for (const sm of cache.smoke) for (let i = 0; i < 9; i++) if (i < 6 || i % 2) put(sm.x + Math.round(Math.sin(now / 700 + i * 0.5 + sm.p) * i / 4), sm.y - i, C.smoke[(i >> 2) % 2]);
    cache.fountains.forEach(([x, y], i) => { if ((Math.floor(now / 380) + i * 3) % 5 < 2) put(x, y, C.fountain[(Math.floor(now / 380) + i) % 2]); });
    // brilho no rio: o ouro do céu tremendo na água
    const ph = Math.floor(now / 260);
    for (let i = 0; i < cache.river.length; i += 3) { const [x, y] = cache.river[i]; if ((x + y * 3 + ph) % 7 === 0) put(x, y, (ph + i) % 3 ? C.river.glint : C.river.gold); }
    const st = L.star, wind = Math.floor(now / 650) % 2;
    c.drawImage(GridSprite.render(TITLE_STAR, Math.floor(now / 900) % 2), st.x, st.y + oy);
    c.drawImage(GridSprite.render(TITLE2_LIT.aldo, Math.floor(now / 1100) % 2), L.aldo.x, L.aldo.y + oy);
    c.drawImage(GridSprite.render(TITLE2_LIT.lyra, wind), L.lyra.x, L.lyra.y + oy);
    for (const t of cache.tufts) {
      const y0 = cache.tops[t.x] - 1;
      for (let i = 0; i < t.h; i++) put(t.x + (i === t.h - 1 ? wind : 0), y0 - i, i === t.h - 1 ? C.grass[2] : i ? C.grass[0] : C.grass[1]);
      put(t.x + 1, y0, C.grass[0]);
      if (t.flower) put(t.x + wind, y0 - t.h, t.flower);
    }
  }
  return { draw, layout: layoutNow };
})();

// ---------- A ou B: qual abertura mostrar (o Daniel escolhe pelo botão; a escolha fica guardada) ----------
const titleVariant = stored => (stored === 'a' ? 'a' : 'b');
const TitleScene = {
  KEY: 'eterra-title', mem: null,
  get v() { let s = this.mem; try { s = localStorage.getItem(this.KEY) || s; } catch (e) { /* sem armazenamento */ } return titleVariant(s); },
  cur() { return this.v === 'a' ? TitleBG : TitleBG2; },
  toggle() { const v = this.v === 'a' ? 'b' : 'a'; this.mem = v; try { localStorage.setItem(this.KEY, v); } catch (e) { /* fica só nesta sessão */ } return v; },
};

if (typeof module !== 'undefined') module.exports = { TITLE2_C, TITLE2_CLOUDS, titleCloud, rimLit, TITLE2_LIT, titleLayout2, titleVariant };
