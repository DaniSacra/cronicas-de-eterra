// ===== Vila de Valmor: mapa visto de cima, moradores e entrada das catacumbas =====

const TS = 16, TOWN_W = 32, TOWN_H = 22;
const TILE = { GRASS: 0, PATH: 1, WATER: 2, TREE: 3, CLIFF: 4, BUSH: 5, FLOWER: 6,
  FLOOR: 7, WALL: 8, COUNTER: 9, TABLE: 10, HEARTH: 11, BARREL: 12, DOOR: 13,
  // cemitério
  GATE: 14, MURO: 15, TOMB: 16, GRAVE_O: 17, GRAVE_U: 18, GRAVE_OLD: 19, DEADTREE: 20,
  FORD: 21, FIRE: 22 }; // capítulo 1: the shallow crossing of the Vau do Corvo, the campfire
const WALKABLE = new Set([TILE.GRASS, TILE.PATH, TILE.FLOWER, TILE.FLOOR, TILE.DOOR, TILE.GATE, TILE.FORD]);
const isInterior = t => t >= TILE.FLOOR && t <= TILE.DOOR;
const TDIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // cima, direita, baixo, esquerda
const CRYPT_FRONT = { x: 27, y: 18, dir: 2 };
const SHOP = [['pocao', 15], ['eter', 30], ['pena', 60]];
// Gaspar's forge: simple Valmor steel for each hero, weaker than what lies in the crypt (worth a few fights in the cemetery)
const FORGE = [['espadaCurta', 60], ['gibao', 50], ['cajadoFreixo', 55], ['capaLa', 40], ['macaFerro', 45], ['habitoForrado', 40], ['adagaAfiada', 55], ['gibaoCouro', 45]];

const BUILDINGS = [
  { id: 'chapel', x: 2, y: 3, w: 3, h: 3 },
  { id: 'elder', x: 13, y: 3, w: 4, h: 3 },
  { id: 'shop', x: 20, y: 4, w: 3, h: 2 },
  { id: 'smith', x: 25, y: 4, w: 3, h: 2 },
  { id: 'sara', x: 7, y: 15, w: 3, h: 2 },
  { id: 'joaquim', x: 16, y: 15, w: 3, h: 2 },
  { id: 'crypt', x: 26, y: 15, w: 3, h: 3 },
  { id: 'tavern', x: 20, y: 14, w: 5, h: 3 },
  { id: 'school', x: 14, y: 9, w: 4, h: 2 }, // a escolinha da Clara, entre as crianças (Nino e Lia)
];
// Lampiões de rua (cada um ocupa um tile de grama ao lado de uma rua; ver test/winter.test.js)
const LAMPS = [[11, 7], [7, 5], [19, 7], [29, 7], [13, 17], [25, 19]];
BUILDINGS.forEach(b => { b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }; });

// Aparência: pele, cabelo, roupa, pernas, e o jeito de cada um (campos de estilo em src/folk.js)
const LOOKS = {
  aldo:  { skin: '#f0c090', hair: '#7a4220', body: '#d08a30', legs: '#5a3a20', hairStyle: 'spiky', eye: '#3a6ad0', belt: '#5a3418', tool: 'sword', cape: '#2c3c80' }, // capa azul da paleta: de costas ele não vira um bloco vermelho como a Andilla
  lyra:  { skin: '#f4cca0', hair: '#f0d860', body: '#a050c0', legs: '#5a2a70', robe: true, long: true, hairStyle: 'long', hat: 'circlet', gem: '#40c0ff', tool: 'staff', orb: '#9ae8ff', eye: '#9a50d0', trim: '#f0c040', blush: 1 },
  teo:   { skin: '#e8b888', hair: '#3a2a1a', body: '#e8f0e8', legs: '#4a8a6a', robe: true, hairStyle: 'messy', eye: '#3a9a5a', trim: '#4a8a6a', belt: '#4a8a6a', tool: 'book', book: '#2c3c80' },
  andilla: { skin: '#e8c0a0', hair: '#1a1418', body: '#7a7a82', legs: '#4a3424', mark: '#9a1a24', hairStyle: 'bob', eye: '#a02030', cape: '#5a5a64', tool: 'dagger', belt: '#3a2a20' }, // capa cinza como a dos encapuzados; lenço escuro no peito
  guard: { skin: '#e0b080', hair: '#6a6a6a', body: '#7a8494', legs: '#3a3a4a', hat: 'helmet', hatCol: '#a0a8b8', plume: '#c03030', outfit: 'armor', beard: 'mustache', tool: 'spear' },
  lia:   { skin: '#f4cca0', hair: '#c05a28', body: '#e05a6a', legs: '#7a2a3a', robe: true, long: true, kid: 1, hairStyle: 'braids', tie: '#f8f0f0', blush: 1, eye: '#4a8a3a', apron: '#f8ece8' },
  rui:   { skin: '#d8a070', hair: '#4a3020', body: '#7a9a3a', legs: '#5a6a9a', hat: 'straw', hatCol: '#e0c870', band: '#a04a20', outfit: 'overalls', beard: 'stubble', tool: 'rake' },
  marta: { skin: '#e8c0a0', hair: '#e8e8e8', body: '#6a5a8a', legs: '#3a3050', robe: true, long: true, old: 1, hairStyle: 'bun', shawl: '#b08ac8', tool: 'cane' },
  tome:  { skin: '#c89060', hair: '#3a2a1a', body: '#3a7ab0', legs: '#6a5a40', hat: 'cap', hatCol: '#b03a2a', beard: 'full', tool: 'rod', belt: '#4a3020', outfit: 'vest', shirt: '#e8e0c8' },
  nino:  { skin: '#f0c898', hair: '#2a1a10', body: '#e0b030', legs: '#4a5a8a', kid: 1, hairStyle: 'messy', shorts: 1, eye: '#5a3a1a', blush: 1 },
  clara: { skin: '#f0c8a0', hair: '#7a4a2a', body: '#4a7a9a', legs: '#2e4a5e', robe: true, long: true, hairStyle: 'pony', tie: '#f0d860', tool: 'book', book: '#8a2a2a', eye: '#4a6a9a', blush: 1, trim: '#e8e0c8' },
  berta: { skin: '#e8b890', hair: '#b04a20', body: '#c05a3a', legs: '#6a3020', robe: true, long: true, hairStyle: 'bun', apron: '#f4efe2', tool: 'mug', eye: '#6a3a1a', blush: 1 },
  ana:   { skin: '#e0b898', hair: '#e8e8e8', body: '#7a5a3a', legs: '#3a2a20', robe: true, long: true, old: 1, hat: 'kerchief', hatCol: '#c8a868', tool: 'basket', trim: '#c8a868' },
  soldier: { skin: '#e0b080', hair: '#888', body: '#6a7484', legs: '#3a3a4a', hat: 'helmet', hatCol: '#a0a8b8', outfit: 'armor', tool: 'spear' },
  bruno: { skin: '#e0b080', hair: '#5a3a1a', body: '#6a7484', legs: '#3a3a4a', hairStyle: 'bald', beard: 'mustache', outfit: 'vest', shirt: '#d8d0c0', tool: 'mug', belt: '#3a2a20' },
  caio:  { skin: '#d8a878', hair: '#2a1a10', body: '#5a6a8a', legs: '#3a3a4a', hairStyle: 'short', mark: '#c8a040', belt: '#3a2a20', tool: 'sword', eye: '#3a2a1a' },
  tobias: { skin: '#e0b080', hair: '#5a3a1a', body: '#e8eef8', legs: '#3a5aa8', hairStyle: 'short', hat: 'bandage', tool: 'satchel', belt: '#5a3a20', bag: '#a06a30', cape: '#8a5418' },
  ossada: { skin: '#e8e2d0', hair: '#e8e2d0', body: '#cfc8b4', legs: '#bfb8a4', mark: '#2a2420', hairStyle: 'bald', sockets: 1 },
  hooded: { skin: '#2a2228', hair: '#6a6a72', body: '#7a7a82', legs: '#3a3a42', hat: 'hood', hatCol: '#6a6a72', robe: true, mark: '#e02030', glow: '#ff3040', hairStyle: 'none' },
};

