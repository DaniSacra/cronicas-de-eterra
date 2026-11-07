// ===== Sistema de batalha por turnos =====

let B = null;
const bgCanvas = document.createElement('canvas'); bgCanvas.width = VW; bgCanvas.height = VH;
// Battle narration ("Andilla usa Golpe Baixo!") shows on the top plaque, where the command name was
const bsay = async t => {
  if (!B) return UI.say(t, { auto: 650 + t.length * 18 });
  B.label = t; await wait(600 + t.length * 16);
  if (B && B.label === t) B.label = null;
};
const ename = e => e.name + (e.letter ? ' ' + e.letter : '');
const aliveEnemies = () => B.enemies.filter(e => e.hp > 0);
const retarget = t => (t && t.hp > 0) ? t : (aliveEnemies().length ? pick(aliveEnemies()) : null);

function makeEnemies(ids) {
  const list = ids.map((id, i) => {
    const d = ENEMIES[id];
    const frames = Sprites.enemyFrames(id);
    return { ...d, id, maxhp: d.hp, hp: d.hp, i, frames, canvas: frames[0], grid: Sprites.isGrid(id), hitT: -1e9, atkT: -1e9, dieT: null, letter: '' };
  });
  const counts = {};
  list.forEach(e => counts[e.id] = (counts[e.id] || 0) + 1);
  const seen = {};
  list.forEach(e => { if (counts[e.id] > 1) { seen[e.id] = (seen[e.id] || 0); e.letter = 'ABC'[seen[e.id]++]; } });
  // Whole-number scale and positions (src/uirules.js): pixels stay square, nothing under the HUD
  const boss = list.some(e => e.boss);
  battleLayout(list.map(e => ({ w: e.canvas.width, h: e.canvas.height, float: e.float })), VW, VH, boss)
    .forEach((L, i) => Object.assign(list[i], L, { cy: L.top + L.h / 2 }));
  return list;
}

function addNum(x, y, text, color) { B.nums.push({ x, y, text: String(text), color, t0: performance.now() }); }
function addFx(type, x, y, dur = 500) { B.fx.push({ type, x, y, t0: performance.now(), dur }); }
function shake(ms = 250) { G.shakeUntil = performance.now() + ms; }

async function hitEnemy(e, dmg, color = '#fff') {
  e.hp = Math.max(0, e.hp - dmg);
  e.hitT = performance.now();
  addNum(e.x, e.boss ? e.cy : e.top + 28, dmg, color); // no chefe, o número nasce no meio do sprite; nos outros para em top+12, longe da barra de PV
  if (e.hp <= 0) {
    await wait(260);
    e.dieT = performance.now(); Sfx.die();
    await bsay(e.boss ? e.say.stagger : `${ename(e)} cai!`);
  } else await wait(380);
}

// quiet: no ataque em área só o primeiro grito toca (quatro juntos somam +12 dB)
function hurtMember(m, dmg, quiet = false) {
  if (m.defending) dmg = Math.max(1, Math.round(dmg / 2));
  m.hp = Math.max(0, m.hp - dmg);
  UI.cardFloat(m, '-' + dmg, 'dmg'); UI.cardHit(m); shake(); if (!quiet) Sfx.hurt();
  UI.updateParty();
  return dmg;
}


// ---------- Escolha de comandos ----------
// Target choice has no window: an arrow over the enemy (or the hero card) and the name on the top plaque
async function chooseEnemy() {
  const list = aliveEnemies();
  if (list.length === 1) return list[0]; // um inimigo só (o chefe também): alvo direto
  return UI.choose(list.map(e => ({ label: ename(e), value: e })), { style: 'pointer', cancel: true, cols: list.length,
    onHover: v => { B.hover = v; B.label = v ? ename(v) : null; } });
}

async function chooseTarget(kind, title) {
  if (kind === 'enemy') return chooseEnemy();
  if (kind === 'allEnemies' || kind === 'allAllies') return 'all';
  return pickAlly(kind, title, { style: 'pointer', cols: G.party.length,
    onHover: v => { UI.markCard(v); B.label = v ? pdef(v).name : null; } });
}

// Mouse/touch while aiming: hovering an enemy moves the arrow, clicking it picks
function enemyAt(ev) {
  const r = view.getBoundingClientRect(), x = (ev.clientX - r.left) * VW / r.width, y = (ev.clientY - r.top) * VH / r.height;
  return B && aliveEnemies().find(e => Math.abs(x - e.x) < e.w / 2 && y > e.top - 8 && y < e.base + 12);
}
view.addEventListener('mousemove', ev => { const e = enemyAt(ev); if (e) UI.hoverValue(e); });
view.addEventListener('click', ev => { const e = enemyAt(ev); if (e && UI.pickValue(e)) ev.stopPropagation(); });

