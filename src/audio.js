// ===== Efeitos sonoros e música chiptune (WebAudio) =====

const Sfx = (() => {
  let ac = null, master = null, muted = false, nbuf = null;
  function init() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    Music.resume();
  }
  function tone(f, dur, type = 'square', vol = 0.06, slideTo = null, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.08, delay = 0, freq = 1200, q = 1) {
    if (!ac) return;
    if (!nbuf) {
      nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  const seq = (arr, type, dur, vol, gap) => arr.forEach((f, i) => tone(f, dur, type, vol, null, i * gap));
  return {
    init,
    get ctx() { return ac; }, get master() { return master; }, get muted() { return muted; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    step() { noise(0.06, 0.06, 0, 300, 0.8); },
    bump() { tone(110, 0.12, 'square', 0.06, 60); },
    cursor() { tone(880, 0.03, 'square', 0.025); },
    select() { tone(660, 0.05, 'square', 0.035); tone(990, 0.06, 'square', 0.035, null, 0.04); },
    cancel() { tone(440, 0.06, 'square', 0.035, 220); },
    encounter() { seq([523, 659, 784, 1046, 784, 1046, 1318], 'square', 0.08, 0.05, 0.05); },
    slash() { noise(0.14, 0.14, 0, 2500, 0.7); },
    hit() { noise(0.08, 0.15, 0, 800, 1); tone(140, 0.1, 'square', 0.05, 60); },
    crit() { noise(0.15, 0.2, 0, 1200, 0.6); tone(300, 0.2, 'square', 0.06, 80); },
    hurt() { tone(200, 0.15, 'sawtooth', 0.07, 80); noise(0.1, 0.1, 0, 500); },
    miss() { tone(600, 0.1, 'triangle', 0.04, 1200); },
    fire() { noise(0.5, 0.14, 0, 600, 0.5); tone(220, 0.4, 'sawtooth', 0.04, 80); },
    ice() { seq([1800, 1500, 2100, 1700, 2300], 'triangle', 0.12, 0.05, 0.05); },
    bolt() { noise(0.35, 0.22, 0, 3000, 0.4); tone(1200, 0.25, 'square', 0.05, 100); },
    holy() { seq([784, 988, 1175, 1568], 'triangle', 0.25, 0.06, 0.07); },
    heal() { seq([523, 659, 784, 1046], 'triangle', 0.15, 0.06, 0.06); },
    die() { tone(400, 0.35, 'square', 0.05, 60); },
    victory() { seq([523, 523, 523, 659, 784, 0.01, 659, 784, 1046], 'square', 0.13, 0.05, 0.11); },
    levelup() { seq([659, 784, 988, 1318, 1568], 'square', 0.12, 0.05, 0.08); },
    chest() { seq([392, 523, 659, 784, 1046], 'triangle', 0.14, 0.06, 0.07); },
    stairs() { seq([392, 330, 262, 196, 131], 'triangle', 0.22, 0.06, 0.14); },
    gameover() { seq([392, 370, 349, 330, 262], 'triangle', 0.45, 0.06, 0.3); },
    dark() { tone(80, 0.8, 'sawtooth', 0.08, 40); noise(0.8, 0.1, 0, 300, 0.5); },
    drain() { tone(700, 0.45, 'sine', 0.07, 150); },
  };
})();

const Music = (() => {
  // Notas MIDI, uma por colcheia; 0 = pausa
  const SONGS = {
    explore: {
      bpm: 84, lt: 'triangle', lv: 0.05,
      lead: [69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 72, 74, 72, 0, 69, 0, 65, 0, 69, 0, 72, 0, 71, 69, 68, 0, 71, 0, 76, 0, 0, 0],
      bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0, 41, 0, 48, 0, 41, 0, 48, 0, 40, 0, 47, 0, 44, 0, 40, 0],
    },
    town: {
      bpm: 112, lt: 'square', lv: 0.028,
      lead: [72, 0, 74, 76, 79, 0, 76, 0, 77, 76, 74, 0, 72, 0, 0, 0, 74, 0, 76, 77, 81, 0, 79, 0, 77, 76, 74, 76, 72, 0, 0, 0],
      bass: [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 55, 0, 52, 0, 50, 0, 57, 0, 53, 0, 57, 0, 55, 0, 59, 0, 48, 0, 43, 0],
    },
    battle: {
      bpm: 150, lt: 'square', lv: 0.03,
      lead: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 74, 0, 71, 0, 69, 72, 76, 72, 69, 72, 76, 81, 79, 77, 76, 74, 76, 0, 0, 0],
      bass: [45, 0, 57, 0, 45, 0, 57, 0, 41, 0, 53, 0, 43, 0, 55, 0, 45, 0, 57, 0, 45, 0, 57, 0, 40, 0, 52, 0, 40, 0, 44, 0],
    },
    boss: {
      bpm: 168, lt: 'sawtooth', lv: 0.022,
      lead: [62, 0, 65, 68, 71, 0, 68, 65, 62, 0, 65, 68, 74, 0, 71, 0, 61, 0, 64, 67, 70, 0, 67, 64, 61, 64, 67, 70, 73, 0, 0, 0],
      bass: [38, 38, 50, 38, 38, 50, 38, 50, 38, 38, 50, 38, 38, 50, 38, 50, 37, 37, 49, 37, 37, 49, 37, 49, 37, 37, 49, 37, 40, 0, 43, 0],
    },
    ending: {
      bpm: 96, lt: 'triangle', lv: 0.05,
      lead: [72, 0, 76, 79, 84, 0, 83, 79, 81, 0, 77, 81, 79, 0, 0, 0, 76, 0, 79, 84, 88, 0, 86, 84, 83, 0, 79, 83, 84, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 41, 0, 48, 0, 43, 0, 50, 0, 45, 0, 52, 0, 48, 0, 55, 0, 43, 0, 50, 0, 48, 0, 36, 0],
    },
  };
  let cur = null, want = null, timer = null, step = 0, nextT = 0, gain = null;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function note(n, t, dur, type, vol) {
    const ac = Sfx.ctx, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(gain); o.start(t); o.stop(t + dur + 0.02);
  }
  function tick() {
    const ac = Sfx.ctx, s = SONGS[cur]; if (!ac || !s) return;
    const sd = 60 / s.bpm / 2;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.02;
    while (nextT < ac.currentTime + 0.25) {
      const l = s.lead[step % s.lead.length], b = s.bass[step % s.bass.length];
      if (l) note(l, nextT, sd * 1.7, s.lt, s.lv);
      if (b) note(b, nextT, sd * 0.95, 'triangle', 0.09);
      nextT += sd; step++;
    }
  }
  function start(name) {
    const ac = Sfx.ctx; if (!ac) return;
    if (!gain) { gain = ac.createGain(); gain.gain.value = 0.7; gain.connect(Sfx.master); }
    cur = name; step = 0; nextT = ac.currentTime + 0.05;
    timer = setInterval(tick, 60); tick();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = null; want = null; }
  return {
    play(name) { if (want === name && cur === name) return; stop(); want = name; if (Sfx.ctx) start(name); },
    stop,
    resume() { if (want && !cur && Sfx.ctx) start(want); },
  };
})();
