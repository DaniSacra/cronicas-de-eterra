const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

test('an item that would do nothing is kept, with the reason', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 1, pena: 1, elixir: 1 } });
  const use = (id, i) => run(`applyItem('${id}', G.party[${i}])`);
  assert.equal(use('eter', 0), 'Aldo já está com os PM cheios.');
  assert.equal(use('pocao', 1), 'Lyra já está com os PV cheios.');
  assert.equal(use('pena', 0), 'Aldo não precisa disso.');
  assert.equal(run(`applyItem('elixir', 'all')`), 'O grupo já está inteiro. O Elixir fica guardado.');
  assert.deepEqual({ ...G.inv }, { pocao: 1, eter: 1, pena: 1, elixir: 1 }, 'nothing was spent');
});

test('an item that helps is spent and says how much', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 2, pena: 1 } });
  const [aldo, lyra] = G.party;
  aldo.mp = 0; lyra.hp = 5;
  assert.equal(run(`applyItem('eter', G.party[0])`), `Aldo recupera ${aldo.mp} PM.`);
  assert.ok(aldo.mp > 0);
  assert.match(run(`applyItem('pocao', G.party[1])`), /^Lyra recupera \d+ PV\.$/);
  lyra.hp = 0;
  assert.equal(run(`applyItem('eter', G.party[1])`), 'Lyra caiu. O éter não tem efeito.');
  assert.equal(run(`applyItem('pena', G.party[1])`), 'Lyra voltou à vida!');
  assert.deepEqual({ ...G.inv }, { pocao: 0, eter: 1, pena: 0 });
});
