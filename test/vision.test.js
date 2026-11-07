const test = require('node:test');
const assert = require('node:assert/strict');
const { story, battle } = require('./harness.js');
const V = require('../src/vision.js');

test('each tile is dark, fog or lit for a position and a radius', () => {
  const W = 10, H = 8, seen = new Uint8Array(W * H);
  V.markSight(seen, W, H, 2, 2, 2);
  assert.equal(V.tileSight(seen, W, 2, 4, 2, 2, 2), V.SIGHT.LIT, 'two tiles away is inside the radius');
  assert.equal(V.tileSight(seen, W, 4, 4, 2, 2, 2), V.SIGHT.DARK, 'the corner of the square is outside the circle');
  assert.equal(V.tileSight(seen, W, 2, 4, 7, 5, 2), V.SIGHT.FOG, 'seen before, now out of reach');
  assert.equal(V.tileSight(seen, W, 9, 0, 7, 5, 2), V.SIGHT.DARK, 'never seen');
});

test('seen tiles of an area live in G.explored next to the crypt floors and survive the save; old saves start in the dark', () => {
  const ex = { 0: new Uint8Array([1, 0, 1]) };
  const seen = V.seenTiles(ex, V.areaKey('cemiterio'), 16 * 12);
  V.markSight(seen, 16, 12, 8, 10, 4);
  const back = V.unpackExplored(JSON.parse(JSON.stringify(V.packExplored(ex))));
  assert.deepEqual([...back[0]], [1, 0, 1], 'the crypt floor is still there');
  assert.deepEqual([...back['area:cemiterio']], [...seen]);
  const old = V.unpackExplored({ 0: [1, 1] });
  assert.ok(V.seenTiles(old, 'area:cemiterio', 16 * 12).every(v => v === 0), 'an old save has the whole cemetery dark');
});

test('a roamer wanders near home while it cannot see the party, and comes around obstacles once it does', () => {
  const wall = new Set(['3,1', '3,2', '3,3']);
  const free = (x, y) => x >= 0 && y >= 0 && x < 10 && y < 6 && !wall.has(x + ',' + y);
  const r = { x: 1, y: 2, home: { x: 1, y: 2 }, range: 1 };
  for (let i = 0; i < 200; i++) {
    const { to, chase } = V.roamerStep(r, { x: 9, y: 5 }, 3, free);
    assert.equal(chase, false);
    if (to) { assert.ok(Math.abs(to.x - 1) <= 1 && Math.abs(to.y - 2) <= 1, 'stays near home'); assert.ok(free(to.x, to.y)); }
  }
  const { to, chase } = V.roamerStep(r, { x: 4, y: 2 }, 3, free);
  assert.equal(chase, true);
  assert.ok(free(to.x, to.y));
  assert.equal(V.pathStep({ x: 2, y: 2 }, { x: 4, y: 2 }, free).y !== 2, true, 'goes around the wall, not through it');
  assert.equal(V.roamerStep({ ...r, calm: 500 }, { x: 2, y: 2 }, 3, free).chase, false, 'calm after a flight: it does not chase');
});

test('cemetery roamers: none before the first fixed fight, two after it, three after Teo; the vision lamp lights the entrance', async () => {
  const count = seen => {
    const { run } = story(['aldo', 'lyra'], { seen: { job: 1, ...seen } });
    run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
    return run('TOWN.roamers.length');
  };
  assert.equal(count({}), 0);
  assert.equal(count({ cem1: 1 }), 2);
  assert.equal(count({ cem1: 1, cem2: 1, cem3: 1, teoWin: 1 }), 3);
  const { G, log, run } = story(['aldo', 'lyra'], { seen: { job: 1 } });
  run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
  assert.equal(run('tileSight(areaSeen(), 16, 8, 7, 8, 10, 4)'), 2, 'lit around the party');
  assert.equal(G.explored['area:cemiterio'][1 * 16 + 1], 0, 'the far corner is still dark');
  await run('TOWN.A.onEnter()');
  assert.ok(log.indexOf('Aldo acende o lampião. A névoa engole tudo além da luz.') === log.findIndex(t => t.includes('covas abertas por toda parte')) + 1);
  run(`TOWN.p.x = 4; TOWN.p.y = 8`);
  await run(`cemFight(TOWN.npcs.find(n => n.def.id === 'rato'))`);
  assert.equal(run('TOWN.roamers.length'), 2, 'they show up right after the first fight');
  assert.ok(run('TOWN.roamers.every(r => (r.x - 4) ** 2 + (r.y - 8) ** 2 > 25)'), 'away from the party');
});

test('a roamer never steps on a fixed fight, the Teo spot, the gate or the entrance', () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1, cem2: 1, cem3: 1, teoWin: 1 } });
  run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
  run(`TOWN.roamers.push(...[[9, 2], [12, 2], [4, 8], [8, 9]].map(([x, y]) => ({ ...newActor(x, y, 2), def: CEM_ROAMERS[0], home: { x, y }, range: 3, wait: 0, calm: 0 })))`);
  for (let i = 0; i < 3000; i++) {
    if (i % 500 === 0) run(`TOWN.p.x = ${[8, 10, 6, 12, 4, 9][i / 500]}; TOWN.p.y = ${[10, 2, 8, 4, 6, 8][i / 500]}`);
    run(`for (const r of TOWN.roamers) { const { to } = roamerStep(r, TOWN.p, 4, roamFree); if (to && roamFree(to.x, to.y)) { r.x = to.x; r.y = to.y; } }`);
    assert.ok(run('TOWN.roamers.every(r => !CEM_RESERVED.has(r.x + "," + r.y))'), 'step ' + i);
  }
  assert.ok(run('CEM_ROAM_SPOTS.every(([x, y]) => !CEM_RESERVED.has(x + "," + y) && TOWN.walkable(x, y))'));
});

