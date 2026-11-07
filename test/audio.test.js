const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

// src/audio.js in a vm with a fake AudioContext: no sound, but every note and every timer goes through the real code
function loadAudio() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = extra => ({ connect() {}, disconnect() {}, ...extra });
  const made = { osc: 0 }, listeners = {};
  let timer = null;
  const ac = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: node(),
    suspend() { this.state = 'suspended'; made.suspend = (made.suspend || 0) + 1; }, resume() { this.state = 'running'; },
    createGain: () => node({ gain: param() }),
    createOscillator: () => { made.osc++; return node({ type: '', frequency: param(), detune: param(), start() {}, stop() {}, setPeriodicWave() {} }); },
    createBiquadFilter: () => node({ type: '', frequency: param(), Q: param() }),
    createBufferSource: () => node({ buffer: null, start() {}, stop() {} }),
    createBuffer: (ch, n) => ({ getChannelData: () => new Float32Array(n) }),
    createPeriodicWave: () => ({}),
  };
  const document = { hidden: false, addEventListener: (k, f) => { listeners[k] = f; } };
  const ctx = {
    console, Math, Object, Array, Float32Array, Set, Error,
    window: { AudioContext: function () { return ac; } }, document,
    localStorage: { getItem: () => null, setItem() {} },
    setInterval: f => { timer = f; return 1; }, clearInterval: () => { timer = null; }, setTimeout: () => 0,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(`${__dirname}/../src/audio.js`, 'utf8') + '\nthis.Sfx = Sfx; this.Music = Music;', ctx, { filename: 'audio.js' });
  ctx.Sfx.init();
  // advance the audio clock, firing the music timer every 50 ms like the browser does
  const advance = sec => { for (let t = 0; t < sec; t += 0.05) { ac.currentTime += 0.05; if (timer) timer(); } };
  return { Sfx: ctx.Sfx, Music: ctx.Music, ac, made, advance, document, listeners };
}

test('every song plays a whole loop and every channel of a song has the same length', () => {
  const { Music, made, advance } = loadAudio();
  const info = JSON.parse(JSON.stringify(Music.info()));
  for (const [name, s] of Object.entries(info)) {
    assert.ok(s.chans.every(n => n === s.steps), `${name}: channels ${s.chans} differ`);
    const before = made.osc;
    Music.play(name);
    assert.equal(Music.current, name);
    advance(s.sec + 1);
    assert.ok(made.osc > before + 20, `${name} played notes`);
  }
});

test('every sound effect runs, the ground steps included', () => {
  const { Sfx, made } = loadAudio();
  for (const k of ['clue', 'encounterDark', 'join', 'exclaim', 'bell', 'bellFar', 'bossEncounter', 'cursor']) {
    const before = made.osc; Sfx[k](); assert.ok(made.osc > before, k);
  }
  for (const g of ['snow', 'wood', 'stone', undefined]) Sfx.step(g);
});

test('place songs resume where a battle cut them; battle songs start over', () => {
  const { Music, advance } = loadAudio();
  Music.play('cemetery'); advance(5);
  const at = Music.step;
  assert.ok(at > 0);
  // the first tick already schedules the next 0.2 s, so a fresh start sits a few steps in
  Music.play('battle'); assert.ok(Music.step < 5, 'the battle starts over');
  advance(3);
  Music.play('cemetery'); assert.ok(Music.step >= at && Music.step < at + 5, 'the cemetery picks up where it was');
  Music.play('battle'); assert.ok(Music.step < 5, 'battles always start over');
});

test('the boss theme can wait for the toll before its first note', () => {
  const { Music, made, advance } = loadAudio();
  Music.play('boss', { delay: 1.5 });
  const before = made.osc;
  advance(1.2);
  assert.equal(made.osc, before, 'silent during the delay');
  advance(0.6);
  assert.ok(made.osc > before, 'then it plays');
});

test('a tab in the background suspends the audio clock and resumes it on return', () => {
  const { ac, document, listeners } = loadAudio();
  document.hidden = true; listeners.visibilitychange();
  assert.equal(ac.state, 'suspended');
  document.hidden = false; listeners.visibilitychange();
  assert.equal(ac.state, 'running');
});