const say = (name, lines) => lines.reduce((p, l) => p.then(() => UI.say(`${name}:\n${typeof l === 'function' ? l() : l}`)), Promise.resolve());
// Etapas da vila: arrive (Aldo acabou de chegar) · start (depois da noite na taverna) · quest (missão do ancião)
// · desceu (o grupo já foi à cripta e voltou: curiosidade e dúvida) · won (o Sineiro caiu: orgulho, e a dúvida do túmulo vazio)
const stage = () => G.bossDead ? 'won' : G.reached >= 1 ? 'desceu' : G.quest ? 'quest' : G.intro ? 'start' : 'arrive';
const STAGE_FALLBACK = { arrive: ['arrive', 'start'], start: ['start'], quest: ['quest', 'start'], desceu: ['desceu', 'quest', 'start'], won: ['won', 'quest', 'start'] };
// Saudação (def.hi) só na primeira conversa de cada save
const greet = (def, lines) => {
  if (!def.hi || G.seen['oi:' + def.id]) return lines;
  G.seen['oi:' + def.id] = 1;
  return [def.hi, ...lines];
};
const byStage = o => { for (const k of STAGE_FALLBACK[stage()]) if (o[k]) return o[k]; return o.start || o.quest || o.won; };

const NPC_DEFS = [
  { id: 'guard', name: 'Guarda Hugo', x: 27, y: 18, dir: 2, wander: 0, hi: () => `${heroName('aldo')}! De volta para o inverno, é?`, lines: {
    arrive: ['A igreja velha está fechada por ordem do ancião.', 'Ninguém desce desde que o marido da Sara voltou de lá sem dizer uma palavra.', () => nextStep()],
    start: ['Ouvi a briga na Berta daqui. Não saí da porta. Ordem do ancião.', 'A igreja velha está fechada por ordem do ancião.', 'Ninguém desce desde que o marido da Sara voltou de lá sem dizer uma palavra.', () => nextStep()],
    quest: ['Que a luz os guie lá embaixo. Voltem vivos.'],
    desceu: ['Vocês subiram inteiros. Primeira vez que alguém sobe dessa escada falando.', () => `O que tem lá embaixo, ${heroName('aldo')}? Não, não me conta. Eu ainda tenho que ficar aqui de guarda.`],
    won: ['O sino parou. Primeira noite em semanas que eu fico de guarda sem tremer.', 'Mas se o túmulo estava vazio, quem é que eu fiquei guardando esse tempo todo?'] } },
  { id: 'lia', name: 'Lia', x: 18, y: 8, dir: 2, wander: 2, lines: {
    arrive: ['Meu gato fugiu ontem à noite...', 'Ele nunca foge. Acho que ficou com medo dos barulhos que vêm da cripta.'],
    start: ['O Bigode ainda não voltou. Dormi com a janela aberta pra ele.', 'Ele nunca foge. Acho que ficou com medo dos barulhos que vêm da cripta.'],
    quest: ['Vocês vão lá embaixo? Se virem um gato laranja, é o Bigode!'],
    desceu: ['Vocês desceram mesmo! O Bigode não estava lá, né? Ele tem medo de escuro.'],
    won: ['O Bigode voltou pra casa! Ele voltou sozinho... mas obrigada mesmo assim!'] } },
  { id: 'rui', name: 'Rui, o lavrador', x: 6, y: 7, dir: 2, wander: 2, when: () => G.intro, lines: {
    start: ['O sino tocou de novo. E hoje cedo tinha mais três covas abertas. Por dentro.', 'Aquela igreja está vazia faz cinquenta anos. Quem é que toca?'],
    quest: ['Vão descer? Levem uma pá. Eu levaria.'],
    desceu: ['Desceram e voltaram! Viram quem abriu as covas?', 'Ninguém acreditou em mim. Agora a vila inteira só fala disso.'],
    won: ['Dormi a noite inteira pela primeira vez em semanas!', 'Mas aquelas covas cavadas com pá... Morto não usa pá.'] } },
  { id: 'marta', name: 'Dona Marta', x: 23, y: 8, dir: 2, wander: 1, hi: () => `O ${heroName('aldo')} de volta. A escola agradece. Digo, a vila agradece.`, lines: {
    arrive: ['A cripta debaixo da igreja velha foi fechada pelos paladinos. Ninguém devia abrir aquilo.', 'Minha avó dizia isso, e a avó dela também.', 'Se os mortos estão acordando... alguém está batendo do outro lado.'],
    start: ['Briga na Berta e sino de madrugada. Minha avó dizia que inverno assim não traz coisa boa.', 'A cripta debaixo da igreja velha foi fechada pelos paladinos. Ninguém devia abrir aquilo.', 'Se os mortos estão acordando... alguém está batendo do outro lado.'],
    quest: ['Vão abrir o que os paladinos fecharam. Que seja para fechar de novo.', 'Lá embaixo, leiam as paredes. Os antigos escreviam tudo.', 'Levem poções. Muitas poções. A Dora vende na loja de telhado dourado.'],
    desceu: ['Leram as paredes? Minha avó dizia que os paladinos escreviam até na pedra do chão.'],
    won: ['Minha avó ficaria orgulhosa de vocês.', 'Mas eu não durmo tranquila. Paladino nenhum deixaria aquele túmulo vazio.'] } },
  { id: 'tome', name: 'Tomé, o pescador', x: 9, y: 11, dir: 3, wander: 0, hi: () => `${heroName('aldo')}! Veio pescar? Ah, não. Veio pelo... trabalho.`, lines: {
    arrive: ['Os peixes sumiram do lago desde que o chão começou a tremer.', 'Dizem que lá embaixo há uma fonte de luz que cura qualquer ferida e guarda a memória de quem passa.'],
    start: ['Ouvi que teve briga na Berta. Gente de capa cinza. Nem os peixes quiseram ficar para ver.', 'Dizem que lá embaixo há uma fonte de luz que cura qualquer ferida e guarda a memória de quem passa.'],
    quest: ['Vão descer? Se a fonte cura mesmo, tragam um pouco para o meu joelho.'],
    desceu: ['Viram a fonte de luz? Cura mesmo qualquer ferida? Meu joelho quer saber.'],
    won: ['Os peixes voltaram! E eu achando que era a minha isca.'] } },
  { id: 'nino', name: 'Nino', x: 17, y: 12, dir: 2, wander: 3, lines: {
    arrive: [() => nextStep()],
    start: [() => `${heroName('aldo')}, me ensina a segurar a espada? A professora disse que não. Mas ela sorriu quando disse.`, 'Eu não tenho medo de esqueleto!', '...Tá bom, tenho um pouquinho.', () => nextStep()],
    quest: ['Vocês vão mesmo descer? Uau! Me tragam um osso!'],
    desceu: [() => `O ${heroName('aldo')} desceu na cripta! Eu contei pra todo mundo. Duas vezes.`, 'Vocês viram esqueleto? Grande? Maior que o Seu Joaquim?'],
    won: ['Quando eu crescer, quero ser herói igual a vocês!'] } },
  // A professora de Valmor: a razão de Aldo voltar (nome provisório, prologo.md)
  { id: 'clara', name: 'Clara, a professora', x: 14, y: 12, dir: 0, wander: 1, onTalk: claraTalk, lines: {
    arrive: [() => `Boa tarde, ${heroName('aldo')}.`, 'O Nino passou a semana olhando para a estrada.'],
    start: [() => `Bom dia, ${heroName('aldo')}.`, () => `O Nino não dormiu. Ouviu o sino de madrugada e quer saber se foi você, ${heroName('aldo')}.`, 'O Nino passou a semana olhando para a estrada.'],
    quest: ['Vão descer na igreja velha?', 'Voltem. Todos.'],
    desceu: ['Voltaram. Todos. Que bom.', 'O Nino contou para a vila inteira. Eu fingi que não ouvi.'],
    won: ['O Nino agora quer ser guerreiro. Obrigada por isso. Acho.', 'Erukh fica longe. A sopa da Berta, nem tanto.'] } },
  { id: 'cat', name: 'Bigode', x: 20, y: 17, dir: 3, wander: 4, cat: true, when: () => G.bossDead, lines: {
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
  rect(13, 11, 16, 11, TILE.PATH);    // da rua até a porta da escola
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

  for (const [x, y] of LAMPS) set(x, y, TILE.BUSH); // obstáculo; o desenho do lampião sai de TownArt
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
Object.assign(AREAS.valmor, { winter: true, dusk: true, lamps: LAMPS }); // inverno ao entardecer: neve, janelas acesas, lampiões
AREAS.taverna.music = () => 'tavern'; // giga da Poney Saltitante
AREAS.taverna.cozy = 'rgba(40,20,14,.38)'; // penumbra quente; a lareira, as velas e a lamparina abrem poças de luz

const TOWN = {
  A: AREAS.valmor, p: null, followers: [], npcs: [], step: 0, dim: 0,
  inside(x, y) { return x >= 0 && y >= 0 && x < this.A.W && y < this.A.H; },
  tileAt(x, y) { return this.inside(x, y) ? this.A.g[y * this.A.W + x] : this.A.outside; },
  buildingAt(x, y) { const i = this.inside(x, y) ? this.A.bld[y * this.A.W + x] : -1; return i >= 0 ? this.A.buildings[i] : null; },
  walkable(x, y) { return WALKABLE.has(this.tileAt(x, y)) && !this.buildingAt(x, y); },
};

// ---------- Desenho estático (tiles e prédios) ----------
// Chão, árvores, enfeites e prédios ficam em src/townart.js; aqui só a chamada (uma vez por área, em cache)
function drawTownLayer(A) { return TownArt.layer(A); }

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
    R(11, 4, 1, 5, '#3a3840'); R(10, 9, 3, 1, '#3a3840'); R(11, 10, 1, 2, '#3a3840'); // espada erguida, o sinal de um paladino
  } else if (t === TILE.DEADTREE) {
    R(7, 6, 2, 10, '#5a4a3e'); R(3, 4, 4, 1, '#6a5a4e'); R(9, 3, 4, 1, '#6a5a4e'); R(5, 2, 1, 3, '#6a5a4e');
    R(11, 1, 1, 3, '#6a5a4e'); R(6, 5, 1, 2, '#6a5a4e'); R(9, 4, 1, 2, '#6a5a4e'); R(4, 15, 9, 1, 'rgba(0,0,0,.3)');
  }
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------- Personagens ----------
const PSPR = {};
const personSprite = (key, dir, frame) => Folk.sprite(key, dir, frame);

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

// A horse seen from the side, walking (the four horses of the Vau do Corvo); coat: [body, mane]
function horseSprite(dir, frame, coat) {
  const k = `horse|${dir}|${frame}|${coat}`;
  if (PSPR[k]) return PSPR[k];
  const [fur, mane] = coat, cv = document.createElement('canvas'); cv.width = 16; cv.height = 18;
  const c = cv.getContext('2d'), r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  r(2, 16, 12, 2, 'rgba(0,0,0,.3)');
  r(1, 6, 12, 1, '#26202e'); r(1, 7, 12, 5, fur); r(1, 11, 12, 1, '#26202e');      // body
  r(11, 2, 3, 6, fur); r(12, 1, 3, 2, fur); r(14, 2, 2, 2, fur);                  // neck and head, facing right
  r(10, 2, 2, 5, mane); r(0, 7, 2, 4, mane);                                      // mane and tail
  r(14, 2, 1, 1, '#26202e');                                                      // eye
  const legs = frame ? [[2, 12], [4, 12], [9, 12], [11, 12]] : [[1, 12], [5, 12], [8, 12], [12, 12]];
  for (const [x, y] of legs) { r(x, y, 1, 4, fur); r(x, y + 3, 1, 1, '#26202e'); }
  if (dir === 3) {
    const f = document.createElement('canvas'); f.width = 16; f.height = 18;
    const fc = f.getContext('2d'); fc.translate(16, 0); fc.scale(-1, 1); fc.drawImage(cv, 0, 0);
    return (PSPR[k] = f);
  }
  return (PSPR[k] = cv);
}

// Dois morcegos lado a lado, batendo as asas (inimigo visível no cemitério)
function batsSprite(now, col = '#4a3a5a') {
  const up = Math.floor(now / 300) % 2, k = `bats|${up}|${col}`;
  if (PSPR[k]) return PSPR[k];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 18;
  const c = cv.getContext('2d'), r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (const [ox, oy] of [[1, 4], [9, 8]]) {
    r(ox + 1, oy + 2, 4, 3, col);
    if (up) { r(ox - 1, oy, 2, 2, col); r(ox + 5, oy, 2, 2, col); }
    else { r(ox - 1, oy + 4, 2, 2, col); r(ox + 5, oy + 4, 2, 2, col); }
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
const areaNpcs = area => AREAS[area].cast ? AREAS[area].cast() : NPC_DEFS.filter(d => !d.when || d.when());
function spawnNpc(d) {
  const h = d.id === 'guard' ? guardHome() : d;
  return { ...newActor(h.x, h.y, d.dir), def: d, home: { x: h.x, y: h.y }, wait: d.wander ? rnd(500, 2500) : 1e9 };
}

// cast: lista de moradores no lugar dos fixos da área (usado pelas cenas)
function enterTown(pos, area = 'valmor', cast = null, music = true) {
  G.mode = 'town';
  G.area = area;
  TOWN.A = AREAS[area];
  TOWN.dim = TOWN.A.dim ? TOWN.A.dim() : 0;
  G.town = { x: pos.x, y: pos.y, dir: pos.dir };
  if (!TOWN.A.layer) TOWN.A.layer = drawTownLayer(TOWN.A);
  TOWN.p = newActor(pos.x, pos.y, pos.dir);
  TOWN.followers = G.party.slice(1).map(() => newActor(pos.x, pos.y, pos.dir));
  TOWN.npcs = (cast || areaNpcs(area)).map(spawnNpc);
  lookAround();
  G.queue.length = 0; G.held.clear();
  TOWN.moved = false;
  if (music) Music.play(TOWN.A.music ? TOWN.A.music() : 'town');
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

// ---------- Visão (áreas com vision: { radius }; regras em src/vision.js) ----------
const areaSeen = () => seenTiles(G.explored, areaKey(G.area), TOWN.A.W * TOWN.A.H);
function lookAround() { const V = TOWN.A.vision; if (V) markSight(areaSeen(), TOWN.A.W, TOWN.A.H, TOWN.p.x, TOWN.p.y, V.radius); }
const visibleAt = (x, y) => !TOWN.A.vision || inSight(x, y, TOWN.p.x, TOWN.p.y, TOWN.A.vision.radius);

// ---------- Encontros (áreas com encounters: () => [{ ids, intro }]) ----------
// Como na cripta: ninguém aparece no mapa e a luta vem com os passos (encounterChance, src/uirules.js). Uma área
// sem grupos (ou num tile reservado: lutas fixas, cenas, portão) não tem encontro.
function wildStep(x, y) {
  const groups = TOWN.A.encounters ? TOWN.A.encounters() : [];
  if (!groups.length || (TOWN.A.reserved && TOWN.A.reserved(x, y))) return null;
  G.sinceFight++;
  if (Math.random() >= encounterChance(G.sinceFight)) return null;
  G.sinceFight = 0;
  return pick(groups);
}
// Volta da batalha para a área (luz e música do lugar)
function backToArea() { G.mode = 'town'; TOWN.dim = TOWN.A.dim ? TOWN.A.dim() : 0; Music.play(TOWN.A.music ? TOWN.A.music() : 'town'); }
async function wildFight(g) {
  const res = await startBattle(g.ids, false, { intro: g.intro });
  if (res === 'lose') return gameOver();
  backToArea();
  if (TOWN.A.afterFight) await TOWN.A.afterFight(res); // the pasture: the noise scares the horses close by
}

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
  if (nx < 0 && G.area === 'valmor' && G.bossDead) { townBusy(departValmor); return; } // capítulo 1 (src/chapter1.js)
  if (nx < 0 && G.area === 'valmor') { townBusy(() => UI.say(G.party.length === 1 ? `A estrada volta para o oeste. ${heroName('aldo')} acabou de chegar.` : 'A estrada vai para o oeste e depois sobe para o norte, até Erukh.\nVocês não podem partir enquanto a vila corre perigo.')); return; }
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
  lookAround();
  TOWN.moved = true;
  F.forEach(f => { f.dir = f.x !== f.fx ? (f.x > f.fx ? 1 : 3) : f.y !== f.fy ? (f.y > f.fy ? 2 : 0) : f.dir; });
  if (++TOWN.step % 2) Sfx.step(TOWN.A.cozy ? 'wood' : 'snow');
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
    const g = wildStep(P.x, P.y);
    if (g) { townBusy(() => wildFight(g)); return; }
  }
  if (TOWN.A.update) TOWN.A.update(dt); // an area's own life (the horses of the pasture)
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
    else await say(n.def.name, greet(n.def, byStage(n.def.lines)));
  } finally { n.talking = false; }
}

// Clara e Aldo: ele gosta dela e tropeça nas palavras; ela é discreta e só deixa escapar um olhar.
// Duas cenas, uma vez cada: sozinho no primeiro dia, e com a Lyra narrando o irmão depois que ela chega.
async function claraTalk(n) {
  const nm = 'Clara, a professora', a = heroName('aldo'), lyra = inParty('lyra');
  if (G.bossDead || G.seen[lyra ? 'talk:claraLyra' : 'talk:clara']) return say(nm, byStage(n.def.lines));
  const tail = [
    [null, 'Clara se afasta. Antes da esquina, olha para trás uma vez.'],
    ['lyra', `Ela olhou para trás. ${a} viu. ${a} vai pensar nisso a semana inteira.`, 'alegre'],
    ['aldo', 'Eu não vou pensar em nada.'],
    ['teo', `Você ficou vermelho, ${a}.`],
    ['andilla', 'Vermelho de frio, claro.'],
    ['lyra', 'Frio. Sei.', 'alegre'],
  ];
  const leave = stage() === 'start' ? 'a aula vai começar' : 'preciso levar as crianças para casa'; // só na manhã do começo há aula
  const bye = [nm, `Oi, ${heroName('lyra')}. Com licença, ${leave}.`];
  // a Lyra chega depois: se o Aldo já viu a Clara sozinho, o reencontro não se repete
  if (lyra) return partyTalk('claraLyra', G.seen['talk:clara'] ? [
    [null, `${a} vê a professora de novo e para no meio da rua.`],
    ['lyra', `${a} vê a professora. ${a} esquece como se anda.`, 'alegre'],
    [nm, G.intro ? 'De novo por aqui?' : `Duas vezes no mesmo dia, ${a}.`],
    ['aldo', 'Eu estava passando.'],
    bye, ...tail,
  ] : [
    [null, `${a} vê a professora e para no meio da rua.`],
    ['lyra', `${a} vê a professora. ${a} esquece como se anda.`, 'alegre'],
    ['aldo', 'Clara.'],
    [nm, `${a}. Voltou.`],
    ['aldo', 'Voltei. Para o inverno. Tem trabalho. Quer dizer, vim pelo trabalho. Também.'],
    ['lyra', 'Você explica demais quando está nervoso.'],
    ['aldo', `${heroName('lyra')}.`, 'bravo'],
    bye, ...tail,
  ]);
  await partyTalk('clara', [
    [null, `${a} vê a professora e para no meio da rua.`],
    ['aldo', 'Clara.'],
    [nm, `${a}. Voltou.`],
    ['aldo', 'Voltei. Para o inverno. Tem trabalho por aqui. Quer dizer, vim pelo trabalho. Também.'],
    [nm, 'Que bom.'],
    [null, 'Ela ajeita o xale e olha para as crianças.'],
    ['aldo', 'Você está... As crianças estão bem? O Nino cresceu.'],
    [nm, 'Estão bem. Se veio pelo trabalho, fala com a Berta. Ela sempre precisa de braços.'],
    [nm, stage() === 'start' ? 'Eu também tenho o meu, com as crianças. A aula vai começar, preciso ir.' : 'Eu também tenho o meu, com as crianças. Preciso levá-las para casa.'],
    [null, 'Clara se afasta. Antes da esquina, olha para trás uma vez.'],
    [null, `${a} fica parado, coçando a nuca.`],
    ['teo', `Você ficou vermelho, ${a}.`],
    ['andilla', 'Vermelho de frio, claro.'],
  ]);
}

// Passing near Clara while Aldo is still alone, the first time: he stops, walks up to her and the scene plays
function claraNear(x, y) {
  const n = TOWN.npcs.find(a => a.def.id === 'clara');
  if (!n || n.talking || !claraCalls(G.seen, G.party.length, { x, y }, n)) return null;
  return async () => {
    n.talking = true;
    const P = TOWN.p, next = (ax, ay) => Math.abs(ax - n.x) + Math.abs(ay - n.y) === 1;
    const path = gridPath(P, next, (ax, ay) => TOWN.walkable(ax, ay) && !npcAt(ax, ay), 200);
    if (path) await walkPath(P, path, 200);
    P.dir = n.x > P.x ? 1 : n.x < P.x ? 3 : n.y > P.y ? 2 : 0;
    n.talking = false;
    await talkTo(n);
  };
}
AREAS.valmor.onStep = claraNear;

// O próximo passo da história, dito do mesmo jeito por quem dá direção (Hugo, Nino, ancião)
function nextStep() {
  if (!G.seen.job) return 'Procurando trabalho? A Berta, na taverna de telhado vermelho, lá embaixo, sempre precisa de braços.';
  // only old saves reach this line: Lyra now joins in the tavern before the job
  if (!inParty('lyra')) return 'Sua irmã chegou na carroça do correio. Está na taverna, procurando você.';
  if (!inParty('teo')) return 'A Berta mandou olhar o cemitério? O portão fica ao lado da capela, no alto da vila, à esquerda.';
  if (!G.intro) return 'Voltem à taverna. A Berta vai querer saber o que vocês viram.';
  // only old saves reach this line: the dice girl now joins on the tavern night
  if (!inParty('andilla')) return 'A moça dos dados ficou na taverna. Disse que devia uma a vocês.';
  if (!G.quest) return 'O ancião Bertoldo mora na casa de telhado verde, no alto da vila.';
  // only old saves reach this line: the party is four before the elder since the tavern night
  if (G.party.length < 4) return 'O ancião quer quatro. Tem gente esperando para descer, lá na taverna.';
  return 'Vocês são quatro. Falem com o Hugo, na porta da igreja velha.';
}

// Próximo lugar da história, para a setinha amarela na vila, na taverna e no cemitério
function goalSpot() {
  if (G.busy) return null;
  if (TOWN.A.goal) return TOWN.A.goal();
  if (G.area === 'valmor' && G.bossDead && !G.chapter) return { x: 0, y: 6 }; // the west road, to Erukh
  if (G.bossDead) return null;
  const door = id => BUILDINGS.find(b => b.id === id).door;
  const npc = id => { const n = TOWN.npcs.find(a => a.def.id === id); return n && { x: n.x, y: n.y }; };
  const a = G.area, four = G.party.length >= 4;
  if (a === 'valmor') {
    if (!G.seen.job || !inParty('lyra')) return door('tavern'); // a Lyra espera pelo irmão na taverna
    if (!inParty('teo')) return { x: 5, y: 3 };          // portão do cemitério
    if (!G.intro || !inParty('andilla')) return door('tavern');
    if (!G.quest) return door('elder');
    if (!four) return door('tavern');
    if (!G.seen.hugo4) return npc('guard');
    return door('crypt');
  }
  if (a === 'taverna') {
    if (!inParty('lyra')) return npc('lyra');
    if (!G.seen.job) return npc('berta');
    if (G.intro && !inParty('andilla')) return npc('andilla'); // saves de antes da noite nova: ela espera aqui
    return { x: 7, y: 9 };                                // a porta
  }
  if (a === 'cemiterio') {
    if (inParty('teo')) return { x: 8, y: 11 };           // o portão
    const f = Object.keys(CEM_FIGHTS).find(id => !G.seen[CEM_FIGHTS[id].flag]);
    return f ? npc(f) : { x: 10, y: 2 };                  // Teo, no fundo
  }
  return null;
}

// Guarda Hugo: só deixa descer com a missão do ancião e um grupo de quatro
async function guardTalk(n) {
  const nm = 'Guarda Hugo';
  if (!G.quest || G.bossDead) return say(nm, greet(NPC_DEFS[0], byStage(NPC_DEFS[0].lines)));
  if (G.party.length < 4) return say(nm, ['Ordem do ancião: só desce grupo de quatro. Eu conto daqui.', `Vocês são ${['', 'um', 'dois', 'três'][G.party.length]}. Tem gente esperando para descer, lá na taverna. A Berta sabe quem.`]);
  if (!G.seen.hugo4) {
    G.seen.hugo4 = 1;
    await say(nm, greet(NPC_DEFS[0], ['Quatro. Assim o ancião aceita. Que a luz os guie lá embaixo.']));
    saveGame(); // the way down is open: closing the browser now keeps it
    const guard = n || TOWN.npcs.find(a => a.def.id === 'guard');
    if (guard) { const h = guardHome(); guard.home = h; moveActor(guard, h.x, h.y, 400); guard.dir = 3; }
    return;
  }
  return say(nm, greet(NPC_DEFS[0], byStage(NPC_DEFS[0].lines)));
}

async function enterBuilding(b) {
  Sfx.select();
  if (TOWN.A.enterBuilding) return TOWN.A.enterBuilding(b); // the towns of chapter 1 have their own doors
  if (b.id === 'crypt') {
    if (!G.quest || G.party.length < 4 || !G.seen.hugo4) { await guardTalk(null); return; }
    await partyTalk('igreja', TALKS.igreja);
    await askWhyAtDoor();
    const ok = await UI.choose([{ label: 'Descer', value: true }, { label: 'Ficar', value: false }],
      { title: 'Entre as paredes rachadas da igreja velha, uma escada desce para a cripta.', cancel: true });
    if (ok) await enterDungeon();
    return;
  }
  if (b.id === 'tavern') return enterTavern();
  if (b.id === 'elder') return elderTalk();
  if (b.id === 'chapel') return chapel();
  if (b.id === 'shop') return shop();
  if (b.id === 'smith') return forge();
  if (b.id === 'school') return school();
  await homeTalk(b.id);
}

// Who lives in each house and what they say at each stage
const GASPAR = 'Gaspar, o ferreiro';
const HOMES = {
  smith: [GASPAR, {
    arrive: [() => `${heroName('aldo')}! Essa espada ainda tem o fio que eu dei no verão?`, 'Forjo espadas há trinta anos, mas aço comum mal arranha um esqueleto.', () => inParty('teo') ? 'Contra mortos-vivos, confiem na Luz Sagrada do clérigo. Ou numa lâmina melhor, se acharem uma lá embaixo.'
      : 'Contra mortos-vivos, aço comum não basta. Luz faz mais que espada.'],
    start: ['Lâmina curva, me contaram. Não é aço daqui. Quem forja assim mora longe.'],
    quest: ['Mostra essa espada. Hum. Lá embaixo, mire nas juntas. Osso quebra na junta.'],
    desceu: ['Deixa eu ver esse fio depois de lá embaixo.', 'Hum. Aguentou. Eu faço espada boa.'],
    won: ['Vou forjar uma placa com o nome de vocês. Em ferro, que dura mais!'] }],
  sara: ['Sara', {
    arrive: ['Meu marido desceu na igreja velha para ver de onde vinham os barulhos.', 'Voltou pálido e não disse uma palavra desde então.'],
    start: ['Ouvi o sino de madrugada. Fazia cinquenta anos que ele não tocava.', 'Meu marido desceu na igreja velha para ver de onde vinham os barulhos.', 'Voltou pálido e não disse uma palavra desde então.'],
    quest: ['Se forem descer, cuidado com os morcegos: eles bebem o sangue para se curar.'],
    desceu: ['Vocês desceram onde o meu marido desceu. E voltaram falando. Obrigada por isso.'],
    won: ['Meu marido voltou a sorrir. Obrigada, de coração.'] }],
  joaquim: ['Seu Joaquim', {
    arrive: ['Na minha época, rapaz voltava para a vila por causa de moça e dizia que era pelo trabalho. Igualzinho você.', 'Na minha época, a gente enfrentava rato gigante com uma vassoura!', 'Os ratos lá embaixo são fáceis. O que vem depois, não.'],
    start: ['Ouvi a gritaria na Berta. Na minha idade, a gente fecha a janela e espera o dia.', 'Na minha época, rapaz voltava para a vila por causa de moça e dizia que era pelo trabalho. Igualzinho você.', 'Na minha época, a gente enfrentava rato gigante com uma vassoura!', 'Os ratos lá embaixo são fáceis. O que vem depois, não.'],
    quest: ['Na minha época, ninguém descia na igreja velha. Nem por moça.'],
    desceu: ['Desceram, é? Na minha época, a gente voltava com um osso de lembrança.'],
    won: ['Hunf. Na minha época, isso levava dois dias. Bom trabalho, meninos.', 'Na minha época, túmulo vazio queria dizer encrenca. Ainda quer.'] }],
};
const homeTalk = id => HOMES[id] ? say(HOMES[id][0], byStage(HOMES[id][1])) : Promise.resolve();


// Purchases (the shop window, src/equipview.js): Dora sells qty of one item, never more than the purse pays for;
// Gaspar sells one piece, worn at once ("Comprar e equipar") or kept while the hero wears what they had ("Só comprar")
const shopPrice = (list, id) => list.find(([s]) => s === id)[1];
function buyItem(id, qty) {
  const price = shopPrice(SHOP, id);
  if (!buyPreview(G.gold, price, 0, qty).ok) return false;
  G.gold -= price * qty; G.inv[id] = (G.inv[id] || 0) + qty;
  return true;
}
function buyGear(id, wear, owned) {
  const price = shopPrice(FORGE, id), e = EQUIPS[id];
  G.equip = G.equip || {};
  if (G.gold < price || !forgeCompare(id, owned, EQUIPS, STAT_NAMES, G.equip).ok) return false;
  const now = equippedGear(e.who, e.slot, owned, EQUIPS, G.equip), delta = equipDelta(id, owned, EQUIPS, G.equip);
  G.gold -= price; G.gear = [...(G.gear || []), id];
  if (wear) wearGear(id, delta);
  else G.equip[e.who] = { ...G.equip[e.who], [e.slot]: now || '' };
  return true;
}
async function forge() {
  for (;;) {
    const v = await UI.choose([{ label: 'Comprar', value: 'buy' }, { label: 'Conversar', value: 'talk' }, { label: 'Sair', value: null }],
      { title: `${GASPAR}:\nAço de Valmor. Não é o melhor do mundo, mas é o melhor da rua.`, cancel: true, cols: 3, party: true });
    if (v === null) return;
    if (v === 'talk') { await homeTalk('smith'); continue; }
    if (!G.seen.forja) { G.seen.forja = 1; await say(GASPAR, ['Coisa simples, feita aqui. O aço bom mesmo ficou lá embaixo, com os mortos.']); }
    await HeroView.show('shop', { shop: { who: GASPAR, line: 'Aço de Valmor. Não é o melhor do mundo, mas é o melhor da rua.',
      thanks: 'Bom aço. Cuida bem dele.', items: FORGE.filter(([id]) => inParty(EQUIPS[id].who)), gear: true } });
  }
}

async function enterTavern() {
  if (inParty('teo') && !G.intro) { saveGame(); return nightScene(); } // a noite do mensageiro; perder a luta volta para a porta da taverna
  await fadeTo(1, 300);
  enterTown(TAVERN_INSIDE, 'taverna');
  await fadeTo(0, 300);
  if (!inParty('lyra') && !G.bossDead) await lyraArrives(); // a irmã do Aldo espera por ele lá dentro
}
async function leaveTavern() {
  Sfx.select();
  await fadeTo(1, 300);
  enterTown(TAVERN_FRONT, 'valmor');
  await fadeTo(0, 300);
}

async function elderTalk() {
  const nm = 'Ancião Bertoldo';
  if (G.bossDead) { await say(nm, ['Os mortos voltaram a dormir, e o sino se calou. Valmor deve isso a vocês.', 'Mas um túmulo arrombado e vazio... Alguém levou o rei lá de baixo, e nós nem vimos.', 'Levem a carta com o selo real a Erukh. A rainha Lara precisa saber.']); return; }
  if (!G.intro) { await say(nm, [`${heroName('aldo')}. De volta outra vez.`, nextStep()]); return; }
  // only old saves reach this line: the party is four before the elder since the tavern night
  if (G.quest && G.party.length < 4) { await say(nm, [`Achem mais ${G.party.length === 3 ? 'um' : 'dois'}. A taverna anda cheia de gente de estrada.`]); return; }
  if (G.quest && G.reached >= 1) { await say(nm, ['Voltaram. A cripta deixa vocês subirem, por enquanto.', 'Não parem antes do fundo. O que acorda os mortos ainda está lá embaixo.',
    G.seen.lapide || G.seen.bilhete ? 'Morvath... Então vocês leram o nome. Não o digam aqui em cima.' : 'Na cripta, procurem a fonte de luz. E a irmã Irene cuida dos feridos.']); return; }
  if (G.quest) { await say(nm, ['O que acorda os mortos está no fundo da cripta.', 'Na cripta, procurem a fonte de luz para recuperar as forças.', 'E se precisarem, a irmã Irene cuida dos feridos na capela.']); return; }
  await say(nm, [
    'A Berta mandou vocês? Mostrem essa carta.',
    'É o selo real, o leão de Hanokh. E vocês não abriram. Bom.',
    'Na minha casa se dizia: o que o leão fecha, só o sangue de Hanokh abre.',
    'Se quase mataram o homem que a trazia, o que tem dentro é maior que Valmor.',
    'O homem que a trouxe delira "o selo... o selo". As covas abrem sozinhas.',
    'E o sino que vocês ouviram de madrugada é o da igreja velha. Ninguém toca aquele sino há cinquenta anos.',
    'Toda noite em que ele toca, mais covas amanhecem abertas. O sino chama, e os mortos obedecem.',
    'Tudo aponta para o mesmo lugar. Debaixo da igreja velha, no fundo da cripta, dorme um rei, selado na guerra de Elun.',
    'Não digo o nome dele. Não aqui em cima.',
    ...(G.party.length < 4 ? [ // only old saves reach this line: the party is four before the elder since the tavern night
      `Mas ${G.party.length === 3 ? 'três' : 'dois'} não descem lá. Os paladinos que fecharam a cripta eram quatro, um em cada canto do selo.`,
      `Achem mais ${G.party.length === 3 ? 'um' : 'dois'}. A taverna anda cheia de gente de estrada. Aí o Hugo deixa passar.`,
    ] : [
      'Vocês já são quatro. Bom. Os paladinos que fecharam a cripta também eram quatro, um em cada canto do selo.',
      'Digam ao Hugo que eu mandei, e ele deixa passar.',
    ]),
  ]);
  G.quest = 1;
  G.inv.pocao = (G.inv.pocao || 0) + 2;
  Sfx.chest();
  await UI.say('O ancião entrega 2 Poções ao grupo.\nNova missão: ' + (G.party.length < 4 ? 'reunir um grupo de quatro e descer à cripta.' : 'descer à cripta.'));
  saveGame(); // the mission and the potions survive a closed browser
}

// A escolinha: ninguém lá dentro, só a lousa e os desenhos das crianças
const SCHOOL = {
  start: [() => 'A escolinha de Valmor. Na lousa, a letra caprichada da Clara: "Hoje, as estações do ano."',
    'Num canto, um desenho de criança: um homem de espada, maior que as casas. Embaixo, em letra torta: NINO.'],
  quest: ['As carteiras estão vazias. Com a igreja velha assim, as crianças ficam perto de casa.',
    'O desenho do Nino continua no canto. Alguém desenhou um coração do lado e depois apagou.'],
  won: ['Na lousa, alguém desenhou quatro heróis e um sino quebrado.', 'Embaixo, na letra da Clara: "Voltem."'],
};
const school = () => SCHOOL[G.bossDead ? 'won' : G.quest ? 'quest' : 'start'].reduce((p, t) => p.then(() => UI.say(typeof t === 'function' ? t() : t)), Promise.resolve());

async function chapel() {
  const nm = 'Irmã Irene';
  for (;;) {
    const v = await UI.choose([
      { label: 'Orar', hint: 'restaura e salva', value: 'pray' }, { label: 'Conversar', value: 'talk' }, { label: 'Sair', value: null },
    ], { title: `${nm}:\n${G.party.length > 1 ? 'Bem-vindos' : 'Bem-vindo'} à capela de Valmor.`, cancel: true, cols: 3, party: true });
    if (v === null) return;
    if (v === 'talk') await say(nm, byStage({
      arrive: [`${heroName('aldo')}. Que bom te ver de volta.`, 'A capela está sempre aberta.', ...(inParty('teo') ? ['Teo, você voltou inteiro. Graças a Elun.'] : ['O irmão Teo saiu para rezar no cemitério e ainda não voltou.', 'Já devia ter voltado. Se passarem por lá, olhem por ele.'])],
      start: ['O mensageiro dorme. Perdeu muito sangue, mas vai viver.', 'Fala dormindo. Repete sempre a mesma coisa: "o selo... o selo".', 'O ancião Bertoldo mora na casa de telhado verde.'],
      quest: ['O mensageiro ainda não acordou. Continua repetindo "o selo... o selo".', 'Perguntei o nome dele. Não disse. Rezo por ele de hora em hora.', 'A Luz Sagrada de Teo queima os mortos-vivos com o dobro da força.', 'E se alguém cair lá embaixo, tragam-no aqui: eu cuido dele.'],
      desceu: ['Voltaram da cripta. Deixem-me ver esses ferimentos.', 'O mensageiro se mexeu quando vocês passaram pela porta. Como se soubesse onde vocês estiveram.'],
      won: ['O mensageiro já se levanta sozinho. E o sino da igreja velha se calou.', 'Esta noite, enfim, eu durmo.'] }));
    if (v === 'talk' && G.bossDead) await say('Tobias', ['Em Erukh, ninguém antes da rainha.', 'Que a luz de Elun vá com vocês.']); // he rests at the chapel
    if (v === 'pray') {
      for (const m of G.party) { fullRestore(m); UI.cardGlow(m); }
      UI.updateParty(); Sfx.holy();
      G.flashColor = '255,250,220'; G.flash = { t0: performance.now(), dur: 600 };
      await UI.say('Uma luz cálida envolve o grupo.\nTodos foram restaurados.' + (saveGame() ? '\nJogo salvo.' : ''));
    }
  }
}

// Dora's greeting: the first visit always greets Aldo, then the line of the stage; she sees the purse after the boss
function doraHello(st, gold, first, aldo) {
  const line = st === 'won' ? (gold < 15 ? 'Os heróis de Valmor! Ainda sem moeda, aposto.' : 'Os heróis de Valmor! E com a bolsa pesada, pela primeira vez.')
    : st === 'desceu' ? 'Voltaram! Lá embaixo poção some rápido, né?'
    : st === 'quest' ? 'Para a cripta? Poção primeiro, coragem depois.' : 'O que vai ser?';
  return first ? `${aldo}! O freguês que nunca tem moeda. ${line}` : line;
}
async function shop() {
  const nm = 'Dora, a mercadora';
  const hello = doraHello(stage(), G.gold, !G.seen.dora, heroName('aldo')), solo = G.party.length === 1;
  G.seen.dora = 1;
  await HeroView.show('shop', { shop: { who: nm, line: hello, thanks: 'Obrigada! Bom proveito.', items: SHOP } });
  await say(nm, [solo ? 'Volte sempre! E volte inteiro.' : 'Voltem sempre! E voltem inteiros.']);
}

// ---------- Desenho por quadro ----------
// Névoa da visão: uma máscara de um pixel por tile (com uma borda preta em volta do mapa), ampliada com suavização,
// dá a borda macia. Primeiro tira a cor do que está fora do raio, depois escurece: névoa no que já foi visto, preto no resto.
const SIGHT_MASKS = {}, SIGHT_DARK = [4, 4, 12]; // the never-seen dark, also past the map's edge
function drawSight(c, A, lp, camX, camY) {
  const W = A.W + 2, H = A.H + 2, seen = areaSeen(), r = A.vision.radius, px = lp.x / TS, py = lp.y / TS;
  let M = SIGHT_MASKS[A.name];
  if (!M) {
    const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); return { cv, cx, img: cx.createImageData(W, H) }; };
    M = SIGHT_MASKS[A.name] = { gray: mk(), dark: mk() };
  }
  const g = M.gray.img.data, d = M.dark.img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = x - 1, ty = y - 1, i = (y * W + x) * 4, inMap = tx >= 0 && ty >= 0 && tx < A.W && ty < A.H;
    const k = inMap ? Math.min(1, Math.max(0, (Math.hypot(tx - px, ty - py) - (r - 1)) / 1.5)) : 1; // 0 perto do grupo, 1 além do raio
    const a = inMap && seen[ty * A.W + tx] ? 0.6 * k : k;
    g[i] = g[i + 1] = g[i + 2] = 128; g[i + 3] = 255 * k;
    [d[i], d[i + 1], d[i + 2]] = SIGHT_DARK; d[i + 3] = 255 * a;
  }
  M.gray.cx.putImageData(M.gray.img, 0, 0); M.dark.cx.putImageData(M.dark.img, 0, 0);
  const X = -camX - TS, Y = -camY - TS;
  c.save(); c.imageSmoothingEnabled = true;
  c.globalCompositeOperation = 'saturation'; c.drawImage(M.gray.cv, X, Y, W * TS, H * TS);
  c.globalCompositeOperation = 'source-over'; c.drawImage(M.dark.cv, X, Y, W * TS, H * TS);
  c.restore();
}

