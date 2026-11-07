const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { story } = require('./harness.js');

test('Lyra has her own entrance: she joins on the first tavern visit, goes to the cemetery with Aldo, and the party meets the elder with four', async () => {
  const { G, log, run } = story(['aldo']);
  run(`enterTown(TAVERN_FRONT, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'tavern').door`));
  await run('enterTavern()');
  assert.deepEqual([...G.party.map(m => m.id)], ['aldo', 'lyra']);
  assert.ok(log.includes('Lyra~alegre:\nALDO!'));
  await run(`talkTo(TOWN.npcs.find(n => n.def.id === 'berta'))`);
  assert.equal(G.seen.job, 1);
  assert.ok(log.includes('Berta:\nVoltem inteiros e o quarto é de vocês. A sopa também.'));
  Object.assign(G.seen, { cem1: 1, cem2: 1, cem3: 1 });
  run(`enterTown({ x: 10, y: 2, dir: 0 }, 'cemiterio')`);
  log.length = 0;
  await run('teoScene()');
  assert.deepEqual([...G.party.map(m => m.id)], ['aldo', 'lyra', 'teo']);
  assert.ok(log.includes('Teo:\nObrigado. Sou Teo. Ainda estou aprendendo, mas um dia quero servir no Templo. Vim ajudar a irmã Irene no inverno.'));
  run(`enterTown(TAVERN_FRONT, 'valmor')`);
  log.length = 0;
  await run('enterTavern()');   // a noite do mensageiro
  assert.equal(G.intro, 1);
  assert.ok(!log.includes('Lyra~alegre:\nALDO!'), 'no second entrance');
  assert.deepEqual([...G.party.map(m => m.id)], ['aldo', 'lyra', 'teo', 'andilla'], 'Andilla joins on the night');
  run(`enterTown(TAVERN_FRONT, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'elder').door`));
  log.length = 0;
  await run('elderTalk()');
  assert.ok(log.some(t => t.includes('Vocês já são quatro. Bom.')), 'the elder sees four');
  assert.ok(log.includes('Ancião Bertoldo:\nSe quase mataram um homem por ela, o que tem dentro é maior que Valmor.'));
});

test('the night: the dice girl plays, stays when the hooded men come, fights unnamed and says her name after the fight', async () => {
  for (const estojo of [true, false]) {
    const { G, log, run } = story(['aldo', 'lyra', 'teo'], { seen: { job: 1, teoWin: 1 }, key: { estojo } });
    run(`startBattle = async (ids, b, o) => { globalThis.at = { ids, party: G.party.map(m => m.id), name: heroName('andilla'), hint: o.hints[0], full: G.party.every(m => m.hp === maxHp(m) && m.mp === maxMp(m)) }; return 'win'; }`);
    run(`enterTown(TAVERN_FRONT, 'valmor'); for (const m of G.party) { m.hp = 3; m.mp = 0; }
      globalThis.savedAt = null; saveGame = () => { if (!globalThis.savedAt) globalThis.savedAt = G.area === 'valmor' && G.town.x === TAVERN_FRONT.x && G.town.y === TAVERN_FRONT.y ? 'TAVERN_FRONT' : G.area; return true; };`);
    await run('enterTavern()');
    const at = run.json('at');
    assert.deepEqual(at.party, ['aldo', 'lyra', 'teo', 'andilla'], 'she is in the party before the fight');
    assert.equal(at.ids.length, 3, 'three hooded men');
    assert.ok(at.full, 'the soup of Berta: the party starts the night fight rested');
    assert.equal(run('globalThis.savedAt'), 'TAVERN_FRONT', 'saved at the tavern door before the night');
    assert.equal(at.name, 'Moça dos dados', 'no name on her card in the fight');
    assert.equal(at.hint, 'Os inimigos agiram primeiro: a ordem de quem age está no topo. A moça dos dados é a mais rápida.');
    const i = t => { const k = log.indexOf(t); assert.ok(k >= 0, t); return k; };
    i('Moça dos dados~alegre:\nNinguém tira. Eu tiro.');
    i('Lyra~alegre:\nVocê nunca vai descobrir como ela faz, Aldo.');
    assert.ok(i('As botas dele estão cobertas de terra úmida. A capa marrom está rasgada na barra. E tem cera de vela na manga.') > i('O mensageiro desmaia. Teo recebe um rolo fechado com o selo real.'));
    assert.ok(i('Ela guarda os dados no bolso. Na outra mão, já tem uma faca.') > i('Encapuzado:\nA carta. E ninguém mais precisa sangrar esta noite.'));
    const name = i('Andilla:\nMe chamam de Andilla. Às vezes é verdade.');
    assert.ok(i('Andilla:\nCapa cinza é a mais barata do sul. Metade desta taverna usa.') > i('Bruno:\nCapa cinza, igual à deles.'), 'the grey cloak keeps the false lead');
    assert.ok(log.slice(0, name).every(t => !t.startsWith('Andilla')), 'no name before she says it');
    assert.ok(name > i('Teo:\nPor isso mesmo. Quem abrir tem de ter o direito.'), 'the introductions come after the letter');
    assert.ok(i('Andilla entrou para o grupo!') > i('Andilla~alegre:\nViu? Eu sempre ganho.'));
    assert.ok(log.includes(estojo ? 'Andilla~alegre:\nMeus ganchos! Achei que tinham ficado para os mortos. Te devo uma, cavaleiro. Eu nunca devo duas.'
      : 'Andilla:\nLarguei meus ganchos lá quando eles me viram. Se acharem, são meus.'));
    assert.equal(G.key.estojo, false);
    assert.ok(!G.seen.andillaAnon && run('heroName("andilla")') === 'Andilla');
    assert.ok(!log.some(t => /cadeira da moça|Sumiu antes|fiar a conta|sopa de amanhã/.test(t)), 'the old lines are gone');
  }
});

