// ===== Estado, exploração e fluxo do jogo =====

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR_NAMES = ['N', 'L', 'S', 'O'];
const dirAngle = d => (d - 1) * Math.PI / 2;
const SAVE_KEY = 'rpg-dungeon-save-v1';

const MAPS = [], TEXCACHE = [];
const getMap = i => MAPS[i] || (MAPS[i] = generateFloor(i));
const getTex = i => TEXCACHE[i] || (TEXCACHE[i] = makeTextures(FLOORS[i].pal, FLOORS[i].seed));
let SPR = null;

const G = {
  mode: 'title', floor: 0, x: 1, y: 1, dir: 1,
  party: [], inv: {}, opened: {}, explored: {}, bossDead: false, gold: 0, quest: 0, town: null, area: 'valmor', key: {}, intro: 1, reached: 0, seen: {}, macros: [null, null], lastRound: null,
  sinceFight: 0, anim: null, busy: false, queue: [], held: new Set(),
  bigMap: false, fade: 0, fadeAnim: null, flash: null, flashColor: '255,255,255', shakeUntil: 0,
};
const cam = { x: 1.5, y: 1.5, a: 0 };

const map = () => getMap(G.floor);
const cellAt = (x, y) => { const m = map(); return (x < 0 || y < 0 || x >= m.size || y >= m.size) ? 1 : m.grid[y * m.size + x]; };
const objKey = o => `${G.floor}:${o.x},${o.y}`;
// Depois do chefe, o lugar dele mostra o túmulo arrombado (continua sólido e dá para examinar)
const objAt = (x, y) => map().objects.find(o => o.x === x && o.y === y);

function exploredArr() {
  const m = map();
  if (!G.explored[G.floor]) G.explored[G.floor] = new Uint8Array(m.size * m.size);
  return G.explored[G.floor];
}
function markExplored() {
  const m = map(), ex = exploredArr(), N = m.size;
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < N && y < N) ex[y * N + x] = 1; };
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(G.x + dx, G.y + dy);
  const [fx, fy] = DIRS[G.dir];
  for (let i = 1; i < 6; i++) {
    const x = G.x + fx * i, y = G.y + fy * i;
    mark(x, y); mark(x + fy, y + fx); mark(x - fy, y - fx);
    if (cellAt(x, y) === 1) break;
  }
}

function loadFloor(i, pos) {
  G.floor = i;
  TEX = getTex(i);
  const m = getMap(i);
  const p = pos || m.start;
  G.x = p.x; G.y = p.y; G.dir = p.dir;
  G.anim = null; G.sinceFight = 0;
  markExplored();
}

function worldSprites(now) {
  return map().objects.map(o => {
    const s = { x: o.x + 0.5, y: o.y + 0.5, type: o.type };
    if (o.type === 'chest') { s.spr = G.opened[objKey(o)] ? SPR.chestOpen : SPR.chest; s.scale = 0.62; }
    if (o.type === 'fountain') { s.spr = SPR.fountain; s.scale = 0.8; s.emit = 0.85; }
    if (o.type === 'boss' && G.bossDead) { s.type = 'tomb'; s.spr = SPR.tomb; s.scale = 0.75; }
    else if (o.type === 'boss') { s.spr = SPR.boss; s.scale = 0.95; s.emit = 0.55; s.lift = 0.04 + Math.sin(now / 500) * 0.03; }
    return s;
  });
}

function exploreHint() {
  if (G.mode === 'town') return townHint();
  if (G.mode !== 'explore') return;
  const f = FLOORS[G.floor];
  placeHint(`${f.short} · ${f.name}`, 'dungeon',
    'Setas andar · Espaço interagir · Esc menu');
}

// Aviso no alto da cena, sem repetir: o nome do lugar só quando muda de lugar, os comandos uma vez por save
// (na vila e na dungeon) e o objetivo só quando muda. O resto fica no Diário (Esc → Diário).
let lastPlace = null, lastGoal = null;
function placeHint(place, kind, help) {
  const lines = [];
  if (place !== lastPlace) lines.push(place);
  if (help && !G.seen['ajuda_' + kind]) { G.seen['ajuda_' + kind] = 1; lines.push(help); }
  const goal = journalGoal();
  if (goal && goal !== lastGoal) { lines.push('Objetivo: ' + goal); lastGoal = goal; }
  lastPlace = place;
  if (!lines.length) return;
  if (lines[0] !== place) lines.unshift(place);
  UI.info(lines.join('\n'));
}

