// ===== Vila de Valmor: mapa visto de cima, moradores e entrada das catacumbas =====

const TS = 16, TOWN_W = 32, TOWN_H = 22;
const TILE = { GRASS: 0, PATH: 1, WATER: 2, TREE: 3, CLIFF: 4, BUSH: 5, FLOWER: 6,
  FLOOR: 7, WALL: 8, COUNTER: 9, TABLE: 10, HEARTH: 11, BARREL: 12, DOOR: 13,
  // cemitério
  GATE: 14, MURO: 15, TOMB: 16, GRAVE_O: 17, GRAVE_U: 18, GRAVE_OLD: 19, DEADTREE: 20 };
const WALKABLE = new Set([TILE.GRASS, TILE.PATH, TILE.FLOWER, TILE.FLOOR, TILE.DOOR, TILE.GATE]);
const isInterior = t => t >= TILE.FLOOR && t <= TILE.DOOR;
const TDIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // cima, direita, baixo, esquerda
const CRYPT_FRONT = { x: 27, y: 18, dir: 2 };
const SHOP = [['pocao', 15], ['eter', 30], ['pena', 60]];

const BUILDINGS = [
  { id: 'chapel', x: 2, y: 3, w: 3, h: 3 },
  { id: 'elder', x: 13, y: 3, w: 4, h: 3 },
  { id: 'shop', x: 20, y: 4, w: 3, h: 2 },
  { id: 'smith', x: 25, y: 4, w: 3, h: 2 },
  { id: 'sara', x: 7, y: 15, w: 3, h: 2 },
  { id: 'joaquim', x: 16, y: 15, w: 3, h: 2 },
  { id: 'crypt', x: 26, y: 15, w: 3, h: 3 },
  { id: 'tavern', x: 20, y: 14, w: 5, h: 3 },
];
BUILDINGS.forEach(b => { b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }; });

// Aparência: pele, cabelo, roupa, pernas; robe = túnica longa; hat = capacete/chapéu
const LOOKS = {
  aldo:  { skin: '#f0c090', hair: '#6a3a1a', body: '#d08a30', legs: '#5a3a20' },
  lyra:  { skin: '#f4cca0', hair: '#f0d860', body: '#a050c0', legs: '#5a2a70', robe: true, long: true },
  teo:   { skin: '#e8b888', hair: '#3a2a1a', body: '#e8f0e8', legs: '#4a8a6a', robe: true },
  andilla: { skin: '#e8c0a0', hair: '#1a1418', body: '#7a7a82', legs: '#4a3424', mark: '#7a1a24' }, // capa cinza como a dos encapuzados; lenço escuro no peito
  guard: { skin: '#e0b080', hair: '#888', body: '#7a8494', legs: '#3a3a4a', hat: '#a0a8b8' },
  lia:   { skin: '#f4cca0', hair: '#a04a20', body: '#e05a6a', legs: '#7a2a3a', robe: true, long: true },
  rui:   { skin: '#d8a070', hair: '#4a3020', body: '#7a9a3a', legs: '#5a4020', hat: '#d8c070' },
  marta: { skin: '#e8c0a0', hair: '#e8e8e8', body: '#6a5a8a', legs: '#3a3050', robe: true, long: true },
  tome:  { skin: '#c89060', hair: '#2a2018', body: '#3a7ab0', legs: '#4a4030' },
  nino:  { skin: '#f0c898', hair: '#2a1a10', body: '#e0b030', legs: '#4a5a8a' },
  berta: { skin: '#e8b890', hair: '#b04a20', body: '#c05a3a', legs: '#6a3020', robe: true, long: true },
  ana:   { skin: '#e0b898', hair: '#e8e8e8', body: '#7a5a3a', legs: '#3a2a20', robe: true, long: true },
  soldier: { skin: '#e0b080', hair: '#888', body: '#6a7484', legs: '#3a3a4a', hat: '#a0a8b8' },
  tobias: { skin: '#e0b080', hair: '#5a3a1a', body: '#e8eef8', legs: '#3a5aa8', robe: true },
  ossada: { skin: '#e8e2d0', hair: '#e8e2d0', body: '#cfc8b4', legs: '#bfb8a4', mark: '#2a2420' },
  hooded: { skin: '#2a2228', hair: '#6a6a72', body: '#7a7a82', legs: '#3a3a42', hat: '#6a6a72', robe: true, mark: '#e02030' },
};

const say = (name, lines) => lines.reduce((p, l) => p.then(() => UI.say(`${name}:\n${l}`)), Promise.resolve());
// Etapas da vila: arrive (Aldo acabou de chegar) · start (depois da noite na taverna) · quest (missão do ancião) · won
const stage = () => G.bossDead ? 'won' : G.quest ? 'quest' : G.intro ? 'start' : 'arrive';
const STAGE_FALLBACK = { arrive: ['arrive', 'start'], start: ['start'], quest: ['quest', 'start'], won: ['won', 'quest', 'start'] };
const byStage = o => { for (const k of STAGE_FALLBACK[stage()]) if (o[k]) return o[k]; return o.start || o.quest || o.won; };

const NPC_DEFS = [
  { id: 'guard', name: 'Guarda Hugo', x: 27, y: 18, dir: 2, wander: 0, lines: {
    start: ['Alto! A cripta está fechada por ordem do ancião Bertoldo.', 'Se querem descer, falem com ele primeiro. É a casa de telhado verde, ao norte.'],
    quest: ['Que a luz os guie lá embaixo. Voltem vivos.'],
    won: ['Já não ouço ossos batendo debaixo da cripta. Vocês conseguiram!'] } },
  { id: 'lia', name: 'Lia', x: 18, y: 8, dir: 2, wander: 2, lines: {
    start: ['Meu gato fugiu ontem à noite...', 'Ele nunca foge. Acho que ficou com medo dos barulhos que vêm da cripta.'],
    won: ['O Bigode voltou pra casa! Ele voltou sozinho... mas obrigada mesmo assim!'] } },
  { id: 'rui', name: 'Rui, o lavrador', x: 6, y: 7, dir: 2, wander: 2, lines: {
    start: ['Toda noite ouço algo arranhando debaixo da terra.', 'Eu falei das covas vazias e ninguém acreditou. Agora acreditam?'],
    won: ['Dormi a noite inteira pela primeira vez em semanas!'] } },
  { id: 'marta', name: 'Dona Marta', x: 23, y: 8, dir: 2, wander: 1, lines: {
    start: ['Minha avó dizia que foram paladinos que fecharam a cripta. E que ela nunca mais devia abrir.', 'Se os mortos estão acordando... alguém está batendo do outro lado.'],
    quest: ['Lá embaixo, leiam as paredes. Os antigos escreviam tudo.', 'Levem poções. Muitas poções. A Dora vende na loja de telhado dourado.'],
    won: ['Meu avô ficaria orgulhoso de vocês.'] } },
  { id: 'tome', name: 'Tomé, o pescador', x: 9, y: 11, dir: 3, wander: 0, lines: {
    start: ['Os peixes sumiram do lago desde que o chão começou a tremer.', 'Dizem que lá embaixo há fontes de luz que curam qualquer ferida e guardam a memória de quem passa.'],
    won: ['Os peixes voltaram! E eu achando que era a minha isca.'] } },
  { id: 'nino', name: 'Nino', x: 14, y: 12, dir: 2, wander: 3, lines: {
    start: ['Eu não tenho medo de esqueleto!', '...Tá bom, tenho um pouquinho.'],
    quest: ['Vocês vão mesmo descer? Uau! Me tragam um osso!'],
    won: ['Quando eu crescer, quero ser herói igual a vocês!'] } },
  { id: 'cat', name: 'Bigode', x: 20, y: 17, dir: 3, wander: 4, cat: true, lines: {
    start: ['Miau?'], won: ['Purrrr...'] } },
];