test('Lyra asks "por que descer" once, at the old church door, after the party talk and before going down', async () => {
  for (const [k, road] of [['mortos', 'desceu pelos mortos'], ['carta', 'desceu pela carta'], ['ouro', 'desceu pelo ouro']]) {
    const { G, log, picks, run } = story(['aldo', 'teo', 'lyra', 'andilla'], { intro: 1, quest: 1, seen: { job: 1, hugo4: 1 } });
    run(`enterTown(CRYPT_FRONT, 'valmor')`);
    const door = `enterBuilding(BUILDINGS.find(b => b.id === 'crypt'))`;
    picks.push(k, false);
    await run(door);
    assert.equal(G.seen.porque, k);
    const ask = log.indexOf('Lyra:\nAntes de descer, uma pergunta. Por que você vai, maninho?');
    assert.ok(ask > log.findIndex(t => t.startsWith('Lyra:\nConstruíram uma igreja')), 'after the church talk');
    assert.deepEqual(log.slice(-2), ['Andilla:\nVocês dois são sempre assim?', 'Teo:\nDesde ontem, pelo menos.']);
    assert.ok(run('porqueRoad()').includes(road), k);
    log.length = 0; picks.push(false);
    await run(door);
    assert.ok(!log.some(t => t.includes('Por que você vai')), 'only once');
  }
  const { run } = story(['aldo']);
  assert.equal(run('porqueRoad()'), null, 'old saves have no answer: the road line is skipped');
});

test('old save from dawn on without Lyra and Andilla: the arrow sends Aldo to the tavern, where both wait for him', async () => {
  const { G, log, run } = story(['aldo', 'teo'], { intro: 1, seen: { job: 1, teoWin: 1 }, key: { carta: true, estojo: true } });
  run(`enterTown(TAVERN_FRONT, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'tavern').door`));
  await run('enterTavern()');
  assert.ok(log.includes('Lyra~alegre:\nALDO!'));
  assert.ok(G.party.some(m => m.id === 'lyra'));
  assert.deepEqual(run.json('goalSpot()'), run.json(`(n => ({ x: n.x, y: n.y }))(TOWN.npcs.find(n => n.def.id === 'andilla'))`));
  log.length = 0;
  await run(`talkTo(TOWN.npcs.find(n => n.def.id === 'andilla'))`);
  assert.equal(log[0], 'Moça dos dados~alegre:\nVocês de novo. Andilla, prazer. Ouvi dizer que o ancião quer quatro.'); // never said her name in that save
  assert.ok(G.party.some(m => m.id === 'andilla'));
  assert.equal(G.key.estojo, false);
  run(`enterTown(TAVERN_FRONT, 'valmor')`);
  assert.deepEqual(run.json('goalSpot()'), run.json(`BUILDINGS.find(b => b.id === 'elder').door`));
});

