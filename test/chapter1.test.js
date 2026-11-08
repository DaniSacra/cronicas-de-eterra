const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { story } = require('./harness');

const SRC = fs.readFileSync(`${__dirname}/../src/chapter1.js`, 'utf8');
const after = () => ({ bossDead: true, quest: 1, intro: 1, key: { carta: true }, inv: { pocao: 1 }, gold: 30 });
const tick = () => new Promise(r => setTimeout(r, 0));

test('chapter 1 areas: same-width rows, every letter a tile, the way from the entry reaches every exit', () => {
  const { run } = story(['aldo']);
  for (const [id, plan, from] of [['vau', 'VAU_PLAN', '{ x: 11, y: 18 }'], ['pasto', 'PASTO_PLAN', '{ x: 1, y: 8 }']]) {
    const rows = run.json(plan), w = rows[0].length;
    assert.ok(rows.every(r => r.length === w), id);
    assert.ok(rows.join('').split('').every(ch => run(`C1_TILES[${JSON.stringify(ch)}] !== undefined`)), id);
    const exits = run.json(`AREAS.${id}.exits.map(e => [e.x, e.y])`);
    const reach = run.json(`(() => { TOWN.A = AREAS.${id}; const s = ${from}, seen = new Set([s.x + ',' + s.y]), q = [s];
      const ex = new Set(AREAS.${id}.exits.map(e => e.x + ',' + e.y));
      while (q.length) { const p = q.shift(); for (const [dx, dy] of TDIRS) { const x = p.x + dx, y = p.y + dy, k = x + ',' + y;
        if (seen.has(k) || !(TOWN.walkable(x, y) || ex.has(k))) continue; seen.add(k); if (!ex.has(k)) q.push({ x, y }); } }
      return [...seen]; })()`);
    for (const [x, y] of exits) assert.ok(reach.includes(x + ',' + y), `${id}: exit ${x},${y}`);
  }
});

test('the farewell: four loaves, Clara\'s closed note, the letter in the leather case, chapter 1 on the road', async () => {
  const { G, log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], after());
  run(`enterTown({ x: 2, y: 6, dir: 3 }, 'valmor')`);
  await run('farewell()');
  assert.strictEqual(G.inv.pao, 4);
  assert.strictEqual(G.key.bilhete, true);
  assert.strictEqual(G.chapter, 1); assert.strictEqual(G.part, 1);
  assert.strictEqual(G.area, 'estrada');
  const at = t => log.findIndex(l => l.includes(t));
  assert.ok(at('Se a sopa não vai até vocês') < at('bilhete dobrado'));
  assert.ok(at('Aldo guarda o bilhete sem abrir') < at('estojo de couro'));
  assert.ok(log.includes('Aldo:\nVamos.'));
  assert.ok(run(`KEY_ITEMS.carta.sealed[0]`).includes('estojo de couro'));
});

test('the bread heals 30 and is never wasted', () => {
  const { G, run } = story(['aldo'], { inv: { pao: 2 } });
  G.party[0].hp = 10;
  assert.match(run(`applyItem('pao', G.party[0])`), /recupera 30 PV/);
  G.party[0].hp = run('maxHp(G.party[0])');
  assert.match(run(`applyItem('pao', G.party[0])`), /PV cheios/);
  assert.strictEqual(G.inv.pao, 1);
});

test('the grey silhouette shows twice at the edge of the light, once each: past the second lamp and at the lookout', () => {
  const { G, run } = story(['aldo']);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 14, y: 50 })`), null);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 8, y: 42 }).flag`), 'silhueta1');
  G.seen['c1:silhueta1'] = 1;
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 8, y: 42 })`), null);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 26, y: 2 }).flag`), 'silhueta2');
});

const FOUR = ['aldo', 'lyra', 'teo', 'andilla'];
// Can the party walk from the entry of the road to (x, y)? (exits count as reached, not walked through)
const reachEstrada = (run, x, y) => run(`(() => { const s = ESTRADA_START, seen = new Set([s.x + ',' + s.y]), q = [s];
  while (q.length) { const p = q.shift(); for (const [dx, dy] of TDIRS) { const nx = p.x + dx, ny = p.y + dy, k = nx + ',' + ny;
    if (seen.has(k)) continue; if (nx === ${x} && ny === ${y}) return true; if (!TOWN.walkable(nx, ny)) continue; seen.add(k); q.push({ x: nx, y: ny }); } }
  return false; })()`);

