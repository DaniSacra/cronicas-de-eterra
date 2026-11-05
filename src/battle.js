// ===== Sistema de batalha por turnos =====

let B = null;
const bgCanvas = document.createElement('canvas'); bgCanvas.width = VW; bgCanvas.height = VH;
const bsay = t => UI.say(t, { auto: 650 + t.length * 18 });
const ename = e => e.name + (e.letter ? ' ' + e.letter : '');
const aliveEnemies = () => B.enemies.filter(e => e.hp > 0);
const retarget = t => (t && t.hp > 0) ? t : (aliveEnemies().length ? pick(aliveEnemies()) : null);

function makeEnemies(ids) {
  const list = ids.map((id, i) => {
    const d = ENEMIES[id];
    return { ...d, id, maxhp: d.hp, hp: d.hp, i, canvas: Sprites.enemy(id), hitT: -1e9, atkT: -1e9, dieT: null, letter: '' };
  });
  const counts = {};
  list.forEach(e => counts[e.id] = (counts[e.id] || 0) + 1);
  const seen = {};
  list.forEach(e => { if (counts[e.id] > 1) { seen[e.id] = (seen[e.id] || 0); e.letter = 'ABC'[seen[e.id]++]; } });
  const n = list.length;
  list.forEach((e, i) => {
    e.scale = e.boss ? 1.15 : 1.3;
    e.w = e.canvas.width * e.scale; e.h = e.canvas.height * e.scale;
    e.x = e.boss ? VW / 2 : VW / 2 + (i - (n - 1) / 2) * (n === 3 ? 100 : 110);
    // a janela de texto cobre cerca de 1/3 de baixo: os inimigos ficam em pé logo acima dela
    const floorY = Math.round(VH * 0.66);
    if (e.boss) { e.scale = Math.min(1.15, (floorY - 44) / e.canvas.height); e.w = e.canvas.width * e.scale; e.h = e.canvas.height * e.scale; }
    e.base = e.boss ? floorY - 4 : floorY - 14;
    e.top = e.base - e.h; e.cy = e.base - e.h / 2;
  });
  return list;
}

function addNum(x, y, text, color) { B.nums.push({ x, y, text: String(text), color, t0: performance.now() }); }
function addFx(type, x, y, dur = 500) { B.fx.push({ type, x, y, t0: performance.now(), dur }); }
function shake(ms = 250) { G.shakeUntil = performance.now() + ms; }

async function hitEnemy(e, dmg, color = '#fff') {
  e.hp = Math.max(0, e.hp - dmg);
  e.hitT = performance.now();
  addNum(e.x, e.top + 10, dmg, color);
  if (e.hp <= 0) {
    await wait(260);
    e.dieT = performance.now(); Sfx.die();
    await bsay(e.boss ? 'Morvath cambaleia...' : `${ename(e)} foi derrotado!`);
  } else await wait(380);
}

function hurtMember(m, dmg) {
  if (m.defending) dmg = Math.max(1, Math.round(dmg / 2));
  m.hp = Math.max(0, m.hp - dmg);
  UI.cardFloat(m, '-' + dmg, '#ff6a6a'); UI.cardHit(m); shake(); Sfx.hurt();
  UI.updateParty();
  return dmg;
}

function physDmg(atk, def, power = 1) { return Math.max(1, Math.round(atk * power * rnd(0.88, 1.12) - def * 0.5)); }

// ---------- Escolha de comandos ----------
async function chooseEnemy(title) {
  const list = aliveEnemies();
  if (list.length === 1 && !list[0].boss) return list[0];
  return UI.choose(list.map(e => ({ label: ename(e), value: e })), { title, cancel: true, cols: list.length > 2 ? 3 : 2, onHover: v => B.hover = v });
}

async function chooseTarget(kind, title) {
  if (kind === 'enemy') return chooseEnemy(title);
  if (kind === 'allEnemies' || kind === 'allAllies') return 'all';
  return pickAlly(kind, title);
}