test('beating a roamer removes it; fleeing sends it back a few tiles, calm for a while', async () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1 } });
  run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
  run(`const r = TOWN.roamers[0]; Object.assign(r, { x: 6, y: 10, fx: 6, fy: 10 }); globalThis.r0 = r`);
  run(`startBattle = async () => 'fled'`);
  await run('roamerFight(r0)');
  assert.equal(run('TOWN.roamers.includes(r0)'), true);
  assert.ok(run('r0.calm') > 0);
  assert.ok(run('Math.abs(r0.x - TOWN.p.x) + Math.abs(r0.y - TOWN.p.y)') > 2, 'it backed off');
  run(`startBattle = async () => 'win'`);
  await run('roamerFight(r0)');
  assert.equal(run('TOWN.roamers.includes(r0)'), false);
});

test('the tunnel clue lies on the only way from the stairs to the fountain and the last door', () => {
  const { run } = story(['aldo']);
  const m = run.json('(m => ({ size: m.size, grid: [...m.grid], objects: m.objects, clue: m.clue, dist: [...m.dist] }))(generateFloor(0))');
  assert.ok(m.clue, 'the crypt has a clue');
  const N = m.size, at = (x, y) => y * N + x, reach = new Set([at(1, 1)]), q = [[1, 1]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (m.grid[at(nx, ny)] === 1 || reach.has(at(nx, ny)) || (nx === m.clue.x && ny === m.clue.y)) continue;
      reach.add(at(nx, ny)); q.push([nx, ny]);
    }
  }
  for (const type of ['fountain', 'boss']) {
    const o = m.objects.find(o => o.type === type);
    assert.ok(!reach.has(at(o.x, o.y)), `no way to the ${type} without passing the clue`);
  }
  const f = m.objects.find(o => o.type === 'fountain');
  assert.ok(m.dist[at(m.clue.x, m.clue.y)] < m.dist[at(f.x, f.y)], 'before the note at the fountain');
});

test('the Sineiro whispers a name once, on the second round, to the first one standing among Teo, Lyra, Andilla and Aldo', async () => {
  const { G, log, run, ctx } = battle(['aldo', 'lyra', 'teo'], () => null);
  run(`B = { round: 1, enemies: makeEnemies(['sineiro']), fx: [], nums: [] }`);
  await run('bossAct(B.enemies[0])');
  assert.ok(!log.some(t => t.includes('sussurra')), 'not on the first round');
  G.party.find(m => m.id === 'teo').hp = 0;
  run('B.round = 2');
  await run('bossAct(B.enemies[0])');
  await run('bossAct(B.enemies[0])');
  assert.deepEqual(log.filter(t => t.includes('sussurra')), ['O Sineiro sussurra: "Lyra... o sino vai tocar por você."']);
  assert.deepEqual(ctx.kept, ['sussurro'], 'kept in the save, so a retry after a loss does not repeat it');
});

test('the road talk: Aldo, the answer from the church door if there is one, then Valmor, the letter, the fountains and the rich city', async () => {
  for (const porque of ['ouro', undefined]) {
    const { log, run } = story(['aldo', 'teo', 'lyra', 'andilla'], { bossDead: true, seen: porque ? { porque } : {} });
    await run(`partyTalk('estrada', TALKS.estrada)`);
    assert.deepEqual(log, [
      'Aldo:\nFui contratado para olhar umas covas. E agora vou para a capital.',
      ...(porque ? ['Lyra:\nAldo desceu pelo ouro. Voltou sem nenhum. Aldo está feliz mesmo assim.'] : []),
      'Aldo:\nSe alguém tirou um rei daquele buraco, não foi para deixar ele quieto. Eu vou.',
      'Lyra~alegre:\nVocê diz que vai por Valmor. Eu ouço: por uma certa professora.',
      'Aldo~bravo:\nLyra.',
      'Teo:\nA carta vai até a rainha. Até lá, ninguém toca nela.',
      'Lyra:\nDizem que Erukh tem fontes em todas as praças. Quero ver se alguma lembra.',
      'Andilla~alegre:\nE é a cidade mais rica do oeste. Eu vou junto. Pela carta, claro.',
    ]);
  }
});

test('the tomb talk ends on Aldo\'s silence; Lyra\'s "inteiro" line moved to right after the Sineiro falls', () => {
  const { run } = story(['aldo']);
  assert.equal(run('TALKS.tumulo.at(-1)[1]()'), 'Aldo ficou quieto. Quando Aldo fica quieto assim, é raiva.');
  assert.ok(!run.json('TALKS.tumulo').some(l => String(l[1]).includes('remendo')));
});