// ---------- Entrada ----------
function normKey(k) { return k.length === 1 ? k.toLowerCase() : k; }
function keyAction(k) {
  switch (k) {
    case 'ArrowUp': case 'w': return 'fwd';
    case 'ArrowDown': case 's': return 'back';
    case 'ArrowLeft': case 'a': return 'left';
    case 'ArrowRight': case 'd': return 'right';
    case 'q': return 'sl';
    case 'e': return 'sr';
  }
  return null;
}
function onKeyDown(e) {
  Sfx.init();
  const k = normKey(e.key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Backspace'].includes(e.key)) e.preventDefault && e.preventDefault();
  if (HeroView.isOpen()) { e.preventDefault && e.preventDefault(); if (!e.repeat) HeroView.key(k); return; }
  if (WorldMap.isOpen()) { e.preventDefault && e.preventDefault(); if (!e.repeat) WorldMap.key(k); return; }
  if (k === 'u' && !e.repeat && canWorldMap()) { openWorldMap(); return; }
  if (k === 'n' && !e.repeat) { const m = Sfx.toggleMute(); flashNote(m ? 'Som: desligado' : 'Som: ligado'); return; }
  if (UI.handleKey(e)) return;
  if (G.mode === 'battle' && k === 'Escape' && !e.repeat && stopMacro()) return;
  if (G.mode === 'town' && !G.busy) {
    if ((k === 'Enter' || k === ' ') && !e.repeat) { G.held.clear(); townAction(k === 'Enter'); return; }
    if (k === 'Escape' && !e.repeat) { G.held.clear(); campMenu(); return; }
    if (!e.repeat && townDir(k) !== null) G.queue.push(k);
  }
  if (G.mode === 'explore' && !G.busy) {
    if ((k === 'm' || k === 'Tab') && !e.repeat) { G.bigMap = !G.bigMap; return; }
    if ((k === 'Enter' || k === ' ') && !e.repeat && G.anim === null) {
      // Espaço interage com o que está à frente (baú, fonte, chefe); Enter também, ou abre o menu
      const [dx, dy] = DIRS[G.dir], obj = objAt(G.x + dx, G.y + dy);
      G.held.clear();
      if (obj) { G.busy = true; interact(obj).finally(() => { G.busy = false; exploreHint(); }); return; }
      if (k === ' ') return;
    }
    if ((k === 'Enter' || k === 'Escape') && !e.repeat) { G.bigMap = false; G.held.clear(); campMenu(); return; }
    if (!e.repeat && keyAction(k)) G.queue.push(k);
  }
  G.held.add(k);
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', e => G.held.delete(normKey(e.key)));
window.addEventListener('blur', () => G.held.clear());

// ---------- Mapa-múndi (src/worldmap.js) ----------
const wmBtn = document.getElementById('wmBtn');
wmBtn.querySelector('img').src = iconUrl('mundo');
const canWorldMap = () => (G.mode === 'town' || G.mode === 'explore') && !G.busy && !UI.busy() && !WorldMap.isOpen();
async function openWorldMap() {
  G.busy = true; G.held.clear(); G.queue.length = 0; G.bigMap = false;
  await WorldMap.show();
  G.busy = false; exploreHint();
}
wmBtn.addEventListener('click', ev => { ev.stopPropagation(); Sfx.init(); if (canWorldMap()) openWorldMap(); });

let noteText = '', noteUntil = 0;
function flashNote(t) { noteText = t; noteUntil = performance.now() + 1200; }

// Controles de toque
document.querySelectorAll('#touch [data-k]').forEach(b => {
  const key = b.dataset.k;
  b.addEventListener('pointerdown', ev => { ev.preventDefault(); onKeyDown({ key, repeat: false }); });
  b.addEventListener('pointerup', () => G.held.delete(normKey(key)));
  b.addEventListener('pointerleave', () => G.held.delete(normKey(key)));
});

// ---------- Movimento ----------
function doAction(act) {
  if (act === 'left' || act === 'right') {
    const s = act === 'right' ? 1 : -1;
    const a0 = dirAngle(G.dir);
    G.anim = { type: 'turn', fromA: a0, toA: a0 + s * Math.PI / 2, t: 0, dur: 170, nd: (G.dir + 4 + s) % 4 };
    return;
  }
  let d = G.dir;
  if (act === 'back') d = (d + 2) % 4; else if (act === 'sl') d = (d + 3) % 4; else if (act === 'sr') d = (d + 1) % 4;
  const [dx, dy] = DIRS[d];
  const nx = G.x + dx, ny = G.y + dy;
  const obj = objAt(nx, ny);
  if (cellAt(nx, ny) === 1 || obj) {
    G.anim = { type: 'bump', dx, dy, t: 0, dur: 200 };
    Sfx.bump();
    if (obj && act === 'fwd' && !G.hintObj) { G.hintObj = 1; flashNote('Espaço para interagir'); }
    return;
  }
  G.anim = { type: 'move', fx: G.x, fy: G.y, tx: nx, ty: ny, t: 0, dur: 210 };
}

const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

function updateExplore(dt) {
  const A = G.anim;
  if (A) {
    A.t += dt;
    const k = Math.min(1, A.t / A.dur), e = ease(k);
    if (A.type === 'move') { cam.x = A.fx + (A.tx - A.fx) * e + 0.5; cam.y = A.fy + (A.ty - A.fy) * e + 0.5; }
    else if (A.type === 'turn') { cam.a = A.fromA + (A.toA - A.fromA) * e; }
    else if (A.type === 'bump') { const b = Math.sin(k * Math.PI) * 0.1; cam.x = G.x + 0.5 + A.dx * b; cam.y = G.y + 0.5 + A.dy * b; }
    if (k >= 1) {
      G.anim = null;
      if (A.type === 'move') { G.x = A.tx; G.y = A.ty; onStep(); }
      if (A.type === 'turn') { G.dir = A.nd; markExplored(); }
    }
  }
  if (!G.anim) { cam.x = G.x + 0.5; cam.y = G.y + 0.5; cam.a = dirAngle(G.dir); }
  if (!G.anim && !G.busy && G.mode === 'explore' && !UI.busy()) {
    let act = null;
    while (G.queue.length && !act) act = keyAction(G.queue.shift());
    if (!act) for (const k of G.held) { act = keyAction(k); if (act) break; }
    if (act) doAction(act);
  }
}

async function onStep() {
  markExplored();
  Sfx.step();
  if (G.floor === 0 && G.x === map().start.x && G.y === map().start.y) {
    G.busy = true; G.held.clear(); G.queue.length = 0;
    const ok = await UI.choose([{ label: 'Subir', value: true }, { label: 'Ficar', value: false }],
      { title: 'Uma escada sobe para a luz do dia. Voltar para a vila?', cancel: true });
    if (ok) await leaveDungeon();
    G.busy = false; exploreHint();
    return;
  }
  if (cellAt(G.x, G.y) === 2) {
    G.busy = true; G.held.clear(); G.queue.length = 0;
    const ok = await UI.choose([{ label: 'Descer', value: true }, { label: 'Ficar', value: false }],
      { title: 'Uma escadaria desce para a escuridão...', cancel: true });
    if (ok) await descend();
    G.busy = false; exploreHint();
    return;
  }
  G.sinceFight++;
  const chance = G.sinceFight < 5 ? 0 : Math.min(0.22, 0.05 + (G.sinceFight - 5) * 0.012);
  if (Math.random() < chance) {
    G.sinceFight = 0; G.busy = true; G.held.clear(); G.queue.length = 0;
    const f = FLOORS[G.floor];
    let n = 1 + Math.floor(Math.random() * f.maxGroup);
    if (f.maxGroup >= 3 && n === 1 && Math.random() < 0.5) n = 2;
    const ids = Array.from({ length: n }, () => pick(f.enemies));
    await runBattle(ids, false);
    G.busy = false; exploreHint();
  }
}

async function runBattle(ids, isBoss, opts) {
  const r = await startBattle(ids, isBoss, opts);
  if (r === 'lose') { await gameOver(); return r; }
  G.mode = 'explore';
  if (isBoss && r === 'win') { await ending(); return r; }
  Music.play('explore');
  return r;
}

// ---------- Interações ----------
async function interact(o) {
  if (o.type === 'chest') {
    const key = objKey(o);
    if (G.opened[key]) { await UI.say('O baú está vazio.'); return; }
    const eq0 = EQUIPS[o.loot];
    if (eq0 && !inParty(eq0.who)) { await UI.say(`Um equipamento que só ${heroName(eq0.who)} saberia usar.`); return; }
    if (!G.seen.bau1 && inParty('andilla')) { G.seen.bau1 = 1; await say2(heroName('andilla'), 'Tranca velha. Dois ganchos e... pronto.'); }
    G.opened[key] = true; Sfx.chest();
    if (ITEMS[o.loot]) {
      G.inv[o.loot] = (G.inv[o.loot] || 0) + 1;
      await UI.say(`Vocês abrem o baú...\nEncontraram: ${ITEMS[o.loot].name}!`);
    } else {
      const eq = EQUIPS[o.loot];
      const m = G.party.find(p => p.id === eq.who);
      for (const [k, v] of Object.entries(eq.bonus)) m.bonus[k] = (m.bonus[k] || 0) + v;
      UI.updateParty(); UI.cardGlow(m);
      const b = Object.entries(eq.bonus).map(([k, v]) => `${STAT_NAMES[k]} +${v}`).join(', ');
      await UI.say(`Vocês abrem o baú...\nEncontraram: ${eq.name}!\n${pdef(m).name} equipa (${b}).`);
    }
  } else if (o.type === 'fountain') {
    if (!G.seen.lapide) { G.seen.lapide = 1; await clue(FLOOR_CLUES[1]); await partyTalk('lapide', TALKS.lapide); }
    if (!G.seen.bilhete) {
      G.seen.bilhete = 1;
      await say2(null, 'Junto à fonte, um capuz cinza rasgado. Dentro dele, um bilhete.');
      await say2('Bilhete', '"O selo cede. Mais três noites. O homem do sumo sacerdote não pode sair de Valmor. V."');
      await partyTalk('bilhete', TALKS.bilhete);
    }
    Sfx.holy();
    G.flashColor = '160,230,255'; G.flash = { t0: performance.now(), dur: 700 };
    for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); UI.cardGlow(m); }
    UI.updateParty();
    const saved = saveGame();
    await UI.say('Uma fonte de água cristalina brilha na escuridão.\nO grupo foi totalmente restaurado!' + (saved ? '\nJogo salvo.' : ''));
    if (!G.seen.fonteLyra && inParty('lyra')) { G.seen.fonteLyra = 1; await say2('Lyra', 'É verdade, então. A água lembra de quem passa. Dá para sentir.'); }
  } else if (o.type === 'boss' && G.bossDead) {
    await UI.say('O túmulo do rei, arrombado e vazio. Sob os quatro símbolos dos paladinos, os nichos continuam vazios.');
  } else if (o.type === 'boss') {
    if (!G.seen.altar) { G.seen.altar = 1; await clue(FLOOR_CLUES[2]); await partyTalk('altar', TALKS.altar); }
    if (!G.seen.sino) { G.seen.sino = 1; Sfx.bell(); await UI.say('Um sino toca, aqui embaixo. Perto. Devagar.'); await partyTalk('sino', TALKS.sino); }
    const ok = await UI.choose([{ label: 'Enfrentar', value: true }, { label: 'Recuar', value: false }],
      { title: 'Diante da última porta, um morto de batina segura um sino de bronze.\nEnfrentar o Sineiro?', cancel: true });
    if (ok) await runBattle(['sineiro'], true, { hints: [
      'Só atacar não basta. Teo cura os feridos com Magia; não espere alguém cair.',
      'Lyra queima com Fogo, e a Luz Sagrada de Teo fere em dobro os mortos-vivos.',
      'Se alguém cair, a Pena Vital traz de volta. Poções estão em Item.',
    ] });
  }
}

