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
  assert.deepEqual(R.fontScale(1280, 800, 1), { f1: 16, f2: 16, fd: 24 });
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
  assert.equal(crypt.opts.at(-2).value, 'quit', 'Sair right before Voltar');
});

test('equipment screen: gear grouped by hero and slot', () => {
  const EQ = { a: { name: 'Espada', who: 'aldo', slot: 'arma', bonus: { atk: 6 } }, b: { name: 'Cota', who: 'aldo', slot: 'armadura', bonus: { def: 6 } },
    c: { name: 'Cajado', who: 'lyra', slot: 'arma', bonus: { mag: 6 } } };
  const aldo = R.heroGear('aldo', ['a', 'b', 'c'], EQ);
  assert.deepEqual(aldo.map(s => s.slot), ['arma', 'armadura']);
  assert.deepEqual(aldo[0].items.map(i => i.name), ['Espada']);
  assert.deepEqual(aldo[1].items.map(i => i.name), ['Cota']);
  assert.deepEqual(R.heroGear('teo', ['a', 'c'], EQ).map(s => s.items.length), [0, 0]);
  assert.equal(R.bonusText({ def: 5, mag: 5 }, { def: 'DEF', mag: 'MAG' }), 'DEF +5, MAG +5');
});

test('party talk: plays once per save and skips heroes not in the party', () => {
  const seen = {};
  assert.equal(R.takeTalk(seen, 'olho'), true);
  assert.equal(R.takeTalk(seen, 'olho'), false, 'second time is skipped');
  assert.equal(seen['talk:olho'], 1, 'saved in G.seen');
  assert.equal(R.takeTalk(seen, 'altar'), true, 'other talks are independent');
  const lines = [['aldo', 'a'], ['lyra', 'b'], [null, 'narração'], ['Bilhete', 'c'], ['andilla', 'd']];
  const heroes = ['aldo', 'teo', 'lyra', 'andilla'];
  const got = R.talkLines(lines, heroes, id => id === 'aldo' || id === 'andilla').map(l => l[1]);
  assert.deepEqual(got, ['a', 'narração', 'c', 'd']);
});

test('speaker mood: "Aldo~bravo" shows Aldo with the angry face', () => {
  assert.deepEqual(R.splitMood('Aldo~bravo'), { name: 'Aldo', mood: 'bravo' });
  assert.deepEqual(R.splitMood('Guarda Hugo'), { name: 'Guarda Hugo', mood: null });
  assert.deepEqual(R.splitMood('Aldo~sono'), { name: 'Aldo~sono', mood: null }, 'unknown moods are not stripped');
  assert.deepEqual(R.splitMood(null), { name: null, mood: null });
});

test('party card face: worried when hurt, fierce on its battle turn', () => {
  assert.equal(R.cardMood(50, 50, false), 'normal');
  assert.equal(R.cardMood(50, 50, true), 'bravo');
  assert.equal(R.cardMood(10, 50, true), 'preocupado');
  assert.equal(R.cardMood(0, 50, true), 'normal');
});

test('crypt light: warm next to the torch, cold blue far away, changing smoothly', () => {
  const [nr, , nb] = R.torchTint(0.5), [fr, , fb] = R.torchTint(10);
  assert.ok(nr > nb, 'near is warm');
  assert.ok(fb > fr, 'far is cold');
  let last = R.torchTint(0);
  for (let d = 0.25; d < 8; d += 0.25) { const t = R.torchTint(d); assert.ok(t[0] <= last[0] && t[2] >= last[2], `d=${d}`); last = t; }
});
