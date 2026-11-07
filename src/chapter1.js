// ===== Capítulo 1 · Parte 1 · A Estrada do Sul =====
// História: docs/mundo/historias/capitulo1-parte1.md · plano e falas aprovadas: docs/planos/capitulo1-parte1.md
// Flags da parte em G.seen com o prefixo "c1:". G.chapter = 1 e G.part = 1 desde a despedida em Valmor.
// Só o grupo sabe da carta: ninguém de fora fala dela.

const c1 = k => !!G.seen['c1:' + k];
const c1set = k => { G.seen['c1:' + k] = 1; };
// A scene: lines like TALKS ([who, text, mood], who a hero id, a name or null for narration), heroes only when in the party
async function play(lines) {
  for (const [who, t, mood] of talkLines(lines, HERO_IDS, inParty)) {
    const text = typeof t === 'function' ? t() : t;
    if (!text) continue;
    const name = HERO_IDS.includes(who) ? heroName(who) : who;
    await UI.say(name ? `${name}${mood ? '~' + mood : ''}:\n${text}` : text);
  }
}
const giveKey = async (id, text) => { G.key[id] = true; Sfx.keyItem(); if (text) await UI.say(text); };

Object.assign(LOOKS, {
  viajante:  { skin: '#d8a878', hair: '#5a3a1a', body: '#6a3a1a', legs: '#3a3a4a', hairStyle: 'short', beard: 'stubble', hat: 'cap', hatCol: '#55555e', tool: 'satchel', bag: '#9a6232', belt: '#3a2010' },
  gervasio:  { skin: '#d8a070', hair: '#a2a2ac', body: '#7a4a24', legs: '#3a3050', hairStyle: 'short', beard: 'full', outfit: 'vest', shirt: '#e8e0c8', hat: 'straw', hatCol: '#c89c38', band: '#7a1a24', tool: 'rake' },
  cavalarico: { skin: '#f0c090', hair: '#c05a28', body: '#3a9a6a', legs: '#5a3a20', hairStyle: 'messy', outfit: 'overalls', eye: '#3a2a1a' },
  estalajadeira: { skin: '#e8c0a0', hair: '#3a2a1a', body: '#3a78c8', legs: '#2c3c80', robe: true, long: true, hairStyle: 'bun', apron: '#f4efe2', tool: 'mug', blush: 1 },
  silhueta:  { skin: '#26202e', hair: '#7a7a82', body: '#7a7a82', legs: '#55555e', hat: 'hood', hatCol: '#7a7a82', robe: true, hairStyle: 'none' },
});

// ---------- Plantas das áreas: uma letra por tile ----------
const C1_TILES = { T: TILE.TREE, '.': TILE.GRASS, ':': TILE.PATH, r: TILE.BUSH, '~': TILE.WATER, '=': TILE.FORD, f: TILE.FLOWER };
const planGrid = plan => Uint8Array.from(plan.join(''), ch => C1_TILES[ch]);

// ---------- 1 · Despedida em Valmor ----------
// Who waits at the west road: the cast stands on the grass beside the street, facing the party
const FAREWELL_CAST = [
  { id: 'berta', name: 'Berta', x: 4, y: 5, dir: 3 }, { id: 'ana', name: 'Ana', x: 5, y: 5, dir: 3 },
  { id: 'clara', name: 'Clara', x: 4, y: 7, dir: 3 }, { id: 'nino', name: 'Nino', x: 5, y: 7, dir: 3 },
].map(d => ({ wander: 0, ...d }));

async function departValmor() {
  const ok = await UI.choose([{ label: 'Sim', value: true }, { label: 'Não', value: false }], { title: 'Partir para Erukh? Valmor fica para trás.', cancel: true, cols: 2 });
  if (!ok) return;
  await farewell();
}