function fadeTo(to, dur) {
  return new Promise(res => { G.fadeAnim = { from: G.fade, to, t0: performance.now(), dur, res }; });
}

async function enterDungeon() {
  Sfx.stairs();
  await fadeTo(1, 700);
  G.mode = 'explore';
  loadFloor(0);
  G.reached = Math.max(G.reached || 0, 1);
  cam.x = G.x + 0.5; cam.y = G.y + 0.5; cam.a = dirAngle(G.dir);
  Music.play('explore');
  await fadeTo(0, 700);
  await UI.say(`${FLOORS[0].short} · ${FLOORS[0].name}\nPara voltar à vila, retornem a esta escada.`);
  await floorClues(0);
  saveGame();
  G.busy = false; exploreHint();
}

async function leaveDungeon() {
  Sfx.stairs();
  await fadeTo(1, 700);
  enterTown(CRYPT_FRONT);
  await fadeTo(0, 700);
}

async function descend() {
  Sfx.stairs();
  await fadeTo(1, 700);
  loadFloor(G.floor + 1);
  G.reached = Math.max(G.reached || 0, G.floor + 1);
  cam.x = G.x + 0.5; cam.y = G.y + 0.5; cam.a = dirAngle(G.dir);
  await fadeTo(0, 700);
  const f = FLOORS[G.floor];
  await UI.say(`${f.short} · ${f.name}` + (f.boss ? '\nUm sino toca, em algum lugar lá embaixo.' : ''));
  await floorClues(G.floor);
}

