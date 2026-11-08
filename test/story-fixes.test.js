const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

test('an old save that reaches the elder with four hears the right lines', async () => {
  const { log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], { intro: 1, seen: { job: 1 } });
  await run('elderTalk()');
  assert.ok(!log.some(t => t.includes('não descem lá')));
  assert.ok(log.some(t => t.includes('Vocês já são quatro. Bom.')));
  assert.ok(log.at(-1).endsWith('Nova missão: descer à cripta.'));
});

test('the Teo fight cannot be fled', async () => {
  const { run } = story(['aldo', 'lyra'], { seen: { job: 1, cem1: 1, cem2: 1, cem3: 1 } });
  run(`enterTown({ x: 10, y: 2, dir: 0 }, 'cemiterio')`);
  run(`startBattle = async (ids, b, o) => { globalThis.lastOpts = o; return 'win'; }`);
  await run('teoScene()');
  assert.ok(run('lastOpts.noRun'));
});

test('greetings are said once per save, and the town cast follows the story', async () => {
  const { log, run } = story(['aldo', 'lyra'], { seen: { job: 1 } });
  run(`enterTown({ x: 10, y: 12, dir: 0 }, 'valmor')`);
  const ids = () => run.json('TOWN.npcs.map(n => n.def.id)');
  assert.ok(!ids().includes('rui'), 'Rui is in the tavern on the afternoon of the arrival');
  assert.ok(!ids().includes('cat'), 'the cat ran away');
  const tome = `talkTo(TOWN.npcs.find(n => n.def.id === 'tome'))`;
  await run(tome); await run(tome);
  assert.equal(log.filter(t => t.includes('Veio pescar?')).length, 1);
  run('G.intro = 1; G.bossDead = true');
  run(`enterTown({ x: 10, y: 12, dir: 0 }, 'valmor')`);
  assert.ok(ids().includes('rui') && ids().includes('cat'));
});

test('sister Irene greets Teo when he is in the party', async () => {
  const { log, run } = story(['aldo', 'lyra', 'teo'], { seen: { job: 1 } });
  run(`UI.choose = async () => { UI.choose = async () => null; return 'talk'; }`);
  await run('chapel()');
  assert.ok(log.some(t => t.includes('Teo, você voltou inteiro.')));
  assert.ok(!log.some(t => t.includes('saiu cedo para o cemitério')));
});

test('after the victory the west road asks to leave for Erukh; saying no stays in Valmor', async () => {
  const { G, log, run, picks } = story(['aldo', 'lyra'], { bossDead: true });
  run(`enterTown({ x: 0, y: 6, dir: 3 }, 'valmor')`);
  picks.push(false);
  run('tryTownMove(3)');
  await new Promise(r => setTimeout(r, 0));
  assert.ok(!log.some(t => t.includes('corre perigo')));
  assert.strictEqual(G.area, 'valmor');
  assert.strictEqual(G.chapter, undefined);
});

test('level ups: everyone who reached the same level shares one box, each new spell has its own', () => {
  const { run } = story(['aldo']);
  const lines = ups => run.json(`levelUpLines(${JSON.stringify(ups)})`);
  assert.deepEqual(lines([{ name: 'Lyra', lv: 3, learned: [] }]), ['Lyra subiu para o nível 3!']);
  assert.deepEqual(lines([
    { name: 'Aldo', lv: 3, learned: [] }, { name: 'Lyra', lv: 3, learned: ['Gelo'] },
    { name: 'Teo', lv: 3, learned: [] }, { name: 'Andilla', lv: 3, learned: [] },
  ]), ['Aldo, Lyra, Teo e Andilla subiram para o nível 3!', 'Lyra aprendeu: Gelo!']);
  const G = run('G'); G.party[0].xp = 9999;
  const ups = run.json('levelUp(G.party[0])');
  assert.ok(ups.length > 1 && ups.every((u, i) => u.lv === i + 2 && u.name === 'Aldo'));
});

test('a title or line splits into who speaks and what', () => {
  const { splitSpeaker } = require('../src/uirules.js');
  assert.deepEqual(splitSpeaker('Irmã Irene:\nBem-vindos.'), { who: 'Irmã Irene', text: 'Bem-vindos.' });
  assert.deepEqual(splitSpeaker('Dora, a mercadora:\nO que vai ser?  (40 moedas)'), { who: 'Dora, a mercadora', text: 'O que vai ser?  (40 moedas)' });
  assert.deepEqual(splitSpeaker('Por que descer à cripta?'), { who: null, text: 'Por que descer à cripta?' });
  assert.deepEqual(splitSpeaker('Táticas · escolha uma\nlinha dois'), { who: null, text: 'Táticas · escolha uma\nlinha dois' });
});

test('the turn queue calls the boss by its own name', () => {
  const { battle } = require('./harness.js');
  const { run } = battle(['aldo'], () => null);
  run(`globalThis.q = null; HUD.queue = items => { globalThis.q = items; }`);
  run(`B = { order: [{ actor: { ...ENEMIES.sineiro, id: 'sineiro', hp: 1, boss: true }, side: 'enemy' }], turn: 0, round: 1, roundT: 0 }`);
  run(`drawOrder({ beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} }, 0, true)`);
  assert.equal(run('q[0].label'), 'Si');
  assert.equal(run('q[0].face'), 'face:sineiro', 'its head in the slot, the name stays as the alt text');
});

test('the morning after the fight: Tomé heard of the grey cloaks; before the night he only talks of fish', () => {
  const { run } = story(['aldo']);
  const tome = () => run.json("byStage(NPC_DEFS.find(d => d.id === 'tome').lines)")[0];
  assert.equal(tome(), 'Os peixes sumiram do lago desde que o chão começou a tremer.');
  run('G.intro = 1');
  assert.equal(tome(), 'Ouvi que teve briga na Berta. Gente de capa cinza. Nem os peixes quiseram ficar para ver.');
});
