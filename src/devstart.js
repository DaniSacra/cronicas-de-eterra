// ===== Modo dev (?dev no endereço): começar em qualquer ponto da história =====
// Cada ponto monta um save plausível para aquele momento (nível, itens, flags) e leva o grupo até lá.
// Ao fazer uma parte nova, acrescente os pontos dela no fim de DEV_STARTS.

const DEV_HEROES = ['aldo', 'lyra', 'teo', 'andilla'];
const DEV_CRYPT_GEAR = ['espadaFerro', 'cotaMalha', 'cajadoRunico', 'mantoSagrado'];
// Everything the prologue sets on the way to the end (the talks already heard included)
const DEV_PROLOGUE = { job: 1, cem1: 1, cem2: 1, cem3: 1, teoWin: 1, estojo: 1, cemEntrou: 1, covaU: 1, covaO: 1, covas: 1, hugo4: 1,
  andillaNome: 1, porque: 'mortos', andar0: 1, lapide: 1, bilhete: 1, pistaTunel: 1, altar: 1, buraco: 1, sino: 1, fonteLyra: 1 };

// A fresh party of four at a level, with the crypt's gear worn when asked
function devParty(lv, gear = []) {
  G.party = DEV_HEROES.map(id => { const m = newMember(PARTY_DEFS.find(d => d.id === id)); m.lv = lv; m.xp = 0; return m; });
  G.gear = [...gear]; G.equip = {};
  for (const g of gear) { const m = G.party.find(p => p.id === EQUIPS[g].who); for (const [k, v] of Object.entries(EQUIPS[g].bonus)) m.bonus[k] = (m.bonus[k] || 0) + v; }
  for (const m of G.party) fullRestore(m);
}
function devState(o) {
  devParty(o.lv, o.gear);
  Object.assign(G, { chapter: 0, part: 0, inv: { pocao: 4, eter: 2, pena: 1 }, opened: {}, explored: {}, field: {}, mapv: {}, bossDead: false, gold: 80,
    quest: 1, key: { carta: true }, intro: 1, reached: 1, macros: normalizeMacros(), lastRound: null }, o.G || {});
  G.seen = { ...DEV_PROLOGUE, ...(o.seen || {}) };
  for (const [k, v] of Object.entries(o.c1 || {})) G.seen['c1:' + k] = v;
  loadFloor(0);
  UI.buildParty();
}
const C1_BASE = { G: { chapter: 1, part: 1, bossDead: true, key: { carta: true, bilhete: true } }, gear: DEV_CRYPT_GEAR };
// The road as if the party had already passed the fallen pine and the ravine
function devRoad(done) {
  const st = fieldState(G.field, 'area:estrada');
  if (done.pinheiro) { st.solved.pinheiro = 1; st.p.pinheiro = [12, 33]; }
  if (done.ponte) { for (const id of ['viga1', 'viga2', 'corda1', 'corda2']) st.s[id] = 1; st.tiles['21,12'] = TILE.BRIDGE; st.tiles['21,13'] = TILE.BRIDGE; }
  G.seen['c1:cascata'] = 0;
}
const devTown = async (pos, area) => { enterTown(pos, area); G.busy = false; townHint(); };