async function farewell() {
  G.busy = true;
  await fadeTo(1, 600);
  enterTown({ x: 2, y: 6, dir: 1 }, 'valmor', FAREWELL_CAST, false);
  G.busy = true;
  TOWN.followers.forEach((f, i) => placeActor(f, i === 0 ? 1 : 2, [6, 5, 7][i], 1));
  Music.play('ending');
  await fadeTo(0, 600);
  const a = heroName('aldo');
  await play([[null, 'Na saída do oeste, metade de Valmor espera o grupo na neve.'], ['Berta', 'Se a sopa não vai até vocês, o pão vai.']]);
  G.inv.pao = (G.inv.pao || 0) + 4; Sfx.chest();
  await UI.say('A Berta entrega 4 Pães ao grupo.');
  await play([['Ana', 'Prometi, está prometido. Um cachecol para cada um.'],
    ['Nino', 'Eu vou junto! Eu atiro pedra mais longe que todo mundo!'],
    [null, 'A Clara segura o Nino pelo ombro.'],
    ['Clara', 'Você fica, Nino. Alguém precisa me ajudar com a turma.'],
    [null, `A Clara chega perto do ${a} e põe na mão dele um bilhete dobrado, fechado com um pingo de cera.`],
    ['Clara', 'Abre quando chegar em Erukh.']]);
  await giveKey('bilhete', `${a} guarda o bilhete sem abrir.`);
  await play([[null, 'Teo guarda a carta num estojo de couro, por dentro da roupa, junto ao peito.'],
    ['teo', 'Ela vai inteira até a rainha.'],
    ['lyra', `${a} não olha para trás. ${a} está olhando para trás agora.`, 'preocupado'], // Lyra 1/5
    ['aldo', 'Vamos.']]);
  G.chapter = 1; G.part = 1;
  await fadeTo(1, 900);
  enterTown(ESTRADA_START, 'estrada');
  G.busy = true;
  saveGame();
  await fadeTo(0, 900);
  await UI.say('Capítulo 1 · A Estrada do Sul');
  await UI.say('A estrada sobe para o norte entre os pinheiros. Anoitece cedo no sul.');
  await UI.say('Objetivo: seguir a estrada para o norte, até o Vau do Corvo.');
}

// ---------- 2 · A Estrada do Sul ----------
const ESTRADA_PLAN = [
  'TTTTTTT:TTTTTTTT',
  'TTTTT..:..TTTTTT',
  'TTTT...:...TTTTT',
  'TTT..r.::...TTTT',
  'TTT.....:....TTT',
  'TT..T...:..r..TT',
  'TT......::.....T',
  'TTT.r....:.....T',
  'TTTT.....:..T..T',
  'TTT.....::.....T',
  'TT.....:::....TT',
  'TT....::...r..TT',
  'TT...::.......TT',
  'TTT..:....T...TT',
  'TTT..:.........T',
  'TT...::....r...T',
  'TT.T..:........T',
  'TT....::.......T',
  'TTT....:::....TT',
  'TTT......::...TT',
  'TT..r.....:...TT',
  'TT........::..TT',
  'TTT...T....:..TT',
  'TTT........:.TTT',
  'TT.........:.TTT',
  'TT..r.....::..TT',
  'TTT......::...TT',
  'TTTT....:.....TT',
  'TTTTT...:...TTTT',
  'TTTTTTTT:TTTTTTT',
];
const ESTRADA_START = { x: 8, y: 28, dir: 0 };
// The grey cloak shows at the edge of the lamp light at two fixed spots and is gone before the light reaches it
const SILHOUETTES = [
  { flag: 'silhueta1', x: 10, y: 18, lines: [[null, 'No limite da luz do lampião, uma silhueta de capa cinza. Quando a luz chega lá, não há ninguém.'],
    ['andilla', 'Alguém está andando no mesmo passo que a gente.'], ['aldo', 'Fiquem perto da luz.']] },
  { flag: 'silhueta2', x: 12, y: 6, lines: [[null, 'De novo a capa cinza, mais longe. Some entre os pinheiros.'], ['lyra', 'Duas vezes. Eu estou contando.']] },
];
const silhouetteNear = (seen, p, radius = 4) => SILHOUETTES.find(s => !seen['c1:' + s.flag] && Math.hypot(s.x - p.x, s.y - p.y) <= radius) || null;
async function silhouetteScene(s) {
  c1set(s.flag);
  const sil = addActor({ id: 'sil', look: 'silhueta', name: '?', x: s.x, y: s.y, dir: TOWN.p.y > s.y ? 2 : 0 });
  Sfx.dark();
  await wait(500);
  await play(s.lines.slice(0, 1));
  TOWN.npcs = TOWN.npcs.filter(n => n !== sil);
  await play(s.lines.slice(1));
}
const ESTRADA_ROAM = [[4, 9, 'wolf'], [12, 15, 'wolf'], [3, 21, 'wolf'], [11, 3, 'crow'], [12, 23, 'crow']];
const ROAD_FOES = {
  wolf: { foe: 'wolf', ids: ['loboGeada'], speed: 300, intro: 'Um Lobo da Geada salta dos pinheiros!' },
  wolf2: { foe: 'wolf', ids: ['loboGeada', 'loboGeada'], speed: 300, intro: 'Dois Lobos da Geada cercam o grupo!' },
  crow: { foe: 'crow', ids: ['corvo', 'corvo'], speed: 360, intro: 'Corvos mergulham do escuro!' },
};
// Roamers born far from the party (never on top of it when the area loads)
const farRoamers = (spots, p, kinds = ROAD_FOES) => spots.filter(([x, y]) => (x - p.x) ** 2 + (y - p.y) ** 2 > 25).map(([x, y, k]) => ({ ...kinds[k], x, y }));

