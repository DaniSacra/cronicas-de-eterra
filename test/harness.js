const fs = require('node:fs');
const vm = require('node:vm');

// Runs the real chapter 1 scenes outside the browser: every line goes to `log`, every choice takes `pick` (or the first option)
// o.files: scripts after the shared ones (default: the town scenes); o.ctx: extra globals; o.choose(opts, o): the player
function loadStory(G, o = {}) {
  const log = [], picks = [];
  const ctx = {
    console, G, log, picks, Set, Promise, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    setTimeout: f => { ctx.tick && ctx.tick(); queueMicrotask(f); return 0; },
    UI: { say: async t => { log.push(t); }, choose: async (opts, oo) => (o.choose ? o.choose(opts, oo || {}) : picks.length ? picks.shift() : opts[0].value),
      buildParty() {}, updateParty() {}, cardFloat() {}, cardGlow() {}, cardHit() {}, markCard() {}, busy: () => false },
    Sfx: new Proxy({}, { get: () => () => {} }), Music: { play() {}, stop() {} }, TownArt: { layer: () => null },
    fadeTo: async () => {}, wait: async () => {}, shake() {}, saveGame: () => true, townHint() {}, placeHint() {},
    startBattle: async () => 'win', gameOver: async () => {},
    ...o.ctx,
  };
  vm.createContext(ctx);
  for (const f of ['palette', 'data', 'map', 'uirules', 'party', ...(o.files || ['town', 'opening'])])
    vm.runInContext(fs.readFileSync(`${__dirname}/../src/${f}.js`, 'utf8'), ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  // values from the vm realm have other prototypes: compare them as plain JSON
  run.json = code => JSON.parse(JSON.stringify(run(code)));
  return { log, picks, run, ctx };
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

// The real battle loop (src/battle.js) with a scripted player: choose(opts, o, run) answers every menu.
// Dice are fixed (Math.random = 0.5): heroes act by agility, nobody misses, no critical hits.
// Narration from the top plaque (bsay) goes to `log` too.
function battle(ids, choose, extra = {}) {
  const G = newG([], extra);
  let run;
  const el = id => ({ id, addEventListener() {}, getBoundingClientRect: () => ({}) });
  const s = loadStory(G, {
    files: ['macro', 'battle'], choose: (opts, o) => choose(opts, o, run),
    ctx: { VW: 320, VH: 200, view: el('view'), performance: { now: () => 0 }, HUD: { queue() {}, label() {}, boss() {} },
      document: { createElement: () => ({ getContext: () => ({ drawImage() {}, putImageData() {} }) }), getElementById: el },
      Sprites: { enemyFrames: () => [{ width: 48, height: 48 }], isGrid: () => true },
      renderView() {}, drawTown() {}, worldSprites: () => [], vimg: {}, cam: {} },
  });
  run = s.run;
  run('Math.random = () => 0.5');
  run(`ENEMIES.boneco = { name: 'Boneco', hp: 999, atk: 1, def: 0, agi: 0, xp: 1 }`);
  G.party = ids.map(id => run(`newMember(PARTY_DEFS.find(d => d.id === '${id}'))`));
  let last = null;
  s.ctx.tick = () => { const l = run('B && B.label'); if (l && l !== last) s.log.push(l); last = l; };
  return { G, ...s };
}
// Which hero a command bar belongs to ('card-lyra' -> 'lyra'), or null for other menus
const barHero = o => o.style === 'bar' && o.anchor ? o.anchor.id.slice(5) : null;

module.exports = { loadStory, story, battle, barHero };
