const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

test('an item that would do nothing is kept, with the reason', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 1, pena: 1, elixir: 1 } });
  const use = (id, i) => run(`applyItem('${id}', G.party[${i}])`);
  assert.equal(use('eter', 1), 'Lyra já está com os PM cheios.');
  assert.equal(use('eter', 0), 'Aldo não usa PM. O éter não tem efeito.');
  assert.equal(use('pocao', 1), 'Lyra já está com os PV cheios.');
  assert.equal(use('pena', 0), 'Aldo não precisa disso.');
  assert.equal(run(`applyItem('elixir', 'all')`), 'O grupo já está inteiro. O Elixir fica guardado.');
  assert.deepEqual({ ...G.inv }, { pocao: 1, eter: 1, pena: 1, elixir: 1 }, 'nothing was spent');
});

test('an item that helps is spent and says how much', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 2, pena: 1 } });
  const [, lyra] = G.party;
  lyra.mp = 0; lyra.hp = 5;
  assert.equal(run(`applyItem('eter', G.party[1])`), `Lyra recupera ${lyra.mp} PM.`);
  assert.ok(lyra.mp > 0);
  assert.match(run(`applyItem('pocao', G.party[1])`), /^Lyra recupera \d+ PV\.$/);
  lyra.hp = 0;
  assert.equal(run(`applyItem('eter', G.party[1])`), 'Lyra caiu. O éter não tem efeito.');
  assert.equal(run(`applyItem('pena', G.party[1])`), 'Lyra voltou à vida!');
  assert.deepEqual({ ...G.inv }, { pocao: 0, eter: 1, pena: 0 });
});

test('review 2026-11-07 (2): the forge sells weak gear; a hero wears the strongest piece of each slot and bonuses never stack', async () => {
  const { bestGear, equipDelta, gearPower } = require('../src/uirules.js');
  const { EQUIPS } = require('../src/data.js');
  assert.deepEqual(equipDelta('espadaCurta', [], EQUIPS), { atk: 3 });
  assert.deepEqual(equipDelta('espadaFerro', ['espadaCurta'], EQUIPS), { atk: 3 }, 'the crypt sword replaces the bought one: +6 in all');
  assert.deepEqual(equipDelta('espadaCurta', ['espadaFerro'], EQUIPS), {}, 'a weaker piece changes nothing');
  assert.equal(bestGear('aldo', 'arma', ['espadaFerro', 'espadaCurta'], EQUIPS), 'espadaFerro');
  // every forge piece is weaker than the crypt piece of the same hero and slot
  for (const [weak, strong] of [['espadaCurta', 'espadaFerro'], ['cajadoFreixo', 'cajadoRunico']]) assert.ok(gearPower(EQUIPS[weak]) < gearPower(EQUIPS[strong]));

  const { G, log, run, picks } = story(['aldo', 'lyra'], { gold: 100, gear: [] });
  run('globalThis.HeroView = { owned: () => [...G.gear] }');
  const opts = run.json('forgeOptions(100, [])');
  assert.ok(opts.every(o => ['aldo', 'lyra'].includes(run(`EQUIPS['${o.value}'].who`))), 'only gear for the heroes in the party');
  assert.ok(opts.find(o => o.value === 'espadaCurta').hint.includes('ATQ +3'));
  run(`enterTown({ x: 26, y: 6, dir: 0 }, 'valmor')`);
  picks.push('buy', 'espadaCurta', null, null);
  await run(`enterBuilding(BUILDINGS.find(b => b.id === 'smith'))`);
  assert.equal(G.gold, 40);
  assert.deepEqual([...G.gear], ['espadaCurta']);
  assert.equal(G.party[0].bonus.atk, 3);
  assert.ok(log.includes('Compraram: Espada Curta!\nAldo equipa (ATQ +3).'));
  assert.ok(run.json('forgeOptions(100, G.gear)').find(o => o.value === 'espadaCurta').disabled, 'no second copy');
});

test('equipment choice: the strongest by default (old saves too), a chosen piece stays worn, Melhor picks the strongest', () => {
  const R = require('../src/uirules.js');
  const { EQUIPS } = require('../src/data.js');
  const owned = ['espadaFerro', 'espadaCurta', 'cotaMalha'];
  assert.equal(R.equippedGear('aldo', 'arma', owned, EQUIPS), 'espadaFerro', 'no choice (old save): the strongest');
  assert.equal(R.equippedGear('aldo', 'arma', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } }), 'espadaCurta');
  assert.equal(R.equippedGear('aldo', 'arma', ['espadaFerro'], EQUIPS, { aldo: { arma: 'espadaCurta' } }), 'espadaFerro', 'a choice no longer owned falls back');
  const list = R.gearChoices('aldo', 'arma', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } });
  assert.deepEqual(list.map(c => [c.id, c.equipped, c.diff]), [['espadaFerro', false, { atk: 3 }], ['espadaCurta', true, {}]]);
  assert.deepEqual(R.bestChoice('aldo', owned, EQUIPS), { arma: 'espadaFerro', armadura: 'cotaMalha' });
  assert.deepEqual(R.bonusDiff('espadaCurta', 'espadaFerro', EQUIPS), { atk: -3 });
  assert.deepEqual(R.equipDelta('espadaPrata', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } }), { atk: 7 }, 'against what is worn, not the best owned');
  const pal = R.bodyPal({ g: 'x' }, 'aldo', ['espadaFerro', 'espadaPrata'], EQUIPS, { espadaFerro: { g: 'ferro' }, espadaPrata: { g: 'prata' } }, { aldo: { arma: 'espadaFerro' } });
  assert.equal(pal.g, 'ferro', 'the weapon in hand is the one worn');
  const bag = R.bagGroups({ inv: {}, key: {}, owned, items: {}, equips: EQUIPS, keyItems: {}, equip: {} }).find(g => g.title === 'Equipamentos').cells;
  assert.deepEqual(bag.map(c => [c.id, c.who, c.inUse]), [['espadaFerro', 'aldo', true], ['espadaCurta', 'aldo', false], ['cotaMalha', 'aldo', true]]);
});
