const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { story } = require('./harness');

const SRC = fs.readFileSync(`${__dirname}/../src/chapter1.js`, 'utf8');
const after = () => ({ bossDead: true, quest: 1, intro: 1, key: { carta: true }, inv: { pocao: 1 }, gold: 30 });
const tick = () => new Promise(r => setTimeout(r, 0));

test('chapter 1 areas: same-width rows, every letter a tile, the way from the entry reaches every exit', () => {
  const { run } = story(['aldo']);
  for (const [id, plan, from] of [['estrada', 'ESTRADA_PLAN', 'ESTRADA_START'], ['vau', 'VAU_PLAN', '{ x: 11, y: 18 }'], ['pasto', 'PASTO_PLAN', '{ x: 1, y: 8 }']]) {
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

test('the grey silhouette shows twice at the edge of the light, once each', () => {
  const { G, run } = story(['aldo']);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 8, y: 26 })`), null);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 10, y: 22 }).flag`), 'silhueta1');
  G.seen['c1:silhueta1'] = 1;
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 10, y: 22 })`), null);
  assert.strictEqual(run(`silhouetteNear(G.seen, { x: 11, y: 9 }).flag`), 'silhueta2');
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
