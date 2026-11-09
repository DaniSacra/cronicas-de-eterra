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
const C1_TILES = { T: TILE.TREE, '.': TILE.GRASS, ':': TILE.PATH, r: TILE.BUSH, '~': TILE.WATER, '=': TILE.FORD, f: TILE.FLOWER,
  // exploration: cliff ledge, ramp, wooden bridge, ravine, avalanche, wheel ruts, dead pine, a flat stone in the brook, ice
  '^': TILE.CLIFF, '/': TILE.RAMP, H: TILE.BRIDGE, '#': TILE.CHASM, A: TILE.SNOWPILE, u: TILE.RUTS, x: TILE.DEADTREE, P: TILE.FORD, I: TILE.ICE, n: TILE.FENCE };
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
  await estradaStart();
  await UI.say('Objetivo: seguir a estrada para o norte, até o Vau do Corvo.');
}

// ---------- 2 · A Estrada do Sul ----------
// Seven stretches from south to north (docs/planos/exploracao-estrada-pasto.md): the bridge over the brook, the road of
// the lamps (Seu Dorival), the fallen pine, the frozen waterfall (optional), the travellers' cairn, the ravine and the
// lookout. The road climbs the hills in three ledges; the wolves walk on the map and the light keeps them off.
// Objects of the field (lamps, logs, the beam over the ravine...) are listed in ESTRADA_FIELD, not in the plan.
const ESTRADA_PLAN = [
  'TTTTTTTTTTTTTTT:TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTT...:.TTTTT.........T',
  'TTTTTTTTTTT....:...TT..........T',
  'TTTTTTTTTT.....:...............T',
  'TTTTTTTTT......:.....x.........T',
  'TTTTTTTTT..T...::::::::.......TT',
  'TTTTTTTTTT.....T..T...:..T...TTT',
  'TTTTTTTTTTT^^^^^^^^^^^/^^^^^^TTT',
  'TTTTTTTTTTT..........:.....TTTTT',
  'TTTTTTTTTT..T........:..T....TTT',
  'TTT^^^^^^^...........:.......TTT',
  'TT.......^...T.......:.......TTT',
  'TT.......^###################TTT',
  'TT.......^###################TTT',
  'TTT......^...T.......:.......TTT',
  'TTTT..T............:::...T...TTT',
  'TTTTTA^^^^.........:.........TTT',
  'TTTTTATTTT....::::::.........TTT',
  'TTTTTAAAAA...::..............TTT',
  'TTTTTAAAAA..::.........T.....TTT',
  'TTTTT:uuuu:::.......T........TTT',
  'TTTTT::::::..............T...TTT',
  'TTTTTTT...:..T..............TTTT',
  'TTTTTTT^^^/^^^^^^^^^^^^^^^^^^TTT',
  'TTTTTTT...:........TTTT^^^^^^TTT',
  'TTTTTT....:.........TTT^^^^^^TTT',
  'TTTTT.....:...........~~P~~..TTT',
  'TTTTT.....:..........TT~~~T..TTT',
  'TTTTT.T...:..........T.~~..T.TTT',
  'TTTTTT....::........T..~.....TTT',
  'TTTTTTT....:.........T.~..T..TTT',
  'TTTTTTTTT^^/^^^^^^^^^^^~^^^^^TTT',
  'T^..........:....T.....~.....TTT',
  'T^..........:..........~..T..TTT',
  'T^^.^^^.....:.T........~.....TTT',
  'T^^.^^^^^^^^:^^^^^^^^^^~.....TTT',
  'T^^.^^^^^^TT:TTTT......~.....TTT',
  'T^.....^^^T.:..T......~~....TTTT',
  'T^.....^^^..:.........~.....TTTT',
  'TTT.:::.....:.........~.....TTTT',
  'TTTT...::...:........~~....TTTTT',
  'TTTTT....::.:........~....TTTTTT',
  'TTTTT......:::......~~...TTTTTTT',
  'TTTTT........:......~...TTTTTTTT',
  'TTTTT........:......~...TTTTTTTT',
  'TTTTT........:......~~..TTTTTTTT',
  'TTTTTT.......:.......~..TTTTTTTT',
  'TTTTTTT......:.......~.TTTTTTTTT',
  'TTTTTTTT.....:......~~.TTTTTTTTT',
  'TTTTTTTT.....:......~..TTTTTTTTT',
  'TTTTTTTTT....::....~~..TTTTTTTTT',
  'TTTTTTTTT.....:...~~..TTTTTTTTTT',
  'TTTTTTTTTT....:..~~...TTTTTTTTTT',
  '~~~~~~~~~~~~~~H~~~TTTTTTTTTTTTTT',
  'TTTTTTTTTTT...:.....TTTTTTTTTTTT',
  'TTTTTTTTTT....:.....TTTTTTTTTTTT',
  'TTTTTTTTTT....:.....TTTTTTTTTTTT',
  'TTTTTTTTTTTT..:..TTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTT.:.TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTT:TTTTTTTTTTTTTTTTT',
];
const ESTRADA_START = { x: 14, y: 58, dir: 0 };
const ESTRADA_LAMPS = [[14, 46], [8, 43], [13, 41], [11, 39]];
const ESTRADA_FIELD = () => [
  ...ESTRADA_LAMPS.map(([x, y], i) => ({ id: 'lamp' + (i + 1), kind: 'lamp', x, y })),
  { id: 'seta', kind: 'sign', x: 16, y: 55, look: 'Uma seta riscada na pedra aponta para o norte.' },
  { id: 'pinheiro', kind: 'log', x: 12, y: 34, puzzle: 'pinheiro' },
  { id: 'tronco1', kind: 'log', x: 3, y: 32, puzzle: 'atalho' }, { id: 'tronco2', kind: 'log', x: 4, y: 33, puzzle: 'atalho' },
  { id: 'pedra', kind: 'rock', x: 3, y: 35, puzzle: 'atalho' },
  { id: 'cascata1', kind: 'falls', x: 23, y: 25 }, { id: 'gruta', kind: 'cave', x: 24, y: 25 }, { id: 'cascata2', kind: 'falls', x: 25, y: 25 },
  { id: 'marco', kind: 'rune', x: 7, y: 26 },
  { id: 'fogueira', kind: 'fire', x: 16, y: 26, use: () => campRest() },
  { id: 'viga1', kind: 'beam', x: 20, y: 12 }, { id: 'viga2', kind: 'beam', x: 20, y: 13 },
  { id: 'corda1', kind: 'rope', x: 21, y: 12 }, { id: 'corda2', kind: 'rope', x: 21, y: 13 },
  { id: 'bauToca', kind: 'chest', x: 3, y: 11 },
];
// The grey cloak shows at the edge of the light at two fixed spots and is gone before the light reaches it:
// past the second lamp of the road, and at the tip of the lookout
const SILHOUETTES = [
  { flag: 'silhueta1', x: 5, y: 41, lines: [[null, 'No limite da luz do lampião, uma silhueta de capa cinza. Quando a luz chega lá, não há ninguém.'],
    ['andilla', 'Alguém está andando no mesmo passo que a gente.'], ['aldo', 'Fiquem perto da luz.']] },
  { flag: 'silhueta2', x: 29, y: 1, lines: [[null, 'De novo a capa cinza, mais longe. Some entre os pinheiros.'], ['lyra', 'Duas vezes. Eu estou contando.']] },
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
// Wolves and crows of the road and the pasture: on the map, they come after the party once they see it
const ROAD_FOES = {
  wolf: { foe: 'wolf', ids: ['loboGeada'], intro: 'Um Lobo da Geada salta dos pinheiros!' },
  wolf2: { foe: 'wolf', ids: ['loboGeada', 'loboGeada'], intro: 'Dois Lobos da Geada cercam o grupo!' },
  crow: { foe: 'crow', ids: ['corvo', 'corvo'], intro: 'Corvos mergulham do escuro!', perch: true },
};
const roamer = (kind, x, y) => ({ ...ROAD_FOES[kind], x, y });
const ESTRADA_ROAMERS = () => [roamer('wolf', 18, 39), roamer('wolf', 16, 43), roamer('wolf2', 7, 47), roamer('wolf', 20, 33),
  roamer('wolf2', 17, 19), roamer('wolf2', 6, 11), roamer('wolf', 6, 13), roamer('crow', 21, 4)];

// A lit campfire: rest, heal and save (the travellers' cairn)
async function campRest() {
  for (const m of G.party) { fullRestore(m); UI.cardGlow(m); }
  UI.updateParty(); Sfx.holy();
  await UI.say('Todos foram restaurados.' + (saveGame() ? '\nJogo salvo.' : ''));
}
// Gear found on the way: kept in the bag and worn when it beats what the hero has
async function giveGear(id) {
  const owned = typeof HeroView !== 'undefined' ? HeroView.owned() : (G.gear || []);
  const delta = equipDelta(id, owned, EQUIPS, G.equip || {});
  G.gear = [...(G.gear || []), id];
  Sfx.chest();
  await UI.say(wearGear(id, delta));
}

LOOKS.dorival = { skin: '#d8a478', hair: '#a2a2ac', body: '#2c3c80', legs: '#55555e', hairStyle: 'short', beard: 'full', hat: 'cap', hatCol: '#55555e', belt: '#3a2010' };
const DORIVAL_HOUSE = { id: 'dorival', style: 'joaquim', x: 9, y: 44, w: 3, h: 2 };
DORIVAL_HOUSE.door = { x: 10, y: 45 };
const DORIVAL = { id: 'dorival', name: 'Seu Dorival', x: 11, y: 46, dir: 3, wander: 0, lines: { start: ['A estrada voltou a ter luz.'] } };
const lampsLit = () => ESTRADA_LAMPS.filter((_, i) => G.field && G.field['area:estrada'] && G.field['area:estrada'].s['lamp' + (i + 1)]).length;
async function dorivalDoor() {
  if (c1('dorivalPena')) return play([['Seu Dorival', 'A estrada voltou a ter luz.']]);
  await play([[null, 'A porta está trancada. Na janela, a luz fraca de uma vela.'],
    ['Seu Dorival', 'Desde que a capa cinza passou, os lobos rondam a estrada e eu não saio mais.'],
    ['Seu Dorival', 'Acende quem tiver coragem. O fogo eles respeitam.']]);
}
async function dorivalReward() {
  c1set('dorivalPena');
  Sfx.select();
  await play([[null, 'A porta da casa se abre.']]);
  TOWN.npcs.push(spawnNpc(DORIVAL));
  await play([['Seu Dorival', 'A estrada voltou a ter luz. Tomem, para o caminho.']]);
  G.inv.pena = (G.inv.pena || 0) + 1; Sfx.chest();
  await UI.say('O Seu Dorival entrega 1 Pena Vital ao grupo.');
  saveGame();
}

// The ravine: Andilla walks the narrow log, ties the rope bridge on the far side and comes back over it
const ROPE_TILES = [[21, 12], [21, 13]];
async function crossBeam() {
  const a = heroActor('andilla');
  if (a && a !== TOWN.p) {
    for (const [x, y] of [[20, 13], [20, 12], [20, 11], [21, 11]]) { a.dir = y < a.y ? 0 : x > a.x ? 1 : a.dir; moveActor(a, x, y, 260); await wait(270); }
  }
  await play([[null, 'A Andilla prende a ponte do outro lado.']]);
  const st = fieldNow();
  for (const o of TOWN.objs) if (o.kind === 'beam' || o.kind === 'rope') { o.done = true; st.s[o.id] = 1; }
  setTiles(ROPE_TILES, TILE.BRIDGE);
  Sfx.chest();
  if (a && a !== TOWN.p) {
    for (const [x, y] of [[21, 12], [21, 13], [21, 14], [TOWN.p.x - 1 >= 0 ? TOWN.p.x : 20, TOWN.p.y + 1]]) { a.dir = 2; moveActor(a, x, y, 220); await wait(230); }
  }
  c1set('ponte');
}

async function estradaField(o, verb) {
  if (o.kind === 'lamp' && lampsLit() >= ESTRADA_LAMPS.length && !c1('dorivalPena')) return dorivalReward();
  if (o.id === 'pedra' || (o.def && o.def.puzzle === 'atalho')) {
    if (fieldNow().solved.atalho && !c1('atalho')) { c1set('atalho'); await UI.say('A pedra rola fenda abaixo. O caminho de volta está aberto.'); }
    return;
  }
  if (o.kind === 'rune') {
    return play([[null, 'Letras gastas aparecem na luz do Teo: Até aqui.'],
      ['teo', 'Os antigos empilhavam pedras onde foram ajudados. Cada um põe a sua.'],
      ['andilla', 'Eu ponho a minha. Não custa nada.'],
      ['lyra', () => `Para quem não é de lugar nenhum, você pôs bem no meio.`, 'alegre'],
      ['andilla', 'Lugar bom é lugar bom.']]);
  }
  if (o.kind === 'fire') { await UI.say('A fogueira pega. O grupo descansa perto do fogo.'); return campRest(); }
  if (o.kind === 'beam') return crossBeam();
  if (o.id === 'bauToca') { G.inv.eter = (G.inv.eter || 0) + 1; Sfx.chest(); return UI.say('O grupo encontrou: Éter.'); }
}

// The lookout: the mist opens and the camera rises over the valley
async function mirante() {
  c1set('mirante');
  await panVista('north');
  await play([[null, 'A névoa abre. Lá embaixo, o rio do Vau brilha entre as luzes de um povoado. Ao norte, uma mancha escura cobre o horizonte.'],
    ['teo', 'Daqui dá para ver o caminho inteiro até a floresta.'], ['aldo', 'E dá para ver a gente daqui também.']]);
  await vistaBack();
}
// The first stretch, right after the farewell: Valmor down below
async function estradaStart() {
  await panVista('south');
  await play([[null, 'Lá embaixo, Valmor acende as janelas. A fumaça das chaminés sobe reta no frio.']]);
  await vistaBack();
  await play([['andilla', 'Última chance de voltar para a sopa da Berta.'], ['aldo', 'A sopa espera.']]);
}

AREAS.estrada = makeArea('Estrada do Sul', 'ESTRADA', 32, 60, planGrid(ESTRADA_PLAN), [DORIVAL_HOUSE], TILE.TREE);
Object.assign(AREAS.estrada, {
  poi: 'valmor', winter: true, trees: 'pine', river: true, vision: { radius: 5, chase: 4 }, dimCol: '10,24,56', dim: () => 0.3, battle: 'estrada',
  music: () => 'cemetery', mapv: 2, start: ESTRADA_START,
  field: ESTRADA_FIELD, roamers: ESTRADA_ROAMERS,
  puzzles: { pinheiro: () => true, atalho: objs => objs.find(o => o.id === 'pedra').y >= 37 },
  freezable: (x, y) => y === 26 && (x === 22 || x === 23), // the brook below the frozen waterfall
  onField: estradaField,
  vista: { south: (c, w, h) => TownArt.vista(c, w, h, 'valmor'), north: (c, w, h) => TownArt.vista(c, w, h, 'vale') },
  cast: () => [{ id: 'viajante', name: 'Viajante', x: 14, y: 44, dir: 3, wander: 0, lines: { start: [
    'No Vau do Corvo alugam cavalos. A pé, Erukh fica a um mês.', 'E não andem depois que escurece. Os lobos estão com fome este ano.'] } },
  ...(c1('dorivalPena') ? [DORIVAL] : [])],
  exits: [{ x: 15, y: 0, to: 'vau', pos: { x: 11, y: 18, dir: 0 } },
    { x: 24, y: 25, to: 'gruta', pos: { x: 3, y: 4, dir: 0 } },
    { x: 14, y: 59, check: () => 'Valmor fica para trás. A carta segue para o norte.' }],
  reserved: (x, y) => (y === 0 && x === 15) || (x === 24 && y <= 26 && y >= 25),
  goal: () => ({ x: 15, y: 0 }),
  look(x, y) {
    const t = TOWN.tileAt(x, y);
    if (t === TILE.SNOWPILE) return () => UI.say('A neve da avalanche fecha a estrada velha.');
    if (t === TILE.CHASM && !c1('ponte')) return () => UI.say('A ponte de cordas está solta do lado de lá. Um tronco estreito atravessa o vão.');
    return null;
  },
  onStep(x, y) {
    const s = silhouetteNear(G.seen, { x, y });
    if (s) return () => silhouetteScene(s);
    if (TOWN.tileAt(x, y) === TILE.RUTS && !c1('sulcos')) return async () => {
      c1set('sulcos');
      await play([['andilla', 'Carroça pesada. Passou faz poucos dias, antes da neve cair.'], ['aldo', 'Por aqui ninguém passa agora.']]);
    };
    if (x >= 19 && x <= 22 && y >= 25 && y <= 28 && !c1('cascata')) return async () => {
      c1set('cascata');
      await UI.say('O riacho desce numa cascata congelada que brilha mesmo no escuro.');
    };
    if (y <= 6 && !c1('mirante')) return mirante;
    return null;
  },
});
AREAS.estrada.enterBuilding = b => (b.id === 'dorival' ? dorivalDoor() : null);

// The small grotto behind the frozen waterfall: a chest held in a block of ice
const GRUTA_PLAN = ['^^^^^^^^', '^......^', '^......^', '^......^', '^......^', '^^^:^^^^'];
AREAS.gruta = makeArea('Gruta da Cascata', 'GRUTA', 8, 6, planGrid(GRUTA_PLAN), [], TILE.CLIFF);
Object.assign(AREAS.gruta, {
  poi: 'valmor', winter: true, dimCol: '10,24,56', dim: () => 0.38, battle: 'estrada', music: () => 'cemetery',
  field: () => [{ id: 'bauGruta', kind: 'chest', x: 4, y: 2, open: true }, { id: 'gelo', kind: 'iceBlock', x: 4, y: 2 }],
  exits: [{ x: 3, y: 5, to: 'estrada', pos: { x: 24, y: 26, dir: 2 } }],
  async onField(o) {
    if (o.kind !== 'iceBlock' || c1('gibaoPele')) return;
    c1set('gibaoPele');
    await UI.say('O gelo escorre e solta um baú.');
    await giveGear('gibaoPele');
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
    await UI.say('Objetivo: trazer os quatro cavalos do pasto, a leste do Vau.\nCada um está preso de um jeito. Os lobos espantam os cavalos: evitem lutar perto deles.');
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
    { x: 23, y: 10, to: 'pasto', pos: { x: 1, y: 12, dir: 1 }, check: () => c1('gervasio') ? null : 'Uma cerca e um pasto coberto de névoa. Melhor falar antes com o dono do haras.' },
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
      for (const m of G.party) { fullRestore(m); UI.cardGlow(m); }
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
// Four horses, each held a different way (docs/planos/exploracao-estrada-pasto.md): the brown one shut in the corral
// behind two fallen posts, the white one on an island of the frozen lake, the black one shy in the middle of the field
// (it sees a fan in front of it and turns now and then), the painted one lame at the foot of the bank, behind icicles.
// The wolves walk on the map; a fight close to a horse sends it running.
const PASTO_PLAN = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTIIIIIIIIITTTTTTTTT',
  'TT.......TTTTTIIIIIIIIITTT.....T',
  'TT.nnnnnn.TTTTIIII..IIITT......T',
  'TT.n....n..TTTIIIIIIIIIT....T..T',
  'TT.n....n...TTIIIIIIIIIT.......T',
  'TT.nnn.nn....T.........T...T...T',
  'TT............................TT',
  'TT..........T......T..........TT',
  'TT..........................T.TT',
  'TT...T....................T...TT',
  'T.......T..........T...........T',
  ':..............................T',
  'T....T.........................T',
  'TT.......................T.....T',
  'TT..T..............T...........T',
  'TT...........T.................T',
  'TTT.....T............^^^/^^^^TTT',
  'TTT..................^.......^TT',
  'TTTT....T...T........^.......^TT',
  'TTTT.................^.......^TT',
  'TTTTT......T.........^^^^^^^^^TT',
  'TTTTTTT.........TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
const PASTO_START = { x: 1, y: 12, dir: 1 };
const HORSE_COATS = ['castanho', 'branco', 'preto', 'malhado']; // HORSE_PALS in src/town.js
const HORSE_SPOTS = [[5, 5], [19, 3], [17, 12], [25, 19]];
const GATE_SWING = [[6, 7], [6, 8]]; // the gate opens outwards over these two tiles
// A horse already caught leaves its puzzle solved: an old save finds the gate open and the icicles gone
const PASTO_FIELD = () => {
  const corral = c1('cavalo1'), bank = c1('cavalo4');
  return [
    { id: 'porteira', kind: 'gate', x: 6, y: 6, open: corral, look: 'Mourões caídos estão no caminho da porteira.' },
    ...GATE_SWING.map(([x, y], i) => ({ id: 'mourao' + (i + 1), kind: 'post', x: corral ? x + 1 : x, y, puzzle: 'porteira' })),
    ...[[17, 1], [17, 3], [18, 5]].map(([x, y], i) => ({ id: 'pedra' + (i + 1), kind: 'stone', x, y })),
    { id: 'pingentes', kind: 'icicles', x: 24, y: 17, open: bank, look: 'Pingentes de gelo fecham a descida do barranco.' },
    { id: 'pata', kind: 'hurt', x: 25, y: 19, open: bank },
  ];
};
const PASTO_ROAMERS = () => [roamer('wolf', 15, 10), roamer('wolf', 9, 15), roamer('wolf2', 27, 4), roamer('wolf2', 11, 19), roamer('wolf2', 22, 10)];
const gateClear = objs => objs.filter(o => o.def.puzzle === 'porteira').every(o => !GATE_SWING.some(([x, y]) => o.x === x && o.y === y));

const FLEE_NEAR = 4;
// The horses this close to a fight (Manhattan distance) bolt with the noise; the lame one cannot run
const horsesNear = (p, npcs, d = FLEE_NEAR) => npcs.filter(n => n.def.horse && !n.def.lame && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= d);
// One step away from the threat: the free neighbor farthest from it (stays put when cornered)
function fleeStep(h, from, free) {
  let best = null, bd = Math.hypot(h.x - from.x, h.y - from.y);
  for (const [dx, dy] of TDIRS) {
    const x = h.x + dx, y = h.y + dy, d = Math.hypot(x - from.x, y - from.y);
    if (free(x, y) && d > bd) { bd = d; best = { x, y }; }
  }
  return best;
}
// A horse never runs onto the ice of the lake
const horseFree = (x, y) => TOWN.walkable(x, y) && TOWN.tileAt(x, y) !== TILE.ICE && x > 0 && !npcAt(x, y) && !partyAt(x, y) && !roamerAt(x, y);
async function horseRun(h, from, steps = 3) {
  h.fleeing = true;
  for (let i = 0; i < steps; i++) {
    const s = fleeStep(h, from, horseFree);
    if (!s) break;
    h.dir = s.x > h.x ? 1 : s.x < h.x ? 3 : s.y > h.y ? 2 : 0;
    moveActor(h, s.x, s.y, 160);
    await wait(170);
  }
  h.fleeing = false;
}
// The shy horse: it sees the party in the fan in front of it and runs; from behind or from the side it lets Andilla
// take the rein
const horseSees = h => [TOWN.p, ...TOWN.followers].some(a => inCone(h, h.dir, a));
async function shyRun(h) {
  Sfx.alert();
  await horseRun(h, TOWN.p);
  h.dir = dirTo(h, TOWN.p.x, TOWN.p.y); // it stops and looks back at whoever scared it
  h.turn = rnd(3000, 5000);
  if (!c1('arisco')) { c1set('arisco'); await play([['andilla', 'Assim não. Deixa comigo.']]); }
}
const pataCured = () => { const o = (TOWN.objs || []).find(q => q.id === 'pata'); return !o || o.done; };
const LAME = 'O cavalo manca e não deixa ninguém chegar perto da pata.';
// The lame horse: Teo heals the leg first (the "cura" verb on the hurt object under it), then it comes along
async function lameHorse(h) {
  if (pataCured()) return catchHorse(h);
  const act = fieldAction(h.x, h.y);
  return act ? act() : UI.say(LAME);
}
async function catchHorse(h) {
  c1set('cavalo' + h.def.n);
  TOWN.npcs = TOWN.npcs.filter(n => n !== h);
  if (h.def.shy && inParty('andilla')) await play([['andilla', 'Ninguém me vê chegar. Nem cavalo.', 'alegre']]);
  Sfx.join();
  const n = horsesCaught(G.seen);
  await UI.say(`O cavalo baixa a cabeça e deixa pegar a rédea. Cavalos: ${n} de ${HORSES}.`);
  if (n >= HORSES) { saveGame(); await UI.say('Os quatro cavalos estão com o grupo. Hora de voltar ao Gervásio.'); }
}
async function openGate() {
  const g = TOWN.objs.find(o => o.id === 'porteira');
  if (!g || g.done) return;
  g.done = true; fieldNow().s.porteira = 1;
  Sfx.chest();
  await play([[null, 'A porteira abre para fora. Lá dentro, o cavalo castanho bate o casco no chão.'], ['aldo', 'Calma. É só madeira.']]);
}
const horseDef = i => {
  const [x, y] = HORSE_SPOTS[i], n = i + 1;
  return { id: 'cavalo' + n, n, name: 'Cavalo', horse: HORSE_COATS[i], x, y, dir: n === 3 ? 2 : 3, wander: 0, shy: n === 3, lame: n === 4, onTalk: n === 4 ? lameHorse : catchHorse };
};

AREAS.pasto = makeArea('Pasto do Vau', 'PASTO', 32, 24, planGrid(PASTO_PLAN), [], TILE.TREE);
Object.assign(AREAS.pasto, {
  poi: 'vau', winter: true, fog: true, trees: 'pine', vision: { radius: 5, chase: 4 }, dimCol: '10,24,56', dim: () => 0.25, battle: 'estrada',
  music: () => 'cemetery', mapv: 2, start: PASTO_START,
  field: PASTO_FIELD, roamers: PASTO_ROAMERS, puzzles: { porteira: gateClear },
  cast: () => HORSE_SPOTS.map((_, i) => horseDef(i)).filter(d => !c1('cavalo' + d.n)),
  exits: [{ x: 0, y: 12, to: 'vau', pos: { x: 22, y: 10, dir: 3 } }],
  reserved: (x, y) => x === 0 && y === 12,
  goal() {
    if (horsesCaught(G.seen) >= HORSES) return { x: 0, y: 12 };
    const h = TOWN.npcs.find(n => n.def.horse && visibleAt(n.x, n.y));
    return h ? { x: h.x, y: h.y } : null;
  },
  async onEnter() {
    if (c1('pasto')) return;
    c1set('pasto'); G.busy = true;
    await UI.say('O pasto do Vau, coberto de névoa. Em algum lugar, cavalos relincham. Em outro, lobos.');
  },
  async onField(o) {
    if (o.def && o.def.puzzle === 'porteira' && fieldNow().solved.porteira) return openGate();
    if (o.id === 'pata') { const h = TOWN.npcs.find(n => n.def.lame); if (h) await catchHorse(h); }
  },
  async onSlide() {
    if (c1('lago')) return;
    c1set('lago');
    await play([['andilla', 'Ninguém disse que o pasto tinha pista de patinação.', 'alegre'], ['lyra', 'Se alguém cair, eu não vi.']]);
  },
  // A fight scares the horses close by: they run off through the fog and the party has to find them again
  async afterFight() {
    const near = horsesNear(TOWN.p, TOWN.npcs);
    if (!near.length) return;
    Sfx.alert();
    await UI.say(near.length > 1 ? 'Com o barulho da luta, os cavalos disparam pela névoa.' : 'Com o barulho da luta, um cavalo dispara pela névoa.');
    await Promise.all(near.map(h => horseRun(h, TOWN.p)));
  },
  onStep(x, y) {
    const shy = TOWN.npcs.find(n => n.def.shy && !n.fleeing);
    if (shy && horseSees(shy)) return () => shyRun(shy);
    const h = TOWN.npcs.find(n => n.def.horse && !n.fleeing && Math.abs(n.x - x) + Math.abs(n.y - y) === 1);
    if (!h) return null;
    if (h.def.lame && !pataCured()) return h.warned ? null : () => { h.warned = true; return UI.say(LAME); };
    return () => catchHorse(h);
  },
  // The shy horse turns a quarter now and then; turning onto the party scares it too
  update(dt) {
    const h = TOWN.npcs.find(n => n.def.shy && !n.fleeing);
    if (!h || G.busy || UI.busy()) return;
    if ((h.turn = (h.turn ?? rnd(3000, 5000)) - dt) > 0) return;
    h.turn = rnd(3000, 5000);
    h.dir = (h.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    if (horseSees(h)) townBusy(() => shyRun(h));
  },
  // What the shy horse sees: a faint warm fan on the snow in front of it, in a 2x2 checker so it reads over white
  drawGround(c, camX, camY) {
    const h = TOWN.npcs.find(n => n.def.shy);
    if (!h || !visibleAt(h.x, h.y)) return;
    const fan = coneTiles(h, h.dir).filter(([x, y]) => TOWN.walkable(x, y) && visibleAt(x, y)), inFan = new Set(fan.map(([x, y]) => x + ',' + y));
    for (const [x, y] of fan) { // whole gold dots every 4 px, a gold line where the fan ends (no see-through color)
      const X = x * TS - camX, Y = y * TS - camY;
      c.fillStyle = '#e8b840';
      for (let j = 2; j < TS; j += 4) for (let i = (j >> 2) % 2 ? 0 : 2; i < TS; i += 4) c.fillRect(X + i, Y + j, 1, 1);
      c.fillStyle = '#c89c38';
      if (!inFan.has(x + ',' + (y - 1))) c.fillRect(X, Y, TS, 1);
      if (!inFan.has(x + ',' + (y + 1))) c.fillRect(X, Y + TS - 1, TS, 1);
      if (!inFan.has((x - 1) + ',' + y)) c.fillRect(X, Y, 1, TS);
      if (!inFan.has((x + 1) + ',' + y)) c.fillRect(X + TS - 1, Y, 1, TS);
    }
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
  poi: 'acampamento', winter: true, dusk: true, trees: 'pine', battle: 'estrada', music: () => 'cemetery',
  cast: () => HORSE_COATS.map((coat, i) => ({ id: 'cavaloC' + i, name: 'Cavalo', horse: coat, x: 1 + (i % 2) * 2, y: 5 + (i >> 1), dir: 1, wander: 0 })), // two tiles apart: a horse is wider than its tile
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
