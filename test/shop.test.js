const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');
const R = require('../src/uirules.js');
const { EQUIPS } = require('../src/data.js');
const STAT_NAMES = { atk: 'ATQ', def: 'DEF', mag: 'MAG', res: 'RES', agi: 'AGI' };

test('shop: the total, the coins and the bag after, and the max the purse pays for', () => {
  assert.deepEqual(R.buyPreview(180, 15, 4, 3), { total: 45, gold: [180, 135], have: [4, 7], ok: true });
  assert.equal(R.buyPreview(40, 15, 0, 3).ok, false, 'three cost more than the purse');
  assert.equal(R.buyPreview(40, 15, 0, 0).ok, false, 'nothing to buy');
  assert.equal(R.buyMax(180, 15), 12);
  assert.equal(R.buyMax(14, 15), 0, 'no coins: the item is greyed out');
  assert.equal(R.buyMax(5000, 15), 99);
});

test('Dora sells qty of one item and never more than the purse pays for', () => {
  const { G, run } = story(['aldo'], { gold: 180, inv: { pocao: 4 } });
  assert.equal(run("buyItem('pocao', 3)"), true);
  assert.equal(G.gold, 135); assert.equal(G.inv.pocao, 7);
  assert.equal(run("buyItem('pena', 3)"), false, '180 coins do not pay three Penas');
  assert.equal(G.gold, 135); assert.equal(G.inv.pena, undefined);
});

test('forge: each piece against what its hero has (▲ the gain, ▼ greyed out when weaker or bought)', () => {
  const cmp = (id, owned, choice) => R.forgeCompare(id, owned, EQUIPS, STAT_NAMES, choice);
  assert.deepEqual(cmp('cajadoFreixo', []), { ok: true, now: null, diff: { mag: 2 }, text: '▲ MAG +2' });
  assert.deepEqual(cmp('espadaCurta', ['espadaFerro']), { ok: false, text: '▼ mais fraca que a Espada de Ferro' });
  assert.deepEqual(cmp('macaFerro', ['mantoSagrado']).text, '▲ ATQ +2', 'another slot does not count');
  assert.deepEqual(cmp('habitoForrado', ['mantoSagrado']), { ok: false, text: '▼ mais fraco que o Manto Sagrado' });
  assert.deepEqual(cmp('gibao', ['gibao']), { ok: false, text: 'Já comprado' });
  assert.deepEqual(cmp('capaLa', ['capaLa']), { ok: false, text: 'Já comprada' });
  assert.deepEqual(R.forgeFilter(['espadaCurta', 'cajadoFreixo', 'capaLa'], EQUIPS, 'lyra'), ['cajadoFreixo', 'capaLa']);
  assert.equal(R.forgeFilter(['espadaCurta', 'cajadoFreixo'], EQUIPS, 'all').length, 2);
});

test('Gaspar: "Comprar e equipar" wears the piece, "Só comprar" keeps what the hero had, both pay', () => {
  const { G, run } = story(['aldo', 'lyra'], { gold: 180 });
  assert.equal(run("buyGear('cajadoFreixo', false, [])"), true);
  assert.equal(G.gold, 125); assert.deepEqual([...G.gear], ['cajadoFreixo']);
  assert.equal(run("equippedGear('lyra', 'arma', G.gear, EQUIPS, G.equip)"), null, 'still the starting staff');
  assert.equal(G.party[1].bonus.mag || 0, 0);
  assert.equal(run("buyGear('espadaCurta', true, [])"), true);
  assert.equal(run("equippedGear('aldo', 'arma', G.gear, EQUIPS, G.equip)"), 'espadaCurta');
  assert.equal(G.party[0].bonus.atk, 3);
  assert.equal(run("buyGear('espadaCurta', true, G.gear)"), false, 'bought already');
  G.gold = 10;
  assert.equal(run("buyGear('gibao', true, G.gear)"), false, 'no coins');
  assert.equal(G.gold, 10);
});