// ---------- Mapa ----------
function buildTownMap() {
  const N = TOWN_W, g = new Uint8Array(TOWN_W * TOWN_H).fill(TILE.GRASS);
  const id = (x, y) => y * N + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < TOWN_W && y < TOWN_H) g[id(x, y)] = t; };
  const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };

  for (let x = 0; x < N; x++) { set(x, 0, TILE.CLIFF); set(x, TOWN_H - 1, TILE.TREE); }
  for (let y = 1; y < TOWN_H; y++) { set(0, y, TILE.TREE); set(N - 1, y, TILE.TREE); }
  // Caminhos
  rect(0, 6, 30, 6, TILE.PATH);       // rua principal (sai a oeste)
  rect(12, 6, 12, 18, TILE.PATH);     // rua que desce
  rect(6, 18, 29, 18, TILE.PATH);     // rua do sul, até a cripta
  rect(9, 10, 11, 10, TILE.PATH);     // trilha do lago
  for (const b of BUILDINGS) set(b.door.x, b.door.y + 1, TILE.PATH);
  // Portão do cemitério, colado à capela, ligado à rua principal
  set(5, 4, TILE.PATH); set(5, 5, TILE.PATH); set(5, 3, TILE.GATE);
  // Lago
  rect(4, 9, 8, 9, TILE.WATER); rect(3, 10, 8, 11, TILE.WATER); rect(3, 12, 7, 12, TILE.WATER);

  // Áreas que ficam livres: perto de caminhos, prédios e moradores
  const keep = new Uint8Array(N * TOWN_H);
  for (let y = 0; y < TOWN_H; y++) for (let x = 0; x < N; x++) {
    if (g[id(x, y)] !== TILE.PATH) continue;
    for (const [dx, dy] of [[0, 0], ...TDIRS]) if (x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < TOWN_H) keep[id(x + dx, y + dy)] = 1;
  }
  for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) keep[id(x, y)] = 1;
  for (const n of NPC_DEFS) for (const [dx, dy] of [[0, 0], ...TDIRS]) keep[id(n.x + dx, n.y + dy)] = 1;

  // Árvores, arbustos e flores (semente fixa: a vila é sempre a mesma)
  const rng = mulberry32(2024);
  for (let y = 1; y < TOWN_H - 1; y++) for (let x = 1; x < N - 1; x++) {
    const r = rng();
    if (g[id(x, y)] !== TILE.GRASS || keep[id(x, y)]) { if (g[id(x, y)] === TILE.GRASS && r < 0.07) g[id(x, y)] = TILE.FLOWER; continue; }
    if (y <= 2 || r < 0.34) g[id(x, y)] = TILE.TREE;
    else if (r < 0.40) g[id(x, y)] = TILE.BUSH;
    else if (r < 0.48) g[id(x, y)] = TILE.FLOWER;
  }

  const bld = new Int8Array(N * TOWN_H).fill(-1);
  BUILDINGS.forEach((b, i) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) bld[id(x, y)] = i; });
  return { g, bld };
}

// Interior da taverna: # parede, . chão, H lareira, C balcão, T mesa, B barril, D porta
const TAVERN_PLAN = [
  '##############',
  '#.HH....C.BBB#',
  '#.......C....#',
  '#.TT....CCCCC#',
  '#............#',
  '#..........TT#',
  '#.TT.........#',
  '#............#',
  '#............#',
  '#######D######',
];
function buildTavernMap() {
  const key = { '#': TILE.WALL, '.': TILE.FLOOR, H: TILE.HEARTH, C: TILE.COUNTER, T: TILE.TABLE, B: TILE.BARREL, D: TILE.DOOR };
  return Uint8Array.from(TAVERN_PLAN.join(''), ch => key[ch]);
}

// Uma área é um mapa do motor da vila: a vila de Valmor ou o interior de um prédio
function makeArea(name, short, W, H, g, buildings, outside) {
  const bld = new Int8Array(W * H).fill(-1);
  buildings.forEach((b, i) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) bld[y * W + x] = i; });
  return { name, short, W, H, g, buildings, bld, outside, layer: null };
}
const AREAS = {
  valmor: makeArea('Vila de Valmor', 'VALMOR', TOWN_W, TOWN_H, buildTownMap().g, BUILDINGS, TILE.TREE),
  taverna: makeArea('Taverna Poney Saltitante', 'TAVERNA', 14, 10, buildTavernMap(), [], TILE.WALL),
};

const TOWN = {
  A: AREAS.valmor, p: null, followers: [], npcs: [], step: 0, dim: 0,
  inside(x, y) { return x >= 0 && y >= 0 && x < this.A.W && y < this.A.H; },
  tileAt(x, y) { return this.inside(x, y) ? this.A.g[y * this.A.W + x] : this.A.outside; },
  buildingAt(x, y) { const i = this.inside(x, y) ? this.A.bld[y * this.A.W + x] : -1; return i >= 0 ? this.A.buildings[i] : null; },
  walkable(x, y) { return WALKABLE.has(this.tileAt(x, y)) && !this.buildingAt(x, y); },
};