AREAS.estrada = makeArea('Estrada do Sul', 'ESTRADA', 16, 30, planGrid(ESTRADA_PLAN), [], TILE.TREE);
Object.assign(AREAS.estrada, {
  poi: 'valmor', winter: true, trees: 'pine', vision: { radius: 4 }, dimCol: '10,24,56', dim: () => 0.3, battle: 'cemiterio',
  music: () => 'cemetery',
  roamers: () => farRoamers(ESTRADA_ROAM, TOWN.p),
  cast: () => [{ id: 'viajante', name: 'Viajante', x: 8, y: 14, dir: 3, wander: 0, lines: { start: [
    'No Vau do Corvo alugam cavalos. A pé, Erukh fica a um mês.', 'E não andem depois que escurece. Os lobos estão com fome este ano.'] } }],
  exits: [{ x: 7, y: 0, to: 'vau', pos: { x: 11, y: 18, dir: 0 } },
    { x: 8, y: 29, check: () => 'Valmor fica para trás. A carta segue para o norte.' }],
  goal: () => ({ x: 7, y: 0 }),
  onStep(x, y) {
    const s = silhouetteNear(G.seen, { x, y });
    return s ? () => silhouetteScene(s) : null;
  },
});

// ---------- 3 · O Vau do Corvo ----------
const VAU_PLAN = [
  'TTTTTTTTTTT::TTTTTTTTTTT',
  'TT.........::.........TT',
  'T..........::..........T',
  'T..........::..........T',
  'T..........::..........T',
  'T..........::..........T',
  'T....::::::::::::::....T',
  'T..........::..........T',
  'T..........::..........T',
  'T..........::..........T',
  'T..........:::::::::::::',
  'T..f.......::....f.....T',
  'T..........::..........T',
  '~~~~~~~~~~====~~~~~~~~~~',
  '~~~~~~~~~~====~~~~~~~~~~',
  '~~~~~~~~~~====~~~~~~~~~~',
  'T.....r....::.....r....T',
  'TT.........::.........TT',
  'TTT........::........TTT',
  'TTTTTTTTTTT::TTTTTTTTTTT',
];
const VAU_BUILDINGS = [
  { id: 'estalagem', style: 'inn', x: 3, y: 2, w: 5, h: 3 },
  { id: 'haras', style: 'stable', x: 15, y: 2, w: 4, h: 3 },
  { id: 'casaVau1', style: 'sara', x: 3, y: 7, w: 3, h: 2 },
  { id: 'casaVau2', style: 'joaquim', x: 17, y: 7, w: 3, h: 2 },
];
VAU_BUILDINGS.forEach(b => { b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }; });
const VAU_LAMPS = [[10, 5], [13, 9], [9, 16]];
const HORSES = 4;
const horsesCaught = seen => [1, 2, 3, 4].filter(i => seen['c1:cavalo' + i]).length;

