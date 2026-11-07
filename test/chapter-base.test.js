const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { story } = require('./harness');

test('crypt floors keep numeric keys; later floors use their id', () => {
  const { run } = story(['aldo']);
  assert.strictEqual(run('floorKey(0)'), '0');
  run(`FLOORS.push({ id: 'mina1' })`);
  assert.strictEqual(run('floorKey(1)'), 'mina1');
});

test('old 3-floor saves start the crypt over; saves on a new floor find it by id', () => {
  const { run } = story(['aldo']);
  run(`FLOORS.push({ id: 'mina1' }, { id: 'mina2' })`);
  assert.strictEqual(run('savedFloor({ floor: 1 })'), 0);   // old crypt B2: not the mine
  assert.strictEqual(run('savedFloor({ floor: 2 })'), 0);
  assert.strictEqual(run('savedFloor({ floor: 0 })'), 0);
  assert.strictEqual(run(`savedFloor({ floor: 2, floorId: 'mina2' })`), 2);
  assert.strictEqual(run(`savedFloor({ floor: 7, floorId: 'mina1' })`), 1);
});

test('only old crypt keys count as the 3-floor version', () => {
  const { run } = story(['aldo']);
  assert.strictEqual(run(`oldCryptKey('1:3,4')`), true);
  assert.strictEqual(run(`oldCryptKey('0:3,4')`), false);
  assert.strictEqual(run(`oldCryptKey('mina1:3,4')`), false);
});

test('the save keeps chapter, part and the floor id; old saves default to the prologue', () => {
  const src = fs.readFileSync(`${__dirname}/../src/main.js`, 'utf8');
  assert.match(src, /floorId: floorKey\(G\.floor\), chapter: G\.chapter, part: G\.part/);
  assert.match(src, /G\.chapter = s\.chapter \|\| 0; G\.part = s\.part \|\| 0/);
  assert.match(src, /async function endScreen\(title, lines, stayLabel\)/);
});