// Pistas da história ao chegar a cada andar (aparecem uma vez só)
const say2 = (who, t) => UI.say(who ? `${who}:\n${t}` : t);
// The clue comes first; the party talk follows it (never in its place)
// [0] ao entrar na cripta (olho) · [1] na fonte (lápide) · [2] diante do altar
const FLOOR_CLUES = [
  [[null, 'Na parede, ao pé da escada, pintado de vermelho: um olho cortado ao meio.']],
  [[null, 'Uma lápide antiga, rachada ao meio. As letras ainda se leem:'], ['Lápide', '"Aqui foi selado Morvath, o rei que traiu a luz. Que nenhuma mão abra o que a luz fechou."']],
  [[null, 'Num altar, alguém riscou o nome de Elun. Por cima, em letra nova: "O rei voltará."']],
];
const FLOOR_TALKS = ['olho'];
// Conversas do grupo (docs/mundo/historias/capitulo1.md)
const TALKS = {
  olho: [['andilla', 'Tinta fresca. Faz menos de uma semana.'], ['aldo', 'Eles já estiveram aqui embaixo.', 'preocupado'], ['lyra', 'Então não vieram a Valmor só pela carta.']],
  lapide: [['teo', 'Morvath. O rei que o ancião não quis nomear.'], ['andilla', 'Rei enterrado com a coroa, e a gente aqui de mão vazia.', 'alegre'],
    ['teo', () => `${heroName('andilla')}.`, 'bravo'], ['andilla', 'Brincadeira. Quase toda.', 'alegre']],
  bilhete: [['lyra', '"O homem do sumo sacerdote." Quem seria?'], ['aldo', 'O homem que caiu na taverna carregava um selo real. Não é qualquer mensageiro.'],
    ['teo', 'O mensageiro. Se ele estava aqui embaixo, foi aqui que o feriram.'], ['lyra', 'E V. queria que ele não saísse de Valmor. Quase conseguiu.', 'preocupado']],
  altar: [['teo', 'Riscaram o nome de Elun. Não basta abrir um túmulo; precisavam apagar a luz.', 'bravo'], ['aldo', '"O rei voltará." Então é para ele que eles rezam.']],
  igreja: [['lyra', 'Construíram uma igreja em cima de um túmulo. Ou queriam rezar pelo morto, ou queriam que ele não saísse.'],
    ['teo', 'Uma casa de oração vazia. Ninguém reza aqui faz cinquenta anos.'], ['andilla', 'Porta caída, telhado aberto. Pelo menos não vou precisar dos ganchos.', 'alegre']],
  sino: [['andilla', 'Sino tocando numa igreja sem ninguém. Que ótimo.', 'preocupado'], ['aldo', 'Fiquem atrás de mim.', 'bravo'], ['lyra', 'Fica você atrás de mim. Eu tenho o fogo.', 'alegre']],
  tumulo: [['lyra', 'Arrombaram a tampa. E arrastaram alguma coisa para fora.', 'preocupado'], ['teo', 'Esses quatro símbolos são de paladinos. E embaixo de cada um havia alguma coisa.'],
    ['andilla', 'E alguém levou. Não fui eu, antes que alguém olhe para mim.', 'preocupado'], ['aldo', 'Chegamos tarde.', 'bravo'],
    ['lyra', () => `${heroName('aldo')} ficou quieto. Quando ${heroName('aldo')} fica quieto assim, é raiva.`, 'preocupado'],
    ['lyra', 'Você está inteiro? Ótimo. A professora não gosta de remendo.', 'alegre']],
  estrada: [['aldo', 'Fui contratado para olhar umas covas. E agora vou para a capital.'],
    ['aldo', 'Se alguém tirou um rei daquele buraco, ele não vai ficar longe de Valmor. Eu vou.'],
    ['lyra', () => `${heroName('aldo')} diz que vai pela carta. ${heroName('aldo')} vai por uma certa professora.`, 'alegre'],
    ['aldo', () => `${heroName('lyra')}.`, 'bravo'], ['lyra', porqueRoad], // a resposta das apresentações (G.seen.porque)
    ['teo', 'Até a rainha, ninguém toca nela.'], ['lyra', 'Dizem que Erukh tem fontes em todas as praças. Quero ver se alguma lembra.'],
    ['andilla', 'E é a cidade mais rica do oeste. Eu vou junto. Pela carta, claro.', 'alegre']],
};
const clue = async lines => { for (const [who, t] of lines) await say2(who, t); };
async function floorClues(f) {
  if (G.seen['andar' + f] || !FLOOR_CLUES[f]) return;
  G.seen['andar' + f] = 1;
  await clue(FLOOR_CLUES[f]);
  if (FLOOR_TALKS[f]) await partyTalk(FLOOR_TALKS[f], TALKS[FLOOR_TALKS[f]]);
}

