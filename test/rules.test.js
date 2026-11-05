const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/uirules.js');

test('crispPx lands on multiples of 8 device pixels', () => {
  for (const dpr of [1, 1.25, 1.5, 2, 3]) for (const t of [8, 12, 16, 24]) {
    const css = R.crispPx(t, dpr), dev = css * dpr;
    assert.ok(Math.abs(dev / 8 - Math.round(dev / 8)) < 1e-9, `${t}px @${dpr}`);
    assert.ok(dev >= 8);
  }
  assert.equal(R.crispPx(12, 1), 16); // 12 px on a 1× screen would blur: rounds to 16
  assert.equal(R.crispPx(12, 2), 12); // 24 device px: crisp as is
});

test('fontScale: PC, large PC and phone', () => {
  assert.deepEqual(R.fontScale(1280, 800, 1), { f1: 8, f2: 16, fd: 24 });
  assert.deepEqual(R.fontScale(1000, 650, 1), { f1: 8, f2: 16, fd: 16 });
  assert.deepEqual(R.fontScale(390, 844, 2), { f1: 8, f2: 12, fd: 12 });
  assert.deepEqual(R.fontScale(1920, 1080, 1), { f1: 16, f2: 24, fd: 24 });
});

test('place label shows only while walking', () => {
  const base = { areaName: 'Vila de Valmor', floorShort: 'B1', floorName: 'Cripta de Valmor', gold: 20 };
  assert.deepEqual(R.placeLabel({ ...base, mode: 'town' }), { text: 'Vila de Valmor', gold: 20 });
  assert.deepEqual(R.placeLabel({ ...base, mode: 'explore' }), { text: 'B1 · Cripta de Valmor', gold: 20 });
  for (const mode of ['battle', 'title', 'gameover']) assert.equal(R.placeLabel({ ...base, mode }), null, mode);
});

test('enemy health words follow the HP fraction', () => {
  assert.equal(R.healthWord(10, 10), 'ileso');
  assert.equal(R.healthWord(6, 10), 'ferido');
  assert.equal(R.healthWord(3, 10), 'muito ferido');
  assert.equal(R.healthWord(1, 10), 'quase caindo');
});

test('camp menu: coins in the title, Mapa hidden in town, Itens off with an empty bag', () => {
  const labels = m => m.opts.map(o => o.label);
  const town = R.campMenuOpts({ gold: 20, inTown: true, bagCount: 0 });
  assert.equal(town.title, 'Menu · 20 moedas');
  assert.ok(!labels(town).includes('Mapa'));
  assert.equal(town.opts.find(o => o.value === 'item').disabled, true);
  const crypt = R.campMenuOpts({ gold: 40, inTown: false, bagCount: 2 });
  assert.ok(labels(crypt).includes('Mapa'));
  assert.equal(crypt.opts.find(o => o.value === 'item').disabled, false);
  assert.equal(crypt.opts.at(-1).value, null, 'Voltar stays last');
});
