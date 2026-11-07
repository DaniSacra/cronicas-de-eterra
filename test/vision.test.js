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

test('the cemetery has random fights, never visible ones: none before the first fixed fight, none after the end', async () => {
  const groups = seen => {
    const { run } = story(['aldo', 'lyra'], { seen: { job: 1, ...seen } });
    run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
    return run('TOWN.A.encounters().length');
  };
  assert.equal(groups({}), 0);
  assert.equal(groups({ cem1: 1 }), 2);
  assert.equal(groups({ cem1: 1, cem2: 1, cem3: 1, teoWin: 1 }), 2);
  const { G, log, run } = story(['aldo', 'lyra'], { seen: { job: 1 } });
  run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
  assert.equal(run('tileSight(areaSeen(), 16, 8, 7, 8, 10, 4)'), 2, 'lit around the party');
  assert.equal(G.explored['area:cemiterio'][1 * 16 + 1], 0, 'the far corner is still dark');
  await run('TOWN.A.onEnter()');
  assert.ok(log.indexOf('Aldo acende o lampião. A névoa engole tudo além da luz.') === log.findIndex(t => t.includes('covas abertas por toda parte')) + 1);
  assert.equal(run('typeof TOWN.roamers'), 'undefined', 'no enemy walks on the map');
});

test('random fights in the open areas follow the crypt rule: none in the first steps, never on a reserved tile', () => {
  const { G, run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1 } });
  run(`enterTown({ x: 8, y: 10, dir: 0 }, 'cemiterio')`);
  run('Math.random = () => 0');
  G.sinceFight = 0;
  for (let i = 0; i < 4; i++) assert.equal(run('wildStep(4, 6)'), null, 'step ' + i);
  assert.ok(run('wildStep(4, 6)'), 'the fifth step can bring a fight');
  assert.equal(G.sinceFight, 0);
  G.sinceFight = 30;
  assert.equal(run('wildStep(5, 8)'), null, 'a fixed fight spot');
  assert.equal(run('wildStep(7, 2)'), null, 'the Teo spot');
  assert.equal(run('wildStep(8, 10)'), null, 'the entrance');
  run(`enterTown({ x: 20, y: 18, dir: 0 }, 'valmor')`);
  assert.equal(run('wildStep(20, 18)'), null, 'no fights in the village');
  assert.ok(run('CEM_ENCOUNTERS.every(d => d.intro && d.ids.length)'));
});

test('walking the open area brings the fight with the steps, and the party goes on after it', async () => {
  const { G, run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1 } });
  run(`enterTown({ x: 4, y: 6, dir: 0 }, 'cemiterio')`);
  run(`globalThis.fought = []; startBattle = async (ids, boss, o) => { fought.push(o.intro); return 'win'; }`);
  run('Math.random = () => 0');
  G.sinceFight = 10;
  await run('wildFight(wildStep(4, 6))');
  assert.deepEqual(run.json('fought'), ['Um rato sai da névoa!']);
  assert.equal(G.mode, 'town');
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
      'Aldo:\nSe alguém tirou um rei daquele buraco, não foi para deixar ele quieto. Eu vou. Por Valmor.',
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