// ---------- Menu de acampamento ----------
async function campMenu() {
  G.busy = true;
  for (;;) {
    const m = campMenuOpts({ gold: G.gold, inTown: G.mode === 'town', bagCount: itemOptions().length + Object.keys(KEY_ITEMS).filter(k => G.key[k]).length });
    const v = await UI.choose(m.opts, { title: m.title, cancel: true, cols: 3 });
    if (v === 'diary') await showDiary();
    if (v === 'world') await WorldMap.show();
    if (v === null) break;
    if (v === 'quit') {
      const ok = await UI.choose([{ label: 'Sim, sair', value: true }, { label: 'Não', value: false }],
        { title: 'Voltar à tela inicial? O que não foi salvo se perde.', cancel: true, cols: 2, start: false });
      if (ok) { G.bigMap = false; G.held.clear(); return titleScreen(); }
      continue;
    }
    if (v === 'map') { G.bigMap = true; await UI.say('Mapa do andar (M alterna durante a exploração).'); G.bigMap = false; }
    if (v === 'save') { await UI.say(saveGame() ? 'Jogo salvo.' : 'Não foi possível salvar neste navegador.'); }
    if (v === 'status') await HeroView.show();
    if (v === 'macros') await campMacros();
    if (v === 'item') {
      const keys = Object.keys(KEY_ITEMS).filter(k => G.key[k]).map(k => ({ label: G.key.lida || !KEY_ITEMS[k].sealedName ? KEY_ITEMS[k].name : KEY_ITEMS[k].sealedName, hint: KEY_ITEMS[k].desc, value: 'key:' + k }));
      const opts = [...itemOptions(), ...keys];
      if (!opts.length) { await UI.say('A bolsa está vazia.'); continue; }
      const it = await UI.choose(opts, { title: 'Usar qual item?', cancel: true });
      if (it == null) continue;
      if (it === 'key:carta') { await readLetter(false); continue; }
      if (String(it).startsWith('key:')) { const k = KEY_ITEMS[it.slice(4)]; for (const t of k.text) await UI.say(`${k.name}:\n${t}`); continue; }
      const t = ITEMS[it].target === 'allAllies' ? 'all' : await pickAlly(ITEMS[it].target, `${ITEMS[it].name} em quem?`);
      if (t == null) continue;
      await UI.say(applyItem(it, t));
    }
    if (v === 'magic') {
      const casters = G.party.filter(m => m.hp > 0 && knownSpells(m).some(s => SPELLS[s].field));
      if (!casters.length) { await UI.say('Ninguém pode usar magia agora.'); continue; }
      const cm = casters.length === 1 ? casters[0] : await UI.choose(casters.map(m => ({ label: pdef(m).name, value: m })), { title: 'Quem vai conjurar?', cancel: true, cols: 3 });
      if (cm == null) continue;
      const sp = await UI.choose(knownSpells(cm).filter(s => SPELLS[s].field).map(s => ({ label: SPELLS[s].name, hint: SPELLS[s].mp + 'PM', value: s, disabled: cm.mp < SPELLS[s].mp })),
        { title: `Magias de ${pdef(cm).name} (PM ${cm.mp})`, cancel: true });
      if (sp == null) continue;
      const t = SPELLS[sp].target === 'allAllies' ? 'all' : await pickAlly(SPELLS[sp].target, `${SPELLS[sp].name} em quem?`);
      if (t == null) continue;
      cm.mp -= SPELLS[sp].mp; UI.updateParty();
      await UI.say(castSupport(cm, sp, t));
    }
  }
  G.busy = false; exploreHint();
}

// ---------- Salvar / carregar ----------
function saveGame() {
  try {
    const explored = {};
    for (const [k, v] of Object.entries(G.explored)) explored[k] = Array.from(v);
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 2, floor: G.floor, x: G.x, y: G.y, dir: G.dir, party: G.party.map(({ id, lv, xp, hp, mp, bonus }) => ({ id, lv, xp, hp, mp, bonus })),
      inv: G.inv, opened: G.opened, explored, bossDead: G.bossDead,
      place: G.mode === 'town' ? 'town' : 'dungeon', town: G.mode === 'town' ? { x: TOWN.p.x, y: TOWN.p.y, dir: TOWN.p.dir } : G.town,
      area: G.mode === 'town' ? G.area : 'valmor', gold: G.gold, quest: G.quest, key: G.key, intro: G.intro, reached: G.reached, seen: G.seen, macros: G.macros,
    }));
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return false;
    G.party = s.party; G.inv = s.inv; G.opened = s.opened; G.bossDead = s.bossDead;
    G.gold = s.gold || 0; G.quest = s.quest ?? 1; // saves antigos já estavam na dungeon
    G.key = s.key || { carta: true }; G.intro = s.intro ?? 1;
    G.seen = s.seen || {};
    G.macros = normalizeMacros(s.macros); G.lastRound = null; // saves without tactics get two empty slots
    G.reached = s.reached ?? (s.place === 'town' ? Object.keys(s.explored || {}).length : s.floor + 1);
    G.explored = {};
    for (const [k, v] of Object.entries(s.explored || {})) G.explored[k] = Uint8Array.from(v);
    // saves da versão de 3 andares: quem estava no B2/B3 volta ao começo da cripta
    if (s.floor >= FLOORS.length) loadFloor(0); else loadFloor(s.floor, { x: s.x, y: s.y, dir: s.dir });
    // saves da versão 1 (Aldo, Lyra e Teo): a ladina entra no grupo
    if (!s.v && !inParty('andilla')) {
      recruit('andilla');
      Object.assign(G.seen, { job: 1, cem1: 1, cem2: 1, cem3: 1, teoWin: 1, estojo: 1, cemEntrou: 1, migrou: 0 });
      if (G.quest) G.seen.hugo4 = 1; // o Hugo já tinha liberado a cripta
    }
    UI.buildParty();
    if (s.place === 'town') {
      enterTown(s.town || CRYPT_FRONT, s.area || 'valmor');
      // saves antigos podem apontar para um lugar que hoje é parede (ex.: onde a taverna foi construída)
      if (!TOWN.walkable(TOWN.p.x, TOWN.p.y)) enterTown(CRYPT_FRONT, 'valmor');
    }
    else { G.mode = 'explore'; G.town = s.town || CRYPT_FRONT; Music.play('explore'); }
    return true;
  } catch (e) { console.error('Falha ao carregar o save:', e); G.loadFailed = true; return false; }
}