async function chooseCommand(m) {
  const d = pdef(m);
  UI.updateParty(m.id);
  for (;;) {
    const spells = knownSpells(m);
    const v = await UI.choose([
      { label: 'Atacar', value: 'atk', icon: iconUrl('atk') },
      { label: d.skillWord, value: 'spell', disabled: !spells.length, icon: iconUrl('spell') },
      { label: 'Item', value: 'item', disabled: !itemOptions().length, icon: iconUrl('item') },
      { label: 'Defender', value: 'def', icon: iconUrl('def') },
      { label: 'Fugir', value: 'run', icon: iconUrl('run') },
    ], { title: `Vez de ${d.name}: o que fazer?`, cancel: false, cols: 5, icons: true });
    if (v == null) continue;
    if (v === 'atk') {
      const t = await chooseEnemy(`${d.name} ataca quem?`);
      if (t == null) continue;
      return { type: 'attack', target: t };
    }
    if (v === 'spell') {
      const sp = await UI.choose(spells.map(id => ({ label: SPELLS[id].name, hint: SPELLS[id].mp + 'PM', value: id, disabled: m.mp < SPELLS[id].mp })),
        { title: `${d.skillWord} de ${d.name} (PM ${m.mp})`, cancel: true, cols: 2 });
      if (sp == null) continue;
      const t = await chooseTarget(SPELLS[sp].target, `${SPELLS[sp].name} em quem?`);
      if (t == null) continue;
      return { type: 'spell', spell: sp, target: t };
    }
    if (v === 'item') {
      const it = await UI.choose(itemOptions(), { title: 'Usar qual item?', cancel: true, cols: 2 });
      if (it == null) continue;
      const t = await chooseTarget(ITEMS[it].target, `${ITEMS[it].name} em quem?`);
      if (t == null) continue;
      return { type: 'item', item: it, target: t };
    }
    if (v === 'def') return { type: 'defend' };
    if (v === 'run') return { type: 'run' };
  }
}

