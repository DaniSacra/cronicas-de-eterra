const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { story, battle, barHero } = require('./harness.js');

test('starting over asks before replacing a save, with No selected', async () => {
  const { run } = story(['aldo']);
  run(`UI.choose = async (opts, o) => { globalThis.asked = o; return false; }`);
  assert.equal(await run('replaceSaveOk(true)'), false, 'No keeps the save');
  assert.equal(run('asked.start'), false);
  assert.match(run('asked.title'), /substituído/);
  run(`UI.choose = async () => true`);
  assert.equal(await run('replaceSaveOk(true)'), true);
  run(`globalThis.asked = null; UI.choose = async (opts, o) => { globalThis.asked = o; return false; }`);
  assert.equal(await run('replaceSaveOk(false)'), true, 'without a save there is nothing to ask');
  assert.equal(run('asked'), null);
});

test('town menus about PV and PM show the party strip; story choices do not', async () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1 } });
  run(`globalThis.seenParty = []; UI.choose = async (opts, o) => { seenParty.push(!!(o && o.party)); return null; }`);
  await run('chapel()'); await run('shop()');
  await run(`pickAlly('ally', 'Em quem?')`);
  assert.deepEqual(run.json('seenParty'), [true, true, true]);
  run(`seenParty.length = 0; UI.choose = async (opts, o) => { seenParty.push(!!(o && o.party)); return opts[0].value; }`);
  await run('askPorque()');
  assert.deepEqual(run.json('seenParty'), [false], 'a story choice leaves the scene alone');
});

test('Fugir in the boss fight shows the line and the same hero chooses again', async () => {
  const bars = [];
  const { log, run } = battle(['aldo'], (opts, o, run) => {
    const h = barHero(o);
    if (!h) return opts.find(x => !x.disabled).value;
    bars.push(run('B.round'));
    if (bars.length === 1) return 'run';
    run('B.enemies.forEach(e => { e.hp = 0; })'); return 'def';
  });
  run(`ENEMIES.boneco.boss = true; ENEMIES.boneco.say = { noRun: 'O chefe barra a porta.', stagger: 'Cai.', intro: 'Oi.' }`);
  await run(`startBattle(['boneco'], true, { surprise: 'normal' })`);
  assert.deepEqual(bars, [1, 1], 'the same round, the same hero');
  assert.ok(log.includes('O chefe barra a porta.'));
  assert.ok(!log.some(t => /tenta fugir/.test(t)), 'no turn spent trying');
});

test('faith is never on the hooded men side', () => {
  const src = ['opening', 'data', 'town', 'main'].map(f => fs.readFileSync(`${__dirname}/../src/${f}.js`, 'utf8')).join('\n');
  assert.ok(!/eles rezam|cova não reza|adoram Morvath/.test(src));
  assert.ok(src.includes('é por ele que eles esperam') && src.includes('servem a Morvath'));
});

test('Dora greets Aldo on the first visit, then by stage, and sees a heavy purse after the boss', () => {
  const { run } = story(['aldo']);
  assert.equal(run(`doraHello('quest', 0, true, 'Aldo')`), 'Aldo! O freguês que nunca tem moeda. Para a cripta? Poção primeiro, coragem depois.');
  assert.equal(run(`doraHello('start', 0, true, 'Aldo')`), 'Aldo! O freguês que nunca tem moeda. O que vai ser?');
  assert.equal(run(`doraHello('desceu', 0, false, 'Aldo')`), 'Voltaram! Lá embaixo poção some rápido, né?');
  assert.equal(run(`doraHello('won', 10, false, 'Aldo')`), 'Os heróis de Valmor! Ainda sem moeda, aposto.');
  assert.equal(run(`doraHello('won', 300, false, 'Aldo')`), 'Os heróis de Valmor! E com a bolsa pesada, pela primeira vez.');
});

test('Gaspar speaks of the cleric only when Teo is in the party', async () => {
  for (const [ids, want, not] of [[['aldo'], 'Luz faz mais que espada', 'clérigo'], [['aldo', 'teo'], 'clérigo', 'Luz faz mais']]) {
    const { log, run } = story(ids);
    run(`enterTown({ x: 10, y: 12, dir: 0 }, 'valmor')`);
    await run(`enterBuilding({ id: 'smith' })`);
    assert.ok(log.some(t => t.includes(want)), want);
    assert.ok(!log.some(t => t.includes(not)), not);
  }
});

test('the elder warns about the name once the party has read it', async () => {
  const { log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], { intro: 1, quest: 1, reached: 1, seen: { job: 1, lapide: 1 } });
  await run('elderTalk()');
  assert.ok(log.some(t => t.includes('Então vocês leram o nome.')));
  assert.ok(!log.some(t => t.includes('procurem a fonte de luz')));
});