// ---------- Diário de missões ----------
// The scene shows only the three essential commands; the full list lives here
const CONTROLS_PAGE = 'Diário · controles\nSetas ou WASD andar · Q/E passo lateral · Espaço interagir · Esc menu\n' +
  'M ou Tab mapa da cripta · U mapa de Eterra · F tela cheia · N som\nNa cripta, o ponto verde do mapa leva de volta à vila.';
function diaryPages() {
  const notes = JOURNAL.notes.filter(n => n.show()).map(n => '· ' + n.text);
  const pages = [`Diário · ${JOURNAL.title()}\nObjetivo: ${JOURNAL.goal()}`];
  for (let k = 0; k < notes.length; k += 3) pages.push(`Diário · anotações\n` + notes.slice(k, k + 3).join('\n'));
  const tips = TIPS.filter(t => t.show()).map(t => '· ' + t.text);
  if (tips.length) pages.push('Diário · dicas\n' + tips.join('\n'));
  pages.push(CONTROLS_PAGE);
  return pages;
}
// Camp menu: see both tactics and erase one
async function campMacros() {
  for (;;) {
    G.macros = normalizeMacros(G.macros);
    const opts = G.macros.map((mc, i) => ({ label: macroName(i), value: i, icons: macroIcons(mc, G.party.map(m => m.id), SPELLS), hint: mc ? '' : 'vazia', disabled: !mc }));
    const slot = await UI.choose(opts, { title: 'Táticas · escolha uma para apagar', cancel: true, cols: 1 });
    if (slot == null) return;
    const ok = await UI.choose([{ label: 'Sim, apagar', value: true }, { label: 'Não', value: false }],
      { title: `Apagar ${macroName(slot)}?`, cancel: true, cols: 2, start: false });
    if (ok) { G.macros[slot] = null; await UI.say(`${macroName(slot)} apagada.`); }
  }
}
async function showDiary() {
  const pages = diaryPages();
  if (!pages.length) { await UI.say('O diário ainda está em branco.'); return; }
  for (const p of pages) await UI.say(p);
}

// ---------- Telas ----------
// Emblema do título: a Estrela de Eterra (desenho original, 15×15)
const EMBLEM = ['.......a.......', '.......a.......', '......cac......', '...a..cbc..a...', '....a.cbc.a....', '.....acbca.....',
  '..ccccbgbcccc..', 'aaabbbgwgbbbaaa', '..ccccbgbcccc..', '.....acbca.....', '....a.cbc.a....', '...a..cbc..a...',
  '......cac......', '.......a.......', '.......a.......'];