// ---------- Desenho estático (tiles e prédios) ----------
function drawTownLayer(A) {
  const cv = document.createElement('canvas');
  cv.width = A.W * TS; cv.height = A.H * TS;
  const c = cv.getContext('2d');
  const rng = mulberry32(77);
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const speckle = (X, Y, cols, n) => { for (let i = 0; i < n; i++) px(X + Math.floor(rng() * TS), Y + Math.floor(rng() * TS), cols[i % cols.length]); };
  const grass = (X, Y) => { c.fillStyle = '#3f9a3a'; c.fillRect(X, Y, TS, TS); speckle(X, Y, ['#56b84c', '#2f7f2c', '#4aa842'], 14); };

  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
    const X = x * TS, Y = y * TS, t = TOWN.tileAt(x, y);
    if (isInterior(t)) { drawInteriorTile(c, t, X, Y, x, y, speckle); continue; }
    if (t >= TILE.GATE) { grass(X, Y); drawGraveTile(c, t, X, Y, x, y, px, rng); continue; }
    if (t === TILE.CLIFF) {
      c.fillStyle = '#e6d49a'; c.fillRect(X, Y, TS, TS); speckle(X, Y, ['#d4bd7c', '#f2e4b4'], 10);
      c.fillStyle = '#9a6430'; c.fillRect(X, Y + 11, TS, 5);
      c.fillStyle = '#c08040'; for (let i = 0; i < TS; i += 4) c.fillRect(X + i, Y + 11, 2, 2);
      c.fillStyle = '#5a3a18'; c.fillRect(X, Y + 15, TS, 1);
      continue;
    }
    if (t === TILE.PATH) {
      c.fillStyle = '#a87c48'; c.fillRect(X, Y, TS, TS); speckle(X, Y, ['#8c6434', '#c09460', '#7a5428'], 12);
      continue;
    }
    if (t === TILE.WATER) {
      c.fillStyle = '#2a68c8'; c.fillRect(X, Y, TS, TS); speckle(X, Y, ['#3a80e0'], 8);
      c.fillStyle = '#a8d8ff';
      if (TOWN.tileAt(x, y - 1) !== TILE.WATER) c.fillRect(X, Y, TS, 2);
      if (TOWN.tileAt(x, y + 1) !== TILE.WATER) c.fillRect(X, Y + 14, TS, 2);
      if (TOWN.tileAt(x - 1, y) !== TILE.WATER) c.fillRect(X, Y, 2, TS);
      if (TOWN.tileAt(x + 1, y) !== TILE.WATER) c.fillRect(X + 14, Y, 2, TS);
      continue;
    }
    grass(X, Y);
    if (t === TILE.TREE) {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(X + 8, Y + 14, 6, 2, 0, 0, 7); c.fill();
      c.fillStyle = '#5a3a1e'; c.fillRect(X + 6, Y + 9, 4, 6);
      c.fillStyle = '#1d521b'; c.beginPath(); c.arc(X + 8, Y + 7, 7, 0, 7); c.fill();
      c.fillStyle = '#2d7a2a'; c.beginPath(); c.arc(X + 8, Y + 7, 6, 0, 7); c.fill();
      c.fillStyle = '#4fa844'; c.beginPath(); c.arc(X + 6, Y + 5, 3, 0, 7); c.fill();
      px(X + 5, Y + 4, '#7cc46a');
    } else if (t === TILE.BUSH) {
      c.fillStyle = '#1d521b'; c.beginPath(); c.arc(X + 8, Y + 9, 6, 0, 7); c.fill();
      c.fillStyle = '#3a8a34'; c.beginPath(); c.arc(X + 8, Y + 9, 5, 0, 7); c.fill();
      c.fillStyle = '#e04848'; c.fillRect(X + 6, Y + 7, 2, 2); c.fillRect(X + 10, Y + 10, 2, 2);
    } else if (t === TILE.FLOWER) {
      for (const [fx, fy, col] of [[3, 4, '#ff6a8a'], [10, 3, '#ffe060'], [6, 10, '#ffffff'], [12, 11, '#ff6a8a']]) {
        c.fillStyle = col; c.fillRect(X + fx, Y + fy, 2, 2); px(X + fx, Y + fy + 2, '#2a6a24');
      }
    }
  }
  for (const b of A.buildings) drawBuilding(c, b);
  return cv;
}

// Cemitério: muro, portão, lápides, covas e árvores secas (grama já pintada embaixo)
function drawGraveTile(c, t, X, Y, x, y, px, rng) {
  const R = (x0, y0, w, h, col) => { c.fillStyle = col; c.fillRect(X + x0, Y + y0, w, h); };
  if (t === TILE.GATE) {
    R(0, 2, 4, 14, '#8a8a94'); R(12, 2, 4, 14, '#8a8a94'); R(0, 2, 4, 1, '#b0b0ba'); R(12, 2, 4, 1, '#b0b0ba');
    for (let i = 5; i < 12; i += 2) R(i, 4, 1, 12, '#2a2a30');
    R(4, 5, 8, 1, '#2a2a30'); R(4, 11, 8, 1, '#2a2a30');
  } else if (t === TILE.MURO) {
    R(0, 4, 16, 12, '#6e6c78'); R(0, 4, 16, 2, '#9a98a4');
    for (let r = 0; r < 3; r++) for (let k = (r % 2) * 4; k < 16; k += 8) R(k, 7 + r * 3, 1, 3, '#55535e');
    R(0, 9, 16, 1, '#55535e'); R(0, 12, 16, 1, '#55535e');
  } else if (t === TILE.TOMB) {
    R(4, 13, 9, 2, 'rgba(0,0,0,.3)');
    R(4, 5, 8, 9, '#9a98a4'); R(5, 4, 6, 1, '#9a98a4'); R(4, 5, 1, 9, '#bcbac6'); R(11, 5, 1, 9, '#6e6c78');
    R(6, 7, 4, 1, '#6e6c78'); R(6, 9, 4, 1, '#6e6c78');
  } else if (t === TILE.GRAVE_O) {
    R(3, 2, 10, 12, '#3a2a1e'); R(4, 3, 8, 10, '#22180f');
    for (const [a, b] of [[2, 1], [10, 1], [1, 12], [12, 13], [6, 0]]) R(a, b, 3, 2, '#5a4230'); // torrões empurrados para fora
  } else if (t === TILE.GRAVE_U) {
    R(2, 3, 9, 11, '#2a1e14'); R(3, 4, 7, 9, '#1a120a');
    R(11, 5, 4, 8, '#6a4a30'); R(12, 4, 2, 2, '#7a5a3a'); // monte de terra ao lado
  } else if (t === TILE.GRAVE_OLD) {
    R(3, 14, 11, 2, 'rgba(0,0,0,.3)');
    R(3, 3, 10, 11, '#8a8894'); R(4, 2, 8, 1, '#8a8894'); R(3, 3, 1, 11, '#aeacb8');
    R(7, 3, 1, 4, '#3a3840'); R(8, 6, 1, 4, '#3a3840'); R(7, 10, 1, 3, '#3a3840'); // rachadura
  } else if (t === TILE.DEADTREE) {
    R(7, 6, 2, 10, '#5a4a3e'); R(3, 4, 4, 1, '#6a5a4e'); R(9, 3, 4, 1, '#6a5a4e'); R(5, 2, 1, 3, '#6a5a4e');
    R(11, 1, 1, 3, '#6a5a4e'); R(6, 5, 1, 2, '#6a5a4e'); R(9, 4, 1, 2, '#6a5a4e'); R(4, 15, 9, 1, 'rgba(0,0,0,.3)');
  }
}

