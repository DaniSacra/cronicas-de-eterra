const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

// Combat design, Phase 1: Defesa and Resistência are percentages capped at 75
test('physical damage is cut by Defesa as a percentage, never below 1', () => {
  const { run } = story(['aldo']);
  assert.equal(run('physDmg(20, 0, 1, 1)'), 20);
  assert.equal(run('physDmg(20, 25, 1, 1)'), 15);
  assert.equal(run('physDmg(20, 25, 1.5, 1)'), 23, 'skill power multiplies before the cut');
  assert.equal(run('physDmg(20, 90, 1, 1)'), 5, 'Defesa caps at 75%');
  assert.equal(run('physDmg(1, 50, 1, 1)'), 1, 'at least 1');
});

test('magic damage is cut by Resistência, with the same cap', () => {
  const { run } = story(['aldo']);
  assert.equal(run('magDmg(40, 10)'), 36);
  assert.equal(run('magDmg(40, 0)'), 40);
  assert.equal(run('magDmg(40, 100)'), 10);
  assert.equal(run('magDmg(0.2, 0)'), 1);
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
