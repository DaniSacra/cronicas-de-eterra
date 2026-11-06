const test = require('node:test');
const assert = require('node:assert/strict');
const { Folk } = require('../src/folk.js');

test('walking runs a four-beat cycle: step A, pass, step B, pass', () => {
  const a = { x: 3, y: 4, t: 0.2, frame: 1 };
  assert.equal(Folk.pose(a, 0), 1);
  assert.equal(Folk.pose({ ...a, t: 0.7 }, 0), 3);
  assert.equal(Folk.pose({ ...a, frame: 0 }, 0), 2);
  assert.equal(Folk.pose({ ...a, frame: 0, t: 0.9 }, 0), 3);
});

test('standing still breathes: two idle poses that alternate, not in step for everyone', () => {
  const seen = new Set(), at0 = new Set();
  for (let now = 0; now < 4000; now += 100) seen.add(Folk.pose({ x: 5, y: 5, t: 1 }, now));
  assert.deepEqual([...seen].sort(), [0, 4]);
  for (let x = 0; x < 8; x++) at0.add(Folk.pose({ x, y: 2, t: 1 }, 0));
  assert.equal(at0.size, 2, 'villagers do not all breathe together');
});