function drawInteriorTile(c, t, X, Y, x, y, speckle) {
  const floor = () => {
    c.fillStyle = '#8a5a32'; c.fillRect(X, Y, TS, TS);
    c.fillStyle = '#6e4626'; c.fillRect(X, Y + 7, TS, 1); c.fillRect(X, Y + 15, TS, 1);
    c.fillRect(X + ((x * 7) % 12) + 2, Y, 1, 7); c.fillRect(X + ((x * 5 + 6) % 12) + 2, Y + 8, 1, 7);
    speckle(X, Y, ['#9a6a3e'], 4);
  };
  if (t === TILE.WALL || t === TILE.HEARTH) {
    c.fillStyle = '#4a3a34'; c.fillRect(X, Y, TS, TS);
    c.fillStyle = '#5c4a42';
    for (let r = 0; r < 4; r++) for (let k = (r % 2) * 4; k < TS; k += 8) c.fillRect(X + k, Y + r * 4, 7, 3);
    if (t === TILE.WALL && y === 0 && x % 4 === 2) {
      // Janela com a noite lá fora
      c.fillStyle = '#2a1e18'; c.fillRect(X + 3, Y + 3, 10, 10);
      c.fillStyle = '#1a2a50'; c.fillRect(X + 4, Y + 4, 8, 8);
      c.fillStyle = '#e8f0ff'; c.fillRect(X + 9, Y + 5, 1, 1); c.fillRect(X + 5, Y + 9, 1, 1);
      c.fillStyle = '#2a1e18'; c.fillRect(X + 7, Y + 4, 1, 8); c.fillRect(X + 4, Y + 7, 8, 1);
    }
    if (t === TILE.HEARTH) {
      c.fillStyle = '#7a6a60'; c.fillRect(X, Y + 2, TS, 14);
      c.fillStyle = '#140c0a'; c.fillRect(X + 2, Y + 6, 12, 10);
    }
    return;
  }
  floor();
  if (t === TILE.COUNTER) {
    c.fillStyle = '#4a2a14'; c.fillRect(X, Y + 2, TS, 14);
    c.fillStyle = '#7a4a24'; c.fillRect(X, Y + 2, TS, 5);
    c.fillStyle = '#9a6234'; c.fillRect(X, Y + 2, TS, 1);
    if ((x + y) % 3 === 0) { c.fillStyle = '#d8d0c0'; c.fillRect(X + 5, Y, 4, 5); c.fillStyle = '#f0e8a0'; c.fillRect(X + 6, Y + 1, 2, 1); }
  } else if (t === TILE.TABLE) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(X + 1, Y + 13, 14, 3);
    c.fillStyle = '#5a3418'; c.fillRect(X + 1, Y + 3, 14, 10);
    c.fillStyle = '#a0662e'; c.fillRect(X + 1, Y + 3, 14, 8);
    c.fillStyle = '#b8783a'; c.fillRect(X + 1, Y + 3, 14, 1);
    c.fillStyle = '#e8e0d0'; c.fillRect(X + 4, Y + 5, 4, 3); c.fillStyle = '#c86a2a'; c.fillRect(X + 5, Y + 5, 2, 1);
  } else if (t === TILE.BARREL) {
    c.fillStyle = '#5a3418'; c.beginPath(); c.ellipse(X + 8, Y + 9, 6, 6, 0, 0, 7); c.fill();
    c.fillStyle = '#8a5428'; c.beginPath(); c.ellipse(X + 8, Y + 8, 5, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#3a3a3a'; c.fillRect(X + 3, Y + 6, 10, 1); c.fillRect(X + 3, Y + 11, 10, 1);
  } else if (t === TILE.DOOR) {
    c.fillStyle = '#2a1a10'; c.fillRect(X + 1, Y + 6, 14, 10);
    c.fillStyle = '#c8b090'; c.fillRect(X + 2, Y + 12, 12, 4);
  }
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function drawBuilding(c, b) {
  const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS;
  const dx = X + (b.door.x - b.x) * TS;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(X + 3, Y + H - 1, W - 2, 3);
  if (b.id === 'crypt') return drawCrypt(c, X, Y, W, H, dx);
  const style = {
    chapel: { roof: '#4e5d80', wall: '#e6e0d2' }, elder: { roof: '#3f7a46', wall: '#d8ccb0' },
    shop: { roof: '#c08a2a', wall: '#d8c8a8' }, smith: { roof: '#7a4a3a', wall: '#b8b0a0' },
    tavern: { roof: '#8a4a2a', wall: '#d0bc98' },
  }[b.id] || { roof: '#a8442e', wall: '#cfc4a8' };
  const rh = Math.round(H * 0.5);
  // Parede de pedra
  c.fillStyle = style.wall; c.fillRect(X + 1, Y + rh - 2, W - 2, H - rh + 2);
  c.fillStyle = shadeHex(style.wall, 0.8);
  for (let y = Y + rh + 2, row = 0; y < Y + H; y += 4, row++) {
    c.fillRect(X + 1, y, W - 2, 1);
    for (let x = X + 1 + (row % 2) * 4; x < X + W - 1; x += 8) c.fillRect(x, y - 3, 1, 3);
  }
  // Telhado
  c.fillStyle = shadeHex(style.roof, 0.6);
  c.beginPath(); c.moveTo(X - 2, Y + rh + 1); c.lineTo(X + W + 2, Y + rh + 1); c.lineTo(X + W - 4, Y + 1); c.lineTo(X + 4, Y + 1); c.closePath(); c.fill();
  c.fillStyle = style.roof;
  c.beginPath(); c.moveTo(X - 1, Y + rh - 1); c.lineTo(X + W + 1, Y + rh - 1); c.lineTo(X + W - 4, Y + 2); c.lineTo(X + 4, Y + 2); c.closePath(); c.fill();
  c.fillStyle = shadeHex(style.roof, 0.78);
  for (let y = Y + 5; y < Y + rh - 1; y += 3) c.fillRect(X + 2, y, W - 4, 1);
  c.fillStyle = shadeHex(style.roof, 1.3); c.fillRect(X + 5, Y + 2, W - 10, 1);
  // Janelas (todas as colunas menos a da porta)
  for (let cx = 0; cx < b.w; cx++) {
    const wx = X + cx * TS + 5;
    if (X + cx * TS === dx) continue;
    c.fillStyle = '#e8d8a0'; c.fillRect(wx - 1, Y + H - 11, 7, 6);
    c.fillStyle = '#2a3c5c'; c.fillRect(wx, Y + H - 10, 5, 4);
    c.fillStyle = '#e8d8a0'; c.fillRect(wx + 2, Y + H - 10, 1, 4);
  }
  // Porta
  c.fillStyle = '#3a2210'; c.fillRect(dx + 3, Y + H - 12, 10, 12);
  c.fillStyle = '#7a4a22'; c.fillRect(dx + 4, Y + H - 11, 8, 11);
  c.fillStyle = '#5a3418'; c.fillRect(dx + 8, Y + H - 11, 1, 11);
  c.fillStyle = '#e0c050'; c.fillRect(dx + 10, Y + H - 6, 1, 1);
  if (b.id === 'chapel') {
    // Torre do sino com cruz
    const tx = X + W / 2 - 5;
    c.fillStyle = style.wall; c.fillRect(tx, Y - 6, 10, 16);
    c.fillStyle = '#2a2a3a'; c.fillRect(tx + 3, Y - 2, 4, 5);
    c.fillStyle = '#ffd23f'; c.fillRect(tx + 4, Y - 1, 2, 2);
    c.fillStyle = shadeHex(style.roof, 0.8); c.beginPath(); c.moveTo(tx - 2, Y - 6); c.lineTo(tx + 12, Y - 6); c.lineTo(tx + 5, Y - 13); c.closePath(); c.fill();
    c.fillStyle = '#ffd23f'; c.fillRect(tx + 4, Y - 20, 2, 8); c.fillRect(tx + 2, Y - 18, 6, 2);
  } else if (b.id === 'shop') {
    // Placa com um frasco
    c.fillStyle = '#5a3418'; c.fillRect(X + W - 6, Y + rh, 2, 6);
    c.fillStyle = '#8a5a2a'; c.fillRect(X + W - 13, Y + rh + 5, 14, 9);
    c.fillStyle = '#e04848'; c.fillRect(X + W - 9, Y + rh + 8, 6, 5); c.fillStyle = '#f0f0f0'; c.fillRect(X + W - 7, Y + rh + 6, 2, 2);
  } else if (b.id === 'tavern') {
    // Placa com um caldeirão escuro
    c.fillStyle = '#5a3418'; c.fillRect(X + 4, Y + rh, 2, 6);
    c.fillStyle = '#8a5a2a'; c.fillRect(X - 1, Y + rh + 5, 14, 9);
    c.fillStyle = '#1a1a1a'; c.fillRect(X + 2, Y + rh + 8, 8, 5); c.fillRect(X + 1, Y + rh + 8, 10, 1);
    c.fillStyle = '#e06020'; c.fillRect(X + 4, Y + rh + 13, 4, 1);
  } else if (b.id === 'smith') {
    // Chaminé com bigorna na placa
    c.fillStyle = '#6a6a6a'; c.fillRect(X + W - 12, Y - 3, 6, 9);
    c.fillStyle = '#3a3a3a'; c.fillRect(X + 2, Y + rh + 3, 10, 3); c.fillRect(X + 5, Y + rh + 6, 4, 3);
  }
}

function drawCrypt(c, X, Y, W, H, dx) {
  c.fillStyle = '#4a4854'; c.fillRect(X + 1, Y + 12, W - 2, H - 12);
  c.fillStyle = '#5c5a68';
  for (let y = Y + 14, row = 0; y < Y + H; y += 6, row++) for (let x = X + 2 + (row % 2) * 5; x < X + W - 4; x += 10) c.fillRect(x, y, 8, 4);
  // Frontão
  c.fillStyle = '#6a6876'; c.beginPath(); c.moveTo(X - 1, Y + 14); c.lineTo(X + W + 1, Y + 14); c.lineTo(X + W / 2, Y + 1); c.closePath(); c.fill();
  c.fillStyle = '#3a3844'; c.fillRect(X - 1, Y + 13, W + 2, 2);
  // Selo rachado
  c.strokeStyle = '#8ad8ff'; c.lineWidth = 1; c.beginPath(); c.arc(X + W / 2, Y + 9, 3, 0, 7); c.stroke();
  c.strokeStyle = '#1a1820'; c.beginPath(); c.moveTo(X + W / 2 - 1, Y + 5); c.lineTo(X + W / 2 + 1, Y + 13); c.stroke();
  // Colunas
  c.fillStyle = '#9896a4'; c.fillRect(X + 3, Y + 15, 4, H - 15); c.fillRect(X + W - 7, Y + 15, 4, H - 15);
  // Entrada escura com degraus
  c.fillStyle = '#0c0a10'; c.fillRect(dx + 2, Y + H - 16, 12, 16);
  c.fillStyle = '#2a2830'; for (let i = 0; i < 4; i++) c.fillRect(dx + 3 + i, Y + H - 4 - i * 3, 10 - i * 2, 1);
}

// ---------- Personagens ----------
const PSPR = {};
function personSprite(key, dir, frame) {
  const k = `${key}|${dir}|${frame}`;
  if (PSPR[k]) return PSPR[k];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 18;
  const c = cv.getContext('2d');
  const L = LOOKS[key];
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y + 2, w, h); };
  r(4, 14, 8, 2, 'rgba(0,0,0,.3)');
  const side = dir === 1 || dir === 3;
  // Pernas
  if (L.robe) {
    r(4, 10, 8, 4, L.body); r(4, 13, 8, 1, shadeHex(L.body, 0.75));
    r(frame ? 5 : 4, 14, 2, 1, L.legs); r(frame ? 9 : 10, 14, 2, 1, L.legs);
  } else if (side) {
    r(frame ? 5 : 6, 11, 2, 4, L.legs); r(frame ? 9 : 8, 11, 2, 4, shadeHex(L.legs, 0.8));
  } else {
    r(5, 11, 2, frame ? 3 : 4, L.legs); r(9, 11, 2, frame ? 4 : 3, L.legs);
  }
  // Tronco e braços
  r(4, 6, 8, 6, L.body); r(4, 9, 8, 1, shadeHex(L.body, 0.6));
  if (side) r(7, 7, 2, 4, shadeHex(L.body, 0.8)), r(7, 10 + frame, 2, 1, L.skin);
  else { const s = frame ? 1 : 0; r(3, 7 + s, 1, 4, L.skin); r(12, 8 - s, 1, 4, L.skin); }
  // Cabeça
  r(5, 1, 6, 5, L.skin);
  const hair = L.hat || L.hair;
  if (dir === 0) r(5, 0, 6, 6, L.hair);
  else {
    r(5, 0, 6, 2, hair);
    if (dir === 2) { r(4, 1, 1, 3, L.hair); r(11, 1, 1, 3, L.hair); r(6, 3, 1, 1, '#222'); r(9, 3, 1, 1, '#222'); }
    if (dir === 1) { r(5, 1, 2, 4, L.hair); r(9, 3, 1, 1, '#222'); }
    if (dir === 3) { r(9, 1, 2, 4, L.hair); r(6, 3, 1, 1, '#222'); }
    if (L.long) { r(4, 2, 1, 5, L.hair); r(11, 2, 1, 5, L.hair); }
  }
  if (L.hat) { r(4, 0, 8, 2, L.hat); r(5, -1, 6, 1, L.hat); }
  if (L.mark && dir !== 0) r(7, 7, 2, 1, L.mark);
  return (PSPR[k] = cv);
}