async function chooseCommand(m) {
  const d = pdef(m);
  UI.updateParty(m.id);
  // each hero's bar opens on the last command of this fight (right after the tip, on Tática)
  const mem = (B.mem = B.mem || {})[m.id] = B.mem[m.id] || {};
  let last = B.tipStart || mem.cmd || 'atk';
  B.tipStart = null;
  for (;;) {
    const spells = knownSpells(m), one = spells.length === 1 && SPELLS[spells[0]];
    let v = last = await UI.choose([
      { label: 'Atacar', value: 'atk', icon: 'atk' },
      { label: d.skillWord, value: 'spell', disabled: !spells.length, icon: 'spell' },
      { label: 'Item', value: 'item', disabled: !itemOptions().length, icon: 'item' },
      { label: 'Defender', value: 'def', icon: 'def' },
      { label: 'Fugir', value: 'run', icon: 'run' },
      { label: 'Tática', value: 'macro', icon: 'tatica' },
    ], { style: 'bar', anchor: document.getElementById('card-' + m.id), start: last, cols: 6, keys: MACRO_KEYS,
      onHover: (v, op) => { B.label = !op ? null : op.value === 'spell' && one ? `${one.name} · ${one.mp} PM` : op.label; } });
    if (['atk', 'spell', 'item', 'def'].includes(v)) mem.cmd = v;
    if (v === 'macro') v = await macroMenu();
    if (v == null) continue;
    if (v === 'macroSave') { await recordMacro(); continue; }
    if (v === 'macro1' || v === 'macro2') {
      const slot = v === 'macro1' ? 0 : 1;
      if (!macros()[slot]) { Sfx.bump(); await bsay(`${macroName(slot)} está vazia.`); continue; }
      G.seen.macro = 1;
      return { type: 'macro', slot };
    }
    if (v === 'atk') {
      const t = await chooseEnemy();
      if (t == null) continue;
      return { type: 'attack', target: t };
    }
    if (v === 'spell') {
      // the list opens even for a single skill: the player reads its name and sees there is room for more;
      // it opens on the last one used
      const sp = await UI.choose(spells.map(id => ({ label: SPELLS[id].name, hint: SPELLS[id].mp + 'PM', value: id, disabled: m.mp < SPELLS[id].mp })),
        { title: `${d.skillWord} ${midName(d.name, 'de')} (PM ${m.mp})`, cancel: true, cols: 2, start: mem.spell,
          onHover: v => { B.label = v ? SPELLS[v].desc : null; } }); // the plaque says what the spell does
      if (sp == null) continue;
      mem.spell = sp;
      const t = await chooseTarget(SPELLS[sp].target, `${SPELLS[sp].name} em quem?`);
      if (t == null) continue;
      return { type: 'spell', spell: sp, target: t };
    }
    if (v === 'item') {
      const it = await UI.choose(itemOptions(), { title: 'Usar qual item?', cancel: true, cols: 2 });
      if (it == null) continue;
      const t = await chooseTarget(ITEMS[it].target, `${ITEMS[it].name} em quem?`);
      if (t == null) continue;
      const useless = itemUseless(it, t);   // nada a curar: escolhe de novo, sem perder a vez
      if (useless) { await bsay(useless); continue; }
      return { type: 'item', item: it, target: t };
    }
    if (v === 'def') return { type: 'defend' };
    if (v === 'run') return { type: 'run' };
  }
}

// ---------- Táticas (macros, src/macro.js) ----------
const MACRO_KEYS = { 1: 'macro1', 2: 'macro2', g: 'macroSave' };
const macros = () => (G.macros = normalizeMacros(G.macros));
const macroOpt = (slot, value) => {
  const mc = macros()[slot];
  return { label: macroName(slot), value, icons: macroIcons(mc, G.party.map(m => m.id), SPELLS), hint: mc ? '' : 'vazia', disabled: value !== slot && !mc };
};
const macroMenu = () => UI.choose([macroOpt(0, 'macro1'), macroOpt(1, 'macro2'), { label: 'Gravar tática', value: 'macroSave', disabled: !G.lastRound }],
  { title: 'Táticas · atalhos 1, 2 e G', cancel: true, cols: 1 });

// Saves the last round the party played into one of the two slots (asking before replacing one)
async function recordMacro() {
  if (!G.lastRound) { Sfx.bump(); await bsay('Ainda não há rodada para gravar.'); return; }
  const slot = await UI.choose([macroOpt(0, 0), macroOpt(1, 1)], { title: 'Gravar a última rodada em qual espaço?', cancel: true, cols: 1 });
  if (slot == null) return;
  if (macros()[slot] && !await UI.choose([{ label: 'Sim', value: true }, { label: 'Não', value: false }],
    { title: `Substituir ${macroName(slot)}?`, cancel: true, cols: 2, start: false })) return;
  macros()[slot] = { ...G.lastRound };
  G.seen.macro = 1;
  await bsay(`${macroName(slot)} gravada.`);
}