const GERVASIO = { id: 'gervasio', name: 'Gervásio', x: 19, y: 5, dir: 3, wander: 0, onTalk: gervasioTalk };
async function gervasioTalk() {
  if (!c1('gervasio')) {
    c1set('gervasio');
    await play([['Gervásio', 'Uma caravana de capa cinza levou todos os meus cavalos de tração. Precisavam puxar uma carroça coberta, pesada como chumbo.'],
      ['Gervásio', 'E pagaram com isto.'],
      [null, 'Ele mostra moedas de ouro antigas, com o rosto de um rei que ninguém reconhece.'],
      ['andilla', 'Ouro de rei morto.'],
      ['Gervásio', 'Sobraram quatro cavalos, e os lobos espantaram os quatro para o pasto.'],
      ['Gervásio', 'Tragam os quatro de volta e eles são de vocês até Arcaval. Lá eu busco.'],
      ['aldo', 'Feito.']]);
    saveGame();
    await UI.say('Objetivo: trazer os quatro cavalos do pasto, a leste do Vau.\nOs lobos espantam os cavalos. Cheguem perto com nenhum lobo por perto.');
    return;
  }
  if (horsesCaught(G.seen) >= HORSES && !c1('cavalos')) return horsesBack();
  if (c1('cavalos')) return play([['Gervásio', 'Os quatro! Cuidem bem deles. Eles conhecem o caminho melhor que vocês.']]);
  return play([['Gervásio', `Cavalos: ${horsesCaught(G.seen)} de ${HORSES}. Tragam os quatro de volta e eles são de vocês até Arcaval.`]]);
}
async function horsesBack() {
  c1set('cavalos');
  await play([['Gervásio', 'Os quatro! Cuidem bem deles. Eles conhecem o caminho melhor que vocês.']]);
  saveGame();
  await UI.say('Objetivo: seguir para o norte a cavalo, pela estrada que sai do Vau.');
}

const vauGrid = () => { const g = planGrid(VAU_PLAN); for (const [x, y] of VAU_LAMPS) g[y * 24 + x] = TILE.BUSH; return g; }; // a lamp post is in the way
AREAS.vau = makeArea('Vau do Corvo', 'VAU', 24, 20, vauGrid(), VAU_BUILDINGS, TILE.TREE);
Object.assign(AREAS.vau, {
  poi: 'vau', winter: true, dusk: true, river: true, lamps: VAU_LAMPS, music: () => 'town',
  cast: () => [GERVASIO],
  exits: [
    { x: 11, y: 19, check: () => 'A estrada volta para o sul, para Valmor. A carta segue para o norte.' },
    { x: 12, y: 19, check: () => 'A estrada volta para o sul, para Valmor. A carta segue para o norte.' },
    { x: 23, y: 10, to: 'pasto', pos: { x: 1, y: 8, dir: 1 }, check: () => c1('gervasio') ? null : 'Uma cerca e um pasto coberto de névoa. Melhor falar antes com o dono do haras.' },
    { x: 11, y: 0, enter: () => leaveVau() }, { x: 12, y: 0, enter: () => leaveVau() },
  ],
  goal() {
    if (!c1('gervasio')) return { x: GERVASIO.x, y: GERVASIO.y };
    if (horsesCaught(G.seen) < HORSES) return { x: 23, y: 10 };
    if (!c1('cavalos')) return { x: GERVASIO.x, y: GERVASIO.y };
    return { x: 11, y: 0 };
  },
  async onEnter() {
    if (c1('vau')) return;
    c1set('vau'); G.busy = true;
    await UI.say('Vau do Corvo. Um rio raso corta a estrada, e do outro lado brilham as janelas de uma estalagem.');
    saveGame();
  },
  onStep(x, y) {
    if (TOWN.tileAt(x, y) === TILE.FORD && !c1('estojo')) return async () => {
      c1set('estojo');
      await play([[null, 'O rio é raso, mas a água bate na cintura. Teo ergue o estojo da carta acima da água com as duas mãos.'],
        ['andilla', 'Padre, é só papel.', 'alegre'], ['teo', 'Não é só papel.']]);
    };
    return null;
  },
});
// The doors of the Vau: the inn opens, the stable is Gervásio's (he stands outside), the houses are shut for the night
AREAS.vau.enterBuilding = async b => {
  if (b.id === 'estalagem') { await fadeTo(1, 300); enterTown({ x: 7, y: 8, dir: 0 }, 'estalagem'); await fadeTo(0, 300); return; }
  if (b.id === 'haras') return UI.say('O haras está vazio. Só cheiro de feno e baias abertas.');
  return UI.say('Janelas acesas e a porta fechada. A noite no Vau começa cedo.');
};

async function leaveVau() {
  if (!c1('cavalos')) { await UI.say('A pé, Erukh fica a um mês. O Gervásio, do haras, aluga cavalos.'); return; }
  const ok = await UI.choose([{ label: 'Partir', value: true }, { label: 'Ficar', value: false }], { title: 'Seguir para o norte a cavalo? O Vau fica para trás.', cancel: true, cols: 2 });
  if (ok) await rideNorth(); // the trip and the camp (part 2 of the road)
}