function catSprite(dir, frame, fur = '#e09038', stripe = '#b06a20') {
  const k = `cat|${dir}|${frame}|${fur}`;
  if (PSPR[k]) return PSPR[k];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 18;
  const c = cv.getContext('2d');
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  r(3, 15, 10, 2, 'rgba(0,0,0,.3)');
  r(3, 10, 8, 4, fur); r(5, 10, 1, 4, stripe); r(8, 10, 1, 4, stripe);
  r(10, 7, 5, 5, fur); r(10, 6, 1, 1, fur); r(14, 6, 1, 1, fur);
  r(11, 9, 1, 1, '#222'); r(13, 9, 1, 1, '#222'); r(12, 10, 1, 1, '#f8a0a0');
  r(1, 7 + frame, 2, 1, fur); r(2, 8, 1, 3, fur);
  r(4, 14, 1, 2 - frame, stripe); r(9, 14, 1, 1 + frame, stripe);
  if (dir === 3) {
    const f = document.createElement('canvas'); f.width = 16; f.height = 18;
    const fc = f.getContext('2d'); fc.translate(16, 0); fc.scale(-1, 1); fc.drawImage(cv, 0, 0);
    return (PSPR[k] = f);
  }
  return (PSPR[k] = cv);
}

// Dois morcegos lado a lado, batendo as asas (inimigo visível no cemitério)
function batsSprite(now) {
  const up = Math.floor(now / 300) % 2, k = `bats|${up}`;
  if (PSPR[k]) return PSPR[k];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 18;
  const c = cv.getContext('2d'), r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (const [ox, oy] of [[1, 4], [9, 8]]) {
    r(ox + 1, oy + 2, 4, 3, '#4a3a5a');
    if (up) { r(ox - 1, oy, 2, 2, '#4a3a5a'); r(ox + 5, oy, 2, 2, '#4a3a5a'); }
    else { r(ox - 1, oy + 4, 2, 2, '#4a3a5a'); r(ox + 5, oy + 4, 2, 2, '#4a3a5a'); }
    r(ox + 2, oy + 3, 1, 1, '#ffdd33'); r(ox + 4, oy + 3, 1, 1, '#ffdd33');
  }
  return (PSPR[k] = cv);
}
function foeSprite(n, now) {
  if (n.def.foe === 'rat') return catSprite(n.dir === 1 ? 1 : 3, Math.floor(now / 400) % 2, '#7a6a5a', '#4a3a2e');
  if (n.def.foe === 'bats') return batsSprite(now);
  return personSprite('ossada', n.dir, 0);
}