// The hero's command this turn: from the running tactic when it has one for him, otherwise chosen by hand.
// Returns the command and what goes into this round's record.
async function heroCommand(m, opts) {
  for (;;) {
    const saved = B.macro && B.macro.entries[m.id];
    if (saved) {
      const { cmd, warn } = resolveMacro(saved, { actor: m, name: pdef(m).name, party: G.party, enemies: B.enemies, inv: G.inv,
        spells: Object.fromEntries(knownSpells(m).map(id => [id, SPELLS[id]])), items: ITEMS, maxHp, maxMp, useless: itemUseless });
      if (warn) await bsay(warn);
      return { cmd, entry: saved };
    }
    const cmd = await chooseCommand(m);
    if (cmd.type === 'macro') {
      B.macro = { slot: cmd.slot, entries: macros()[cmd.slot] };
      if (!B.macro.entries[m.id]) await bsay(`${pdef(m).name} não estava na ${macroName(cmd.slot)}.`);
      continue;
    }
    const noRun = opts.noRun || (B.boss && B.enemies.find(e => e.boss).say.noRun); // the boss bars the door: choose again
    if (cmd.type === 'run' && noRun) { await UI.say(noRun); continue; }
    return { cmd, entry: macroEntry(cmd) };
  }
}
// Esc or a tap while a tactic runs: from the next hero on, commands are chosen by hand again
function stopMacro() {
  if (!B || !B.macro) return false;
  B.macro = null; Sfx.cancel(); bsay('Tática interrompida.');
  return true;
}
if (typeof document !== 'undefined') document.getElementById('screen')?.addEventListener('click', () => { if (G.mode === 'battle' && !UI.busy()) stopMacro(); });

const MACRO_TALK = [
  ['lyra', 'Estamos repetindo os mesmos golpes. Podíamos combinar uma tática e só dar o sinal.'],
  ['aldo', 'Menos conversa. Mas faz sentido.'],
  ['andilla', 'Eu bato, ela queima, o padre cura. Até eu decoro isso.', 'alegre'],
];
async function macroTip() {
  G.seen.dicaTatica = 1;
  await partyTalk('tatica', MACRO_TALK);
  await UI.say('Dica: ' + MACRO_TIP);
  B.tipStart = 'macro';
}