// ---------- A estalagem do Vau ----------
AREAS.estalagem = makeArea('Estalagem do Vau', 'ESTALAGEM', 14, 10, buildTavernMap(), [], TILE.WALL);
Object.assign(AREAS.estalagem, {
  poi: 'vau', music: () => 'tavern', cozy: 'rgba(40,20,14,.38)',
  exits: [{ x: 7, y: 9, to: 'vau', pos: { x: 5, y: 5, dir: 2 } }],
  cast: () => [
    { id: 'estalajadeira', name: 'Estalajadeira', x: 10, y: 2, dir: 2, wander: 0, onTalk: innkeeper },
    { id: 'cavalarico', name: 'Cavalariço', x: 3, y: 6, dir: 1, wander: 0, onTalk: diceGame },
  ],
});
const INN = { price: 10, shop: [['pocao', 15], ['eter', 30], ['pena', 60]] };
async function innkeeper() {
  for (;;) {
    const v = await UI.choose([{ label: `Descansar ${INN.price}`, hint: 'restaura e salva', value: 'rest', disabled: G.gold < INN.price },
      ...INN.shop.map(([id, price]) => ({ label: `${ITEMS[id].name} ${price}`, hint: `tem ${G.inv[id] || 0}`, value: id, disabled: G.gold < price })),
      { label: 'Sair', value: null }], { title: `Estalajadeira:\nCama, sopa e o que a estrada pedir.  (${G.gold} moedas)`, cancel: true, cols: 2, party: true });
    if (v === null) return;
    if (v === 'rest') {
      G.gold -= INN.price;
      for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); UI.cardGlow(m); }
      UI.updateParty(); Sfx.holy();
      await UI.say('Uma noite de cama quente. Todos foram restaurados.' + (saveGame() ? '\nJogo salvo.' : ''));
      continue;
    }
    G.gold -= INN.shop.find(([id]) => id === v)[1]; G.inv[v] = (G.inv[v] || 0) + 1; Sfx.coin();
  }
}
// Optional: one round of dice with the stable boys (once per save). Andilla wins three in a row, Aldo loses two coins.
async function diceGame() {
  if (c1('dados')) return play([['Cavalariço', 'Selas novas, e a gente sem cerveja. Nunca mais jogo com ela.']]);
  const ok = await UI.choose([{ label: 'Jogar', value: true }, { label: 'Agora não', value: false }], { title: 'Cavalariço:\nUma rodada de dados? Quem perde paga a cerveja.', cancel: true, cols: 2 });
  if (!ok) return;
  c1set('dados');
  Sfx.coin();
  await play([[null, 'A Andilla ganha três rodadas seguidas. Os cavalariços pagam com quatro selas novas.'],
    ['andilla', 'Selas novas. Ninguém vai agradecer?', 'alegre']]);
  if (inParty('lyra')) { G.gold = Math.max(0, G.gold - 2); await play([['lyra', `${heroName('aldo')} perdeu duas moedas tentando aprender. ${heroName('aldo')} não vai aprender.`, 'alegre']]); } // Lyra 2/5
}