// Rows of the scene covered by the open dialog box (0 when closed). The speaker's face sits in the left corner
// and is left out, so a face showing up never moves the scene; the room of a five-line box is kept from the
// first line, so a long line does not either
// Rows the touch pad covers at the bottom of a portrait phone: the camera keeps the party above it too
function touchRows() {
  const t = document.getElementById('touch');
  if (!t || !matchMedia('(orientation: portrait) and (pointer: coarse)').matches) return 0;
  const v = view.getBoundingClientRect(), r = t.getBoundingClientRect();
  return r.height ? Math.max(0, Math.min(VH * 0.5, (v.bottom - r.top) * VH / v.height)) : 0;
}
function dialogRows() {
  const d = document.getElementById('dialog');
  if (!d || !d.classList.contains('open')) return 0;
  const mb = document.getElementById('msgbox'), ms = getComputedStyle(mb);
  const v = view.getBoundingClientRect(), b = mb.getBoundingClientRect();
  if (b.top < v.top + v.height / 2) return 0; // a box at the top covers nothing below
  const extra = boxRoom(mb.offsetHeight, parseFloat(ms.lineHeight), parseFloat(ms.paddingTop) + parseFloat(ms.paddingBottom) + parseFloat(ms.borderTopWidth) + parseFloat(ms.borderBottomWidth));
  return Math.max(0, Math.min(VH * 0.6, (v.bottom - b.top + extra) * VH / v.height));
}