// ---------- Execução ----------
async function partyAct(c) {
  const a = c.actor, an = pdef(a).name;
  if (c.type === 'defend') { a.defending = true; Sfx.defend(); UI.updateParty(); await bsay(`${an} se defende.`); return; }
  if (c.type === 'attack') {
    const t = retarget(c.target); if (!t) return;
    await bsay(`${an} ataca ${midName(ename(t))}!`);
    addFx('slash', t.x, t.cy, 300); Sfx.slash(); await wait(180);
    const roll = rollHit(critChance(a.id), t.agi), crit = roll === 'crit';
    if (roll === 'miss') { Sfx.miss(); addNum(t.x, t.top + 10, 'ERROU', '#aaa'); await bsay('Errou!'); return; }
    if (roll === 'dodge') { Sfx.miss(); addNum(t.x, t.top + 10, 'ESQUIVA', '#aaa'); await bsay(`${ename(t)} se esquiva!`); return; }
    const dmg = physDmg(stat(a, 'atk'), t.def, crit ? HIT.critMul : 1);
    if (crit) { Sfx.crit(); shake(150); } else Sfx.hit();
    await hitEnemy(t, dmg, crit ? '#ffd23f' : '#fff');
    if (crit && t.hp > 0) await bsay('Golpe crítico!');
    if (crit) await heroLine('crit', a);
    return;
  }
  if (c.type === 'item') {
    if (!G.inv[c.item]) { await bsay(`${an} procura ${ITEMS[c.item].name}, mas acabou!`); return; }
    await bsay(`${an} usa ${ITEMS[c.item].name}.`);
    await bsay(applyItem(c.item, c.target));
    return;
  }
  if (c.type === 'spell') {
    const sp = SPELLS[c.spell];
    if (a.mp < sp.mp) { await bsay(`${an} não tem PM suficiente!`); return; }
    a.mp -= sp.mp; UI.updateParty();
    const targets = sp.kind === 'heal' || sp.kind === 'revive' ? [] : sp.target === 'allEnemies' ? aliveEnemies() : [retarget(c.target)].filter(Boolean);
    await bsay(spellLine(an, sp.name, sp.target === 'enemy' && targets[0] ? ename(targets[0]) : ''));
    if (sp.kind === 'heal' || sp.kind === 'revive') { await bsay(castSupport(a, c.spell, c.target)); return; }
    if (sp.fx && Sfx[sp.fx]) Sfx[sp.fx](); else Sfx.slash();
    if (sp.fx === 'bolt') { G.flashColor = '255,255,200'; G.flash = { t0: performance.now(), dur: 180 }; }
    targets.forEach(t => addFx(sp.fx, t.x, t.cy, sp.fx === 'slash' ? 300 : 650));
    await wait(sp.fx === 'slash' ? 200 : 450);
    for (const t of targets) {
      if (t.hp <= 0) continue;
      let dmg;
      if (sp.kind === 'phys') dmg = Math.round(physDmg(stat(a, 'atk'), sp.pierce ? 0 : t.def, sp.power) * (sp.bone && t.undead ? sp.bone : 1));
      else {
        dmg = magDmg((stat(a, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1), t.res);
        if (sp.kind === 'holy' && t.undead) dmg *= 2;
      }
      Sfx.hit();
      await hitEnemy(t, dmg, sp.kind === 'phys' ? '#fff' : '#9fe0ff');
    }
    if (sp.kind === 'holy' && targets.some(t => t.undead)) await bsay('A luz queima os mortos-vivos!');
    if (sp.bone && targets.some(t => t.undead)) await bsay('Osso quebra na junta!');
  }
}

async function enemyAttack(e, t, power = 1) {
  e.atkT = performance.now();
  await wait(200);
  const roll = rollHit(e.boss ? 0 : HIT.crit, stat(t, 'agi'));
  if (roll === 'miss') { Sfx.miss(); UI.cardFloat(t, 'ERROU', '#aaa'); await bsay(`${ename(e)} erra!`); return 0; }
  if (roll === 'dodge') { Sfx.miss(); UI.cardFloat(t, 'ESQUIVA', '#aaa'); await bsay(`${pdef(t).name} se esquiva!`); return 0; }
  if (roll === 'crit') { Sfx.crit(); shake(300); }
  const d = hurtMember(t, physDmg(e.atk, stat(t, 'def'), power * (roll === 'crit' ? HIT.critMul : 1)));
  await wait(350);
  if (roll === 'crit') await bsay('Golpe crítico!');
  return d;
}

async function checkFallen(t) {
  if (t.hp <= 0) { Sfx.fall(); await bsay(`${pdef(t).name} caiu!`); await fallLine(t); }
  else if (t.hp < maxHp(t) * 0.3) await heroLine('low', t);
}
// A short line from a hero (data.js BATTLE_LINES): each kind at most once per fight, and not every time
async function heroLine(kind, m, ...args) {
  const said = (B.lines = B.lines || {});
  const pool = BATTLE_LINES[kind] && BATTLE_LINES[kind][m.id];
  if (!pool || said[kind] || m.hp <= 0 || Math.random() >= 0.6) return;
  said[kind] = 1;
  const l = pool[Math.floor(Math.random() * pool.length)];
  await bsay(`${pdef(m).name}: "${typeof l === 'function' ? l(...args) : l}"`);
}
const fallLine = t => { const id = fallReactor(t.id, aliveParty().map(m => m.id)), m = id && G.party.find(p => p.id === id); return m ? heroLine('fall', m, t.id, pdef(t).name) : null; };

async function enemyAct(e) {
  const targets = aliveParty(); if (!targets.length) return;
  if (e.boss) return bossAct(e);
  const t = pick(targets);
  const sk = e.skill;
  if (sk && Math.random() < sk.chance) {
    await bsay(`${ename(e)} usa ${sk.name} ${midName(pdef(t).name, 'em')}!`);
    if (sk.kind === 'phys') { await enemyAttack(e, t, sk.power); }
    else if (sk.kind === 'drain') {
      const d = await enemyAttack(e, t, sk.power);
      if (d > 0) { const h = Math.min(e.maxhp - e.hp, d); e.hp += h; Sfx.drain(); addNum(e.x, e.top + 10, '+' + h, '#7dff9a'); await wait(300); }
    } else if (sk.kind === 'mag') {
      e.atkT = performance.now(); Sfx.ice(); await wait(250);
      hurtMember(t, magDmg(sk.power * rnd(0.9, 1.1), stat(t, 'res')));
      await wait(350);
    }
  } else {
    await bsay(`${ename(e)} ataca ${midName(pdef(t).name)}!`);
    await enemyAttack(e, t);
  }
  await checkFallen(t);
}

// Chefe: golpe, ataque em todos e dreno; as falas vêm de ENEMIES[id].say
async function bossAct(e) {
  const S = e.say;
  // O aviso da Ana se paga: na segunda rodada, uma vez por save (fica no save mesmo se o grupo cair), ele chama alguém pelo nome
  if (S.whisper && B.round === 2 && !G.seen.sussurro) {
    const t = ['teo', 'lyra', 'andilla', 'aldo'].map(id => G.party.find(m => m.id === id)).find(m => m && m.hp > 0);
    if (t) { G.seen.sussurro = 1; keepSeen('sussurro'); Sfx.dark(); await bsay(S.whisper(pdef(t).name)); await bsay(t.id === 'teo' ? `${pdef(t).name} aperta o livro e não responde.` : 'Ninguém responde.'); }
  }
  if (!e.enraged && e.hp < e.maxhp * 0.5) {
    e.enraged = true;
    Sfx.dark(); shake(500);
    await bsay(S.enrage);
  }
  const r = Math.random();
  if (r < 0.38) {
    const t = pick(aliveParty());
    await bsay(S.hit(pdef(t).name));
    await enemyAttack(e, t, 1);
    await checkFallen(t);
  } else if (r < 0.7) {
    await bsay(S.aoe);
    Sfx.bell(); shake(300); addFx('dark', VW / 2, VH / 2, 900); G.flashColor = '200,150,60'; G.flash = { t0: performance.now(), dur: 400 };
    await wait(500);
    aliveParty().forEach((t, i) => hurtMember(t, magDmg(e.chama * rnd(0.85, 1.15), stat(t, 'res')), i > 0));
    await wait(500);
    for (const t of G.party) if (t.hp <= 0 && !t._fallenMsg) { t._fallenMsg = true; Sfx.fall(); await bsay(`${pdef(t).name} caiu!`); await fallLine(t); }
  } else {
    const t = pick(aliveParty());
    await bsay(S.drain(pdef(t).name));
    e.atkT = performance.now(); Sfx.drain(); await wait(300);
    const d = hurtMember(t, magDmg(e.dreno * rnd(0.9, 1.1), stat(t, 'res')));
    const h = Math.min(e.maxhp - e.hp, d); e.hp += h;
    addNum(e.x, e.top + 20, '+' + h, '#7dff9a');
    await wait(400);
    await checkFallen(t);
  }
}

// ---------- Iniciativa e surpresa ----------
// free: só esse lado age na rodada de abertura. bonus: esse lado fica mais rápido na 1ª rodada.
const SURPRISE = {
  ambush:    { msg: 'Emboscada! Os inimigos atacam antes que o grupo reaja!', free: 'enemy' },
  offguard:  { msg: 'O grupo foi pego desprevenido!', bonus: 'enemy' },
  normal:    {},
  advantage: { msg: 'O grupo percebeu os inimigos primeiro!', bonus: 'party' },
  preempt:   { msg: 'Ataque surpresa! Os inimigos não perceberam o grupo!', free: 'party' },
};

function rollSurprise(isBoss) {
  if (isBoss) return 'normal';
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const diff = avg(aliveParty().map(m => stat(m, 'agi'))) - avg(B.enemies.map(e => e.agi));
  const r = rnd(0, 100) + diff * 2.5;
  if (r < 8) return 'ambush';
  if (r < 22) return 'offguard';
  if (r > 94) return 'preempt';
  if (r > 80) return 'advantage';
  return 'normal';
}

function buildOrder({ only, bonus } = {}) {
  const list = [];
  // Velocidade sorteada a cada rodada: agilidade + um dado de 0 a 16. A agilidade pesa, mas a ordem muda de rodada
  // para rodada (quem agiu por último numa pode agir primeiro na seguinte).
  const speed = (side, agi) => {
    let v = agi + rnd(0, 16);
    if (bonus) v *= side === bonus ? 1.5 : 0.7;
    return v;
  };
  // Na rodada livre (surpresa), o lado surpreendido aparece apagado na fila e perde a vez
  for (const m of aliveParty()) list.push({ actor: m, side: 'party', speed: speed('party', stat(m, 'agi')), skip: only === 'enemy' });
  for (const e of aliveEnemies()) {
    list.push({ actor: e, side: 'enemy', speed: speed('enemy', e.agi), skip: only === 'party' });
    if (e.boss && e.enraged) list.push({ actor: e, side: 'enemy', speed: speed('enemy', e.agi), skip: only === 'party' });
  }
  return list.sort((p, q) => (p.skip - q.skip) || (q.speed - p.speed));
}

async function tryRun(m, isBoss) {
  await bsay(G.party.length > 1 ? `${pdef(m).name} tenta fugir com o grupo...` : `${pdef(m).name} tenta fugir...`);
  if (isBoss) { await bsay(B.enemies.find(e => e.boss).say.noRun); return false; }
  const ea = aliveEnemies().reduce((s, e) => s + e.agi, 0) / aliveEnemies().length;
  const chance = Math.min(0.9, Math.max(0.2, 0.55 + (stat(m, 'agi') - ea) * 0.03));
  if (Math.random() < chance) { Sfx.flee(); await bsay('Vocês escaparam!'); return true; }
  Sfx.bump(); await bsay('Não conseguiram fugir!');
  return false;
}

// ---------- Fluxo principal ----------
// opts: surprise (força o resultado), intro (texto de entrada), hints (dicas do tutorial), noRun (texto ao tentar fugir)
async function startBattle(ids, isBoss, opts = {}) {
  // Backdrop: the place of the fight painted in pseudo 3D (src/battlebg.js), at the enemies' pixel size
  if (G.mode === 'town') Layout.normal(); // a batalha usa a escala de sempre, mesmo vinda de uma área com zoom
  const enemies = makeEnemies(ids);
  const place = battlePlace({ mode: G.mode, area: G.area, boss: isBoss, floor: G.mode === 'explore' && FLOORS[G.floor] ? FLOORS[G.floor].battle : null });
  bgCanvas.width = VW; bgCanvas.height = VH;
  bgCanvas.getContext('2d').drawImage(BattleBG.paint(place, VW, VH, enemies[0].scale), 0, 0);
  if (G.mode === 'explore') G.seen.lutasCripta = (G.seen.lutasCripta || 0) + 1;   // the Tática tip waits for the 3rd
  G.mode = 'battle';
  // the boss theme waits for the toll to fade; a night ambush has no fanfare
  Music.play(isBoss ? 'boss' : 'battle', { delay: isBoss ? 1.5 : 0 });
  if (isBoss) Sfx.bossEncounter(); else if (opts.grave) Sfx.encounterDark(); else Sfx.encounter();
  G.flashColor = '255,255,255';
  G.flash = { t0: performance.now(), dur: 600, strobe: true };
  B = { enemies, place, fx: [], nums: [], hover: null, boss: isBoss, intro: performance.now() + 600 };
  await wait(650);
  const names = B.enemies.map(ename);
  await UI.say(isBoss ? B.enemies.find(e => e.boss).say.intro
    : opts.intro || `${names.join(', ')} ${names.length > 1 ? 'aparecem' : 'aparece'}!`, { auto: isBoss ? 3200 : 1300 });

  G.party.forEach(m => { m.defending = false; });
  B.surprise = opts.surprise || rollSurprise(isBoss);
  const hints = [...(opts.hints || [])];
  const sur = SURPRISE[B.surprise];
  if (sur.msg) {
    if (sur.free === 'enemy' || sur.bonus === 'enemy') { Sfx.hurt(); shake(sur.free ? 400 : 200); } else Sfx.crit();
    await UI.say(sur.msg, { auto: 1600 });
  }

  // Cada rodada: todos (heróis e inimigos) em fila por agilidade; cada um age na sua vez.
  let result = null, round = 0;
  while (!result) {
    B.order = buildOrder(round === 0 ? { only: sur.free, bonus: sur.bonus } : {});
    B.round = round + (sur.free === 'enemy' ? 0 : 1); B.roundT = performance.now(); // after an ambush the enemies' free round is 0: the party's first is Rodada 1
    B.macro = null; B.thisRound = {};   // a tactic lasts one round
    if (macroTipDue(G.seen, B.round, isBoss)) await macroTip();
    for (B.turn = 0; B.turn < B.order.length; B.turn++) {
      const c = B.order[B.turn];
      if (c.actor.hp <= 0 || c.skip) continue;
      if (c.side === 'party') {
        const m = c.actor;
        m.defending = false; // a defesa dura até a próxima vez do herói
        if (hints.length) await UI.say('Dica: ' + hints.shift());
        const { cmd, entry } = await heroCommand(m, opts);
        B.thisRound[m.id] = entry;
        UI.updateParty(null);
        if (cmd.type === 'run') {
          if (await tryRun(m, isBoss)) { result = 'fled'; break; }
          continue;
        }
        await partyAct({ ...cmd, actor: m, side: 'party' });
      } else {
        G.party.forEach(m => { m._fallenMsg = m.hp <= 0; });
        await enemyAct(c.actor);
      }
      if (!aliveEnemies().length) { result = 'win'; break; }
      if (!aliveParty().length) { result = 'lose'; break; }
    }
    G.lastRound = closeRound(G.lastRound, B.thisRound, !result);
    round++;
  }
  B.order = null; B.macro = null;

  G.party.forEach(m => { m.defending = false; delete m._fallenMsg; });
  if (result === 'win') {
    await wait(300);
    Music.stop(); if (!isBoss) Sfx.victory(); // o chefe cai com a última badalada (ending)
    if (!isBoss) { const up = aliveParty(); if (up.length) await heroLine('win', up[Math.floor(Math.random() * up.length)]); }
    const xp = B.enemies.reduce((s, e) => s + e.xp, 0);
    if (!isBoss) {
      const gold = Math.round(xp * rnd(1.3, 1.7));
      G.gold += gold;
      await UI.say(`Vitória! Cada membro de pé recebe ${xp} XP.\nO grupo encontra ${gold} moedas.`);
      for (const e of B.enemies) {
        if (e.drop && Math.random() < e.drop[1]) {
          G.inv[e.drop[0]] = (G.inv[e.drop[0]] || 0) + 1;
          Sfx.chest(); await UI.say(`${ename(e)} deixou cair: ${ITEMS[e.drop[0]].name}!`);
        }
      }
      const ups = aliveParty().flatMap(m => { m.xp += xp; const u = levelUp(m); if (u.length) UI.cardGlow(m); return u; });
      UI.updateParty();
      for (const msg of levelUpLines(ups)) { Sfx.levelup(); await UI.say(msg); }
    }
  }
  UI.updateParty(null);
  B = null;
  return result;
}

// ---------- Desenho da batalha ----------
// Pixel ellipse on the floor under an enemy (the sprite never carries its own shadow)
function groundShadow(c, x, y, rx, alpha) {
  c.fillStyle = `rgba(38,32,46,${(0.5 * alpha).toFixed(2)})`;
  for (let dy = -2; dy <= 1; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - ((dy + 0.5) / 2.5) ** 2));
    c.fillRect(x - half, y + dy, half * 2, 1);
  }
}

