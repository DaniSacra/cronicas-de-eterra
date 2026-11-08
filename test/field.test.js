const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/field.js');
const { FIELD_KINDS, FIELD_VERBS } = require('../src/data.js');
const V = require('../src/vision.js');
const { story } = require('./harness.js');

test('field verbs: each kind answers to its hero, nothing to do once done, a solved pushable is scenery', () => {
  const verb = o => F.fieldVerb(o, FIELD_KINDS, FIELD_VERBS);
  assert.deepEqual([verb({ kind: 'lamp' }).hero, verb({ kind: 'lamp' }).word], ['lyra', 'acende']);
  assert.equal(verb({ kind: 'log' }).hero, 'aldo');
  assert.equal(verb({ kind: 'beam' }).hero, 'andilla');
  assert.equal(verb({ kind: 'chest' }).hero, 'andilla');
  assert.equal(verb({ kind: 'rune' }).hero, 'teo');
  assert.equal(verb({ kind: 'icicles' }).word, 'derrete');
  assert.equal(verb({ kind: 'lamp', done: true }), null);
  assert.equal(verb({ kind: 'log', fixed: true }), null);
  assert.equal(verb({ kind: 'sign' }), null);
  assert.equal(F.fieldHint(verb({ kind: 'lamp' }), 'Lyra'), 'Espaço: Lyra acende');
  assert.equal(F.fieldBlocks({ kind: 'icicles', done: true }, FIELD_KINDS), false, 'melted icicles let the party pass');
  assert.equal(F.fieldBlocks({ kind: 'lamp', done: true }, FIELD_KINDS), true, 'a lit lamp is still a post');
  for (const [k, v] of Object.entries(FIELD_VERBS)) {
    assert.ok(['aldo', 'lyra', 'teo', 'andilla'].includes(v.hero), k);
    for (const [, t] of v.first || []) assert.ok(!t.includes('—'), 'no em dash: ' + t);
  }
});

test('push: one tile ahead when it is free, nothing when it is taken', () => {
  const wall = new Set(['5,3']);
  const blocked = (x, y) => wall.has(x + ',' + y);
  assert.deepEqual(F.pushTarget(5, 5, 0, blocked), { x: 5, y: 4 });
  assert.equal(F.pushTarget(5, 4, 0, blocked), null, 'against a wall or another object');
  assert.deepEqual(F.pushTarget(5, 5, 1, blocked), { x: 6, y: 5 });
});

test('freeze: up to two tiles of running water right ahead, stopping at the first dry one', () => {
  const water = new Set(['3,1', '4,1', '5,1', '3,3']);
  const isWater = (x, y) => water.has(x + ',' + y);
  assert.deepEqual(F.freezeAhead(2, 1, 1, isWater), [[3, 1], [4, 1]]);
  assert.deepEqual(F.freezeAhead(2, 3, 1, isWater), [[3, 3]]);
  assert.deepEqual(F.freezeAhead(2, 2, 1, isWater), []);
});

test('slide: stops before a rock, at the edge of the map, and on the first floor past the ice', () => {
  // row: floor, ice, ice, rock | ice, ice, floor
  const row = ['floor', 'ice', 'ice', 'block', 'ice', 'ice', 'floor'];
  const kindAt = (x, y) => (y !== 0 || x < 0 || x >= row.length ? 'block' : row[x]);
  assert.deepEqual(F.slidePath(0, 0, 1, kindAt), [[1, 0], [2, 0]], 'stops on the ice before the rock');
  assert.deepEqual(F.slidePath(3, 0, 1, kindAt), [[4, 0], [5, 0], [6, 0]], 'leaves the ice and stops on the floor');
  assert.deepEqual(F.slidePath(6, 0, 1, kindAt), [], 'the edge stops it at once');
});