// ---------- Estado da vila ----------
function newActor(x, y, dir) { return { x, y, dir, fx: x, fy: y, t: 1, dur: 180, frame: 0 }; }
const actorPos = a => { const k = Math.min(1, a.t); return { x: (a.fx + (a.x - a.fx) * k) * TS, y: (a.fy + (a.y - a.fy) * k) * TS }; };
function moveActor(a, x, y, dur) { a.fx = a.x; a.fy = a.y; a.x = x; a.y = y; a.t = 0; a.dur = dur; a.frame ^= 1; }

function guardHome() { return G.quest && G.party.length === 4 && G.seen.hugo4 ? { x: 28, y: 18 } : { x: 27, y: 18 }; }
const areaNpcs = area => AREAS[area].cast ? AREAS[area].cast() : NPC_DEFS;
function spawnNpc(d) {
  const h = d.id === 'guard' ? guardHome() : d;
  return { ...newActor(h.x, h.y, d.dir), def: d, home: { x: h.x, y: h.y }, wait: d.wander ? rnd(500, 2500) : 1e9 };
}

// cast: lista de moradores no lugar dos fixos da área (usado pelas cenas)
function enterTown(pos, area = 'valmor', cast = null) {
  G.mode = 'town';
  G.area = area;
  TOWN.A = AREAS[area];
  TOWN.dim = TOWN.A.dim ? TOWN.A.dim() : 0;
  G.town = { x: pos.x, y: pos.y, dir: pos.dir };
  if (!TOWN.A.layer) TOWN.A.layer = drawTownLayer(TOWN.A);
  TOWN.p = newActor(pos.x, pos.y, pos.dir);
  TOWN.followers = G.party.slice(1).map(() => newActor(pos.x, pos.y, pos.dir));
  TOWN.npcs = (cast || areaNpcs(area)).map(spawnNpc);
  G.queue.length = 0; G.held.clear();
  TOWN.moved = false;
  Music.play(TOWN.A.music ? TOWN.A.music() : 'town');
}

// Saídas das áreas (porta da taverna, portão do cemitério...): pisar nelas troca de área
async function goArea(ex) {
  if (ex.check) { const msg = ex.check(); if (msg) { await UI.say(msg); return; } }
  if (ex.enter) return ex.enter();
  Sfx.select();
  await fadeTo(1, 300);
  enterTown(ex.pos, ex.to);
  await fadeTo(0, 300);
  if (TOWN.A.onEnter) await TOWN.A.onEnter();
}

const npcAt = (x, y) => TOWN.npcs.find(n => n.x === x && n.y === y);
const partyAt = (x, y) => [TOWN.p, ...TOWN.followers].some(a => a.x === x && a.y === y);

function townDir(k) {
  switch (k) {
    case 'ArrowUp': case 'w': return 0;
    case 'ArrowRight': case 'd': return 1;
    case 'ArrowDown': case 's': return 2;
    case 'ArrowLeft': case 'a': return 3;
  }
  return null;
}

function townHint() {
  placeHint(TOWN.A.name, 'vila', 'Setas andar · Espaço falar · Esc menu');
}

async function townBusy(fn) {
  G.busy = true; G.held.clear(); G.queue.length = 0;
  try { await fn(); } finally { if (G.mode === 'town') { G.busy = false; townHint(); } }
}

function tryTownMove(d) {
  const P = TOWN.p;
  P.dir = d;
  const [dx, dy] = TDIRS[d], nx = P.x + dx, ny = P.y + dy;
  if (nx < 0 && G.area === 'valmor') { townBusy(() => UI.say(G.party.length === 1 ? `A estrada volta para o oeste. ${heroName('aldo')} acabou de chegar.` : 'A estrada segue para Erukh.\nVocês não podem partir enquanto a vila corre perigo.')); return; }
  const ex = (TOWN.A.exits || []).find(e => e.x === nx && e.y === ny);
  if (ex) { townBusy(() => goArea(ex)); return; }
  const b = TOWN.buildingAt(nx, ny);
  if (b && b.door.x === nx && b.door.y === ny && d === 0) { townBusy(() => enterBuilding(b)); return; }
  // Moradores só conversam com Espaço (townAction); andar contra eles só esbarra
  if (!TOWN.walkable(nx, ny) || npcAt(nx, ny)) { if (P.t >= 1) { Sfx.bump(); P.t = 0; P.fx = P.x; P.fy = P.y; P.dur = 200; } return; }
  const F = TOWN.followers;
  for (let i = F.length - 1; i > 0; i--) moveActor(F[i], F[i - 1].x, F[i - 1].y, 180);
  if (F[0]) moveActor(F[0], P.x, P.y, 180);
  moveActor(P, nx, ny, 180);
  TOWN.moved = true;
  F.forEach(f => { f.dir = f.x !== f.fx ? (f.x > f.fx ? 1 : 3) : f.y !== f.fy ? (f.y > f.fy ? 2 : 0) : f.dir; });
  if (++TOWN.step % 2) Sfx.step();
}

// Fala com quem está à frente, inclusive por cima do balcão
function facingNpc(nx, ny, dx, dy) {
  return npcAt(nx, ny) || (TOWN.tileAt(nx, ny) === TILE.COUNTER ? npcAt(nx + dx, ny + dy) : null);
}

// Espaço: interage com o que está à frente. Enter: interage ou, se não houver nada, abre o menu.
function townAction(openMenu = true) {
  const P = TOWN.p, [dx, dy] = TDIRS[P.dir], nx = P.x + dx, ny = P.y + dy;
  const npc = facingNpc(nx, ny, dx, dy);
  if (npc) return townBusy(() => talkTo(npc));
  const b = TOWN.buildingAt(nx, ny);
  if (b && b.door.x === nx && b.door.y === ny) return townBusy(() => enterBuilding(b));
  const look = TOWN.A.look && TOWN.A.look(nx, ny);
  if (look) return townBusy(look);
  if (openMenu) campMenu();
}

function updateTown(dt) {
  const P = TOWN.p;
  for (const a of [P, ...TOWN.followers, ...TOWN.npcs]) if (a.t < 1) a.t = Math.min(1, a.t + dt / a.dur);
  // Gatilhos ao pisar (lutas e achados do cemitério, cena do Teo...)
  if (P.t >= 1 && TOWN.moved && !G.busy && !UI.busy()) {
    TOWN.moved = false;
    const fn = TOWN.A.onStep && TOWN.A.onStep(P.x, P.y);
    if (fn) { townBusy(fn); return; }
  }
  if (P.t >= 1 && !G.busy && !UI.busy()) {
    let d = null;
    while (G.queue.length && d === null) d = townDir(G.queue.shift());
    if (d === null) for (const k of G.held) { d = townDir(k); if (d !== null) break; }
    if (d !== null) tryTownMove(d);
  }
  // Moradores passeiam perto de casa
  for (const n of TOWN.npcs) {
    if (!n.def.wander || n.t < 1 || n.talking) continue;
    n.wait -= dt;
    if (n.wait > 0) continue;
    n.wait = rnd(1200, 3400);
    const d = Math.floor(Math.random() * 4), [dx, dy] = TDIRS[d], nx = n.x + dx, ny = n.y + dy;
    n.dir = d;
    if (Math.abs(nx - n.home.x) > n.def.wander || Math.abs(ny - n.home.y) > n.def.wander) continue;
    if (!TOWN.walkable(nx, ny) || npcAt(nx, ny) || partyAt(nx, ny)) continue;
    moveActor(n, nx, ny, n.def.cat ? 260 : 360);
  }
}