function drawBattle(now) {
  const c = vctx;
  c.drawImage(bgCanvas, 0, 0, VW, VH);
  const appear = Math.min(1, Math.max(0, 1 - (B.intro - now) / 600));

  for (const e of [...B.enemies].sort((a, b) => a.base - b.base)) { // the back row first, so the front one stands over it
    if (e.dieT && now - e.dieT > 700) continue;
    let alpha = appear;
    if (e.dieT) alpha = Math.max(0, 1 - (now - e.dieT) / 700);
    if (now - e.hitT < 320 && Math.floor((now - e.hitT) / 55) % 2 === 0) continue;
    // Idle: two frames (slow and heavy for the boss); flyers bob a few whole pixels; attacking = a quick hop forward
    const frame = e.frames[Math.floor((now + e.i * 370) / (e.boss ? 900 : 520)) % 2];
    const bob = e.float ? Math.round(Math.sin(now / 380 + e.i * 1.7) * 3) : 0;
    const hop = now - e.atkT < 300 ? Math.round((e.boss ? 3 : 5) * Math.sin((now - e.atkT) / 300 * Math.PI)) : 0; // o chefe, mais pesado, pula menos
    const rise = e.dieT ? Math.round((now - e.dieT) / 40) : 0;
    if (e.grid && !e.dieT) groundShadow(c, e.x, e.base, Math.round(e.w * (e.float ? 0.28 : 0.38)), alpha);
    c.globalAlpha = alpha;
    if (e.dieT) { c.filter = 'sepia(1) saturate(4) hue-rotate(-50deg)'; }
    c.drawImage(frame, e.left, e.top + bob - hop - rise, e.w, e.h);
    c.filter = 'none';
    c.globalAlpha = 1;
    // Barra de vida
    if (!e.dieT && !e.boss) {
      const bw = 34;
      const by = Math.max(2, e.top - 6); // em cima da cabeça: embaixo a barra de comandos a cobriria
      c.fillStyle = '#000'; c.fillRect(e.x - bw / 2 - 1, by, bw + 2, 4);
      c.fillStyle = e.hp / e.maxhp > 0.3 ? '#e04848' : '#ff9030'; c.fillRect(e.x - bw / 2, by + 1, bw * e.hp / e.maxhp, 2);
      if (e.letter) { // inimigos repetidos: a letra (A, B, C) à esquerda da barra, a mesma das mensagens
        c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.lineWidth = 2; c.strokeStyle = '#26202e';
        const lx = Math.max(9, e.x - bw / 2 - 3);
        c.strokeText(e.letter, lx, by + 2); c.fillStyle = '#ffffff'; c.fillText(e.letter, lx, by + 2); c.textBaseline = 'alphabetic';
      }
    }
  }

  // Chefe: barra no topo
  const boss = B.enemies.find(e => e.boss);
  // Boss fight: the boss window always shows the name; commands and narration use the plaque below it
  if (boss) HUD.boss(boss.name, Math.max(0, boss.hp / boss.maxhp), boss.enraged, B.label);

  // Seta de alvo (balança em cima do inimigo escolhido) e o nome do comando/alvo na placa do topo
  const hv = B.hover;
  if (B.label && !boss) HUD.label(B.label); // no chefe, o comando sai na placa, longe do rosto dele
  if (hv && hv.hp > 0) {
    const y = Math.max(10, hv.top - 10) - (Math.floor(now / 200) % 2) * 2; // acima da barra de PV
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.moveTo(hv.x - 5, y - 7); c.lineTo(hv.x + 5, y - 7); c.lineTo(hv.x, y); c.closePath(); c.fill();
  }

  if (B.order) drawOrder(c, now, boss);

  B.fx = B.fx.filter(f => drawFx(c, f, now));

  c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center';
  B.nums = B.nums.filter(n => {
    const k = (now - n.t0) / 1000; if (k > 1) return false;
    const y = n.y - 16 * Math.min(1, k * 2.5);
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(n.text, n.x, y);
    c.fillStyle = n.color; c.fillText(n.text, n.x, y);
    c.globalAlpha = 1;
    return true;
  });
}

