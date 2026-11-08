const test = require('node:test');
const assert = require('node:assert');
const { loadStory } = require('./harness');

const dev = () => {
  const G = { mode: 'title', queue: [], held: new Set(), seen: {}, key: {}, inv: {}, explored: {}, party: [] };
  const s = loadStory(G, { files: ['town', 'explore', 'opening', 'chapter1', 'devstart'],
    ctx: { loadFloor() {}, normalizeMacros: () => [null, null], newGame: async () => { G.started = 'new'; }, quickDungeon: async () => { G.started = 'crypt'; },
      titleScreen: async () => { G.started = 'title'; }, WorldMap: { travel: async () => {} } } });
  return { G, ...s };
};

test('every dev start of chapter 1 puts the party of four where it can walk, with the state of that moment', async () => {
  const { G, run } = dev();
  const starts = run.json('DEV_STARTS.map(s => s.label)');
  assert.ok(starts.length >= 8);
  for (const [i, label] of starts.entries()) {
    if (!label.startsWith('Capítulo 1') || label.includes('Acampamento')) continue;
    await run(`DEV_STARTS[${i}].go()`);
    assert.strictEqual(G.mode, 'town', label);
    assert.ok(run('TOWN.walkable(TOWN.p.x, TOWN.p.y)'), label);
    assert.strictEqual(G.party.length, 4, label);
    assert.ok(G.key.carta, label);
    assert.strictEqual(G.chapter, label.includes('partida') ? 0 : 1, label);
    assert.ok(G.bossDead, label);
  }
  await run(`DEV_STARTS.find(s => s.label.includes('Pasto')).go()`);
  assert.strictEqual(G.area, 'pasto');
  assert.ok(G.seen['c1:gervasio'] && !G.seen['c1:cavalos']);
  assert.ok(run(`stat(G.party[0], 'atk')`) > run(`stat({ id: 'aldo', lv: 5, bonus: {} }, 'atk')`), 'the crypt gear is worn');
});

test('the dev menu: the prologue starts go to the new game and the crypt; Esc goes back to the title', async () => {
  const { G, run, picks } = dev();
  picks.push(0); await run('devStart()'); assert.strictEqual(G.started, 'new');
  picks.push(1); await run('devStart()'); assert.strictEqual(G.started, 'crypt');
  picks.push(null); await run('devStart()'); assert.strictEqual(G.started, 'title');
});
