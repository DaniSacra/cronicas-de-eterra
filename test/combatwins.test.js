const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/uirules.js');
const { story } = require('./harness.js');

test('the dice girl is "Moça" on her card and "Mç" in the queue; everyone else keeps the name', () => {
  assert.equal(R.shortName('Moça dos dados'), 'Moça');
  assert.equal(R.shortName('Andilla'), 'Andilla');
  assert.equal(R.queueTag('Moça dos dados'), 'Mç');
  assert.equal(R.queueTag('Lyra'), 'Ly');
});

test('a spell on one enemy says where it fell; on everyone or on allies, just the spell', () => {
  assert.equal(R.spellLine('Lyra', 'Fogo', 'Encapuzado B'), 'Lyra usa Fogo em Encapuzado B!');
  assert.equal(R.spellLine('Andilla', 'Leque', ''), 'Andilla usa Leque!');
});

test('before the Sineiro, a weak party (average level under 4) is warned; a strong one is not', () => {
  assert.match(R.bossWarning([{ lv: 3 }, { lv: 3 }, { lv: 4 }, { lv: 3 }]), /O sino pesa/);
  assert.equal(R.bossWarning([{ lv: 4 }, { lv: 4 }, { lv: 5 }, { lv: 3 }]), '');
});

test('a roamer gives the alert once when it starts chasing, and again only after it lost the party', () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1 } });
  assert.deepEqual(JSON.parse(run(`(() => { const r = {}; return JSON.stringify([spotted(r, false), spotted(r, true), spotted(r, true), spotted(r, false), spotted(r, true)]); })()`)), [false, true, false, false, true]);
  assert.ok(run('CEM_ROAMERS.every(d => d.intro && !d.intro.includes("—"))'), 'each roamer kind has its own line');
});

test('the Teo fight has no forced advantage', () => {
  const src = require('node:fs').readFileSync(`${__dirname}/../src/opening.js`, 'utf8');
  const fight = src.slice(src.indexOf('Duas Ossadas se erguem') - 200, src.indexOf('Duas Ossadas se erguem'));
  assert.ok(!fight.includes("surprise: 'advantage'"));
});

test('the camera room for the dialog box holds through a scene and lets go when the game is free', () => {
  let hold = 0;
  hold = R.dialogPad(hold, 43, true); assert.equal(hold, 43);
  hold = R.dialogPad(hold, 0, true); assert.equal(hold, 43, 'the box closes between lines: the scene stays put');
  hold = R.dialogPad(hold, 30, true); assert.equal(hold, 43, 'a smaller box (no face) does not move it down');
  hold = R.dialogPad(hold, 82, true); assert.equal(hold, 82, 'a bigger box moves it up once');
  assert.equal(R.dialogPad(hold, 0, false), 0, 'free to walk: the camera comes back');
});