// ---------- Conversas e prédios ----------
async function talkTo(n) {
  n.talking = true;
  if (!n.def.foe) n.dir = (TOWN.p.dir + 2) % 4;
  try {
    if (n.def.onTalk) await n.def.onTalk(n);
    else if (n.def.id === 'guard') await guardTalk(n);
    else await say(n.def.name, byStage(n.def.lines));
  } finally { n.talking = false; }
}

// Guarda Hugo: só deixa descer com a missão do ancião e um grupo de quatro
async function guardTalk(n) {
  const nm = 'Guarda Hugo';
  if (!G.quest || G.bossDead) return say(nm, byStage(NPC_DEFS[0].lines));
  if (G.party.length < 4) return say(nm, ['Ordem do ancião: só desce grupo de quatro. Eu conto daqui.']);
  if (!G.seen.hugo4) {
    G.seen.hugo4 = 1;
    await say(nm, ['Quatro. Assim o ancião aceita. Que a luz os guie lá embaixo.']);
    const guard = n || TOWN.npcs.find(a => a.def.id === 'guard');
    if (guard) { const h = guardHome(); guard.home = h; moveActor(guard, h.x, h.y, 400); guard.dir = 3; }
    return;
  }
  return say(nm, byStage(NPC_DEFS[0].lines));
}

async function enterBuilding(b) {
  Sfx.select();
  if (b.id === 'crypt') {
    if (!G.quest || G.party.length < 4 || !G.seen.hugo4) { await guardTalk(null); return; }
    const ok = await UI.choose([{ label: 'Descer', value: true }, { label: 'Ficar', value: false }],
      { title: 'Uma escadaria úmida desce para as catacumbas de Valmor.', cancel: true });
    if (ok) await enterDungeon();
    return;
  }
  if (b.id === 'tavern') return enterTavern();
  if (b.id === 'elder') return elderTalk();
  if (b.id === 'chapel') return chapel();
  if (b.id === 'shop') return shop();
  const homes = {
    smith: ['Gaspar, o ferreiro', {
      start: ['Forjo espadas há trinta anos, mas aço comum mal arranha um esqueleto.', 'Contra mortos-vivos, confiem na Luz Sagrada do clérigo. Ou numa lâmina de prata, se acharem uma lá embaixo.'],
      won: ['Vou forjar uma placa com o nome de vocês. Em ferro, que dura mais!'] }],
    sara: ['Sara', {
      start: ['Meu marido desceu à cripta para ver de onde vinham os barulhos.', 'Voltou pálido e não disse uma palavra desde então.'],
      quest: ['Se forem descer, cuidado com os morcegos: eles bebem o sangue para se curar.'],
      won: ['Meu marido voltou a sorrir. Obrigada, de coração.'] }],
    joaquim: ['Seu Joaquim', {
      start: ['Na minha época, a gente enfrentava rato gigante com uma vassoura!', 'Os ratos lá embaixo são fáceis. O que vem depois, não.'],
      won: ['Hunf. Na minha época, isso levava dois dias. Bom trabalho, meninos.'] }],
  }[b.id];
  if (homes) await say(homes[0], byStage(homes[1]));
}

async function enterTavern() {
  if (inParty('teo') && !G.intro) return nightScene(); // Aldo e Teo voltam do cemitério: a noite do mensageiro
  await fadeTo(1, 300);
  enterTown(TAVERN_INSIDE, 'taverna');
  await fadeTo(0, 300);
}
async function leaveTavern() {
  Sfx.select();
  await fadeTo(1, 300);
  enterTown(TAVERN_FRONT, 'valmor');
  await fadeTo(0, 300);
}

async function elderTalk() {
  const nm = 'Ancião Bertoldo';
  if (G.bossDead) { await say(nm, ['Vocês salvaram Valmor!', 'Seus nomes serão lembrados por cem anos, e mais cem depois disso.', 'Dizem os antigos que Morvath não foi o único rei a cair. Rezo para que seja o último.', 'Agora levem a carta de Shulkhan a Erukh. A rainha Lara precisa saber.']); return; }
  if (!G.intro) { await say(nm, ['Forasteiro? Hoje não tenho trabalho. A Berta, na taverna, sempre precisa de braços.']); return; }
  if (G.quest && G.party.length < 4) { await say(nm, [`Achem mais ${G.party.length === 3 ? 'um' : 'dois'}. A taverna anda cheia de gente de estrada.`]); return; }
  if (G.quest) { await say(nm, ['O que acorda os mortos está no fundo da cripta.', 'Nas catacumbas, procurem as fontes de luz para recuperar as forças.', 'E se precisarem, a irmã Irene cuida dos feridos na capela.']); return; }
  await say(nm, [
    'A Berta mandou vocês? Mostrem essa carta.',
    'Este selo é de Shulkhan, o sumo sacerdote. E vocês não abriram. Bom.',
    'Se mataram por ela, o que tem dentro é maior que Valmor.',
    'Debaixo da nossa cripta dorme um rei, selado na guerra de Elun.',
    'Não digo o nome dele. Não aqui em cima.',
    `Mas ${G.party.length === 3 ? 'três' : 'dois'} não descem lá. Os paladinos que fecharam a cripta eram quatro, um em cada canto do selo.`,
    G.party.length < 4 ? `Achem mais ${G.party.length === 3 ? 'um' : 'dois'}. A taverna anda cheia de gente de estrada. Aí o Hugo deixa passar.` : 'Vocês são quatro. Mostrem isso ao Hugo e ele deixa passar.',
  ]);
  G.quest = 1;
  G.inv.pocao = (G.inv.pocao || 0) + 2;
  Sfx.chest();
  await UI.say('O ancião entrega 2 Poções ao grupo.\nNova missão: reunir um grupo de quatro e descer à cripta.');
}

async function chapel() {
  const nm = 'Irmã Irene';
  for (;;) {
    const v = await UI.choose([
      { label: 'Orar', hint: 'restaura e salva', value: 'pray' }, { label: 'Conversar', value: 'talk' }, { label: 'Sair', value: null },
    ], { title: `${nm}:\n${G.party.length > 1 ? 'Bem-vindos' : 'Bem-vindo'} à capela de Valmor.`, cancel: true, cols: 3 });
    if (v === null) return;
    if (v === 'talk' && G.quest) G.seen.tobias = 1;
    if (v === 'talk') await say(nm, byStage({
      arrive: ['Bem-vindo, forasteiro. A capela está sempre aberta.', 'O noviço Teo saiu cedo para o cemitério. Reza pelas covas há três noites.'],
      start: ['O mensageiro dorme. Perdeu muito sangue, mas vai viver.', 'Fala dormindo. Repete sempre a mesma coisa: "o selo... o selo".', 'O ancião Bertoldo mora na casa de telhado verde.'],
      quest: ['O mensageiro acordou. Disse o nome dele: Tobias.', 'Perguntou se a carta continua fechada. Quando eu disse que sim, chorou.', 'E disse que os encapuzados não vieram a Valmor só pela carta.', 'A Luz Sagrada de Teo queima os mortos-vivos com o dobro da força.', 'E se alguém cair lá embaixo, tragam-no aqui: eu cuido dele.'],
      won: ['Toquei os sinos o dia inteiro. Meus braços doem, mas valeu a pena!'] }));
    if (v === 'pray') {
      for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); UI.cardGlow(m); }
      UI.updateParty(); Sfx.holy();
      G.flashColor = '255,250,220'; G.flash = { t0: performance.now(), dur: 600 };
      await UI.say('Uma luz cálida envolve o grupo.\nTodos foram restaurados.' + (saveGame() ? '\nJogo salvo.' : ''));
    }
  }
}