// Barra com a ordem dos turnos da rodada (quem já agiu fica apagado, a vez atual fica destacada)
function drawOrder(c, now, boss) {
  const list = B.order, h = 12, y = boss ? 29 : 5; // y/h: canvas room kept free for the HUD queue
  HUD.queue(list.map((o, i) => {
    const a = o.actor;
    return {
      label: o.side === 'party' ? queueTag(pdef(a).name) : a.boss ? a.name.replace(/^O /, '').slice(0, 2) : a.letter ? a.name[0] + a.letter : a.name.slice(0, 2),
      color: o.side === 'party' ? pdef(a).color : 'var(--danger)',
      state: a.hp <= 0 || o.skip ? 'gone' : i < B.turn ? 'done' : i === B.turn ? 'cur' : 'next',
    };
  }), B.round > 1 && now - B.roundT < 1600 ? B.round : 0, B.macro ? macroName(B.macro.slot) : '');
  // Seta sobre o inimigo que está agindo
  const cur = list[B.turn];
  if (cur && cur.side === 'enemy' && cur.actor.hp > 0 && !cur.actor.boss) {
    const e = cur.actor, ty = Math.max(y + h + 8, e.top - 10);
    c.fillStyle = '#ff5050';
    c.beginPath(); c.moveTo(e.x - 4, ty - 6); c.lineTo(e.x + 4, ty - 6); c.lineTo(e.x, ty); c.closePath(); c.fill();
  }
}

