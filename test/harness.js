const fs = require('node:fs');
const vm = require('node:vm');

// Runs the real chapter 1 scenes outside the browser: every line goes to `log`, every choice takes `pick` (or the first option)
function loadStory(G) {
  const log = [], picks = [];
  const ctx = {
    console, G, log, picks, Set, Promise, setTimeout: f => { queueMicrotask(f); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    UI: { say: async t => { log.push(t); }, choose: async opts => (picks.length ? picks.shift() : opts[0].value), buildParty() {}, updateParty() {}, cardFloat() {}, cardGlow() {} },
    Sfx: new Proxy({}, { get: () => () => {} }), Music: { play() {}, stop() {} }, TownArt: { layer: () => null },
    fadeTo: async () => {}, wait: async () => {}, shake() {}, saveGame: () => true, townHint() {}, placeHint() {},
    startBattle: async () => 'win', gameOver: async () => {},
  };
  vm.createContext(ctx);
  for (const f of ['palette', 'data', 'map', 'uirules', 'party', 'town', 'opening'])
    vm.runInContext(fs.readFileSync(`${__dirname}/../src/${f}.js`, 'utf8'), ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  // values from the vm realm have other prototypes: compare them as plain JSON
  run.json = code => JSON.parse(JSON.stringify(run(code)));
  return { log, picks, run };
}
const newG = (ids, extra = {}) => ({
  mode: 'town', area: 'valmor', busy: false, queue: [], held: new Set(), key: {}, inv: {}, gold: 40, seen: {}, ...extra, party: ids,
});
// party ids become members once party.js (newMember) is loaded
function story(ids, extra) {
  const G = newG([], extra), s = loadStory(G);
  G.party = ids.map(id => s.run(`newMember(PARTY_DEFS.find(d => d.id === '${id}'))`));
  return { G, ...s };
}

module.exports = { loadStory, story };
