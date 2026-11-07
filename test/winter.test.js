const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { inPalette } = require('../src/palette.js');
const { TownArt } = require('../src/townart.js');

// The town scripts are browser globals: run them in one context, as index.html does
function loadTown() {
  const ctx = { console };
  vm.createContext(ctx);
  for (const f of ['palette', 'data', 'map', 'town']) vm.runInContext(fs.readFileSync(`${__dirname}/../src/${f}.js`, 'utf8'), ctx, { filename: f });
  return vm.runInContext('({ AREAS, LAMPS, TILE, WALKABLE, NPC_DEFS, BUILDINGS, CRYPT_FRONT, TDIRS })', ctx);
}

test('winter colors come from the master palette', () => {
  for (const c of TownArt.WINTER_COLORS) assert.ok(inPalette(c), c);
});

test('light pools: whole-pixel rings, smaller inside, warmer inside; the center keeps a little dusk (gold, not a spotlight)', () => {
  for (const r of [12, 13, 22, 30]) {
    const rings = TownArt.lightRings(r);
    let left = 1;
    rings.forEach((g, i) => {
      assert.ok(Number.isInteger(g.r) && g.r > 0, `r=${r}`);
      if (i) assert.ok(g.r < rings[i - 1].r, `r=${r} ring ${i}`);
      left *= 1 - g.cut;
    });
    assert.ok(left > 0.15 && left < 0.25, `center keeps ${left} of the dusk`);
    rings.forEach((g, i) => { if (i) assert.ok(g.warm > rings[i - 1].warm, 'warmer towards the lamp'); });
  }
});

test('chimney smoke rises, grows and fades out', () => {
  for (let seed = 0; seed < 6; seed++) for (let now = 0; now < 6000; now += 37) {
    const puffs = [...Array(TownArt.PUFFS).keys()].map(k => TownArt.smokePuff(k, now, seed)).filter(Boolean);
    assert.ok(puffs.length >= TownArt.PUFFS - 1);
    for (const p of puffs) { assert.ok(p.dy <= 0); assert.ok(p.s >= 2 && p.s <= 5); }
    const byHeight = puffs.slice().sort((a, b) => b.dy - a.dy);
    for (let i = 1; i < byHeight.length; i++) assert.ok(byHeight[i].s >= byHeight[i - 1].s, 'higher puffs are not smaller');
  }
});

test('snowflakes stay on screen', () => {
  for (let i = 0; i < 40; i++) for (let now = 0; now < 200000; now += 997) {
    const f = TownArt.flake(i, now, 320, 200);
    assert.ok(f.x >= 0 && f.x < 320 && f.y >= 0 && f.y < 200, `${i} @${now}`);
    assert.ok(inPalette(f.col));
  }
});

test('street lamps block nothing: each sits on its own tile by a street and every door and villager stays reachable', () => {
  const { AREAS, LAMPS, TILE, WALKABLE, NPC_DEFS, BUILDINGS, CRYPT_FRONT, TDIRS } = loadTown();
  const A = AREAS.valmor, at = (x, y) => A.g[y * A.W + x];
  const free = (x, y) => x >= 0 && y >= 0 && x < A.W && y < A.H && WALKABLE.has(at(x, y)) && A.bld[y * A.W + x] < 0;
  for (const [x, y] of LAMPS) {
    assert.ok(!free(x, y), `lamp ${x},${y} is an obstacle`);
    assert.ok(A.bld[y * A.W + x] < 0, `lamp ${x},${y} not inside a building`);
    assert.ok(!NPC_DEFS.some(n => n.x === x && n.y === y), `lamp ${x},${y} not on a villager`);
    assert.ok(TDIRS.some(([dx, dy]) => at(x + dx, y + dy) === TILE.PATH), `lamp ${x},${y} by a street`);
  }
  const seen = new Set([`${CRYPT_FRONT.x},${CRYPT_FRONT.y}`]), queue = [[CRYPT_FRONT.x, CRYPT_FRONT.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of TDIRS) { const k = `${x + dx},${y + dy}`; if (!seen.has(k) && free(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); } }
  }
  for (const b of BUILDINGS) assert.ok(seen.has(`${b.door.x},${b.door.y + 1}`), `door of ${b.id}`);
  for (const n of NPC_DEFS) if (n.id !== 'guard') assert.ok(TDIRS.some(([dx, dy]) => seen.has(`${n.x + dx},${n.y + dy}`)), `villager ${n.id}`);
});

test('tavern interior colors come from the master palette, and the room has firelight', () => {
  for (const c of TownArt.INTERIOR_COLORS) assert.ok(inPalette(c), c);
  const { AREAS } = loadTown();
  assert.match(AREAS.taverna.cozy, /^rgba\(/, 'the tavern gets a warm veil with light pools');
});