// ---------- O Pasto do Vau ----------
const PASTO_PLAN = [
  'TTTTTTTTTTTTTTTTTTTT',
  'TT......r.........TT',
  'T...............r..T',
  'T..r......T........T',
  'T..................T',
  'T.......r......T...T',
  'T..T...............T',
  'T..............r...T',
  ':..................T',
  'T....r.....T.......T',
  'T..................T',
  'T.........r....r...T',
  'T..T...............T',
  'T.....r............T',
  'TT...............TTT',
  'TTTTTTTTTTTTTTTTTTTT',
];
const HORSE_SPOTS = [[4, 3, ['#9a6232', '#26202e']], [15, 3, ['#e8eff8', '#a2a2ac']], [4, 12, ['#26262e', '#55555e']], [16, 12, ['#b07c58', '#f4cca0']]];
const PASTO_ROAM = [[10, 7, 'wolf'], [9, 2, 'wolf'], [11, 12, 'wolf2']];
const FLEE_NEAR = 4;
// A wolf this close scares a horse away (Manhattan distance)
const wolfNear = (h, wolves, d = FLEE_NEAR) => wolves.find(w => Math.abs(w.x - h.x) + Math.abs(w.y - h.y) <= d) || null;
// One step away from the threat: the free neighbor farthest from it (stays put when cornered)
function fleeStep(h, from, free) {
  let best = null, bd = Math.hypot(h.x - from.x, h.y - from.y);
  for (const [dx, dy] of TDIRS) {
    const x = h.x + dx, y = h.y + dy, d = Math.hypot(x - from.x, y - from.y);
    if (free(x, y) && d > bd) { bd = d; best = { x, y }; }
  }
  return best;
}
const horseFree = (x, y) => TOWN.walkable(x, y) && x > 0 && !npcAt(x, y) && !roamerAt(x, y) && !partyAt(x, y);
async function horseRun(h, from, steps = 3) {
  h.fleeing = true;
  for (let i = 0; i < steps; i++) {
    const s = fleeStep(h, from, horseFree);
    if (!s) break;
    h.dir = s.x > h.x ? 1 : s.x < h.x ? 3 : h.dir;
    moveActor(h, s.x, s.y, 160);
    await wait(170);
  }
  h.fleeing = false;
}
async function catchHorse(h) {
  const w = wolfNear(h, TOWN.roamers);
  if (w) { Sfx.alert(); await UI.say('Um uivo. O cavalo dispara pela névoa.'); await horseRun(h, TOWN.p); return; }
  c1set('cavalo' + h.def.n);
  TOWN.npcs = TOWN.npcs.filter(n => n !== h);
  Sfx.join();
  const n = horsesCaught(G.seen);
  await UI.say(`O cavalo baixa a cabeça e deixa pegar a rédea. Cavalos: ${n} de ${HORSES}.`);
  if (n >= HORSES) { saveGame(); await UI.say('Os quatro cavalos estão com o grupo. Hora de voltar ao Gervásio.'); }
}

AREAS.pasto = makeArea('Pasto do Vau', 'PASTO', 20, 16, planGrid(PASTO_PLAN), [], TILE.TREE);
Object.assign(AREAS.pasto, {
  poi: 'vau', winter: true, fog: true, trees: 'pine', vision: { radius: 4 }, dimCol: '10,24,56', dim: () => 0.25, battle: 'cemiterio',
  music: () => 'cemetery',
  roamers: () => farRoamers(PASTO_ROAM, TOWN.p),
  cast: () => HORSE_SPOTS.map(([x, y, coat], i) => ({ id: 'cavalo' + (i + 1), n: i + 1, name: 'Cavalo', horse: coat, x, y, dir: 3, wander: 0, onTalk: catchHorse }))
    .filter(d => !c1('cavalo' + d.n)),
  exits: [{ x: 0, y: 8, to: 'vau', pos: { x: 22, y: 10, dir: 3 } }],
  goal() {
    if (horsesCaught(G.seen) >= HORSES) return { x: 0, y: 8 };
    const h = TOWN.npcs.find(n => n.def.horse && visibleAt(n.x, n.y));
    return h ? { x: h.x, y: h.y } : null;
  },
  async onEnter() {
    if (c1('pasto')) return;
    c1set('pasto'); G.busy = true;
    await UI.say('O pasto do Vau, coberto de névoa. Em algum lugar, cavalos relincham. Em outro, lobos.');
  },
  // A horse with a wolf close by runs; the party catches one by walking up to it with no wolf around
  update() {
    if (G.busy || UI.busy()) return;
    for (const h of TOWN.npcs) {
      if (!h.def.horse || h.fleeing || h.t < 1) continue;
      const w = wolfNear(h, TOWN.roamers);
      if (w) horseRun(h, w, 1);
    }
  },
  onStep(x, y) {
    const h = TOWN.npcs.find(n => n.def.horse && !n.fleeing && Math.abs(n.x - x) + Math.abs(n.y - y) === 1);
    return h ? () => catchHorse(h) : null;
  },
});

// ---------- 4 · A viagem e o acampamento ----------
async function rideNorth() {
  G.busy = true;
  await fadeTo(1, 600);
  await WorldMap.travel(['vau', 'acampamento'], 'Dois dias a cavalo pela estrada do norte.');
  await campScene();
}