test('the southern road: 32x60, the way north opens only with the fallen pine pushed and the rope bridge tied', async () => {
  const { G, run } = story(FOUR, after());
  const rows = run.json('ESTRADA_PLAN');
  assert.strictEqual(rows.length, 60); assert.ok(rows.every(r => r.length === 32));
  assert.ok(rows.join('').split('').every(ch => run(`C1_TILES[${JSON.stringify(ch)}] !== undefined`)));
  run(`enterTown(ESTRADA_START, 'estrada')`);
  assert.ok(!reachEstrada(run, 15, 0), 'closed at first');
  assert.ok(!reachEstrada(run, 12, 33), 'the fallen pine closes the cleft');
  // Aldo pushes the pine from inside the cleft: once, and it stays where it stopped
  run(`TOWN.p.x = 12; TOWN.p.y = 35; TOWN.p.dir = 0`);
  await run('pushObj(fieldObjAt(12, 34), 0, true)');
  assert.strictEqual(G.field['area:estrada'].solved.pinheiro, 1);
  assert.strictEqual(run('fieldObjAt(12, 33).fixed'), true);
  assert.ok(reachEstrada(run, 20, 14), 'up to the ravine');
  assert.ok(!reachEstrada(run, 15, 0), 'the ravine still closes the way');
  // Andilla crosses the narrow log and ties the bridge
  run(`TOWN.p.x = 20; TOWN.p.y = 14; TOWN.p.dir = 0`);
  await run('fieldAction(20, 13)()');
  assert.strictEqual(G.seen['c1:ponte'], 1);
  assert.ok(reachEstrada(run, 15, 0), 'the road north is open');
  // walking back in keeps both
  run(`enterTown(ESTRADA_START, 'estrada')`);
  assert.ok(reachEstrada(run, 15, 0));
});

test('the shortcut: two logs and a rock, four pushes from above; it never opens from below and starts over when left stuck', async () => {
  const { G, run } = story(FOUR, after());
  run(`enterTown(ESTRADA_START, 'estrada')`);
  const push = async (px, py, dir) => {
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
    run(`TOWN.p.x = ${px}; TOWN.p.y = ${py}; TOWN.p.dir = ${dir}`);
    await run(`pushObj(fieldObjAt(${px + dx}, ${py + dy}), ${dir}, true)`);
  };
  // from below, the rock goes up only until it meets the log, and the cleft stays shut
  await push(3, 36, 0); await push(3, 35, 0);
  assert.ok(!G.field['area:estrada'].solved.atalho);
  run(`enterTown(ESTRADA_START, 'estrada')`);
  assert.deepStrictEqual(run.json('[fieldObjAt(3, 35).id]'), ['pedra'], 'back at its spot');
  // from above
  await push(4, 32, 3); await push(3, 34, 2); await push(3, 35, 2); await push(3, 36, 2);
  assert.strictEqual(G.field['area:estrada'].solved.atalho, 1);
  assert.strictEqual(G.seen['c1:atalho'], 1);
});

test('the lamps: Lyra lights them, the light keeps the fog open, and the four give one Pena Vital once', async () => {
  const { G, log, run } = story(FOUR, after());
  run(`enterTown(ESTRADA_START, 'estrada')`);
  const pena = G.inv.pena || 0;
  for (const [x, y] of run.json('ESTRADA_LAMPS')) { run(`TOWN.p.x = ${x}; TOWN.p.y = ${y + 1}; TOWN.p.dir = 0`); await run(`fieldAction(${x}, ${y})()`); }
  assert.strictEqual(G.inv.pena, pena + 1);
  assert.strictEqual(log.filter(l => l === 'O Seu Dorival entrega 1 Pena Vital ao grupo.').length, 1);
  assert.strictEqual(log.filter(l => l.includes('a chama pula para o pavio')).length, 1, 'the first time of Fogo once');
  assert.strictEqual(run('visibleAt(11, 37)'), true, 'the light of a lamp shows what is around it');
  assert.ok(run(`TOWN.npcs.some(n => n.def.id === 'dorival')`), 'Seu Dorival opens the door');
});

test('an old save standing on the old road starts at the entry of the new one with the same flags', () => {
  const { G, run } = story(FOUR, after());
  run(`enterTown(ESTRADA_START, 'estrada')`);
  assert.strictEqual(G.mapv.estrada, 2, 'saves now know which road they stand on');
  assert.deepStrictEqual(run.json(`savedSpot(AREAS.estrada, undefined, { x: 8, y: 14, dir: 0 })`), run.json('ESTRADA_START'));
  assert.deepStrictEqual(run.json(`savedSpot(AREAS.estrada, 2, { x: 8, y: 14, dir: 0 })`), { x: 8, y: 14, dir: 0 });
  assert.deepStrictEqual(run.json(`savedSpot(AREAS.vau, undefined, { x: 5, y: 5, dir: 0 })`), { x: 5, y: 5, dir: 0 }, 'other areas are untouched');
});

