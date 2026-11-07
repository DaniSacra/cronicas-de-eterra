const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

// Combat design, Phase 1b: Defesa and Resistência are points; a diminishing curve turns them into the share cut
test('cutPct: 80 x points / (points + 55), rising, always under 80, negative counts as 0', () => {
  const { run } = story(['aldo']);
  const pct = p => Math.round(run(`cutPct(${p})`) * 10) / 10;
  for (const [p, v] of [[0, 0], [10, 12.3], [22.5, 23.2], [25, 25], [42.5, 34.9], [60, 41.7], [100, 51.6], [167.5, 60.2]]) assert.equal(pct(p), v, `${p} points`);
  assert.equal(pct(-10), 0);
  let prev = -1;
  for (let p = 0; p <= 2000; p += 5) { const v = run(`cutPct(${p})`); assert.ok(v > prev && v < 80); prev = v; }
});

test('physical and magic damage follow the curve, never below 1; pierce ignores Defesa', () => {
  const { run } = story(['aldo']);
  assert.equal(run('physDmg(20, 0, 1, 1)'), 20, 'same as before with no Defesa');
  assert.equal(run('physDmg(20, 22.5, 1, 1)'), 15);
  assert.equal(run('physDmg(20, 60, 1, 1)'), 12);
  assert.equal(run('physDmg(20, 22.5, 1.5, 1)'), 23, 'skill power multiplies before the cut');
  assert.equal(run('physDmg(1, 50, 1, 1)'), 1, 'at least 1');
  assert.equal(run('magDmg(40, 0)'), 40);
  assert.equal(run('magDmg(40, 22.5)'), 31);
  assert.equal(run('magDmg(40, 60)'), 23);
  assert.equal(run('magDmg(0.2, 0)'), 1);
  assert.match(require('node:fs').readFileSync(`${__dirname}/../src/battle.js`, 'utf8'), /sp\.pierce \? 0 : t\.def/);
});

test('Aldo at level 30 with no gear still cuts less than 65%: the curve never stops at a cap', () => {
  const { G, run } = story(['aldo']);
  G.party[0].lv = 30;
  const c = run(`cutPct(stat(G.party[0], 'def'))`);
  assert.ok(c < 65 && c > 55, String(c));
  G.party[0].lv = 29;
  assert.ok(run(`cutPct(stat(G.party[0], 'def'))`) < c);
});

test('heroes and enemies carry the converted values: Defesa x2.5 for heroes, x1.8 for enemies, Resistência x0.7', () => {
  const { run } = story(['aldo', 'lyra', 'teo', 'andilla']);
  const st = k => run.json(`G.party.map(m => stat(m, '${k}'))`);
  assert.deepEqual(st('def'), [22, 10, 15, 12]);
  assert.deepEqual(st('res'), [4, 12, 10, 6], 'Aldo is weak against magic, Lyra and Teo resist it');
  assert.deepEqual(run.json("[ENEMIES.sineiro.def, ENEMIES.sineiro.res, ENEMIES.ossada.def, ENEMIES.ossada.res]"), [25, 10, 5, 2]);
  assert.ok(run('Object.values(ENEMIES).every(e => e.def >= 0 && e.def <= 75 && e.res >= 0 && e.res <= 75)'));
  assert.equal(run('STAT_FULL.res'), 'Resistência');
});

test('old saves: the Defesa bonus of the equipment becomes a percentage once', () => {
  const { run } = story(['aldo']);
  assert.deepEqual(run.json('migrateBonus({ def: 6 }, 2)'), { def: 15 }, 'Cota de Malha');
  assert.deepEqual(run.json('migrateBonus({ def: 5, mag: 5 })'), { def: 13, mag: 5 }, 'Manto Sagrado, save without version');
  assert.deepEqual(run.json('[EQUIPS.cotaMalha.bonus.def, EQUIPS.mantoSagrado.bonus.def]'), [15, 13], 'same as a new pick');
  assert.deepEqual(run.json('migrateBonus({ def: 15 }, 3)'), { def: 15 }, 'v3 saves are already converted');
  assert.deepEqual(run.json('migrateBonus({ atk: 6 }, 2)'), { atk: 6 });
});

test('Phase 2a: the exact skills table, by level', () => {
  const { PARTY_DEFS } = require('../src/data.js');
  const table = Object.fromEntries(PARTY_DEFS.map(d => [d.id, d.spells]));
  assert.deepEqual(table, {
    aldo: [[4, 'golpe'], [12, 'quebraJunta'], [18, 'furia']],
    lyra: [[1, 'fogo'], [3, 'gelo'], [5, 'raio']],
    teo: [[1, 'cura'], [3, 'luz'], [5, 'reviver'], [10, 'curaTotal']],
    andilla: [[3, 'leque'], [7, 'golpeBaixo']],
  });
});

test('Phase 2 cut: Andilla crits more, both sides miss, dodge and crit, the boss never crits', () => {
  const { HIT, critChance, dodgeChance, rollHit, fallReactor } = require('../src/uirules.js');
  assert.equal(critChance('andilla'), 0.25);
  assert.equal(critChance('aldo'), HIT.crit);
  assert.equal(dodgeChance(1000), HIT.dodgeCap);
  const seq = vals => { let i = 0; return () => vals[i++]; };
  assert.equal(rollHit(0.08, 10, seq([0.01])), 'miss');
  assert.equal(rollHit(0.08, 10, seq([0.5, 0.05])), 'dodge', '4% + 10 x 0.3% = 7%');
  assert.equal(rollHit(0.25, 10, seq([0.5, 0.5, 0.2])), 'crit');
  assert.equal(rollHit(0, 10, seq([0.5, 0.5, 0])), 'hit', 'no crit at 0');
  assert.equal(fallReactor('aldo', ['teo', 'lyra']), 'lyra', 'the sister speaks first');
  assert.equal(fallReactor('andilla', ['lyra']), 'lyra');
  assert.equal(fallReactor('teo', []), null);
  const src = require('node:fs').readFileSync(`${__dirname}/../src/battle.js`, 'utf8');
  assert.match(src, /rollHit\(e\.boss \? 0 : HIT\.crit/);
});

test('battle lines: short, in Portuguese without em dash, at most one of each kind per fight', () => {
  const { BATTLE_LINES } = require('../src/data.js');
  for (const [kind, by] of Object.entries(BATTLE_LINES)) for (const id of ['aldo', 'lyra', 'teo', 'andilla']) {
    assert.ok(by[id] && by[id].length, `${kind} ${id}`);
    for (const l of by[id]) { const t = typeof l === 'function' ? l('aldo', 'Aldo') : l; assert.ok(t.length <= 40 && !t.includes('—'), t); }
  }
});