const CAMP_PLAN = [
  'TTTTTTTTTTTT',
  'TT........TT',
  'T..........T',
  'T..........T',
  'T..........T',
  'T..........T',
  'T..........T',
  'TT........TT',
  'TTTTTTTTTTTT',
];
const CAMP_FIRE = { x: 6, y: 4 };
const campGrid = () => { const g = planGrid(CAMP_PLAN); g[CAMP_FIRE.y * 12 + CAMP_FIRE.x] = TILE.FIRE; return g; };
AREAS.acampamento = makeArea('Beira da Floresta Púrpura', 'ACAMPAMENTO', 12, 9, campGrid(), [], TILE.TREE);
Object.assign(AREAS.acampamento, {
  poi: 'acampamento', winter: true, dusk: true, trees: 'pine', battle: 'cemiterio', music: () => 'cemetery',
  cast: () => HORSE_SPOTS.map(([, , coat], i) => ({ id: 'cavaloC' + i, name: 'Cavalo', horse: coat, x: 1 + (i % 2), y: 5 + (i >> 1), dir: 1, wander: 0 })),
});
// Around the fire: Aldo south of it, the others on the other sides
const CAMP_SEATS = [[6, 5, 0], [5, 4, 1], [7, 4, 3], [6, 3, 2]];

async function campScene() {
  enterTown({ x: CAMP_SEATS[0][0], y: CAMP_SEATS[0][1], dir: 0 }, 'acampamento', null, false);
  G.busy = true;
  TOWN.followers.forEach((f, i) => { const [x, y, d] = CAMP_SEATS[i + 1]; placeActor(f, x, y, d); });
  Music.stop();
  c1set('acampou');
  await fadeTo(0, 900);
  const a = heroName('aldo');
  await play([[null, 'Dois dias a cavalo pela estrada do norte. Na beira da Floresta Púrpura, o grupo para para a noite.'],
    ['teo', 'Dizem que no Grande Templo de Hyarmeth a luz de Elun entra pelo teto inteiro.'],
    ['teo', 'Lá vive o sumo sacerdote. Eu sonho servir lá desde menino.'],
    ['teo', 'Um homem quase morreu para trazer isso até Valmor. Eu não vou fazer menos.'],
    ['lyra', () => `De onde você é, ${heroName('andilla')}?`],
    ['andilla', 'De onde eu estiver.'],
    ['lyra', 'As fontes guardam a memória de quem passa. Eu quero ver uma lembrar.'],
    ['lyra', 'Se uma delas me mostrar uma coisa só, já valeu a viagem.'],
    [null, `${a} tira do bolso o bilhete fechado e fica olhando o pingo de cera.`],
    ['lyra', `${a} está com saudade. ${a} diz que é o frio. Desta vez eu deixo.`, 'alegre'], // Lyra 3/5
    ['aldo', 'É o frio.']]);
  await fadeTo(0.6, 900);
  const sil = addActor({ id: 'sil', look: 'silhueta', name: '?', x: 6, y: 1, dir: 2 });
  Sfx.dark();
  await play([[null, 'De madrugada, a fogueira baixa. Do outro lado das brasas, uma silhueta de capa cinza.']]);
  TOWN.p.dir = 0;
  await play([['aldo', 'Quem está aí?', 'bravo']]);
  Sfx.alert();
  await play([[null, 'Um uivo responde. Depois outro. Lobos!']]);
  TOWN.npcs = TOWN.npcs.filter(n => n !== sil);
  saveGame(); // losing to the pack comes back to the fire
  const r = await startBattle(['loboGeada', 'loboVelho', 'loboGeada'], false, {
    intro: 'A matilha sai da floresta! O Lobo Velho vem na frente.', noRun: 'Os cavalos estão amarrados. Não dá para fugir!',
    hints: ['Os lobos atacam juntos. Lyra e Teo podem atingir todos de uma vez; o Lobo Velho bate mais forte.'],
  });
  if (r === 'lose') return gameOver();
  backToArea();
  Music.stop();
  await fadeTo(0, 400);
  c1set('matilha');
  await play([[null, 'Quando o último lobo cai, a silhueta já não está lá.'],
    ['andilla', 'Veio, olhou e foi embora. Igual a mim em festa de rico.']]);
  await toArcaval();
}

async function toArcaval() {
  G.busy = true;
  if (!AREAS.arcaval) { // the part continues in the next update: the party waits at the camp
    saveGame();
    await UI.say('O sol nasce sobre a Floresta Púrpura.\nA Parte 1 continua na próxima atualização do jogo.');
    G.busy = false; townHint();
    return;
  }
  await fadeTo(1, 800);
  await WorldMap.travel(['acampamento', 'arcaval'], 'Ao amanhecer, a estrada desce para Arcaval.');
  await arriveArcaval();
}
