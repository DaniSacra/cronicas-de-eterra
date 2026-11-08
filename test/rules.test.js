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

test('no text under the body minimum: 16 px on a PC screen, 12 on a phone, in every size of the type scale', () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [844, 390, 3], [390, 844, 3], [1920, 1080, 1], [1000, 650, 1]]) {
    const f = R.fontScale(w, h, dpr), min = R.bodyMin(w, h);
    for (const k of ['f1', 'f2', 'fd']) assert.ok(f[k] >= min, `${w}x${h} ${k} ${f[k]} < ${min}`);
  }
  assert.equal(R.bodyMin(1280, 720), 16);
  assert.equal(R.bodyMin(390, 844), 12);
  // fixed sizes in the stylesheet never go under the phone minimum either (0 hides a glyph behind its icon)
  const css = require('node:fs').readFileSync(`${__dirname}/../style.css`, 'utf8');
  for (const [, n] of css.matchAll(/font-size:\s*([\d.]+)px/g)) assert.ok(+n === 0 || +n >= 12, `font-size ${n}px`);
});

test('fontScale: PC, large PC and phone', () => {
  assert.deepEqual(R.fontScale(1280, 800, 1), { f1: 16, f2: 16, fd: 24 });
  assert.deepEqual(R.fontScale(1000, 650, 1), { f1: 16, f2: 16, fd: 16 }); // 12 would blur at 1x: crispPx rounds it to 16
  assert.deepEqual(R.fontScale(390, 844, 2), { f1: 12, f2: 12, fd: 12 });
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

test('camp menu: a column of icons in three groups; Magia and Item shortcuts on top; Mapa only in the crypt; no Voltar, no coins', () => {
  const labels = m => m.opts.map(o => o.label);
  const town = R.campMenuOpts({ gold: 20, inTown: true, bagCount: 0 });
  assert.deepEqual(labels(town), ['Magia', 'Item', 'Bolsa', 'Livro', 'Heróis', 'Táticas', 'Diário', 'Mundo', 'Salvar', 'Sair']);
  assert.ok(!labels(town).includes('Voltar'));
  assert.deepEqual(town.opts.slice(0, 2).map(o => o.disabled), [true, true], 'nothing to cast or use: grey');
  assert.deepEqual(R.campMenuOpts({ inTown: true, bagCount: 1, itemCount: 1, canCast: true }).opts.slice(0, 2).map(o => o.disabled), [false, false]);
  assert.equal(town.title, undefined, 'the coins are in the corner already');
  assert.equal(town.opts.find(o => o.value === 'bag').disabled, true, 'empty bag in grey');
  assert.deepEqual(town.opts.filter(o => o.sep).map(o => o.label), ['Diário', 'Salvar'], 'a rule above each group');
  assert.ok(town.opts.every(o => o.icon));
  const crypt = R.campMenuOpts({ gold: 40, inTown: false, bagCount: 2 });
  assert.deepEqual(labels(crypt).slice(6, 9), ['Diário', 'Mundo', 'Mapa']);
  assert.equal(crypt.opts.find(o => o.value === 'bag').disabled, false);
  const F = require('../src/frame.js');
  for (const o of crypt.opts) assert.ok(F.ICON_ART[o.icon], o.icon);
});

test('camp menu: one help line for every option, and a red dot on Livro and Diário when something is new', () => {
  for (const inTown of [true, false]) for (const o of R.campMenuOpts({ inTown }).opts) assert.ok(o.help && !o.help.includes('—'), o.value);
  const m = R.campMenuOpts({ inTown: true, dots: { book: true, diary: false } }).opts;
  assert.deepEqual(m.filter(o => o.dot).map(o => o.value), ['book']);
  assert.deepEqual(R.unseen(['aldo:golpe', 'aldo:quebraJunta'], ['aldo:golpe']), ['aldo:quebraJunta']);
  assert.deepEqual(R.unseen(['1', '2'], undefined), [], 'an old save without the list: nothing is new');
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

test('small areas fill the view with a little zoom (never more than 1.5x), the rest keeps the normal scale', () => {
  const cem = { room: { w: 256, h: 192 } };
  assert.deepEqual(R.viewFit(1280, 720), { w: 320, h: 180, s: 4 }, 'unchanged without a room');
  const pc = R.viewFit(1280, 720, cem);
  assert.equal(pc.s, 5);
  assert.ok(pc.w <= 256 && pc.h <= 192, 'on a PC the cemetery covers the whole view');
  const phone = R.viewFit(1170, 2532, cem); // 390x844 at 3x
  assert.equal(phone.s, 6, 'portrait phone: 1.5x the normal 4');
  assert.ok(phone.w <= 256, 'and the cemetery fills the width');
  for (const [w, h] of [[1920, 1080], [2560, 1440], [844 * 3, 390 * 3]]) {
    const n = R.viewFit(w, h), z = R.viewFit(w, h, cem);
    assert.ok(z.s >= n.s && z.s <= Math.floor(n.s * 1.5), `${w}x${h}`);
  }
});

test('portrait phones walk the town about 12 tiles across, at a whole scale; landscape and PC unchanged', () => {
  for (const [bw, bh] of [[1170, 2532], [780, 1688], [1081, 2402], [1080, 2400], [1284, 2778]]) {
    const v = R.viewFit(bw, bh, { minW: R.TOWN_MIN_W });
    assert.ok(v.w >= 160 && v.w <= R.TOWN_MIN_W + 24 && Number.isInteger(v.s) && v.w * v.s >= bw, `${bw}x${bh}: ${JSON.stringify(v)}`);
  }
  assert.deepEqual(R.viewFit(1280, 720, { minW: R.TOWN_MIN_W }), R.viewFit(1280, 720));
  assert.deepEqual(R.viewFit(2532, 1170, { minW: R.TOWN_MIN_W }), R.viewFit(2532, 1170));
  const cem = { w: 256, h: 192 };
  assert.equal(R.viewFit(1170, 2532, { minW: R.TOWN_MIN_W, room: cem }).s, 6, 'small areas: the same zoom as before');
});

test('town camera: centered on the party above the dialog box, small areas centered in the free part', () => {
  assert.equal(R.camAxis(100, 400, 180), 18);
  assert.equal(R.camAxis(390, 400, 180), 220, 'clamped at the bottom edge');
  assert.equal(R.camAxis(390, 400, 180, 60), 280, 'with the box open it may pass the bottom edge');
  assert.equal(R.camAxis(50, 100, 180), -40, 'smaller than the view: centered');
  assert.equal(R.camAxis(50, 100, 180, 60), -10, 'and centered above the box');
  assert.equal(R.camLift(100, 400, 180, 60), 18, 'party already above the box: the camera stays put');
  assert.equal(R.camLift(200, 400, 180, 60), 118, 'party just above the box: no move');
  assert.equal(R.camLift(200, 400, 180, 100), 140, 'party under the box: lifted just enough, not centered (168)');
  assert.equal(R.camLift(200, 400, 180, 170), 203, 'never more than centering above the box');
  assert.equal(R.camLift(170, 400, 180), R.camAxis(170, 400, 180), 'box closed: same as before');
});

test('camp menu Magia: only field spells, with the caster; grey with the reason when short of PM or fallen', () => {
  const { SPELLS } = require('../src/data.js');
  const heroes = [
    { id: 'aldo', name: 'Aldo', hp: 50, mp: 0, spells: ['golpe'] },
    { id: 'lyra', name: 'Lyra', hp: 30, mp: 20, spells: ['fogo', 'gelo'] },
    { id: 'teo', name: 'Teo', hp: 40, mp: 4, spells: ['cura', 'luz', 'reviver'] },
  ];
  const o = R.fieldCasts(heroes, SPELLS);
  assert.deepEqual(o.map(x => [x.label, x.hint, x.disabled]), [['Cura', 'Teo · 3 PM', false], ['Reviver', 'Teo · Faltam 8 PM', true]]);
  assert.deepEqual(o[0].value, { who: 'teo', spell: 'cura' });
  assert.equal(R.fieldCasts([{ ...heroes[2], hp: 0 }], SPELLS)[0].disabled, true);
});