test('light: inside the radius of a lit lamp; a roamer never steps into the light nor chases a party standing in it', () => {
  const lights = [{ x: 10, y: 10, r: 3 }];
  assert.ok(F.litAt(12, 10, lights));
  assert.ok(!F.litAt(14, 10, lights));
  const lit = (x, y) => F.litAt(x, y, lights);
  const free = () => true;
  const wolf = { x: 15, y: 10, home: { x: 15, y: 10 }, range: 3 };
  assert.equal(V.roamerStep(wolf, { x: 11, y: 10 }, 6, free, () => 0, lit).chase, false, 'the party is in the light');
  const near = V.roamerStep(wolf, { x: 17, y: 10 }, 6, free, () => 0, lit);
  assert.equal(near.chase, true, 'out of the light it chases');
  for (let i = 0; i < 40; i++) {
    const s = V.roamerStep({ x: 14, y: 10, home: { x: 14, y: 10 }, range: 2 }, { x: 0, y: 0 }, 2, free, () => (i % 4) / 4, lit);
    if (s.to) assert.ok(!lit(s.to.x, s.to.y), 'wandering never enters the light');
  }
});

test('perched crows only dive at someone walking right beside the dead pine', () => {
  const crow = { x: 5, y: 5, perch: true };
  assert.ok(F.perchedAttack(crow, [{ x: 6, y: 6 }]));
  assert.ok(!F.perchedAttack(crow, [{ x: 7, y: 5 }]), 'two tiles away the party walks around it');
  assert.equal(V.roamerStep({ ...crow, home: crow, range: 2 }, { x: 6, y: 5 }, 6, () => true).to, null, 'a perched crow never walks');
});

test('the shy horse sees a fan in front of it, never behind', () => {
  const h = { x: 10, y: 10 };
  assert.ok(F.inCone(h, 2, { x: 10, y: 11 }));
  assert.ok(F.inCone(h, 2, { x: 12, y: 12 }), 'the fan widens with the distance');
  assert.ok(!F.inCone(h, 2, { x: 12, y: 11 }));
  assert.ok(!F.inCone(h, 2, { x: 10, y: 9 }), 'from behind the horse does not see');
  assert.ok(!F.inCone(h, 2, { x: 10, y: 15 }), 'too far');
  assert.equal(F.coneTiles(h, 2).length, 3 + 5 + 7 + 9);
});

test('an unsolved puzzle starts over when the party walks back in; a solved one stays where it was left', () => {
  const defs = [{ id: 'a', x: 1, y: 1, puzzle: 'p' }, { id: 'b', x: 2, y: 2 }];
  const st = { p: { a: [3, 3], b: [4, 4] }, solved: {} };
  assert.deepEqual(F.fieldPlace(defs, st), [{ id: 'a', x: 1, y: 1 }, { id: 'b', x: 4, y: 4 }]);
  st.solved.p = 1;
  assert.deepEqual(F.fieldPlace(defs, st)[0], { id: 'a', x: 3, y: 3 });
  const all = {};
  assert.deepEqual(F.fieldState(all, 'area:x'), { s: {}, p: {}, tiles: {}, solved: {} }, 'an old save starts every area as drawn');
});

// A small test area on the real engine: a lamp, a log (puzzle "tora": solved once it leaves its spot), water and ice
function testArea(run) {
  run(`
    AREAS.teste = makeArea('Teste', 'TESTE', 8, 6, Uint8Array.from(
      'TTTTTTTT' + 'T......T' + 'T......T' + 'T..~~..T' + 'T......T' + 'TTTTTTTT', ch => ({ T: TILE.TREE, '.': TILE.GRASS, '~': TILE.WATER })[ch]), [], TILE.TREE);
    Object.assign(AREAS.teste, {
      field: () => [{ id: 'lamp1', kind: 'lamp', x: 1, y: 1 }, { id: 'tora', kind: 'log', x: 4, y: 2, puzzle: 'tora' }],
      puzzles: { tora: objs => objs.find(o => o.id === 'tora').x !== 4 },
      freezable: () => true,
    });
  `);
}
const party = ['aldo', 'lyra', 'teo', 'andilla'];