test('the ford: Teo lifts the letter case over the water the first time only', async () => {
  const { log, run } = story(['aldo', 'teo', 'andilla'], after());
  run(`enterTown({ x: 11, y: 12, dir: 2 }, 'vau')`);
  await run(`AREAS.vau.onStep(11, 13)()`);
  assert.ok(log.some(t => t.includes('Não é só papel.')));
  assert.strictEqual(run(`AREAS.vau.onStep(11, 14)`), null);
});

test('Gervásio: the gold of a dead king, four horses, then the road north opens', async () => {
  const { G, log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], after());
  run(`enterTown({ x: 18, y: 5, dir: 1 }, 'vau')`);
  assert.strictEqual(run(`AREAS.vau.exits[2].check()`).includes('dono do haras'), true);
  await run('gervasioTalk()');
  assert.ok(log.some(t => t === 'Andilla:\nOuro de rei morto.'));
  assert.strictEqual(run(`AREAS.vau.exits[2].check()`), null);
  await run('leaveVau()');
  assert.ok(log.at(-1).includes('A pé, Erukh fica a um mês'));
  for (const i of [1, 2, 3, 4]) G.seen['c1:cavalo' + i] = 1;
  await run('gervasioTalk()');
  assert.strictEqual(G.seen['c1:cavalos'], 1);
});

test('the pasture: a fight scares the horses within 4 tiles; walking up to a horse catches it', async () => {
  const { G, log, run } = story(['aldo'], after());
  run(`enterTown({ x: 3, y: 3, dir: 1 }, 'pasto')`);
  assert.ok(run('TOWN.A.encounters().length') > 0, 'the pasture has wolves, unseen');
  const h = n => run.json(`(h => h && { x: h.x, y: h.y })(TOWN.npcs.find(n => n.def.n === ${n}))`);
  const far = h(4);
  await run('TOWN.A.afterFight()');
  assert.ok(log.includes('Com o barulho da luta, um cavalo dispara pela névoa.'));
  assert.notDeepEqual(h(1), { x: 4, y: 3 }, 'the close horse ran');
  assert.deepEqual(h(4), far, 'the far one did not');
  await run(`catchHorse(TOWN.npcs.find(n => n.def.n === 1))`);
  assert.strictEqual(G.seen['c1:cavalo1'], 1);
  assert.ok(log.at(-1).endsWith('Cavalos: 1 de 4.'));
  assert.strictEqual(run(`fleeStep({ x: 5, y: 5 }, { x: 4, y: 5 }, () => true).x`), 6);
});

test('dice at the inn: once, Andilla wins saddles, Aldo loses two coins', async () => {
  const { G, log, run, picks } = story(['aldo', 'lyra', 'teo', 'andilla'], after());
  picks.push(true);
  await run('diceGame()');
  assert.strictEqual(G.gold, 28);
  assert.ok(log.some(t => t.includes('não vai aprender')));
  await run('diceGame()');
  assert.strictEqual(G.gold, 28);
});

test('the camp: four talks by the fire, the silhouette, the pack, and it is gone', async () => {
  const { G, log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], after());
  run(`WorldMap = { travel: async () => {} }`);
  await run('campScene()');
  const at = t => log.findIndex(l => l.includes(t));
  for (const t of ['teto inteiro', 'De onde eu estiver.', 'quero ver uma lembrar', 'pingo de cera', 'Desta vez eu deixo', 'Quem está aí?', 'Lobos!', 'festa de rico'])
    assert.ok(at(t) >= 0, t);
  assert.ok(at('Lobos!') < at('a silhueta já não está lá'));
  assert.strictEqual(G.seen['c1:matilha'], 1);
});

test('Lyra narrates her brother in the third person at most five times in part 1', () => {
  const marks = SRC.match(/\/\/ Lyra (\d)\/5/g) || [];
  assert.ok(marks.length <= 5);
  assert.deepEqual(marks.map(m => +m.match(/\d/)[0]), [...marks.keys()].map(i => i + 1));
});

test('chapter 1 lines: no em dash, nobody outside the party speaks of the letter', () => {
  assert.ok(!SRC.includes('—'));
  const outsiders = [...SRC.matchAll(/\['(Berta|Ana|Nino|Clara|Gervásio|Viajante|Cavalariço|Estalajadeira)', '([^']*)'/g)].map(m => m[2]);
  assert.ok(outsiders.length > 5);
  assert.ok(outsiders.every(t => !/carta|selo/i.test(t)), outsiders.find(t => /carta|selo/i.test(t)));
});
