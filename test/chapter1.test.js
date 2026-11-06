const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { story } = require('./harness.js');

test('dawn: Lyra joins in the tavern right after the messenger night, so the party reaches the elder with three', async () => {
  const { G, log, run } = story(['aldo', 'teo'], { seen: { job: 1, teoWin: 1 } });
  run(`enterTown({ x: 7, y: 8, dir: 0 }, 'taverna')`);
  await run('nightScene()');
  assert.deepEqual([...G.party.map(m => m.id)], ['aldo', 'teo', 'lyra']);
  assert.equal(G.intro, 1);
  assert.ok(log.includes('Lyra~alegre:\nALDO!'));
  const joined = log.indexOf('Lyra entrou para o grupo!'), soup = log.indexOf('A sopa da Berta devolve as forças ao grupo.');
  assert.ok(joined > 0 && soup > joined, 'Lyra joins before the soup');
  log.length = 0;
  await run('elderTalk()');
  assert.ok(log.some(t => t.includes('Mas três não descem lá')), 'the elder sees three');
  assert.equal(G.quest, 1);
});

test('introductions call only Andilla, and still work when she is already in the party', async () => {
  {
    const { G, log, run } = story(['aldo', 'teo', 'lyra'], { intro: 1, quest: 1, seen: { job: 1 } });
    run(`enterTown({ x: 7, y: 8, dir: 0 }, 'taverna')`);
    assert.ok(run('needsIntroductions()'));
    await run('introductions()');
    assert.ok(log.includes('Berta:\nEi, você! Venha cá. Esse povo vai descer.'));
    assert.ok(!log.some(t => t.includes('vocês duas')));
    assert.deepEqual([...G.party.map(m => m.id)], ['aldo', 'teo', 'lyra', 'andilla']);
    assert.equal(log.at(-1), 'Berta:\nQuatro. Agora o Hugo deixa passar. Voltem vivos, que a sopa de amanhã já está paga.');
  }
  {
    const { G, log, run } = story(['aldo', 'teo', 'andilla'], { intro: 1, quest: 1, seen: { job: 1, andillaFuga: 1 } });
    run(`enterTown({ x: 7, y: 8, dir: 0 }, 'taverna')`);
    await run('introductions()');
    assert.ok(!log.some(t => t.includes('Venha cá')), 'nobody to call over');
    assert.equal(G.party.length, 3);
  }
});

test('the answer to "por que descer" is stored once and Lyra brings it back on the road', async () => {
  for (const [k, road] of [['mortos', 'desceu pelos mortos'], ['carta', 'desceu pela carta'], ['ouro', 'desceu pelo ouro']]) {
    const { G, log, picks, run } = story(['aldo', 'teo', 'lyra'], { intro: 1, quest: 1, seen: { job: 1 } });
    run(`enterTown({ x: 7, y: 8, dir: 0 }, 'taverna')`);
    picks.push(k);
    await run('introductions()');
    assert.equal(G.seen.porque, k);
    assert.ok(log.some(t => t.startsWith('Lyra') && t.includes(`Aldo diz que é pel`)), k);
    assert.ok(run('porqueRoad()').includes(road), k);
  }
  const { run } = story(['aldo']);
  assert.equal(run('porqueRoad()'), null, 'old saves have no answer: the road line is skipped');
});

test('old save from dawn on without Lyra: she waits in the tavern, the arrow points at her, talking recruits her', async () => {
  const { G, log, run } = story(['aldo', 'teo'], { intro: 1, seen: { job: 1, teoWin: 1 } });
  run(`enterTown({ x: 7, y: 8, dir: 0 }, 'taverna')`);
  const lyra = run(`TOWN.npcs.find(n => n.def.id === 'lyra')`);
  assert.ok(lyra, 'Lyra is in the tavern');
  assert.deepEqual(run.json('goalSpot()'), { x: lyra.x, y: lyra.y });
  await run(`talkTo(TOWN.npcs.find(n => n.def.id === 'lyra'))`);
  assert.equal(log[0], 'Lyra~alegre:\nAté que enfim! Vim ver meu irmão e a fonte. Nessa ordem. Mais ou menos.');
  assert.ok(G.party.some(m => m.id === 'lyra'));
  run(`enterTown({ x: 22, y: 17, dir: 2 }, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'elder').door`));
});

test('goalSpot: the arrow sends an old save without Lyra back to the tavern before the elder', () => {
  const { run } = story(['aldo', 'teo'], { intro: 1, seen: { job: 1, teoWin: 1 } });
  run(`enterTown({ x: 22, y: 17, dir: 2 }, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'tavern').door`));
});

test('Clara: one scene on the first day, another once Lyra is in the party', async () => {
  const { G, log, run } = story(['aldo']);
  run(`enterTown({ x: 12, y: 11, dir: 2 }, 'valmor')`);
  const clara = () => run(`talkTo(TOWN.npcs.find(n => n.def.id === 'clara'))`);
  await clara();
  assert.ok(log.includes('Clara, a professora:\nAldo. Voltou.'));
  assert.ok(!log.some(t => t.startsWith('Lyra')));
  G.party.push(run(`newMember(PARTY_DEFS.find(d => d.id === 'lyra'))`));
  log.length = 0;
  await clara();
  assert.equal(log[1], 'Lyra~alegre:\nAldo vê a professora. Aldo esquece como se anda.');
  log.length = 0;
  await clara();
  assert.ok(!log.some(t => t.startsWith('Lyra')), 'each scene plays once');
});

test('nobody calls Aldo "forasteiro" anymore', () => {
  for (const f of fs.readdirSync(`${__dirname}/../src`)) assert.doesNotMatch(fs.readFileSync(`${__dirname}/../src/${f}`, 'utf8'), /forasteir/i, f);
});

test('the school stands by Clara and the children, and its board remembers Aldo', async () => {
  const { G, log, run } = story(['aldo'], { intro: 1 });
  const b = run.json(`BUILDINGS.find(b => b.id === 'school')`), near = id => {
    const n = run.json(`NPC_DEFS.find(n => n.id === '${id}')`);
    return Math.abs(n.x - b.door.x) + Math.abs(n.y - b.door.y) <= 4;
  };
  for (const id of ['clara', 'nino', 'lia']) assert.ok(near(id), `${id} is next to the school`);
  run(`enterTown({ x: 16, y: 11, dir: 0 }, 'valmor')`);
  await run(`enterBuilding(BUILDINGS.find(b => b.id === 'school'))`);
  assert.ok(log.some(t => t.includes('em letra torta: ALDO.')));
  G.bossDead = true; log.length = 0;
  await run(`enterBuilding(BUILDINGS.find(b => b.id === 'school'))`);
  assert.equal(log.at(-1), 'Embaixo, na letra da Clara: "Voltem."');
});