// ---------- Execução ----------
async function partyAct(c) {
  const a = c.actor, an = pdef(a).name;
  if (c.type === 'defend') { a.defending = true; await bsay(`${an} se defende.`); return; }
  if (c.type === 'attack') {
    const t = retarget(c.target); if (!t) return;
    await bsay(`${an} ataca ${ename(t)}!`);
    addFx('slash', t.x, t.cy, 300); Sfx.slash(); await wait(180);
    if (Math.random() < 0.05) { Sfx.miss(); addNum(t.x, t.top + 10, 'ERROU', '#aaa'); await bsay('Errou!'); return; }
    const crit = Math.random() < 0.08;
    const dmg = physDmg(stat(a, 'atk'), t.def, crit ? 1.7 : 1);
    if (crit) { Sfx.crit(); shake(150); } else Sfx.hit();
    await hitEnemy(t, dmg, crit ? '#ffd23f' : '#fff');
    if (crit && t.hp > 0) await bsay('Golpe crítico!');
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
    await bsay(`${an} usa ${sp.name}!`);
    if (sp.kind === 'heal' || sp.kind === 'revive') { await bsay(castSupport(a, c.spell, c.target)); return; }
    const targets = sp.target === 'allEnemies' ? aliveEnemies() : [retarget(c.target)].filter(Boolean);
    if (sp.fx && Sfx[sp.fx]) Sfx[sp.fx](); else Sfx.slash();
    if (sp.fx === 'bolt') { G.flashColor = '255,255,200'; G.flash = { t0: performance.now(), dur: 180 }; }
    targets.forEach(t => addFx(sp.fx, t.x, t.cy, sp.fx === 'slash' ? 300 : 650));
    await wait(sp.fx === 'slash' ? 200 : 450);
    for (const t of targets) {
      if (t.hp <= 0) continue;
      let dmg;
      if (sp.kind === 'phys') dmg = physDmg(stat(a, 'atk'), sp.pierce ? 0 : t.def, sp.power);
      else {
        dmg = Math.max(1, Math.round((stat(a, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1) - t.def * 0.2));
        if (sp.kind === 'holy' && t.undead) dmg *= 2;
      }
      Sfx.hit();
      await hitEnemy(t, dmg, sp.kind === 'phys' ? '#fff' : '#9fe0ff');
    }
    if (sp.kind === 'holy' && targets.some(t => t.undead)) await bsay('A luz queima os mortos-vivos!');
  }
}

async function enemyAttack(e, t, power = 1) {
  e.atkT = performance.now();
  await wait(200);
  if (Math.random() < 0.04 + stat(t, 'agi') * 0.003) { Sfx.miss(); await bsay(`${pdef(t).name} se esquiva!`); return 0; }
  const d = hurtMember(t, physDmg(e.atk, stat(t, 'def'), power));
  await wait(350);
  return d;
}

async function checkFallen(t) { if (t.hp <= 0) await bsay(`${pdef(t).name} caiu!`); }

async function enemyAct(e) {
  const targets = aliveParty(); if (!targets.length) return;
  if (e.boss) return bossAct(e);
  const t = pick(targets);
  const sk = e.skill;
  if (sk && Math.random() < sk.chance) {
    await bsay(`${ename(e)} usa ${sk.name} em ${pdef(t).name}!`);
    if (sk.kind === 'phys') { await enemyAttack(e, t, sk.power); }
    else if (sk.kind === 'drain') {
      const d = await enemyAttack(e, t, sk.power);
      if (d > 0) { const h = Math.min(e.maxhp - e.hp, d); e.hp += h; Sfx.drain(); addNum(e.x, e.top + 10, '+' + h, '#7dff9a'); await wait(300); }
    } else if (sk.kind === 'mag') {
      e.atkT = performance.now(); Sfx.ice(); await wait(250);
      hurtMember(t, Math.max(1, Math.round(sk.power * rnd(0.9, 1.1) - stat(t, 'def') * 0.25)));
      await wait(350);
    }
  } else {
    await bsay(`${ename(e)} ataca ${pdef(t).name}!`);
    await enemyAttack(e, t);
  }
  await checkFallen(t);
}

async function bossAct(e) {
  if (!e.enraged && e.hp < e.maxhp * 0.5) {
    e.enraged = true;
    Sfx.dark(); shake(500);
    await bsay('Morvath ruge! "Eu fui rei desta terra. Serei de novo!"');
  }
  const r = Math.random();
  if (r < 0.38) {
    const t = pick(aliveParty());
    await bsay(`Morvath golpeia ${pdef(t).name} com o cajado!`);
    await enemyAttack(e, t, 1);
    await checkFallen(t);
  } else if (r < 0.7) {
    await bsay('Morvath conjura Chama Negra!');
    Sfx.dark(); addFx('dark', VW / 2, VH / 2, 900); G.flashColor = '120,40,160'; G.flash = { t0: performance.now(), dur: 400 };
    await wait(500);
    for (const t of aliveParty()) hurtMember(t, Math.max(1, Math.round(e.chama * rnd(0.85, 1.15) - stat(t, 'def') * 0.25)));
    await wait(500);
    for (const t of G.party) if (t.hp <= 0 && !t._fallenMsg) { t._fallenMsg = true; await bsay(`${pdef(t).name} caiu!`); }
  } else {
    const t = pick(aliveParty());
    await bsay(`Morvath drena a vida de ${pdef(t).name}!`);
    e.atkT = performance.now(); Sfx.drain(); await wait(300);
    const d = hurtMember(t, Math.max(1, Math.round(e.dreno * rnd(0.9, 1.1) - stat(t, 'def') * 0.3)));
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
  if (isBoss) { await bsay('Não há escapatória do Lich-Rei!'); return false; }
  const ea = aliveEnemies().reduce((s, e) => s + e.agi, 0) / aliveEnemies().length;
  const chance = Math.min(0.9, Math.max(0.2, 0.55 + (stat(m, 'agi') - ea) * 0.03));
  if (Math.random() < chance) { await bsay('Vocês escaparam!'); return true; }
  await bsay('Não conseguiram fugir!');
  return false;
}

// ---------- Fluxo principal ----------
// opts: surprise (força o resultado), intro (texto de entrada), hints (dicas do tutorial), noRun (texto ao tentar fugir)
async function startBattle(ids, isBoss, opts = {}) {
  // Fundo: a vila ou a taverna como estão na tela; na dungeon, a imagem do raycaster
  bgCanvas.width = VW; bgCanvas.height = VH;
  if (G.mode === 'town') bgCanvas.getContext('2d').drawImage(view, 0, 0);
  else {
    if (isBoss) renderView(cam, map(), worldSprites(performance.now()).filter(o => o.type !== 'boss'), performance.now());
    bgCanvas.getContext('2d').putImageData(vimg, 0, 0);
  }
  G.mode = 'battle';
  Music.play(isBoss ? 'boss' : 'battle');
  Sfx.encounter();
  G.flashColor = '255,255,255';
  G.flash = { t0: performance.now(), dur: 600, strobe: true };
  B = { enemies: makeEnemies(ids), fx: [], nums: [], hover: null, boss: isBoss, intro: performance.now() + 600 };
  await wait(650);
  const names = B.enemies.map(ename);
  await UI.say(isBoss ? 'Morvath, o Lich-Rei, ergue-se do trono de ossos!\n"Tanto tempo no escuro... Valmor será meu reino outra vez."'
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
    B.round = round + 1; B.roundT = performance.now();
    for (B.turn = 0; B.turn < B.order.length; B.turn++) {
      const c = B.order[B.turn];
      if (c.actor.hp <= 0 || c.skip) continue;
      if (c.side === 'party') {
        const m = c.actor;
        m.defending = false; // a defesa dura até a próxima vez do herói
        if (hints.length) await UI.say('Dica: ' + hints.shift());
        let cmd = await chooseCommand(m);
        while (cmd.type === 'run' && opts.noRun) { await UI.say(opts.noRun); cmd = await chooseCommand(m); }
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
    round++;
  }
  B.order = null;

  G.party.forEach(m => { m.defending = false; delete m._fallenMsg; });
  if (result === 'win') {
    await wait(300);
    Music.stop(); Sfx.victory();
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
      for (const m of aliveParty()) {
        m.xp += xp;
        for (const msg of levelUpMessages(m)) { Sfx.levelup(); UI.updateParty(); UI.cardGlow(m); await UI.say(msg); }
      }
    }
  }
  UI.updateParty(null);
  B = null;
  return result;
}

// ---------- Desenho da batalha ----------
function drawBattle(now) {
  const c = vctx;
  c.drawImage(bgCanvas, 0, 0, VW, VH);
  c.fillStyle = B.boss ? 'rgba(20,0,30,.6)' : 'rgba(0,0,0,.5)';
  c.fillRect(0, 0, VW, VH);
  const appear = Math.min(1, Math.max(0, 1 - (B.intro - now) / 600));

  for (const e of B.enemies) {
    if (e.dieT && now - e.dieT > 700) continue;
    let alpha = appear;
    if (e.dieT) alpha = Math.max(0, 1 - (now - e.dieT) / 700);
    if (now - e.hitT < 320 && Math.floor((now - e.hitT) / 55) % 2 === 0) continue;
    let sc = 1;
    if (now - e.atkT < 300) sc = 1 + 0.14 * Math.sin((now - e.atkT) / 300 * Math.PI);
    const bob = e.float ? Math.sin(now / 380 + e.i * 1.7) * 4 : Math.sin(now / 600 + e.i) * 1;
    const w = e.w * sc, h = e.h * sc;
    c.globalAlpha = alpha;
    if (e.dieT) { c.filter = 'sepia(1) saturate(4) hue-rotate(-50deg)'; }
    c.drawImage(e.canvas, e.x - w / 2, e.base - h + bob - (e.dieT ? (now - e.dieT) / 40 : 0), w, h);
    c.filter = 'none';
    c.globalAlpha = 1;
    // Barra de vida
    if (!e.dieT && !e.boss) {
      const bw = 34;
      c.fillStyle = '#000'; c.fillRect(e.x - bw / 2 - 1, e.base + 6, bw + 2, 4);
      c.fillStyle = e.hp / e.maxhp > 0.3 ? '#e04848' : '#ff9030'; c.fillRect(e.x - bw / 2, e.base + 7, bw * e.hp / e.maxhp, 2);
    }
  }

  // Chefe: barra no topo
  const boss = B.enemies.find(e => e.boss);
  if (boss) {
    drawWindow(c, VW / 2 - 102, 3, 204, 22);
    c.fillStyle = '#07081a'; c.fillRect(VW / 2 - 96, 16, 192, 4);
    c.fillStyle = boss.enraged ? '#ff3060' : '#b040ff'; c.fillRect(VW / 2 - 96, 16, 192 * boss.hp / boss.maxhp, 4);
    c.font = '6px "Press Start 2P", monospace'; c.fillStyle = '#f4f0e0'; c.textAlign = 'center';
    c.fillText('MORVATH, O LICH-REI', VW / 2, 13);
  }

  // Seta de alvo
  const hv = B.hover;
  if (hv && hv.hp > 0 && Math.floor(now / 180) % 2 === 0) {
    const y = Math.max(10, hv.top - 4);
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.moveTo(hv.x - 5, y - 7); c.lineTo(hv.x + 5, y - 7); c.lineTo(hv.x, y); c.closePath(); c.fill();
  }

  if (!boss) drawEnemyNames(c);
  if (B.order) drawOrder(c, now, boss);

  B.fx = B.fx.filter(f => drawFx(c, f, now));

  c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center';
  B.nums = B.nums.filter(n => {
    const k = (now - n.t0) / 1000; if (k > 1) return false;
    const y = n.y - 18 * Math.min(1, k * 2.5) + (k < 0.4 ? 0 : 0);
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(n.text, n.x, y);
    c.fillStyle = n.color; c.fillText(n.text, n.x, y);
    c.globalAlpha = 1;
    return true;
  });
}

// Janela com o nome dos inimigos (canto de cima): ao escolher o alvo, só o inimigo marcado e o estado dele
function drawEnemyNames(c) {
  const alive = aliveEnemies();
  if (!alive.length) return;
  let lines;
  const hv = B.hover;
  if (hv && hv.hp > 0 && hv.name) {
    const k = hv.hp / hv.maxhp;
    lines = [ename(hv).toUpperCase(), k > 0.7 ? 'Ileso' : k > 0.4 ? 'Ferido' : k > 0.15 ? 'Muito ferido' : 'Quase caindo'];
  } else {
    const count = {};
    for (const e of alive) count[e.name] = (count[e.name] || 0) + 1;
    lines = Object.entries(count).map(([n, q]) => n.toUpperCase() + (q > 1 ? ' x' + q : ''));
  }
  c.font = '6px "Press Start 2P", monospace'; c.textAlign = 'left';
  const w = Math.max(...lines.map(t => c.measureText(t).width)) + 14, h = lines.length * 9 + 9;
  const x = 4, y = 22;
  drawWindow(c, x, y, w, h);
  lines.forEach((t, i) => {
    c.fillStyle = '#07081a'; c.fillText(t, x + 8, y + 13 + i * 9);
    c.fillStyle = hv && i === 1 ? '#ffd23f' : '#f4f0e0'; c.fillText(t, x + 7, y + 12 + i * 9);
  });
}

// Barra com a ordem dos turnos da rodada (quem já agiu fica apagado, a vez atual fica destacada)
function drawOrder(c, now, boss) {
  const list = B.order, cw = 18, gap = 3, h = 12;
  let x = Math.round(VW / 2 - (list.length * (cw + gap) - gap) / 2);
  const y = boss ? 29 : 5;
  c.font = '6px "Press Start 2P", monospace'; c.textAlign = 'center';
  list.forEach((o, i) => {
    const a = o.actor, cur = i === B.turn;
    c.globalAlpha = a.hp <= 0 || o.skip ? 0.2 : i < B.turn ? 0.4 : 1;
    c.fillStyle = '#07081a'; c.fillRect(x - 1, y - 1, cw + 2, h + 2); c.fillStyle = '#1d2a74'; c.fillRect(x, y, cw, h);
    c.fillStyle = '#ece2c4'; c.fillRect(x, y, cw, 1);
    c.fillStyle = o.side === 'party' ? pdef(a).color : '#d03c3c'; c.fillRect(x, y + h - 2, cw, 2);
    if (cur && Math.floor(now / 250) % 2 === 0) { c.strokeStyle = '#ffd23f'; c.lineWidth = 1; c.strokeRect(x - 0.5, y - 0.5, cw + 1, h + 1); }
    const label = o.side === 'party' ? pdef(a).name.slice(0, 2) : a.boss ? 'Mo' : a.letter ? a.name[0] + a.letter : a.name.slice(0, 2);
    c.fillStyle = '#fff'; c.fillText(label, x + cw / 2, y + 8);
    x += cw + gap;
  });
  c.globalAlpha = 1;
  // Rodada nova: a fila foi sorteada de novo
  if (B.round > 1 && now - B.roundT < 1600 && Math.floor((now - B.roundT) / 200) % 2 === 0) {
    c.font = '6px "Press Start 2P", monospace'; c.textAlign = 'center';
    c.fillStyle = '#07081a'; c.fillText(`RODADA ${B.round}`, VW / 2 + 1, y + h + 10);
    c.fillStyle = '#ffd23f'; c.fillText(`RODADA ${B.round}`, VW / 2, y + h + 9);
  }
  // Seta sobre o inimigo que está agindo
  const cur = list[B.turn];
  if (cur && cur.side === 'enemy' && cur.actor.hp > 0 && !cur.actor.boss) {
    const e = cur.actor, ty = Math.max(y + h + 8, e.top - 4);
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