const EMBLEM_COL = { a: '#ffd96a', b: '#fff6d8', c: '#b4601a', g: '#8fe0ff', w: '#ffffff' };
function emblemSvg() {
  let r = '';
  EMBLEM.forEach((row, y) => [...row].forEach((ch, x) => { if (EMBLEM_COL[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${EMBLEM_COL[ch]}"/>`; }));
  return `<svg class="emblem" viewBox="0 0 15 15" shape-rendering="crispEdges">${r}</svg>`;
}

// A fonte pixel achata as maiúsculas com circunflexo (Ô parece Ø); no logo o acento é desenhado por cima da letra
const logoText = t => esc(t).replace(/[ÂÊÔ]/g, ch => `<span class="acc">${{ 'Â': 'A', 'Ê': 'E', 'Ô': 'O' }[ch]}<i>^</i></span>`);
async function titleScreen() {
  G.mode = 'title'; G.busy = true;
  Music.play('title');
  loadFloor(0);
  document.title = GAME.tab;
  document.getElementById('game').classList.add('on-title');
  UI.showOverlay(`<div class="title">${emblemSvg()}<h1>${logoText(GAME.title)}</h1><p class="sub">${esc(GAME.subtitle)}</p></div>` +
    `<p class="foot">${esc(GAME.credit)}</p>`, 'ov-title');
  document.getElementById('party').innerHTML = '';
  const v = await UI.choose([{ label: 'Novo Jogo', value: 'new' }, { label: 'Continuar', value: 'load', disabled: !hasSave() },
    { label: 'Direto à dungeon', hint: 'grupo de 4, pula o capítulo', value: 'dungeon' }],
    { title: '', cols: 1 });
  UI.hideOverlay();
  document.getElementById('game').classList.remove('on-title');
  Sfx.init();
  if (v === 'dungeon') return quickDungeon();
  if (v === 'load' && loadGame()) {
    await UI.say(G.mode === 'town' ? `Jogo carregado. ${TOWN.A.name}.` : `Jogo carregado. ${FLOORS[G.floor].short} · ${FLOORS[G.floor].name}`, { auto: 1600 });
    if (G.seen.migrou === 0) { G.seen.migrou = 1; Sfx.levelup(); await UI.say(`Uma ladina de capa cinza, ${heroName('andilla')}, juntou-se ao grupo.`); saveGame(); }
    G.busy = false; exploreHint();
  } else {
    if (v === 'load') await UI.say('Não foi possível carregar o save.\nComeçando um novo jogo.');
    await newGame();
  }
}

async function newGame() {
  G.party = [newMember(PARTY_DEFS.find(d => d.id === 'aldo'))]; // Aldo chega sozinho; o grupo se forma no capítulo
  G.inv = { pocao: 2 };
  G.opened = {}; G.explored = {}; G.bossDead = false; G.gold = 20; G.quest = 0; G.key = {}; G.intro = 0; G.reached = 0; G.seen = {};
  G.macros = normalizeMacros(); G.lastRound = null;
  loadFloor(0);
  UI.buildParty();
  await arrivalScene();
}

// Atalho do título: grupo como depois da abertura (nível 2, carta, missão do ancião) direto na cripta
async function quickDungeon() {
  G.party = ['aldo', 'teo', 'lyra', 'andilla'].map(id => { const m = newMember(PARTY_DEFS.find(d => d.id === id)); m.lv = 2; m.xp = 36; m.hp = maxHp(m); m.mp = maxMp(m); return m; });
  G.inv = { pocao: 5, eter: 1, pena: 1 };
  G.opened = {}; G.explored = {}; G.bossDead = false; G.gold = 40; G.quest = 1; G.key = { carta: true, estojo: true }; G.intro = 1; G.reached = 0;
  G.key.estojo = false; // já devolvido à ladina
  G.seen = { job: 1, cem1: 1, cem2: 1, cem3: 1, teoWin: 1, estojo: 1, cemEntrou: 1, hugo4: 1 };
  G.macros = normalizeMacros(); G.lastRound = null;
  loadFloor(0);
  UI.buildParty();
  G.town = CRYPT_FRONT;
  enterTown(CRYPT_FRONT, 'valmor');
  G.busy = true;
  await enterDungeon();
}

async function gameOver() {
  G.mode = 'gameover'; G.busy = true;
  Music.stop(); Sfx.gameover();
  UI.showOverlay('<div class="title"><h1 class="red">FIM DE JOGO</h1><p class="sub">A escuridão engoliu o grupo...</p></div>', 'ov-dark');
  const v = await UI.choose([{ label: 'Continuar do último save', value: 'load', disabled: !hasSave() }, { label: 'Novo Jogo', value: 'new' }], { title: '', cols: 1 });
  UI.hideOverlay();
  if (v === 'load' && loadGame()) { G.busy = false; exploreHint(); }
  else await newGame();
}

// Fim do capítulo 1: o Sineiro cai, o túmulo do rei está arrombado e vazio, Tobias acorda (capitulo1.md)
async function ending() {
  G.bossDead = true; G.busy = true;
  G.flashColor = '255,255,255'; G.flash = { t0: performance.now(), dur: 1500 };
  Music.stop();
  await UI.say('O Sineiro desaba. O sino rola pelas pedras, toca uma última vez e se cala.');
  await UI.say('Atrás dele, o túnel chega ao túmulo do rei.');
  await UI.say('A tampa foi arrombada. O túmulo está vazio, e há marcas de arrasto no chão.');
  await UI.say('Nos quatro cantos, entalhados na pedra, os símbolos dos paladinos. Embaixo de cada um, um nicho vazio.');
  await partyTalk('tumulo', TALKS.tumulo);
  await fadeTo(1, 900);
  enterTown(CRYPT_FRONT);
  Music.play('ending');
  G.busy = true;
  await fadeTo(0, 900);
  await say2(null, 'Na porta da igreja velha, apoiado na irmã Irene, espera o mensageiro.');
  await say2('Irmã Irene', 'Acordou hoje cedo. Disse o nome: Tobias. E a primeira coisa que perguntou foi da carta.');
  await say2('Tobias', 'A carta... continua fechada?');
  if (inParty('teo')) await say2('Teo', 'Fechada. Como veio.');
  await say2(null, 'Tobias chora em silêncio.');
  await say2('Tobias', 'O que eu vi lá embaixo é da rainha. Levem a carta a ela.');
  await say2('Tobias', 'Em Erukh, não confiem em ninguém antes dela.');
  await partyTalk('estrada', TALKS.estrada);
  await UI.say('Naquela noite, os mortos de Valmor não se levantam. E o sino da igreja velha não toca.');
  const lv = G.party.map(m => `${pdef(m).name} Nv ${m.lv}`).join(' · ');
  UI.showOverlay(`<div class="title">${emblemSvg()}<h1>FIM DO CAPÍTULO 1</h1><p class="sub">O sino de Valmor se calou.</p><p class="small">Mas alguém levou o que estava naquele túmulo. A carta com o selo real segue para Erukh...</p><p class="small">${esc(lv)}</p><p class="small">Obrigado por jogar!</p></div>`, 'ov-dark');
  saveGame();
  const v = await UI.choose([{ label: 'Passear por Valmor', value: 'stay' }, { label: 'Jogar novamente', value: 'new' }], { title: 'FIM', cols: 2 });
  UI.hideOverlay();
  if (v === 'new') return newGame();
  Music.play('town');
  G.busy = false; exploreHint();
}

// ---------- Desenho ----------
function drawMinimap(now) {
  const c = vctx, m = map(), N = m.size, ex = exploredArr();
  if (G.bigMap) {
    const cs = Math.floor(170 / N), ox = Math.floor((VW - cs * N) / 2), oy = Math.floor((VH - cs * N) / 2);
    drawWindow(c, ox - 7, oy - 17, cs * N + 14, cs * N + 24);
    HUD.title(`${FLOORS[G.floor].short} · ${FLOORS[G.floor].name}`, VW / 2, oy - 7);
    drawCells(c, ox, oy, cs, 0, 0, N, N, now);
    return;
  }
  const R = 5, cs = 4, size = (R * 2 + 1) * cs, ox = VW - size - 6, oy = 6;
  drawWindow(c, ox - 4, oy - 4, size + 8, size + 18);
  c.save(); c.beginPath(); c.rect(ox, oy, size, size); c.clip();
  drawCells(c, ox - (G.x - R) * cs, oy - (G.y - R) * cs, cs, G.x - R, G.y - R, G.x + R + 1, G.y + R + 1, now);
  c.restore();
  HUD.compass(DIR_NAMES[G.dir], ox + size / 2, oy + size + 7);
}

function drawCells(c, ox, oy, cs, x0, y0, x1, y1, now) {
  const m = map(), N = m.size, ex = exploredArr();
  for (let y = Math.max(0, y0); y < Math.min(N, y1); y++) for (let x = Math.max(0, x0); x < Math.min(N, x1); x++) {
    if (!ex[y * N + x]) continue;
    const v = m.grid[y * N + x];
    c.fillStyle = v === 1 ? '#6a6290' : v === 2 ? '#ffffff' : '#25213a';
    c.fillRect(ox + x * cs, oy + y * cs, cs, cs);
  }
  if (G.floor === 0) { c.fillStyle = '#5cff7a'; c.fillRect(ox + m.start.x * cs, oy + m.start.y * cs, cs, cs); }
  for (const o of m.objects) {
    if (!ex[o.y * N + o.x] || (o.type === 'boss' && G.bossDead)) continue;
    c.fillStyle = o.type === 'chest' ? (G.opened[`${G.floor}:${o.x},${o.y}`] ? '#7a6030' : '#ffd23f') : o.type === 'fountain' ? '#60e0ff' : '#ff3050';
    c.fillRect(ox + o.x * cs + 1, oy + o.y * cs + 1, Math.max(1, cs - 2), Math.max(1, cs - 2));
  }
  // jogador
  const px = ox + (cam.x) * cs, py = oy + (cam.y) * cs, a = cam.a, r = Math.max(2.5, cs * 0.7);
  c.fillStyle = Math.floor(now / 300) % 2 ? '#ffd23f' : '#fff';
  c.beginPath();
  c.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
  c.lineTo(px + Math.cos(a + 2.5) * r, py + Math.sin(a + 2.5) * r);
  c.lineTo(px + Math.cos(a - 2.5) * r, py + Math.sin(a - 2.5) * r);
  c.closePath(); c.fill();
}

function drawOverlays(now) {
  const c = vctx;
  if (G.flash) {
    const k = (now - G.flash.t0) / G.flash.dur;
    if (k >= 1) G.flash = null;
    else {
      const a = G.flash.strobe ? (Math.floor(k * 6) % 2 ? 0.85 : 0.1) : (1 - k) * 0.8;
      c.fillStyle = `rgba(${G.flashColor},${a})`; c.fillRect(0, 0, VW, VH);
    }
  }
  if (G.fadeAnim) {
    const F = G.fadeAnim, k = Math.min(1, (now - F.t0) / F.dur);
    G.fade = F.from + (F.to - F.from) * k;
    if (k >= 1) { G.fadeAnim = null; F.res(); }
  }
  if (G.fade > 0) { c.fillStyle = `rgba(0,0,0,${G.fade})`; c.fillRect(0, 0, VW, VH); }
  if (now < noteUntil) HUD.note(noteText);
  const shaking = now < G.shakeUntil;
  view.style.transform = shaking ? `translate(${rnd(-4, 4)}px,${rnd(-3, 3)}px)` : '';
}

// ---------- Loop ----------
let last = performance.now();
const gameEl = document.getElementById('game');
function frame(now) {
  const dt = Math.min(50, now - last); last = now;
  // Faixa do grupo: na dungeon, na batalha e com o menu aberto (na vila a cena fica livre)
  gameEl.classList.toggle('show-party', G.mode === 'battle' || G.mode === 'explore' || G.mode === 'gameover' || (G.mode === 'town' && !!document.querySelector('#menu .opt')));
  wmBtn.hidden = !canWorldMap();
  HUD.begin();
  gameEl.classList.toggle('in-battle', G.mode === 'battle'); // phone layout: no d-pad in battle, windows sit lower
  const F = FLOORS[G.floor];
  HUD.place(placeLabel({ mode: G.mode, areaName: G.mode === 'town' ? TOWN.A.name : '', floorShort: F.short, floorName: F.name, gold: G.gold }));
  if (G.mode === 'title') {
    TitleBG.draw(vctx, now); // paisagem de Eterra à noite (src/titlebg.js)
  } else if (G.mode === 'town') {
    updateTown(dt);
    drawTown(now);
  } else if (G.mode === 'battle' && B) {
    drawBattle(now);
  } else if (G.mode === 'explore' || G.mode === 'battle') {
    updateExplore(dt);
    renderView(cam, map(), worldSprites(now), now);
    drawMinimap(now);
  } else {
    renderView(cam, map(), worldSprites(now), now);
  }
  drawOverlays(now);
  HUD.end();
  requestAnimationFrame(frame);
}

function boot() {
  SPR = Sprites.world();
  loadFloor(0);
  requestAnimationFrame(frame);
  titleScreen();
}
boot();