test('before Berta asks, Ana and Rui send Aldo to her', async () => {
  const { run } = story(['aldo']);
  const ana = () => run(`TAVERN_AFTERNOON.find(n => n.id === 'ana').lines.arrive[0]()`);
  const rui = () => run(`TAVERN_AFTERNOON.find(n => n.id === 'rui').lines.arrive[0]()`);
  assert.match(ana(), /A Berta está te esperando/);
  assert.match(rui(), /Fala com a Berta/);
  run('G.seen.job = 1');
  assert.match(ana(), /Leve um lampião/);
  assert.match(rui(), /ninguém acreditou/);
});

test('Lyra quotes the teacher only after the Clara scene; Aldo goes down to learn what wakes the dead', () => {
  const { run } = story(['aldo']);
  assert.equal(run(`storyQuote(HERO_STORY.lyra.quotes, {})`), 'Alguém tem que contar essa história direito.');
  assert.equal(run(`storyQuote(HERO_STORY.lyra.quotes, { 'talk:claraLyra': 1 })`), 'Aldo vê a professora. Aldo esquece como se anda.');
  assert.ok(run(`storyLines(HERO_STORY.aldo.lines, { quest: true }).join(' ')`).includes('descobrir o que acorda os mortos'));
});

test('names in the middle of a line keep their article', () => {
  const R = require('../src/uirules.js');
  assert.equal(R.midName('O Sineiro'), 'o Sineiro');
  assert.equal(R.midName('O Sineiro', 'em'), 'no Sineiro');
  assert.equal(R.midName('Moça dos dados', 'de'), 'da moça dos dados');
  assert.equal(R.midName('Moça dos dados', 'em'), 'na moça dos dados');
  assert.equal(R.midName('Aldo', 'em'), 'em Aldo');
  assert.equal(R.midName('Lyra'), 'Lyra');
  assert.equal(R.spellLine('Lyra', 'Fogo', 'O Sineiro'), 'Lyra usa Fogo no Sineiro!');
});

test('the level-up line names the dice girl with her article', () => {
  const { run } = story(['aldo']);
  const ups = names => run.json(`levelUpLines(${JSON.stringify(names.map(name => ({ name, lv: 3, learned: [] })))})`);
  assert.deepEqual(ups(['Aldo', 'Lyra', 'Teo', 'Moça dos dados']), ['Aldo, Lyra, Teo e a moça dos dados subiram para o nível 3!']);
  assert.deepEqual(ups(['Moça dos dados', 'Aldo']), ['Moça dos dados e Aldo subiram para o nível 3!']);
});

test('the Teo fight starts even, and the tavern has two hints, the first naming the fastest', async () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1, cem2: 1, cem3: 1 } });
  run(`enterTown({ x: 10, y: 2, dir: 0 }, 'cemiterio')`);
  run(`startBattle = async (ids, b, o) => { globalThis.lastOpts = o; return 'win'; }`);
  await run('teoScene()');
  assert.equal(run('lastOpts.surprise'), 'normal');
  const src = fs.readFileSync(`${__dirname}/../src/opening.js`, 'utf8');
  const hints = src.slice(src.indexOf('Três encapuzados puxam'), src.indexOf("noRun: 'Não dá para fugir: o mensageiro"));
  assert.equal((hints.match(/'[^']+\.'/g) || []).length, 2);
  assert.ok(hints.includes('A moça dos dados é a mais rápida.'));
});

test('old 3-floor saves: the gear is read back from the bonus it left', () => {
  const R = require('../src/uirules.js');
  const E = { espadaFerro: { who: 'aldo', bonus: { atk: 6 } }, cotaMalha: { who: 'aldo', bonus: { def: 15 } }, espadaPrata: { who: 'aldo', bonus: { atk: 10 } },
    mantoSagrado: { who: 'teo', bonus: { def: 13, mag: 5 } }, cajadoRunico: { who: 'lyra', bonus: { mag: 6 } } };
  const aldo = bonus => [{ id: 'aldo', bonus }];
  assert.deepEqual(R.gearFromBonus(aldo({ atk: 16, def: 15 }), ['espadaFerro'], E).sort(), ['cotaMalha', 'espadaPrata']);
  assert.deepEqual(R.gearFromBonus(aldo({ atk: 10, def: 15 }), [], E).sort(), ['cotaMalha', 'espadaPrata'], 'Prata, not Ferro');
  assert.deepEqual(R.gearFromBonus(aldo({ atk: 6 }), ['espadaFerro'], E), [], 'nothing left over');
  assert.deepEqual(R.gearFromBonus([{ id: 'teo', bonus: { def: 13, mag: 5 } }, { id: 'lyra', bonus: {} }], [], E), ['mantoSagrado']);
});