test('the engine: lighting a lamp, pushing a log, freezing water; the state goes into G.field and comes back', async () => {
  const { G, run, log } = story(party);
  testArea(run);
  run(`enterTown({ x: 2, y: 1, dir: 3 }, 'teste')`);
  assert.equal(run('TOWN.walkable(1, 1)'), false, 'the lamp is a post');
  await run('fieldAction(1, 1)()');
  assert.equal(G.field['area:teste'].s.lamp1, 1);
  assert.deepEqual(run.json('fieldLights()'), [{ x: 1, y: 1, r: 3 }]);
  assert.ok(log.includes('Lyra estala os dedos e a chama pula para o pavio.'), 'the first time of Fogo');
  const n = log.length;
  run(`TOWN.objs[0].done = false; delete G.field['area:teste'].s.lamp1`);
  await run('fieldAction(1, 1)()');
  assert.equal(log.length, n, 'the first-time lines play once');
  // push the log east: Aldo stands west of it
  run(`enterTown({ x: 3, y: 2, dir: 1 }, 'teste')`);
  await run('pushObj(fieldObjAt(4, 2), 1, true)');
  assert.deepEqual(run.json(`G.field['area:teste'].p.tora`), [5, 2]);
  assert.equal(G.field['area:teste'].solved.tora, 1);
  assert.equal(run('fieldObjAt(5, 2).fixed'), true, 'solved: the log is scenery now');
  run(`enterTown({ x: 2, y: 1, dir: 0 }, 'teste')`);
  assert.equal(run('fieldObjAt(5, 2).id'), 'tora', 'a solved puzzle stays solved');
  assert.equal(run('TOWN.objs[0].done'), true, 'the lamp stays lit');
  // freeze two tiles of water from (2,3) looking east
  run(`enterTown({ x: 2, y: 3, dir: 1 }, 'teste')`);
  await run('fieldAction(3, 3)()');
  assert.deepEqual(Object.keys(G.field['area:teste'].tiles).sort(), ['3,3', '4,3']);
  assert.equal(run('TOWN.tileAt(4, 3) === TILE.ICE'), true);
});

test('the engine: a pushed object that would stay stuck goes back to its spot when the puzzle is not solved', async () => {
  const { G, run } = story(party);
  testArea(run);
  run(`AREAS.teste.puzzles.tora = () => false`);
  run(`enterTown({ x: 4, y: 3, dir: 0 }, 'teste')`);
  await run('pushObj(fieldObjAt(4, 2), 0, true)');
  assert.deepEqual(run.json(`G.field['area:teste'].p.tora`), [4, 1]);
  run(`enterTown({ x: 2, y: 1, dir: 0 }, 'teste')`);
  assert.equal(run('fieldObjAt(4, 2) && fieldObjAt(4, 2).id'), 'tora', 'back where it started');
  await run('pushObj(fieldObjAt(4, 2), 3, false)'); // pushing against nothing free is just a bump
});

test('the engine: roamers are born again on each visit and fight on contact', () => {
  const { run } = story(party);
  testArea(run);
  run(`AREAS.teste.roamers = () => [{ foe: 'wolf', ids: ['loboGeada'], x: 5, y: 4 }, { foe: 'crow', ids: ['corvo'], x: 6, y: 1, perch: true }]`);
  run(`enterTown({ x: 2, y: 4, dir: 1 }, 'teste')`);
  assert.equal(run('TOWN.roamers.length'), 2);
  assert.equal(run('roamerTouching()'), undefined);
  run(`TOWN.p.x = 4; TOWN.p.y = 4;`);
  assert.equal(run('roamerTouching().def.foe'), 'wolf');
  run(`TOWN.roamers = []; enterTown({ x: 2, y: 4, dir: 1 }, 'teste')`);
  assert.equal(run('TOWN.roamers.length'), 2, 'born again');
});

test('the animals of the map (wolf, crow, four horse coats) are valid grids in the master palette', () => {
  const { GridSprite } = require('../src/gridsprite.js');
  const { inPalette } = require('../src/palette.js');
  const { run } = story(party);
  const defs = run.json('ANIMAL_DEFS');
  assert.deepEqual(Object.keys(defs).sort(), ['crow', 'horse:branco', 'horse:castanho', 'horse:malhado', 'horse:preto', 'wolf']);
  for (const [k, d] of Object.entries(defs)) {
    assert.deepEqual(GridSprite.check(d), [], k);
    assert.strictEqual(d.frames.length, 2, k);
    for (const col of Object.values(d.pal)) assert.ok(inPalette(col), `${k}: ${col}`);
  }
  assert.deepEqual(run.json('HORSE_COATS'), Object.keys(run.json('HORSE_PALS')));
});