async function shop() {
  const nm = 'Dora, a mercadora';
  for (;;) {
    const v = await UI.choose([
      ...SHOP.map(([id, price]) => ({ label: `${ITEMS[id].name} ${price}`, hint: `tem ${G.inv[id] || 0}`, value: id, disabled: G.gold < price })),
      { label: 'Sair', value: null },
    ], { title: `${nm}: O que vai ser? (${G.gold} moedas)`, cancel: true, cols: 2 });
    if (v === null) { await say(nm, ['Voltem sempre! E voltem inteiros.']); return; }
    const price = SHOP.find(([id]) => id === v)[1];
    G.gold -= price; G.inv[v] = (G.inv[v] || 0) + 1; Sfx.chest();
  }
}

// ---------- Desenho por quadro ----------
function drawTown(now) {
  const c = vctx;
  const A = TOWN.A, lp = actorPos(TOWN.p);
  const cam = (pos, size, view) => Math.round(size < view ? (size - view) / 2 : Math.max(0, Math.min(size - view, pos + 8 - view / 2)));
  const camX = cam(lp.x, A.W * TS, VW), camY = cam(lp.y, A.H * TS, VH);
  if (!A.edge) { const t = document.createElement('canvas'); t.width = t.height = TS; const tc = t.getContext('2d');
    const i = Math.max(0, A.g.indexOf(A.outside)); tc.drawImage(A.layer, (i % A.W) * TS, Math.floor(i / A.W) * TS, TS, TS, 0, 0, TS, TS); tc.fillStyle = 'rgba(0,0,0,.45)'; tc.fillRect(0, 0, TS, TS); A.edge = c.createPattern(t, 'repeat'); }
  c.save(); c.translate(-camX, -camY); c.fillStyle = A.edge; c.fillRect(camX, camY, VW, VH); c.restore();
  c.drawImage(A.layer, -camX, -camY);

  // Brilho da água
  c.fillStyle = 'rgba(200,235,255,.55)';
  for (let y = Math.floor(camY / TS); y <= Math.floor((camY + VH) / TS); y++) for (let x = Math.floor(camX / TS); x <= Math.floor((camX + VW) / TS); x++) {
    const t = TOWN.tileAt(x, y);
    if (t === TILE.HEARTH) {
      // Fogo da lareira
      const X = x * TS - camX, Y = y * TS - camY, f = Math.sin(now / 90 + x) * 1.5;
      c.fillStyle = '#c83a10'; c.fillRect(X + 3, Y + 10 - f, 10, 6 + f);
      c.fillStyle = '#ff9a20'; c.fillRect(X + 5, Y + 11 - f, 6, 5 + f);
      c.fillStyle = '#ffe070'; c.fillRect(X + 7, Y + 13 - f / 2, 2, 3);
      continue;
    }
    if (t !== TILE.WATER) continue;
    const o = Math.floor(now / 220 + x * 3 + y * 5) % 12;
    c.fillRect(x * TS - camX + 2 + o, y * TS - camY + 5, 3, 1);
    c.fillRect(x * TS - camX + 13 - o, y * TS - camY + 11, 2, 1);
  }

  // Personagens, de trás para a frente
  const list = [
    ...TOWN.followers.map((a, i) => ({ a, spr: () => personSprite(G.party[i + 1]?.id || 'teo', a.dir, a.t < 1 ? a.frame : 0) })).reverse(),
    { a: TOWN.p, spr: () => personSprite('aldo', TOWN.p.dir, TOWN.p.t < 1 ? TOWN.p.frame : 0), lead: true },
    ...TOWN.npcs.map(n => ({ a: n, lying: n.lying, foe: n.def.foe, spr: () => n.def.foe ? foeSprite(n, now) : n.def.cat ? catSprite(n.dir === 1 ? 1 : 3, n.t < 1 ? n.frame : 0) : personSprite(n.def.look || n.def.id, n.lying ? 2 : n.dir, n.t < 1 ? n.frame : 0) })),
  ];
  list.forEach(o => { o.pos = actorPos(o.a); if (o.a === TOWN.p && o.a.x === o.a.fx && o.a.y === o.a.fy && o.a.t < 1) o.pos.x += Math.sin(o.a.t * Math.PI) * 2 * (TDIRS[o.a.dir][0]); });
  list.sort((p, q) => p.pos.y - q.pos.y || (p.lead ? 1 : 0) - (q.lead ? 1 : 0));
  for (const o of list) {
    const x = Math.round(o.pos.x - camX), y = Math.round(o.pos.y - camY - 3);
    if (!o.lying) {
      c.drawImage(o.spr(), x, y);
      // Aviso de luta: "!" amarelo piscando sobre o inimigo quando o herói chega perto
      if (o.foe && Math.abs(o.a.x - TOWN.p.x) + Math.abs(o.a.y - TOWN.p.y) <= 3 && Math.floor(now / 250) % 2) {
        c.fillStyle = '#1a1000'; c.fillRect(x + 6, y - 9, 4, 8); c.fillStyle = '#ffd23f'; c.fillRect(x + 7, y - 8, 2, 4); c.fillRect(x + 7, y - 3, 2, 1);
      }
      continue;
    }
    c.save(); c.translate(x + 8, y + 11); c.rotate(-Math.PI / 2); c.drawImage(o.spr(), -8, -9); c.restore();
  }
  if (TOWN.dim > 0) { c.fillStyle = `rgba(${A.dimCol || '4,2,16'},${TOWN.dim})`; c.fillRect(0, 0, VW, VH); }
  // Névoa baixa (cemitério): faixas claras deslizando devagar
  if (A.fog) {
    // faixas com borda macia em cima e embaixo; cada faixa é mais densa no meio e some nas pontas
    for (let i = 0; i < 3; i++) {
      const y = Math.round(VH * (0.22 + i * 0.28)), h = 40, w = VW * 0.9;
      const off = (((now / 80) * (i % 2 ? -1 : 1) + i * 300) % (VW + w) + VW + w) % (VW + w) - w;
      for (let r = 0; r < h; r += 2) {
        const a = 0.13 * Math.sin(Math.PI * r / h);
        const gr = c.createLinearGradient(off, 0, off + w, 0);
        gr.addColorStop(0, 'rgba(220,230,240,0)'); gr.addColorStop(0.5, `rgba(220,230,240,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(220,230,240,0)');
        c.fillStyle = gr; c.fillRect(Math.round(off), y + r, Math.round(w), 2);
      }
    }
  }

}
