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
    // Sino da igreja velha: duas badaladas graves com parciais desafinados, decaindo devagar
    bell() { for (const d of [0, 1.3]) { tone(196, 2.4, 'sine', 0.09, null, d); tone(466, 1.6, 'sine', 0.035, null, d); tone(590, 1.1, 'triangle', 0.02, null, d); } },
  };
})();

// ===== Música: trilhas de aventura sintetizadas (Web Audio, sem arquivos) =====
// Partitura detalhada em docs/som/. Tudo original.
//
// Notação das melodias: "A4:3 D5:1 r:2" = nota (nome+oitava) : duração em passos; r = pausa.
// Um passo = 1/spb de tempo (spb 4 → semicolcheia; spb 3 → colcheia de compasso 6/8).
// arp('D2.A2*2 G2.D3', [0, 1, 2, 1], 2): acordes separados por ponto, *n repete; o padrão indexa as notas do
// acorde (índice além do fim sobe uma oitava; -1 = pausa; [i, d] = nota i com duração d).

const Music = (() => {
  const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nn(s) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); if (!m) throw new Error('nota inválida: ' + s);
    return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  function mel(str) {
    return str.trim().split(/\s+/).map(tk => {
      const [a, b] = tk.split(':'), len = b ? +b : 1;
      return { n: a === 'r' ? 0 : nn(a), len };
    });
  }
  function arp(chords, pattern, len = 2) {
    const out = [];
    chords.trim().split(/\s+/).forEach(tk => {
      const [c, rep] = tk.split('*'), tones = c.split('.').map(nn);
      for (let r = 0; r < (+rep || 1); r++) pattern.forEach(p => {
        const [i, d] = Array.isArray(p) ? p : [p, len];
        out.push({ n: i < 0 ? 0 : tones[i % tones.length] + 12 * Math.floor(i / tones.length), len: d });
      });
    });
    return out;
  }
  const cat = (...parts) => [].concat(...parts);

  // ---------- Temas ----------
  // Tema de Eterra (título e final). Ré maior com toque mixolídio (Dó natural).
  const HERO_A = mel(`
    A4:3 D5:1 E5:4 F#5:6 r:2      G5:3 F#5:1 E5:2 D5:2 E5:6 r:2
    A4:3 D5:1 E5:4 F#5:4 A5:4     G5:3 B5:1 A5:8 r:4
    B5:3 A5:1 G5:2 F#5:2 E5:4 C5:4   D5:3 E5:1 F#5:4 G5:4 E5:4
    F#5:3 E5:1 D5:4 E5:2 C#5:2 A4:4  D5:12 r:4`);
  const HERO_B = mel(`
    B4:4 D5:4 G5:6 F#5:2          E5:4 D5:4 B4:8
    C5:4 E5:4 A5:6 G5:2           F#5:4 E5:4 D5:8
    B4:2 C#5:2 D5:4 E5:2 F#5:2 G5:4   A5:6 G5:2 F#5:4 E5:4
    G5:3 F#5:1 E5:3 D5:1 C#5:4 E5:4   A5:8 A4:4 r:4`);
  const HERO_CH = `D2.A2*2 E2.B2*2 D2.A2*2 G2.D3*2 G2.D3 C2.G2 D2.A2 E2.B2 B1.F#2 A1.E2 D2.A2*2
                   G2.D3*2 E2.B2*2 C2.G2*2 D2.A2*2 B1.F#2 G2.D3 G2.D3*2 E2.B2 A1.E2 A1.E2*2`;
  const HERO_PAD = mel(`F#4:16 G4:16 F#4:8 A4:8 B4:16 B4:8 C5:8 A4:8 G4:8 F#4:8 E4:8 F#4:16
                        B4:16 G4:16 G4:16 F#4:16 F#4:8 G4:8 B4:16 G4:8 E4:8 C#5:16`);

  // Valmor: valsa calma em Fá, neve e lareiras acesas.
  const TOWN_LEAD = mel(`
    F4:4 G4:2 A4:2 C5:4   D5:6 C5:2 A4:4   Bb4:4 A4:2 G4:2 F4:4   G4:10 r:2
    F4:4 G4:2 A4:2 C5:4   F5:6 E5:2 D5:4   C5:4 A4:2 Bb4:2 G4:4   F4:10 r:2
    D5:4 E5:2 F5:2 A5:4   G5:6 F5:2 D5:4   C5:4 D5:2 E5:2 F5:4    E5:10 r:2
    D5:4 F5:2 A5:2 G5:4   F5:6 E5:2 D5:4   C5:4 F5:2 E5:2 G5:4    F5:8 r:4`);
  const TOWN_CH = 'F2.C3 D2.A2 Bb1.F2 C2.G2 F2.C3 D2.A2 C2.G2 F2.C3 D2.A2 Bb1.F2 C2.G2 A1.E2 D2.A2 Bb1.F2 C2.G2 F2.C3';
  const TOWN_PAD = mel('A4:12 A4:12 F4:12 G4:12 A4:12 A4:12 G4:12 A4:12 A4:12 Bb4:12 G4:12 C#5:12 A4:12 Bb4:12 G4:12 A4:12');

  // Poney Saltitante: giga em 6/8, Sol maior.
  const JIG_A1 = mel('G4 B4 D5 G5:2 D5   E5 D5 C5 B4:2 A4   B4 C5 D5 E5:2 G5   F#5 E5 D5 A4:3');
  const JIG_A = cat(JIG_A1, mel('G4 B4 D5 G5:2 B5   A5 G5 F#5 E5:2 C5   E5 C5 A4 D5:2 F#4   G4:5 r'));
  const JIG_A2 = cat(JIG_A1, mel('G5 F#5 G5 A5:2 G5   F#5 E5 D5 E5:2 C5   B4 G4 B4 A4:2 F#4   G4:5 r'));
  const JIG_B1 = mel('E5 G5 B5 B5:2 A5   G5 F#5 E5 D5:2 B4   C5 E5 G5 G5:2 F#5   E5 D5 C5 B4:3');
  const JIG_B = cat(JIG_B1, mel('A4 C5 E5 A5:2 G5   F#5 G5 A5 B5:2 G5   C5 E5 A5 F#5:2 D5   G5:3 D5:2 B4'));
  const JIG_B2 = cat(JIG_B1, mel('A4 C5 E5 G5:2 E5   D5 E5 F#5 A5:2 F#5   G5 D5 B4 A4:2 F#4   G4:6'));
  const JIG_BASS = [[0, 2], [1, 1], [2, 2], [1, 1]];
  const JIG_CH = 'G2.D3 C2.G2 G2.D3 D2.A2 G2.D3 D2.A2 A1.E2 G2.D3  G2.D3 C2.G2 G2.D3 D2.A2 G2.D3 D2.A2 E2.B2 G2.D3 ' +
                 'E2.B2 D2.A2 C2.G2 E2.B2 A1.E2 D2.A2 D2.A2 G2.D3  E2.B2 D2.A2 C2.G2 E2.B2 A1.E2 D2.A2 D2.A2 G2.D3';
  const JIG_PAD = mel('B3:6 C4:6 B3:6 A3:6 B3:6 A3:6 A3:6 B3:6 B3:6 C4:6 B3:6 A3:6 B3:6 A3:6 B3:6 B3:6 ' +
                      'B3:6 A3:6 C4:6 B3:6 A3:6 A3:6 A3:6 B3:6 B3:6 A3:6 C4:6 B3:6 A3:6 A3:6 A3:6 B3:6');

  // Cemitério: névoa. Lá menor, arpejo lento de caixinha de música.
  const CEM_LEAD = mel(`
    r:16   r:8 E5:6 D5:2   C5:8 A4:8   B4:6 C5:2 D5:8
    E5:12 r:4   r:4 A5:4 G5:4 E5:4   F5:8 D5:4 A4:4   G#4:12 r:4
    A4:6 C5:2 F5:8   E5:4 D5:4 B4:8   E5:6 G5:2 B4:8   A4:12 r:4
    r:4 C5:4 F5:4 E5:4   D5:8 F5:4 A5:4   G#5:8 E5:8   r:16`);
  const CEM_CH = 'A3.C4.E4*2 F3.A3.C4 G3.B3.D4 A3.C4.E4*2 D3.F3.A3 E3.G#3.B3 F3.A3.C4 G3.B3.D4 E3.G3.B3 A3.C4.E4 F3.A3.C4 D3.F3.A3 E3.G#3.B3*2';
  const CEM_BASS = 'A2*2 F2 G2 A2*2 D2 E2 F2 G2 E2 A2 F2 D2 E2*2';

  // Cripta: Ré dórico. Ostinato grave, notas longas com eco, silêncio.
  const CRYPT_LEAD = mel(`
    r:16   r:4 A4:8 r:4   G4:4 E4:8 r:4   F4:4 E4:4 D4:8
    r:4 D5:6 C5:2 A4:4   B4:8 r:4 A4:4   G4:6 F4:2 D4:8   E4:4 F4:4 G#4:8
    A4:12 r:4   r:4 E5:6 D5:2 C5:4   D5:6 Bb4:2 F4:8   E4:8 r:8`);
  const CRYPT_CH = 'D2.A2.E3 D2.A2.F3 C2.G2.D3 D2.A2.E3 D2.A2.F3 D2.A2.E3 Bb1.F2.C3 A1.E2.C#3 D2.A2.E3 C2.G2.D3 Bb1.F2.C3 A1.E2.C#3';
  const CRYPT_DROPS = mel('r:30 E6:2 r:54 A6:2 r:68 D6:2 r:34');

  // Batalha: Mi menor, rápido e sincopado.
  const BAT_LEAD = mel(`
    E5:3 B4:3 E5:2 G5:2 F#5:2 E5:2 D5:2   E5:3 B4:3 D5:2 E5:4 r:4
    C5:3 E5:3 G5:2 A5:2 G5:2 E5:2 C5:2   D5:3 F#5:3 A5:2 F#5:4 D5:4
    E5:3 B4:3 E5:2 G5:2 F#5:2 E5:2 D5:2   E5:3 B4:3 D5:2 E5:2 G5:2 B5:4
    C6:3 B5:3 G5:2 E5:4 G5:4   F#5:3 D#5:3 B4:2 F#5:8
    A5:4 E5:2 C5:2 A4:4 C5:2 E5:2   A5:3 G5:3 E5:2 C5:8
    G5:4 E5:2 B4:2 G4:4 B4:2 E5:2   F#5:3 G5:3 A5:2 B5:8
    C6:2 B5:2 A5:2 G5:2 E5:4 G5:4   F#5:2 E5:2 D5:2 A5:2 F#5:4 D5:4
    D#5:3 F#5:3 B5:2 A5:2 G5:2 F#5:4   D#5:4 B4:4 F#4:8`);
  const BAT_ROOTS = 'E2.E3*2 C2.C3 D2.D3 E2.E3*2 C2.C3 B1.B2 A1.A2*2 E2.E3*2 C2.C3 D2.D3 B1.B2*2';
  const BAT_STABS = 'G4.B4*2 G4.C5 F#4.A4 G4.B4*2 G4.C5 D#4.F#4 A4.C5*2 G4.B4*2 G4.C5 F#4.A4 D#4.F#4*2';

  // Chefe: Dó menor, grave e cromático, pedal insistente.
  const BOSS_A1 = mel(`
    C5:3 Db5:1 C5:4 r:2 G4:2 Ab4:2 B4:2   C5:3 Db5:1 C5:4 r:2 Eb5:2 D5:2 Db5:2
    Db5:3 D5:1 Db5:4 r:2 Ab4:2 A4:2 C5:2   F5:4 E5:4 Eb5:4 D5:4
    C5:3 Db5:1 C5:4 r:2 G4:2 Ab4:2 B4:2`);
  const BOSS_LEAD = cat(BOSS_A1, mel('Eb5:4 G5:4 F#5:4 G5:4   Ab5:6 G5:2 F5:4 Eb5:4   D5:4 Eb5:4 B4:8'),
    BOSS_A1, mel('G5:4 C6:4 B5:4 C6:4   C6:6 B5:2 Ab5:4 F5:4   G5:4 Ab5:4 B5:8'),
    mel(`F5:8 Ab5:8   G5:8 F5:4 E5:4   Gb5:8 Db5:8   C5:8 F5:4 Ab5:4
         Ab5:8 Eb5:4 C5:4   Eb5:4 F5:4 Gb5:4 F5:4   G5:8 F5:4 Eb5:4   D5:4 B4:4 G4:4 B4:4`));
  const BOSS_CH = 'C2.C3.B1*2 Db2.Db3.C2*2 C2.C3.B1*2 Ab1.Ab2.G1 G1.G2.F#1 ' +
                  'C2.C3.B1*2 Db2.Db3.C2*2 C2.C3.B1*2 Ab1.Ab2.G1 G1.G2.F#1 ' +
                  'F2.F3.E2*2 Gb2.Gb3.F2 F2.F3.E2 Ab1.Ab2.G1*2 G1.G2.F#1*2';

  // instrumentos: p50/p25/p12 = onda quadrada com ciclo 50/25/12,5 %; tri = triângulo
  // env: sus (sustenta), pluck (beliscado), soft (entra devagar), bass
  const SONGS = {
    title: { bpm: 116, spb: 4, dv: 0.8, dr: 'k.h.s.h.k.hks.hh', ch: [
      { w: 'p25', v: 0.034, env: 'sus', vib: 9, notes: cat(HERO_A, HERO_B) },
      { w: 'p12', v: 0.016, env: 'soft', notes: HERO_PAD },
      { w: 'tri', v: 0.09, env: 'bass', notes: arp(HERO_CH, [0, 1, 2, 1], 2) },
    ] },
    town: { bpm: 96, spb: 4, ch: [
      { w: 'p25', v: 0.03, env: 'sus', vib: 7, echo: [3, 0.3], notes: TOWN_LEAD },
      { w: 'p12', v: 0.014, env: 'soft', notes: TOWN_PAD },
      { w: 'tri', v: 0.085, env: 'bass', notes: arp(TOWN_CH, [0, 2, 1], 4) },
    ] },
    tavern: { bpm: 104, spb: 3, dv: 0.6, dr: 'k.hs.h', ch: [
      { w: 'p25', v: 0.03, env: 'pluck', vib: 6, notes: cat(JIG_A, JIG_A2, JIG_B, JIG_B2) },
      { w: 'p12', v: 0.013, env: 'soft', notes: JIG_PAD },
      { w: 'tri', v: 0.085, env: 'bass', notes: arp(JIG_CH, JIG_BASS) },
    ] },
    cemetery: { bpm: 76, spb: 4, ch: [
      { w: 'tri', v: 0.07, env: 'sus', vib: 8, echo: [4, 0.35], notes: CEM_LEAD },
      { w: 'p12', v: 0.012, env: 'pluck', notes: arp(CEM_CH, [0, 1, 2, 3, 2, 1, 0, 1], 2) },
      { w: 'tri', v: 0.08, env: 'soft', notes: arp(CEM_BASS, [[0, 16]]) },
    ] },
    explore: { bpm: 72, spb: 4, ch: [
      { w: 'p12', v: 0.026, env: 'sus', vib: 6, echo: [3, 0.4], notes: CRYPT_LEAD },
      { w: 'tri', v: 0.035, env: 'pluck', echo: [6, 0.5], notes: CRYPT_DROPS },
      { w: 'tri', v: 0.09, env: 'bass', notes: arp(CRYPT_CH, [0, -1, 1, -1, 2, -1, 1, -1], 2) },
    ] },
    battle: { bpm: 152, spb: 4, dv: 1, dr: 'k.h.s.hkk.hks.h.', ch: [
      { w: 'p25', v: 0.032, env: 'sus', notes: BAT_LEAD },
      { w: 'p50', v: 0.014, env: 'pluck', notes: arp(BAT_STABS, [-1, 0, -1, 1, -1, 0, -1, 1], 2) },
      { w: 'tri', v: 0.09, env: 'bass', notes: arp(BAT_ROOTS, [0, 0, 1, 0, 0, 1, 0, 1], 2) },
    ] },
    boss: { bpm: 160, spb: 4, dv: 1, dr: 'kkh.s.h.kkh.s.hs', ch: [
      { w: 'p50', v: 0.026, env: 'sus', dbl: [-12, 0.5], notes: BOSS_LEAD },
      { w: 'tri', v: 0.095, env: 'bass', notes: arp(BOSS_CH, [0, 0, 1, 0, 2, 0, 1, 0], 2) },
    ] },
    ending: { bpm: 80, spb: 4, ch: [
      { w: 'p12', v: 0.03, env: 'sus', vib: 9, echo: [3, 0.3], notes: cat(HERO_A, HERO_B, mel('F5:4 D5:4 Bb4:8 D5:16')) },
      { w: 'tri', v: 0.05, env: 'soft', notes: cat(HERO_PAD, mel('D4:16 C5:16')) },
      { w: 'tri', v: 0.08, env: 'soft', notes: cat(arp(HERO_CH, [[0, 8]]), mel('Bb1:16 D2:16')) },
    ] },
  };
  // Pré-compila: cada canal vira um vetor esparso por passo
  for (const s of Object.values(SONGS)) {
    s.ch.forEach(c => {
      c.len = c.notes.reduce((a, e) => a + e.len, 0); c.at = new Array(c.len);
      let p = 0; c.notes.forEach(e => { if (e.n) c.at[p] = e; p += e.len; });
    });
    s.len = Math.max(...s.ch.map(c => c.len));
  }

  const ENV = {
    sus: { a: 0.012, s: 0.7, tau: 0.08, r: 0.035 },
    pluck: { a: 0.004, s: 0.25, tau: 0.07, r: 0.03 },
    soft: { a: 0.08, s: 0.9, tau: 0.2, r: 0.12 },
    bass: { a: 0.006, s: 0.8, tau: 0.1, r: 0.03 },
  };
  const DUTY = { p50: 0.5, p25: 0.25, p12: 0.125 };
  let ac0 = null, waves = {}, nbuf = null, lfo = null, bus = null;
  let cur = null, want = null, timer = null, step = 0, nextT = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function setup(ac) {
    if (ac0 === ac) return; ac0 = ac; waves = {};
    for (const [k, d] of Object.entries(DUTY)) {
      const N = 32, re = new Float32Array(N), im = new Float32Array(N);
      for (let i = 1; i < N; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * d);
      waves[k] = ac.createPeriodicWave(re, im);
    }
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const o = ac.createOscillator(); o.frequency.value = 5.5;
    lfo = ac.createGain(); lfo.gain.value = 1; o.connect(lfo); o.start();
  }
  function newBus(ac) {
    const g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 6500; g.gain.value = 0.7;
    g.connect(f); f.connect(Sfx.master);
    return { g, f };
  }
  function fadeOut(b) {
    if (!b) return; const ac = Sfx.ctx, t = ac.currentTime;
    b.g.gain.cancelScheduledValues(t); b.g.gain.setValueAtTime(b.g.gain.value, t); b.g.gain.linearRampToValueAtTime(0, t + 0.25);
    setTimeout(() => { try { b.f.disconnect(); } catch (e) { /* já desligado */ } }, 600);
  }
  function note(c, n, t, dur, vol, out) {
    const ac = Sfx.ctx, o = ac.createOscillator(), g = ac.createGain(), e = ENV[c.env] || ENV.sus;
    if (waves[c.w]) o.setPeriodicWave(waves[c.w]); else o.type = c.w === 'tri' ? 'triangle' : c.w;
    o.frequency.value = midi(n);
    let vib = null;
    if (c.vib && dur > 0.3) { vib = ac.createGain(); vib.gain.value = c.vib; lfo.connect(vib); vib.connect(o.detune); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + e.a);
    g.gain.setTargetAtTime(vol * e.s, t + e.a, e.tau);
    g.gain.setTargetAtTime(0.0001, t + dur, e.r);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + e.r * 6);
    o.onended = () => { g.disconnect(); if (vib) { lfo.disconnect(vib); vib.disconnect(); } };
  }
  function drum(k, t, dv, out) {
    const ac = Sfx.ctx;
    if (k === 'k') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(0.13 * dv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.16); o.onended = () => g.disconnect();
      return;
    }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    const [type, fr, q, vol, dur] = k === 's' ? ['bandpass', 1800, 0.7, 0.05, 0.09] : ['highpass', 7000, 0.7, 0.018, 0.03];
    s.buffer = nbuf; f.type = type; f.frequency.value = fr; f.Q.value = q;
    g.gain.setValueAtTime(vol * dv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); s.onended = () => g.disconnect();
  }
  function tick() {
    const ac = Sfx.ctx, s = SONGS[cur]; if (!ac || !s || !bus) return;
    const sd = 60 / s.bpm / s.spb;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.03;
    while (nextT < ac.currentTime + 0.2) {
      for (const c of s.ch) {
        const e = c.at[step % c.len]; if (!e) continue;
        const dur = e.len * sd * 0.92;
        note(c, e.n, nextT, dur, c.v, bus.g);
        if (c.echo) note(c, e.n, nextT + c.echo[0] * sd, dur, c.v * c.echo[1], bus.g);
        if (c.dbl) note(c, e.n + c.dbl[0], nextT, dur, c.v * c.dbl[1], bus.g);
      }
      if (s.dr) { const k = s.dr[step % s.dr.length]; if (k !== '.') drum(k, nextT, s.dv || 1, bus.g); }
      nextT += sd; step++;
    }
  }
  function start(name) {
    const ac = Sfx.ctx; if (!ac || !Sfx.master) return;
    setup(ac);
    fadeOut(bus); bus = newBus(ac);
    cur = name; step = 0; nextT = ac.currentTime + 0.08;
    timer = setInterval(tick, 50); tick();
  }
  function halt() { if (timer) clearInterval(timer); timer = null; cur = null; }
  function stop() { halt(); want = null; if (bus && Sfx.ctx) { fadeOut(bus); bus = null; } }
  return {
    play(name) {
      if (!SONGS[name]) { console.warn('Música desconhecida:', name); return; }
      if (want === name && cur === name) return;
      halt(); want = name; if (Sfx.ctx) start(name);
    },
    stop,
    resume() { if (want && !cur && Sfx.ctx) start(want); },
    get current() { return cur; },
    // para testes e para a documentação: duração do laço em segundos
    info() { return Object.fromEntries(Object.entries(SONGS).map(([k, s]) => [k, { steps: s.len, sec: +(s.len * 60 / s.bpm / s.spb).toFixed(1), chans: s.ch.map(c => c.len) }])); },
  };
})();