function drawFx(c, f, now) {
  const k = (now - f.t0) / f.dur;
  if (k > 1) return false;
  if (k < 0) return true;
  const { x, y } = f;
  c.save();
  switch (f.type) {
    case 'slash': {
      const p = Math.min(1, k * 2.2);
      c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        c.beginPath(); c.moveTo(x - 20 + i * 7, y - 20); c.lineTo(x - 20 + i * 7 + 40 * p, y - 20 + 40 * p); c.stroke();
      }
      break;
    }
    case 'fire': {
      const g = c.createRadialGradient(x, y, 0, x, y, 10 + k * 28);
      g.addColorStop(0, `rgba(255,255,180,${1 - k})`); g.addColorStop(0.4, `rgba(255,140,30,${0.9 * (1 - k)})`); g.addColorStop(1, 'rgba(200,30,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 10 + k * 28, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + k * 2, r = k * 30;
        c.fillStyle = i % 2 ? `rgba(255,200,60,${1 - k})` : `rgba(255,90,20,${1 - k})`;
        c.fillRect(x + Math.cos(a) * r - 1.5, y + Math.sin(a) * r - k * 14 - 1.5, 3, 3);
      }
      break;
    }
    case 'ice': {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, r = 32 * (1 - Math.min(1, k * 1.6));
        const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r;
        c.fillStyle = `rgba(200,240,255,${1 - k * 0.8})`;
        c.beginPath(); c.moveTo(sx, sy - 6); c.lineTo(sx + 3, sy); c.lineTo(sx, sy + 6); c.lineTo(sx - 3, sy); c.closePath(); c.fill();
      }
      if (k > 0.5) { c.fillStyle = `rgba(180,230,255,${(1 - k) * 1.2})`; c.fillRect(x - 22, y - 26, 44, 52); }
      break;
    }
    case 'bolt': {
      if (k < 0.7) {
        c.strokeStyle = Math.floor(now / 40) % 2 ? '#fff' : '#ffe060'; c.lineWidth = 2.5;
        c.beginPath(); let px = x + rnd(-6, 6); c.moveTo(px, 0);
        for (let yy = 12; yy < y; yy += 12) { px = x + rnd(-10, 10); c.lineTo(px, yy); }
        c.lineTo(x, y); c.stroke();
        c.fillStyle = `rgba(255,255,200,${0.6 * (1 - k)})`; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
      }
      break;
    }
    case 'holy': {
      const w = 26 * (1 - k * 0.6);
      const g = c.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,255,220,0)'); g.addColorStop(0.5, `rgba(255,255,230,${1 - k})`); g.addColorStop(1, 'rgba(255,255,220,0)');
      c.fillStyle = g; c.fillRect(x - w, 0, w * 2, y + 30);
      for (let i = 0; i < 6; i++) {
        const yy = y + 20 - ((k * 60 + i * 12) % 60);
        c.fillStyle = `rgba(255,240,150,${1 - k})`; c.fillRect(x - 14 + i * 5, yy, 2, 2);
      }
      break;
    }
    case 'dark': {
      c.strokeStyle = `rgba(190,80,255,${1 - k})`; c.lineWidth = 4;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, y + 40, (k * 1.4 + i * 0.25) * 140, 0, Math.PI * 2); c.stroke(); }
      break;
    }
  }
  c.restore();
  return true;
}