test('after the crypt, the village talks about it: curious while the party is still going down, proud and doubtful after the bell stops', async () => {
  const { G, log, run } = story(['aldo', 'teo', 'lyra', 'andilla'], { intro: 1, quest: 1, reached: 1, seen: { job: 1, hugo4: 1 } });
  run(`enterTown({ x: 22, y: 17, dir: 2 }, 'valmor')`);
  const talk = id => run(`talkTo(TOWN.npcs.find(n => n.def.id === '${id}'))`);
  assert.equal(run('stage()'), 'desceu');
  await talk('rui');
  assert.equal(log[0], 'Rui, o lavrador:\nDesceram e voltaram! Viram quem abriu as covas?');
  G.bossDead = true; log.length = 0;
  await talk('rui');
  assert.ok(log.includes('Rui, o lavrador:\nMas aquelas covas cavadas com pá... Morto não usa pá.'));
  for (const id of ['guard', 'lia', 'rui', 'marta', 'tome', 'nino', 'clara'])
    assert.ok(run(`NPC_DEFS.find(n => n.id === '${id}').lines.desceu`), `${id} has something to say after the party goes down`);
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
  assert.ok(log.includes('Clara, a professora:\nEstão bem. Com licença, preciso levar as crianças para casa.'));
  assert.ok(!log.some(t => t.startsWith('Lyra')));
  G.party.push(run(`newMember(PARTY_DEFS.find(d => d.id === 'lyra'))`));
  log.length = 0;
  await clara();
  assert.equal(log[1], 'Lyra~alegre:\nAldo vê a professora. Aldo esquece como se anda.');
  log.length = 0;
  await clara();
  assert.ok(!log.some(t => t.startsWith('Lyra')), 'each scene plays once');
});

test('Clara with Lyra after Aldo saw her alone: "twice in one day" only on the first day; she leaves for home in the afternoon, for class in the morning', async () => {
  const cases = [[{}, 'Duas vezes no mesmo dia, Aldo.', 'preciso levar as crianças para casa'],
    [{ intro: 1 }, 'De novo por aqui?', 'a aula vai começar'], [{ intro: 1, quest: 1 }, 'De novo por aqui?', 'preciso levar as crianças para casa']];
  for (const [extra, again, leave] of cases) {
    const { log, run } = story(['aldo', 'lyra'], { ...extra, seen: { job: 1, 'talk:clara': 1 } });
    run(`enterTown({ x: 12, y: 11, dir: 2 }, 'valmor')`);
    await run(`talkTo(TOWN.npcs.find(n => n.def.id === 'clara'))`);
    assert.ok(log.includes('Clara, a professora:\n' + again), again);
    assert.ok(log.includes(`Clara, a professora:\nOi, Lyra. Com licença, ${leave}.`), leave);
  }
});

test('arrival: Nino tells Aldo about the girl in the purple cape before he sends him off', async () => {
  const { log, run } = story(['aldo']);
  await run('arrivalScene()');
  const i = t => log.indexOf(t);
  assert.ok(i('Nino:\nE tem uma moça de capa roxa na Berta, perguntando de você desde cedo!') > i('Nino:\nEstá! E a professora Clara também. Ela não perguntou de você. Mas olhou pra estrada a semana inteira.'));
  assert.ok(i('Aldo~preocupado:\nCapa roxa? Ah, não.') < i('Aldo~preocupado:\nVai brincar, Nino.'));
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

test('no player text uses an em dash', () => {
  for (const f of fs.readdirSync(`${__dirname}/../src`)) {
    const strings = fs.readFileSync(`${__dirname}/../src/${f}`, 'utf8').match(/'[^'\n]*'|`[^`\n]*`|"[^"\n]*"/g) || [];
    for (const t of strings) assert.doesNotMatch(t, /—/, `${f}: ${t}`);
  }
});

test('after the end the cemetery is calm, and its music is always its own', () => {
  const { run } = story(['aldo']);
  assert.equal(run('cemRoamerCount({ cem1: 1, teoWin: 1 }, false)'), 3);
  assert.equal(run('cemRoamerCount({ cem1: 1, teoWin: 1 }, true)'), 0);
  assert.equal(run('cemRoamerCount({}, false)'), 0);
  assert.equal(run("G.seen.cem3 = G.seen.teoWin = 1, AREAS.cemiterio.music()"), 'cemetery');
});

test('the journal shows the lockpick case only once it was found, and names its owner once she said her name', () => {
  const { run } = story(['aldo', 'andilla']);
  const notes = () => run.json("JOURNAL.notes.filter(n => n.show()).map(n => typeof n.text === 'function' ? n.text() : n.text)").filter(t => t.includes('estojo'));
  assert.deepEqual(notes(), []);
  run('G.seen.estojo = 1');
  assert.ok(notes()[0].endsWith('De quem?'));
  run('G.seen.andillaNome = 1');
  assert.deepEqual(notes(), ['Junto de uma cova cavada, um estojo de ganchos. Era da Andilla.']);
});