const DEV_STARTS = [
  { label: 'Prólogo · início', hint: 'Aldo chega sozinho', go: () => newGame() },
  { label: 'Prólogo · cripta', hint: 'nível 3, grupo de 4', go: () => quickDungeon() },
  { label: 'Prólogo · diante do Sineiro', hint: 'nível 4, equipados', async go() {
    devState({ lv: 4, gear: DEV_CRYPT_GEAR, seen: { buraco: 0, sino: 0, altar: 0 } });
    const m = getMap(0), boss = m.objects.find(o => o.type === 'boss');
    const [dx, dy] = DIRS.find(([x, y]) => cellAt(boss.x + x, boss.y + y) !== 1);
    G.mode = 'explore'; G.town = CRYPT_FRONT;
    loadFloor(0, { x: boss.x + dx, y: boss.y + dy, dir: DIRS.findIndex(([x, y]) => x === -dx && y === -dy) });
    cam.x = G.x + 0.5; cam.y = G.y + 0.5; cam.a = dirAngle(G.dir);
    Music.play('explore'); G.busy = false; exploreHint();
  } },
  { label: 'Capítulo 1 · partida de Valmor', hint: 'nível 4, Prólogo terminado', go() {
    devState({ lv: 4, gear: DEV_CRYPT_GEAR, G: { bossDead: true } });
    return devTown({ x: 1, y: 6, dir: 3 }, 'valmor');
  } },
  { label: 'Capítulo 1 · Estrada do Sul', hint: 'nível 4', go() {
    devState({ lv: 4, ...C1_BASE, G: { ...C1_BASE.G, inv: { pocao: 4, eter: 2, pena: 1, pao: 4 } } });
    return devTown(ESTRADA_START, 'estrada');
  } },
  // The road, stretch by stretch: what lies south of the stretch is already done (the pine pushed, the bridge tied)
  ...[['os lampiões', { x: 13, y: 48, dir: 0 }, {}], ['o pinheiro caído', { x: 12, y: 37, dir: 0 }, {}],
    ['a cascata', { x: 19, y: 27, dir: 1 }, { pinheiro: 1 }], ['o Marco', { x: 10, y: 28, dir: 0 }, { pinheiro: 1 }],
    ['a ravina', { x: 20, y: 16, dir: 0 }, { pinheiro: 1 }], ['a Toca dos Lobos', { x: 11, y: 15, dir: 3 }, { pinheiro: 1 }],
    ['o mirante', { x: 21, y: 9, dir: 0 }, { pinheiro: 1, ponte: 1 }]].map(([name, pos, done]) => ({
    label: 'Capítulo 1 · Estrada: ' + name, hint: 'nível 4', go() {
      devState({ lv: 4, ...C1_BASE, G: { ...C1_BASE.G, inv: { pocao: 4, eter: 2, pena: 1, pao: 4 } }, c1: { ...(done.ponte ? { ponte: 1 } : {}) } });
      devRoad(done);
      return devTown(pos, 'estrada');
    } })),
  { label: 'Capítulo 1 · Vau do Corvo', hint: 'nível 5', go() {
    devState({ lv: 5, ...C1_BASE, c1: { silhueta1: 1, silhueta2: 1 } });
    return devTown({ x: 11, y: 18, dir: 0 }, 'vau');
  } },
  // The pasture: the entry, then right beside each horse's puzzle
  ...[['Pasto do Vau', PASTO_START], ['Pasto: o curral', { x: 4, y: 8, dir: 1 }], ['Pasto: o lago', { x: 16, y: 7, dir: 0 }],
    ['Pasto: o cavalo arisco', { x: 12, y: 12, dir: 1 }], ['Pasto: o barranco', { x: 24, y: 15, dir: 2 }]].map(([name, pos]) => ({
    label: 'Capítulo 1 · ' + name, hint: 'nível 5, depois do Gervásio', go() {
      devState({ lv: 5, ...C1_BASE, c1: { silhueta1: 1, silhueta2: 1, vau: 1, estojo: 1, gervasio: 1, pasto: 1 } });
      return devTown(pos, 'pasto');
    } })),
  { label: 'Capítulo 1 · Acampamento', hint: 'nível 5, a noite da matilha', go() {
    devState({ lv: 5, ...C1_BASE, c1: { silhueta1: 1, silhueta2: 1, vau: 1, estojo: 1, gervasio: 1, pasto: 1, cavalo1: 1, cavalo2: 1, cavalo3: 1, cavalo4: 1, cavalos: 1 } });
    G.busy = true;
    return campScene();
  } },
];

// The dev menu: one start per line; Esc goes back to the title
async function devStart() {
  const i = await UI.choose(DEV_STARTS.map((s, value) => ({ label: s.label, hint: s.hint, value })), { title: 'Modo dev · começar em', cols: 1, cancel: true });
  if (i == null) return titleScreen();
  G.busy = true; G.fade = 0;
  await DEV_STARTS[i].go();
}