function drawTown(now) {
  const c = vctx;
  const A = TOWN.A, lp = actorPos(TOWN.p);
  // with the dialog open, the camera moves only if the box would cover the party (eased, 200 ms)
  const padB = (TOWN.padHold = dialogPad(TOWN.padHold || 0, dialogRows(), G.busy));
  TOWN.pad = TOWN.pad == null ? padB : TOWN.pad + (padB - TOWN.pad) * 0.25;
  const camX = camAxis(lp.x, A.W * TS, VW), camY = camLift(lp.y, A.H * TS, VH, Math.round(Math.max(TOWN.pad, touchRows())));
  if (!A.edge && A.edgeTile) A.edge = c.createPattern(A.edgeTile, 'repeat'); // mata fechada além da borda
  if (!A.edge) { const t = document.createElement('canvas'); t.width = t.height = TS; const tc = t.getContext('2d');
    const i = Math.max(0, A.g.indexOf(A.outside)); tc.drawImage(A.layer, (i % A.W) * TS, Math.floor(i / A.W) * TS, TS, TS, 0, 0, TS, TS); tc.fillStyle = 'rgba(0,0,0,.45)'; tc.fillRect(0, 0, TS, TS); A.edge = c.createPattern(t, 'repeat'); }
  c.save(); c.translate(-camX, -camY); c.fillStyle = A.edge; c.fillRect(camX, camY, VW, VH);
  // além do mapa: o mesmo escuro opaco da névoa (sem emenda no celular em pé)
  if (A.vision) { c.fillStyle = `rgb(${SIGHT_DARK})`; c.fillRect(camX, camY, VW, VH); }
  c.restore();
  c.drawImage(A.layer, -camX, -camY);

  // Brilho da água
  c.fillStyle = 'rgba(200,235,255,.55)';
  for (let y = Math.floor(camY / TS); y <= Math.floor((camY + VH) / TS); y++) for (let x = Math.floor(camX / TS); x <= Math.floor((camX + VW) / TS); x++) {
    const t = TOWN.tileAt(x, y);
    if (t === TILE.FIRE) { // campfire: a tall flame, high in its tile so whoever sits south of it does not hide it
      const X = x * TS - camX, Y = y * TS - camY, f = Math.sin(now / 90 + x) * 1.5;
      c.fillStyle = '#c83a10'; c.fillRect(X + 4, Y + 1 - f, 8, 11 + f);
      c.fillStyle = '#ff9a20'; c.fillRect(X + 5, Y + 3 - f, 6, 9 + f);
      c.fillStyle = '#ffe070'; c.fillRect(X + 7, Y + 6 - f / 2, 2, 5);
      continue;
    }
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
    ...TOWN.followers.map((a, i) => ({ a, spr: () => personSprite(G.party[i + 1]?.id || 'teo', a.dir, Folk.pose(a, now)) })).reverse(),
    { a: TOWN.p, spr: () => personSprite('aldo', TOWN.p.dir, Folk.pose(TOWN.p, now)), lead: true },
    ...TOWN.npcs.filter(n => visibleAt(n.x, n.y)).map(n => ({ a: n, lying: n.lying, foe: n.def.foe, spr: () => n.def.foe ? foeSprite(n, now) : n.def.cat ? catSprite(n.dir === 1 ? 1 : 3, n.t < 1 ? n.frame : 0) : n.def.horse ? horseSprite(n.dir === 1 ? 1 : 3, n.t < 1 ? n.frame : 0, n.def.horse) : personSprite(n.def.look || n.def.id, n.lying ? 2 : n.dir, n.lying ? 0 : Folk.pose(n, now)) })),
  ];
  list.forEach(o => { o.pos = actorPos(o.a); if (o.a === TOWN.p && o.a.x === o.a.fx && o.a.y === o.a.fy && o.a.t < 1) o.pos.x += Math.sin(o.a.t * Math.PI) * 2 * (TDIRS[o.a.dir][0]); });
  list.sort((p, q) => p.pos.y - q.pos.y || (p.lead ? 1 : 0) - (q.lead ? 1 : 0));
  for (const o of list) {
    const spr = o.spr(), x = Math.round(o.pos.x - camX), y = Math.round(o.pos.y - camY - 3 - (spr.height - 18));
    if (!o.lying) {
      c.drawImage(spr, x, y);
      // Aviso de luta: "!" amarelo piscando sobre o inimigo quando o herói chega perto
      if (o.foe && Math.abs(o.a.x - TOWN.p.x) + Math.abs(o.a.y - TOWN.p.y) <= 3 && Math.floor(now / 250) % 2) {
        c.fillStyle = '#1a1000'; c.fillRect(x + 6, y - 9, 4, 8); c.fillStyle = '#ffd23f'; c.fillRect(x + 7, y - 8, 2, 4); c.fillRect(x + 7, y - 3, 2, 1);
      }
      continue;
    }
    c.save(); c.translate(x + 8, y + spr.height - 7); c.rotate(-Math.PI / 2); c.drawImage(spr, -8, -spr.height / 2); c.restore();
  }
  TownArt.weather(c, A, now, camX, camY, VW, VH); // fumaça, anoitecer com poças de luz, neve caindo
  if (A.vision) drawSight(c, A, lp, camX, camY);
  // Setinha amarela sobre o próximo lugar da história, balançando
  const goal = goalSpot();
  if (goal) {
    const gx = goal.x * TS - camX + TS / 2, gy = goal.y * TS - camY - 7 - (Math.floor(now / 250) % 2) * 2;
    c.fillStyle = '#1a1000'; c.beginPath(); c.moveTo(gx - 5, gy - 1); c.lineTo(gx + 5, gy - 1); c.lineTo(gx, gy + 6); c.closePath(); c.fill();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(gx - 3.5, gy); c.lineTo(gx + 3.5, gy); c.lineTo(gx, gy + 4.5); c.closePath(); c.fill();
  }
  if (TOWN.dim > 0) { c.fillStyle = `rgba(${A.dimCol || '4,2,16'},${TOWN.dim})`; c.fillRect(0, 0, VW, VH); }
  if (A.vision) { // a luz quente do lampião em volta do grupo
    const gx = lp.x - camX + TS / 2, gy = lp.y - camY + TS / 2, R = A.vision.radius * TS, gr = c.createRadialGradient(gx, gy, 0, gx, gy, R);
    gr.addColorStop(0, 'rgba(255,190,110,.18)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(gx - R, gy - R, R * 2, R * 2); c.globalCompositeOperation = 'source-over';
  }
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
