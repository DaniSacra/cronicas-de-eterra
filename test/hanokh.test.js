const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { story } = require('./harness.js');

const src = f => fs.readFileSync(`${__dirname}/../src/${f}`, 'utf8');
const GAME = fs.readdirSync(`${__dirname}/../src`).filter(f => f.endsWith('.js')).map(src).join('\n');

test('the lion of Hanokh: no line says the opener "has to have the right" any more', () => {
  assert.doesNotMatch(GAME, /tem de ter o direito/);
  const D = require('../src/data.js');
  assert.match(D.KEY_ITEMS.carta.sealed.join(' '), /leão de Hanokh/);
  assert.match(D.KEY_ITEMS.carta.sealed.join(' '), /sangue de Hanokh/);
});

test('the breach and the tomb lid show the lion; the old grave and the tomb show the raised sword of the paladins', () => {
  const main = src('main.js'), opening = src('opening.js');
  const breach = main.slice(main.indexOf('const BREACH'), main.indexOf(']];', main.indexOf('const BREACH')));
  assert.match(breach, /um leão de pé/);
  assert.doesNotMatch(breach, /anel/);
  const end = main.slice(main.indexOf('async function ending'), main.indexOf('Music.play(\'ending\')'));
  assert.match(end, /Na tampa caída, o mesmo leão de pé, partido ao meio/);
  assert.match(end, /quatro espadas erguidas, o sinal dos paladinos/);
  assert.match(main, /'O túmulo do rei, arrombado e vazio\. Na tampa caída, o mesmo leão de pé/);
  assert.match(opening, /Esta espada erguida na lápide quebrada é o sinal de um paladino/);
  assert.doesNotMatch(GAME, /símbolos? dos paladinos|símbolo de um paladino/);
});

test('the party talks at the breach and at the tomb name the lion and the swords', async () => {
  const { run } = story(['aldo', 'lyra', 'teo', 'andilla']);
  const buraco = run.json('TALKS.buraco.map(t => t[1])'), tumulo = run.json('TALKS.tumulo.filter(t => typeof t[1] === "string").map(t => t[1])');
  assert.equal(buraco[0], 'Um leão. O mesmo do selo real.');
  assert.ok(buraco.some(t => t.includes('Hanokh lutou na guerra de Elun')));
  assert.ok(tumulo.includes('Essas quatro espadas são de paladinos. E embaixo de cada uma havia alguma coisa.'));
});

test('the bell wakes the dead: Rui says so on the morning after, the elder too, and Irene says no grave opened since it stopped', async () => {
  const { log, run } = story(['aldo', 'lyra', 'teo', 'andilla'], { intro: 1, seen: { job: 1 } });
  run(`enterTown({ x: 22, y: 17, dir: 2 }, 'valmor')`);
  assert.equal(run('stage()'), 'start');
  await run(`talkTo(TOWN.npcs.find(n => n.def.id === 'rui'))`);
  assert.equal(log[0], 'Rui, o lavrador:\nO sino tocou de novo. E hoje cedo tinha mais três covas abertas. Por dentro.');
  assert.match(src('town.js'), /'Toda noite em que ele toca, mais covas amanhecem abertas\. O sino chama, e os mortos obedecem\.'/);
  const main = src('main.js'), end = main.slice(main.indexOf('async function ending'));
  const name = end.indexOf('Disse o nome: Tobias'), irene = end.indexOf("'E desde que o sino parou, nenhuma cova abriu.'");
  assert.ok(name > 0 && irene > name && end.slice(irene - 40, irene).includes('Irmã Irene'), 'Irene speaks it after Tobias says his name');
  assert.match(src('data.js'), /O Sineiro ergue o sino de bronze. Em algum lugar acima, a terra das covas estremece./);
});

test('review of the prologue for chapter 1: the Brotherhood came for the messenger, Aldo says Valmor, Lyra takes the fountain seriously', async () => {
  const { run } = story(['aldo', 'lyra', 'teo', 'andilla']);
  const say = id => run.json(`TALKS.${id}.filter(t => typeof t[1] === 'string').map(t => t[0] + ': ' + t[1])`);
  assert.ok(say('olho').includes('lyra: Então não vieram a Valmor só pelo mensageiro.'));
  assert.doesNotMatch(say('olho').join(' '), /carta/, 'the Brotherhood does not know about the letter');
  const road = say('estrada'), go = road.indexOf('aldo: Se alguém tirou um rei daquele buraco, não foi para deixar ele quieto. Eu vou. Por Valmor.');
  assert.ok(go >= 0 && road[go + 1].startsWith('lyra: Você diz que vai por Valmor'), 'Lyra answers what Aldo just said');
  assert.deepEqual(say('fonte'), ['andilla: Uma fonte. No meio de uma cripta. Quem constrói uma fonte numa cripta?',
    'lyra: Ninguém constrói. Elas brotam. Eu vim de longe para ver uma.', 'lyra: Dizem que guardam a memória de quem passa. Esta aqui está quieta.', 'teo: Não questionem. Bebam.']);
});
