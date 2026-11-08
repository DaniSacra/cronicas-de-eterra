// ===== Heróis, Livro and Bolsa: three screens from the camp menu, one overlay =====
// Heróis: the stage (name, XP, the hero full body, the gear slots) and the sheet (bars, attributes, story);
// a slot opens the equipment choice. Livro: an open book with a ribbon per hero, skills on the left, the chosen one
// on the right. Bolsa: coins, three tabs and a grid of items.
// Keys: arrows move, Enter chooses or uses, Tab or Q/E change tabs, Esc goes back one level (choice → sheet → menu).
// On phones (heroViewMode 'tabs'): Heróis has two tabs (Palco, Ficha) lying down and one scrolling column upright, the Livro shows one page at a time, the Bolsa one column.
const HeroView = (() => {
  let root, open = false, screen = 'hero', cur = 0, frame = 0, timer = null, done = null;
  let view = 'stage', slot = 0, choosing = false, pick = 0; // Heróis
  let skill = 0, bookPage = 'list'; // Livro
  let tab = 0, cell = 0; // Bolsa
  let shop = null, qty = 1, filt = 'all', btnAt = 1; // the shop window (Dora, Gaspar): its setup, the quantity, the hero filter, the button
  let aim = -1, note = ''; // Bolsa and Livro: the target card under the cursor (-1: none, the list has the cursor) and the last result
  const STAGE_W = 64, STAGE_H = 72; // the hero's stage in art pixels: stained glass, the 48x64 sprite and the pedestal

  // Equipment the party found: opened chests whose loot is an equipment; saves from the 3-floor version also opened
  // chests on floors that no longer exist, so that gear is read from the bonus it left
  function ownedEquips() {
    const ids = [];
    for (let f = 0; f < FLOORS.length; f++) for (const o of getMap(f).objects)
      if (o.type === 'chest' && EQUIPS[o.loot] && G.opened[`${floorKey(f)}:${o.x},${o.y}`]) ids.push(o.loot);
    const old = Object.keys(G.opened || {}).some(oldCryptKey);
    ids.push(...(G.gear || [])); // bought at Gaspar's forge
    return old ? [...ids, ...gearFromBonus(G.party, ids, EQUIPS)] : ids;
  }
  const faces = {};
  const face = id => faces[id] || (faces[id] = Portraits.draw(Portraits.keyFor(heroName(id))).toDataURL());
  const icon = (id, st, cls = 'hv-ico') => `<img class="${cls}" src="${iconUrl(ICON_ART[id] ? id : 'carta', st)}" alt="">`;
  const flags = () => Object.assign({}, G.seen, { quest: G.quest > 0, bossDead: G.bossDead, carta: !!G.key.carta });
  const mode = () => heroViewMode(innerWidth, innerHeight);
  const ink = c => `color-mix(in srgb, ${c} 62%, #2a1206)`; // the hero color, dark enough on parchment
  const hero = () => G.party[cur];
  const choice = () => (G.equip = G.equip || {});
  const statsOf = m => ({ atk: stat(m, 'atk'), mag: stat(m, 'mag') });
  const btn = (act, v, html, cls = '') => `<button data-act="${act}" data-v="${v}" class="${cls}">${html}</button>`;

  function build() {
    root = document.createElement('div');
    root.id = 'heroview';
    document.getElementById('screen').appendChild(root);
    root.addEventListener('click', ev => {
      ev.stopPropagation();
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const { act, v } = b.dataset, n = +v;
      if (act === 'close') close();
      else if (act === 'hero') setHero(n);
      else if (act === 'step') setHero(cur + n);
      else if (act === 'view') { view = v; Sfx.cursor(); render(); }
      else if (act === 'slot') { slot = n; openChoice(); }
      else if (act === 'gear') { pick = n; equipPick(); }
      else if (act === 'best') equipBest();
      else if (act === 'back') back();
      else if (act === 'skill') { skill = n; bookPage = 'detail'; aim = -1; note = ''; Sfx.cursor(); render(); }
      else if (act === 'cast') cast();
      else if (act === 'tab') { tab = n; cell = 0; aim = -1; note = ''; Sfx.cursor(); render(); }
      else if (act === 'cell') { if (screen === 'shop') pickCell(n); else cell = n; bookPage = 'detail'; aim = -1; note = ''; Sfx.cursor(); render(); }
      else if (act === 'use') useCell();
      else if (act === 'aim') { aim = n; useOn(); }
      else if (act === 'qty') setQty(qty + n);
      else if (act === 'buy') { btnAt = n; buy(); }
      else if (act === 'filt') setFilt(v);
    });
    addEventListener('resize', () => open && render());
  }

  // ---------- Top bar: mini portraits with the arrows next to the first and the last, Fechar on the right ----------
  function heroStrip() {
    const minis = G.party.map((p, i) => `<button class="hv-mini${i === cur ? ' on' : ''}${p.hp <= 0 ? ' ko' : ''}" data-act="hero" data-v="${i}"
      style="--c:${pdef(p).color}" aria-label="${esc(pdef(p).name)}"><img src="${face(p.id)}" alt=""><span>${esc(pdef(p).name)}</span></button>`).join('');
    return `<div class="hv-top win"><div class="hv-party">${btn('step', -1, '◀', 'hv-arrow')}${minis}${btn('step', 1, '▶', 'hv-arrow')}</div>
      ${btn('close', 0, 'Fechar', 'hv-close')}</div>`;
  }

  // ---------- Heróis: the stage ----------
  // The scene: CSS color bands of the hero's family behind; the canvas draws the stained glass, the pedestal and the hero
  function drawStage(cv, m) {
    const dead = m.hp <= 0, bg = HERO_FACE_BG[m.id], c = cv.getContext('2d'), R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, STAGE_W, STAGE_H);
    const ax = 8, aw = 48, top = 0, bot = 62; // the arched window: panes in the lightest tone, lead in the darkest
    for (let y = top; y < bot; y++) {
      const dy = y - (top + 24), half = dy < 0 ? Math.round(Math.sqrt(Math.max(0, 24 * 24 - dy * dy))) : 24;
      R(ax + 24 - half, y, half * 2, 1, bg[3]); if (half > 1) R(ax + 25 - half, y, half * 2 - 2, 1, bg[0]);
    }
    for (let x = ax + 8; x < ax + aw; x += 8) R(x, top + 8, 1, bot - top - 8, bg[2]);
    for (let y = top + 20; y < bot; y += 12) R(ax + 1, y, aw - 2, 1, bg[2]);
    for (const [x, y] of [[ax + 12, top + 12], [ax + 36, top + 24], [ax + 20, top + 36], [ax + 30, top + 48]]) R(x, y, 2, 2, '#fff6c0');
    const P = ['#cbd8ec', '#a2a2ac', '#7a7a82', '#55555e']; // stone pedestal, lit edge on top, the hero's shadow on it
    R(4, 62, 56, 2, P[0]); R(2, 64, 60, 3, P[1]); R(2, 67, 60, 3, P[2]); R(4, 70, 56, 2, P[3]);
    for (let x = 6; x < 60; x += 10) R(x, 67, 1, 3, P[3]);
    R(16, 62, 32, 2, P[3]);
    const pal = bodyPal(HERO_BODY[m.id].pal, m.id, ownedEquips(), EQUIPS, GEAR_LOOK, choice());
    const def = dead ? HERO_BODY[m.id + 'Ko'] : Object.assign({}, HERO_BODY[m.id], { pal });
    c.drawImage(GridSprite.render(def, dead ? 0 : frame), 8, 0);
  }
  function stageCol(m, d) {
    const dead = m.hp <= 0, bg = HERO_FACE_BG[m.id], slots = slotGear(m.id, ownedEquips(), EQUIPS, START_GEAR, choice());
    const slotBtn = (s, i) => `<button class="hv-slot win${i === slot ? ' sel' : ''}${choosing && i === slot ? ' open' : ''}" data-act="slot" data-v="${i}" title="${s.label}">
      <span class="hv-box slot-frame">${icon(s.icon)}</span><span>${esc(s.name)}<br>${s.start ? '<i class="dim">sem bônus</i>' : `<em>${esc(bonusText(s.bonus, STAT_NAMES))}</em>`}<span class="hv-swap">Trocar ▸</span></span></button>`;
    return `<section class="hv-stage-col" style="--b0:${bg[0]};--b1:${bg[1]};--b2:${bg[2]};--b3:${bg[3]}">
      <div class="hv-band"><p><span class="hv-name" style="color:${d.color}">${esc(d.name)}</span> ${esc(d.cls)} · Nível ${m.lv}${dead ? '<span class="hv-ko">Caído</span>' : ''}</p><div class="bar xp"><i style="width:${m.lv >= MAX_LEVEL ? 100 : Math.min(100, 100 * m.xp / xpNext(m.lv))}%"></i></div>
        <p>${m.lv >= MAX_LEVEL ? 'Nível máximo' : xpLeftText(m.xp, m.lv, xpNext(m.lv))}</p></div>
      <div class="hv-scene"><canvas class="hv-body" width="${STAGE_W}" height="${STAGE_H}"></canvas></div>
      <div class="hv-slots">${slots.map(slotBtn).join('')}</div></section>`;
  }

  // ---------- Heróis: the sheet, or the equipment choice in its place ----------
  function sheetCol(m) {
    if (choosing) return choiceCol(m);
    const totals = G.party.map(p => ({ total: Object.fromEntries(STAT_KEYS.map(k => [k, stat(p, k)])), bonus: p.bonus }));
    const statIcon = { atk: 'atk', def: 'def', mag: 'spell', res: 'res', agi: 'run' };
    const st = storyLines(HERO_STORY[m.id].lines, flags()), q = storyQuote(HERO_STORY[m.id].quotes, flags());
    const d = pdef(m), nx = nextSkill(d.spells, m.lv, SPELLS);
    const next = nx ? `<div class="hv-next"><h4>Próxim${gender(d.skillWord)} ${d.skillWord.toLowerCase()}</h4><div><span class="hv-box slot-frame">${icon('spell', 'dis')}</span>
      <p><b class="px">??? · Nível ${nx.lv}</b><small>${esc(nx.hint)}</small></p></div></div>` : '';
    const bar = (lbl, v, max, cls) => `<div class="hv-bar"><span>${lbl}</span><b>${v}<small>/${max}</small></b></div>
      <div class="bar ${cls}"><i style="width:${max ? 100 * v / max : 0}%"></i></div>`;
    return `<section class="hv-sheet win">` + bar('PV', m.hp, maxHp(m), '') +
      (usesEnergy(m) ? `<p class="hv-en">Energia: começa cada luta em ${ENERGY.start} e vai até ${ENERGY.max}</p>` : bar('PM', m.mp, maxMp(m), 'mp')) +
      `<div class="hv-stats">${statRows(totals, cur).map(r => `<div class="hv-stat">${icon(statIcon[r.key])}<span>${STAT_FULL[r.key]}${r.key === 'def' || r.key === 'res' ? `<small class="hv-cut">corta ${guardText(r.value)}</small>` : ''}</span>
        <b>${r.value}</b><em>${r.bonus ? '+' + r.bonus : ''}</em></div>`).join('')}</div>
      <div class="hv-side">${next}<div class="hv-story">${st.map(t => `<p>${esc(t)}</p>`).join('')}<p class="hv-quote">"${esc(q)}"</p></div></div></section>`;
  }
  const choices = m => gearChoices(m.id, GEAR_SLOTS[slot][0], ownedEquips(), EQUIPS, choice());
  function choiceCol(m) {
    const list = choices(m), diff = d => Object.entries(d).map(([k, v]) => `<i class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'} ${STAT_NAMES[k]} ${Math.abs(v)}</i>`).join(' ');
    const rows = list.map((c, i) => `<button class="hv-row${i === pick ? ' sel' : ''}" data-act="gear" data-v="${i}">${icon(c.icon)}<span>
      <b>${esc(c.name)}</b> <em>${esc(bonusText(c.bonus, STAT_NAMES))}</em><br>${c.equipped ? '<span class="hv-seal">Equipado</span>' : diff(c.diff) || '<i>igual</i>'}</span></button>`).join('');
    return `<section class="hv-sheet hv-choice win"><h4>${GEAR_SLOTS[slot][1]} ${ofHero(m.id, pdef(m).name)}</h4>
      ${rows || `<p class="dim">Só a peça de partida. Baús da cripta e a forja do Gaspar têm mais.</p>`}
      <div class="hv-actions">${btn('best', 0, 'Melhor', `hv-btn${pick === list.length ? ' sel' : ''}`)}${btn('back', 0, 'Voltar', 'hv-btn')}</div></section>`;
  }
  function openChoice() {
    const list = choices(hero());
    choosing = true; pick = Math.max(0, list.findIndex(c => c.equipped)); view = 'sheet'; Sfx.select(); render();
  }
  // Wear `id` in its slot: the bonus moves by the difference to what was worn, the choice is kept in the save
  function wear(m, slotId, id) {
    const now = equippedGear(m.id, slotId, ownedEquips(), EQUIPS, choice());
    if (!id || id === now) return false;
    for (const [k, v] of Object.entries(bonusDiff(id, now, EQUIPS))) m.bonus[k] = (m.bonus[k] || 0) + v;
    choice()[m.id] = { ...choice()[m.id], [slotId]: id };
    return true;
  }
  function equipPick() {
    const m = hero(), list = choices(m);
    if (pick >= list.length) return equipBest();
    if (wear(m, GEAR_SLOTS[slot][0], list[pick].id)) { Sfx.select(); UI.updateParty(); } else Sfx.cursor();
    render();
  }
  function equipBest() {
    const m = hero(), best = bestChoice(m.id, ownedEquips(), EQUIPS);
    const changed = Object.entries(best).map(([s, id]) => wear(m, s, id)).some(Boolean);
    changed ? (Sfx.select(), UI.updateParty()) : Sfx.cursor();
    pick = Math.max(0, choices(m).findIndex(c => c.equipped)); render();
  }

  // ---------- Livro: ribbons, the list page and the detail page ----------
  function bookScreen() {
    const m = hero(), d = pdef(m), book = spellBook(d.spells, m.lv), sp = book[skill] && SPELLS[book[skill].id], known = book[skill] && book[skill].known;
    const ribbons = G.party.map((p, i) => `<button class="bk-ribbon${i === cur ? ' on' : ''}${p.hp <= 0 ? ' ko' : ''}" data-act="hero" data-v="${i}"
      style="--c:${pdef(p).color}">${esc(pdef(p).name)}</button>`).join('');
    const list = book.map((r, i) => {
      const s = SPELLS[r.id];
      return `<button class="hv-row${i === skill ? ' sel' : ''}${r.known ? '' : ' off'}" data-act="skill" data-v="${i}">${icon(spellIcon(s), r.known ? 'normal' : 'dis')}
        <b>${r.known ? esc(s.name) : '???'}</b><b class="hv-cost">${r.known ? costText(s) : 'Nível ' + r.lv}</b></button>`;
    }).join('');
    let detail = '';
    if (sp && known) {
      const u = fieldUse(sp, m);
      detail = `${icon(spellIcon(sp), 'normal', 'bk-big')}<h3>${esc(sp.name)}</h3><p class="hv-cost">${costText(sp)} · ${TARGET_TEXT[sp.target]}</p>
        <p>${esc(sp.desc)}</p><p class="bk-fx">${spellEffect(sp, statsOf(m))}.</p>
        ${!u.field ? `<p class="dim">${u.why}.</p>` : aim >= 0 ? targetsBlock(spellFx(sp, m), `${sp.name} em quem?`)
          : `<div class="hv-actions">${btn('cast', 0, 'Usar', `hv-btn${u.ok ? '' : ' dis'}`)}${u.ok ? '' : `<span class="dim">${u.why}</span>`}</div>`}
        ${note ? `<p class="bg-note">${esc(note)}</p>` : ''}`;
    } else if (sp) detail = `${icon(spellIcon(sp), 'dis', 'bk-big')}<h3>???</h3><p class="dim">${esc(d.name)} aprende no nível ${book[skill].lv}.</p>`;
    const back = mode() === 'tabs' ? btn('back', 0, '◀ Lista', 'hv-btn') : '';
    return `<div class="hv-top win"><h3 class="bk-title">Livro</h3>${btn('close', 0, 'Fechar', 'hv-close')}</div>
      <div class="bk" data-page="${bookPage}"><div class="bk-ribbons">${ribbons}</div>
        <section class="bk-page bk-left"><h3 style="color:${ink(d.color)}">${esc(d.skillWord)}</h3>${list}</section>
        <section class="bk-page bk-right">${back}${detail}</section></div>`;
  }
  // ---------- Livro de Elos: the same open book, one card per Elo (known, or two silhouettes and a hint) ----------
  const elosBook = () => eloBook(ELOS, G.seen.elos || {});
  function elosScreen() {
    const book = elosBook(), e = book[skill];
    const list = book.map((r, i) => `<button class="hv-row${i === skill ? ' sel' : ''}${r.known ? '' : ' off'}" data-act="skill" data-v="${i}">${icon('spell', r.known ? 'normal' : 'dis')}
      <b>${r.known ? esc(r.name) : '???'}</b></button>`).join('');
    const pair = r => `<div class="el-pair">${r.heroes.map(h => `<span class="el-face${r.known ? '' : ' unk'}"><img src="${face(h)}" alt="">${r.known ? '' : '<b>?</b>'}</span>`).join('')}</div>`;
    const detail = !e ? '' : e.known
      ? `${pair(e)}<h3>${esc(e.name)}</h3><p class="hv-cost">${e.heroes.map(heroName).join(' e ')}</p><p>${esc(e.asks)}</p><p class="bk-fx">${esc(e.does)}</p>`
      : `${pair(e)}<h3>???</h3><p class="dim">${esc(e.hint)}</p>`;
    const back = mode() === 'tabs' ? btn('back', 0, '◀ Lista', 'hv-btn') : '';
    return `<div class="hv-top win"><h3 class="bk-title">Livro de Elos</h3>${btn('close', 0, 'Fechar', 'hv-close')}</div>
      <div class="bk el-book" data-page="${bookPage}"><section class="bk-page bk-left"><h3>Elos</h3>${list}</section>
        <section class="bk-page bk-right">${back}${detail}</section></div>`;
  }

  // ---------- Target cards (Bolsa and Livro): each hero with what the item or skill would do, or why not ----------
  // fx: { hp } | { mp } | { revive } | { all }; a hero who would gain nothing is greyed out and cannot be chosen
  function targetsBlock(fx, title) {
    if (fx.all) { const ok = groupNeeds(fx); return `<div class="hv-actions">${btn('aim', 0, 'Usar no grupo', `hv-btn${ok ? '' : ' dis'}`)}${ok ? '' : '<span class="dim">O grupo já está inteiro.</span>'}</div>`; }
    const cards = G.party.map((p, i) => {
      const v = previewFor(fx, p), mp = !!fx.mp, cur = mp ? p.mp : p.hp, max = mp ? maxMp(p) : maxHp(p);
      const line = v.ok ? v.text.replace(/\+(\d+) → (\S+)/, '<em>+$1 → $2</em>') : `${cur}/${max} · ${esc(v.why)}`;
      return `<button class="tg-card${v.ok ? '' : ' off'}${i === aim ? ' sel' : ''}" data-act="aim" data-v="${i}"${v.ok ? '' : ' disabled'}>
        <img src="${face(p.id)}" alt=""><span><b style="color:${ink(pdef(p).color)}">${esc(pdef(p).name)}</b>
        <span class="bar${mp ? ' mp' : ''}"><i style="width:${max ? 100 * cur / max : 0}%"></i></span><small class="px">${line}</small></span></button>`;
    }).join('');
    return `<h4>${esc(title)}</h4><div class="tg-grid">${cards}</div>`;
  }
  // What the target cards are for now: the item of the Bolsa or the skill of the Livro
  function aimFx() {
    if (screen === 'bag') { const c = tabsOf()[tab].cells[cell]; return c && c.kind === 'item' ? ITEMS[c.id].fx : null; }
    const m = hero(), r = spellBook(pdef(m).spells, m.lv)[skill], sp = r && r.known && SPELLS[r.id];
    return sp && fieldUse(sp, m).ok ? spellFx(sp, m) : null;
  }
  const canAim = (fx, i) => fx && (fx.all ? i === 0 && groupNeeds(fx) : previewFor(fx, G.party[i]).ok);
  // First (or next, d = 1 / -1) hero the cursor can stand on; -1 when nobody would gain anything
  function nextAim(from, d = 1) {
    const fx = aimFx(), n = fx && fx.all ? 1 : G.party.length;
    for (let k = 1; k <= n; k++) { const i = ((from + d * k) % n + n) % n; if (canAim(fx, i)) return i; }
    return -1;
  }
  function startAim() {
    aim = nextAim(-1);
    if (aim < 0) { Sfx.bump(); note = aimFx() && aimFx().all ? 'O grupo já está inteiro.' : 'Ninguém precisa disso agora.'; } else Sfx.select();
    render();
  }
  // Uses the item or the skill on the hero under the cursor; the cursor stays while there is someone to help
  function useOn() {
    const fx = aimFx();
    if (!canAim(fx, aim)) { Sfx.bump(); return; }
    const t = fx.all ? 'all' : G.party[aim];
    if (screen === 'bag') { const id = tabsOf()[tab].cells[cell].id; note = applyItem(id, t); if (!G.inv[id]) { aim = -1; cell = Math.max(0, Math.min(cell, tabsOf()[tab].cells.length - 1)); } }
    else { const m = hero(), id = spellBook(pdef(m).spells, m.lv)[skill].id; pay(m, SPELLS[id]); note = castSupport(m, id, t); }
    UI.updateParty();
    if (aim >= 0 && !canAim(aimFx(), aim)) aim = nextAim(aim);
    render();
  }
  function aimKey(k) {
    const cols = 2, d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[k];
    if (d) { const n = nextAim(aim, Math.sign(d)); if (Math.abs(d) === cols && canAim(aimFx(), aim + d)) aim += d; else if (n >= 0) aim = n; Sfx.cursor(); return render(); }
    if (k === 'Enter') useOn();
  }
  function cast() {
    const m = hero(), r = spellBook(pdef(m).spells, m.lv)[skill], sp = r && r.known && SPELLS[r.id];
    if (!sp || !fieldUse(sp, m).ok) return Sfx.cancel();
    note = ''; startAim();
  }

  // ---------- Bolsa: three tabs, the list of what the party carries and, beside it, the chosen one ----------
  // A consumable shows the heroes as target cards right there (targetsBlock); a key item can be read
  const tabsOf = () => bagTabs({ inv: G.inv, key: G.key, owned: ownedEquips(), items: ITEMS, equips: EQUIPS, keyItems: KEY_ITEMS, read: !!G.key.lida, equip: choice() });
  function bagScreen() {
    const tabs = tabsOf(), cells = tabs[tab].cells, c = cells[cell];
    const who = x => (x.who ? `<img class="bg-who${x.inUse ? ' on' : ''}" src="${face(x.who)}" alt="">` : '');
    const rows = cells.map((x, i) => `<button class="hv-row bg-row${i === cell ? ' sel' : ''}" data-act="cell" data-v="${i}">${icon(x.icon)}
      <span>${esc(x.name)}</span>${who(x)}<b class="px">${x.n ? '× ' + x.n : ''}</b></button>`).join('');
    const user = c && c.who ? `, ${bonusText(EQUIPS[c.id].bonus, STAT_NAMES)}. ${c.inUse ? 'Em uso por' : 'Guardada, serve para'} ${heroName(c.who)}.` : '';
    const act = !c ? '' : c.kind === 'item' ? targetsBlock(ITEMS[c.id].fx, 'Usar em quem?')
      : c.kind === 'key' ? `<div class="hv-actions">${btn('use', 0, 'Ler', 'hv-btn')}</div>` : '';
    const back = mode() === 'tabs' ? btn('back', 0, '◀ Lista', 'hv-btn') : '';
    const detail = c ? `<section class="bg-detail win">${back}<div class="bg-head"><span class="hv-box slot-frame">${icon(c.icon, 'normal', 'bg-ico')}</span>
      <div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}${user}</p></div></div>${act}${note ? `<p class="bg-note">${esc(note)}</p>` : ''}</section>` : '';
    return `<div class="hv-top win"><h3 class="bk-title">Bolsa</h3>
      <div class="bg-tabs">${tabs.map((t, i) => btn('tab', i, t.title, i === tab ? 'on' : '')).join('')}</div><span class="bg-gold">${G.gold} moedas</span>${btn('close', 0, 'Fechar', 'hv-close')}</div>
      <div class="bg-body" data-page="${bookPage}"><section class="bg-list win">${rows || '<p class="dim">Nada aqui.</p>'}<p class="bg-keys dim">↑↓ escolhe · Enter usa · Esc volta</p></section>${detail}</div>`;
  }
  async function useCell() {
    const c = tabsOf()[tab].cells[cell];
    if (!c || c.kind === 'equip') return;
    if (c.kind === 'item') { note = ''; return aim >= 0 ? useOn() : startAim(); }
    hide(); await useBagItem('key:' + c.id); reshow();
  }

  // ---------- The shop window: Dora's items and Gaspar's pieces, one component ----------
  // shop: { who, line, thanks, items: [[id, price]], gear } (src/town.js); the list on the left, the chosen one on the right
  const shopRows = () => (shop.gear ? forgeFilter(shop.items.map(([id]) => id), EQUIPS, filt) : shop.items.map(([id]) => id));
  const priceOf = id => shop.items.find(([s]) => s === id)[1];
  const shopMax = id => buyMax(G.gold, priceOf(id));
  const cmpOf = id => forgeCompare(id, ownedEquips(), EQUIPS, STAT_NAMES, choice());
  const canBuy = id => shopMax(id) > 0 && (!shop.gear || cmpOf(id).ok);
  const shopCell = () => shopRows()[cell];
  const coin = n => `<span class="sh-coin">●</span> ${n}`;
  const fromTo = (a, b, cls = '') => `<b class="px">${a}</b> → <b class="px ${cls}">${b}</b>`;
  function shopScreen() {
    const ids = shopRows(), id = shopCell(), key = Portraits.keyFor(shop.who);
    const top = `<div class="sh-top">${key ? `<img class="sh-face win" src="${Portraits.draw(key).toDataURL()}" alt="">` : ''}
      <div class="sh-say win"><b>${esc(shop.who)}</b><p>${esc(note || shop.line)}</p></div>
      <div class="sh-gold win"><small>Moedas</small><b class="px">${coin(G.gold)}</b></div>${btn('close', 0, 'Fechar', 'hv-close win')}</div>`; // the window covers the touch ✕: its own way out
    const heroes = shop.gear ? [...new Set(shop.items.map(([i]) => EQUIPS[i].who))].filter(inParty) : [];
    const filter = shop.gear ? `<div class="sh-filter">${btn('filt', 'all', 'Todos', filt === 'all' ? 'on' : '')}${heroes.map(h =>
      btn('filt', h, `<img src="${face(h)}" alt="${esc(heroName(h))}">`, filt === h ? 'on' : '')).join('')}</div>` : '';
    const rows = ids.map((x, i) => {
      const it = shop.gear ? EQUIPS[x] : ITEMS[x], c = shop.gear && cmpOf(x), off = !canBuy(x);
      const sub = shop.gear ? `<small>${GEAR_SLOTS.find(([k]) => k === it.slot)[1]} ${ofHero(it.who, heroName(it.who))}</small>` : '';
      const side = shop.gear ? `<i class="sh-cmp${c.ok ? ' up' : ''}">${esc(c.text)}</i>` : `<small class="px">tem ${G.inv[x] || 0}</small>`;
      return `<button class="hv-row sh-row${i === cell ? ' sel' : ''}${off ? ' off' : ''}" data-act="cell" data-v="${i}">${icon(shop.gear ? it.icon : x, off ? 'dis' : 'normal')}
        <span><b>${esc(it.name)}</b>${sub}</span>${side}<b class="px sh-price">${coin(priceOf(x))}</b></button>`;
    }).join('');
    const hint = shop.gear ? '↑↓ escolhe · ←→ botão · Tab filtra · Enter compra · Esc sai' : '↑↓ escolhe · ←→ quantidade · Enter compra · Esc sai';
    const back = mode() === 'tabs' ? btn('back', 0, '◀ Lista', 'hv-btn') : '';
    return top + `<div class="bg-body" data-page="${bookPage}"><section class="bg-list win">${filter}${rows || '<p class="dim">Nada para este herói.</p>'}
      <p class="bg-keys dim">Sem moeda, o item fica apagado. ${hint}</p></section>
      ${id ? `<section class="bg-detail sh-detail win">${back}${shop.gear ? gearDetail(id) : itemDetail(id)}</section>` : ''}</div>`;
  }
  function itemDetail(id) {
    const it = ITEMS[id], max = shopMax(id), price = priceOf(id), v = buyPreview(G.gold, price, G.inv[id] || 0, qty);
    const head = `<div class="bg-head"><span class="hv-box slot-frame">${icon(id, 'normal', 'bg-ico')}</span><div><h3>${esc(it.name)}</h3><p>${esc(it.desc)}</p></div></div>`;
    if (!max) return head + `<p class="dim">Faltam ${price - G.gold} moedas.</p>`;
    return head + `<div class="sh-grid"><span>Quantidade</span><span class="sh-qty">${btn('qty', -1, '−', 'hv-btn')}<b class="px">${qty}</b>${btn('qty', 1, '+', 'hv-btn')}<small>máx. ${max}</small></span>
      <span>Total</span><b class="px sh-total">${coin(v.total)}</b>
      <span>Moedas</span><span>${fromTo(...v.gold, 'down')}</span>
      <span>Na bolsa</span><span>${fromTo(...v.have, 'up')}</span></div>
      <div class="hv-actions sh-actions">${btn('buy', 1, `Comprar ${qty}`, 'hv-btn sh-buy sel')}</div>`;
  }
  function gearDetail(id) {
    const e = EQUIPS[id], c = cmpOf(id), m = G.party.find(p => p.id === e.who), price = priceOf(id);
    const slotName = GEAR_SLOTS.find(([k]) => k === e.slot)[1], now = c.ok ? c.now : equippedGear(e.who, e.slot, ownedEquips(), EQUIPS, choice());
    const nowPiece = now ? EQUIPS[now] : START_GEAR[e.who][e.slot];
    const piece = (p, cls) => `<span class="sh-piece ${cls}"><span class="hv-box slot-frame">${icon(p.icon)}</span>${esc(p.name)}</span>`;
    const stats = c.ok ? Object.entries(c.diff).map(([k, v]) => `<span>${STAT_FULL[k]}</span><span>${fromTo(stat(m, k), stat(m, k) + v, v > 0 ? 'up' : 'down')}</span>`).join('') : '';
    const ok = c.ok && G.gold >= price;
    return `<div class="bg-head"><img class="sh-hero win" src="${face(e.who)}" alt=""><div><h3 style="color:${ink(pdef(m).color)}">${esc(heroName(e.who))}</h3><p>${slotName}</p></div></div>
      <div class="sh-swap">${piece(nowPiece, 'dim')}<span>→</span>${piece(e, '')}</div>
      ${c.ok ? `<div class="sh-grid">${stats}<span>Moedas</span><span>${fromTo(G.gold, G.gold - price, 'down')}</span></div>` : ''}
      ${c.ok ? '' : `<p class="dim">${esc(c.text.replace('▼ ', ''))}.</p>`}${c.ok && !ok ? `<p class="dim">Faltam ${price - G.gold} moedas.</p>` : ''}
      <div class="hv-actions sh-actions">${btn('buy', 0, 'Só comprar', `hv-btn${ok ? '' : ' dis'}${btnAt === 0 ? ' sel' : ''}`)}${btn('buy', 1, 'Comprar e equipar', `hv-btn sh-buy${ok ? '' : ' dis'}${btnAt === 1 ? ' sel' : ''}`)}</div>`;
  }
  function setQty(n) {
    const id = shopCell(), max = id && !shop.gear ? shopMax(id) : 0;
    const q = Math.max(Math.min(1, max), Math.min(max, n));
    if (q !== qty) { qty = q; Sfx.cursor(); render(); } else Sfx.bump();
  }
  function setFilt(v) { filt = v; cell = 0; qty = 1; Sfx.cursor(); render(); }
  function pickCell(i) { cell = i; qty = Math.min(1, shopCell() ? shopMax(shopCell()) : 0); note = ''; }
  function buy() {
    const id = shopCell();
    if (!id || !canBuy(id)) return Sfx.bump();
    const ok = shop.gear ? buyGear(id, btnAt === 1, ownedEquips()) : buyItem(id, qty);
    if (!ok) return Sfx.bump();
    Sfx.coin(); note = shop.thanks; qty = Math.min(1, shopMax(id));
    UI.updateParty(); if (shop.gear) saveGame(); // the coins and the gear go together
    render();
  }
  function shopKey(k) {
    const n = shopRows().length, d = { ArrowUp: -1, ArrowDown: 1 }[k], lr = { ArrowLeft: -1, ArrowRight: 1 }[k];
    if (d && n) { pickCell(wrap(cell + d, n)); Sfx.cursor(); return render(); }
    if (lr) { if (shop.gear) { btnAt = lr > 0 ? 1 : 0; Sfx.cursor(); return render(); } return setQty(qty + lr); }
    if (k === 'Tab' && shop.gear) { const fs = ['all', ...new Set(shop.items.map(([i]) => EQUIPS[i].who))].filter(h => h === 'all' || inParty(h)); return setFilt(fs[wrap(fs.indexOf(filt) + 1, fs.length)]); }
    if (k === 'Enter') { if (mode() === 'tabs' && bookPage === 'list') { bookPage = 'detail'; Sfx.select(); return render(); } buy(); }
  }

  function render() {
    const m = hero(), d = pdef(m), md = mode();
    root.dataset.mode = md; root.dataset.screen = screen; root.dataset.view = view; root.toggleAttribute('data-choosing', choosing);
    root.style.setProperty('--hv-bg', HERO_FACE_BG[m.id][3]);
    if (screen === 'hero') {
      const tabs = md === 'tabs' ? `<div class="hv-modes">${[['stage', 'Palco'], ['sheet', 'Ficha']].map(([v, l]) => btn('view', v, l, `win${v === view ? ' on' : ''}`)).join('')}</div>` : '';
      root.innerHTML = heroStrip() + tabs + `<div class="hv-cols">${stageCol(m, d)}${sheetCol(m)}</div>`;
      drawCanvas();
    } else if (screen === 'book') root.innerHTML = bookScreen();
    else if (screen === 'elos') root.innerHTML = elosScreen();
    else if (screen === 'shop') root.innerHTML = shopScreen();
    else root.innerHTML = bagScreen();
    const s = root.querySelector('.hv-row.sel');
    if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function drawCanvas() {
    const cv = root.querySelector('.hv-body'), scene = root.querySelector('.hv-scene');
    if (!cv || !scene.offsetWidth) return;
    const dpr = devicePixelRatio || 1, s = Math.max(1, Math.floor(Math.min(scene.clientWidth * dpr / STAGE_W, scene.clientHeight * dpr / STAGE_H)));
    cv.style.width = STAGE_W * s / dpr + 'px'; cv.style.height = STAGE_H * s / dpr + 'px';
    drawStage(cv, hero());
  }

  function setHero(i) {
    if (i < 0 || i >= G.party.length || i === cur) return;
    cur = i; choosing = false; skill = 0; bookPage = 'list'; aim = -1; note = ''; Sfx.cursor(); render();
  }
  // Esc: back one level (the choice to the sheet, the skill page to the list), then to the menu
  function back() {
    if (aim >= 0) { aim = -1; Sfx.cancel(); render(); }
    else if (screen === 'hero' && choosing) { choosing = false; Sfx.cancel(); render(); }
    else if (screen !== 'hero' && bookPage === 'detail' && mode() === 'tabs') { bookPage = 'list'; note = ''; Sfx.cancel(); render(); }
    else close();
  }
  const wrap = (i, n) => (n ? (i + n) % n : 0);
  function heroKey(k) {
    const n = choosing ? choices(hero()).length + 1 : 2; // the choice list, then Melhor; or the two slots
    if (k === 'ArrowLeft' || k === 'ArrowRight') return choosing ? null : setHero(cur + (k === 'ArrowLeft' ? -1 : 1));
    if (k === 'ArrowUp' || k === 'ArrowDown') { const dd = k === 'ArrowUp' ? -1 : 1; if (choosing) pick = wrap(pick + dd, n); else slot = wrap(slot + dd, n); Sfx.cursor(); return render(); }
    if (k === 'Enter') return choosing ? equipPick() : openChoice();
    if (k === 'Tab' && heroViewViews(mode()).length) { const vs = heroViewViews(mode()); view = vs[wrap(vs.indexOf(view) + 1, vs.length)]; Sfx.cursor(); render(); }
  }
  function bookKey(k) {
    const n = spellBook(pdef(hero()).spells, hero().lv).length;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab') return setHero(wrap(cur + (k === 'ArrowLeft' ? -1 : 1), G.party.length));
    if (k === 'ArrowUp' || k === 'ArrowDown') { skill = wrap(skill + (k === 'ArrowUp' ? -1 : 1), n); note = ''; Sfx.cursor(); return render(); }
    if (k === 'Enter') { if (mode() === 'tabs' && bookPage === 'list') { bookPage = 'detail'; Sfx.select(); render(); } else cast(); }
  }
  function elosKey(k) {
    const n = elosBook().length;
    if (k === 'ArrowUp' || k === 'ArrowDown') { skill = wrap(skill + (k === 'ArrowUp' ? -1 : 1), n); Sfx.cursor(); return render(); }
    if (k === 'Enter' && mode() === 'tabs' && bookPage === 'list') { bookPage = 'detail'; Sfx.select(); render(); }
  }
  function bagKey(k) {
    const n = tabsOf()[tab].cells.length;
    if (k === 'Tab') { tab = wrap(tab + 1, 3); cell = 0; note = ''; Sfx.cursor(); return render(); }
    const step = { ArrowUp: -1, ArrowDown: 1 }[k];
    if (step && n) { cell = wrap(cell + step, n); note = ''; Sfx.cursor(); return render(); }
    if (k === 'Enter') { if (mode() === 'tabs' && bookPage === 'list') { bookPage = 'detail'; Sfx.select(); return render(); } useCell(); }
  }
  const KEY_ALIAS = { a: 'ArrowLeft', d: 'ArrowRight', w: 'ArrowUp', s: 'ArrowDown', ' ': 'Enter', e: 'Tab', q: 'ShiftTab' };
  function key(k0) {
    let k = KEY_ALIAS[k0] || k0;
    if (['Escape', 'x', 'Backspace'].includes(k)) return back();
    if (aim >= 0 && k !== 'ShiftTab' && k !== 'Tab') return aimKey(k); // the cursor is on the target cards
    if (k === 'ShiftTab') { // Q: the tab before
      if (screen === 'bag') { tab = wrap(tab - 1, 3); cell = 0; note = ''; Sfx.cursor(); return render(); }
      if (screen === 'book') return setHero(wrap(cur - 1, G.party.length));
      k = 'Tab';
    }
    (screen === 'hero' ? heroKey : screen === 'book' ? bookKey : screen === 'elos' ? elosKey : screen === 'shop' ? shopKey : bagKey)(k);
  }

  // The screen hides while a picker or a message runs (using an item or a skill), then comes back as it was
  function hide() { open = false; root.classList.remove('open'); }
  function reshow() { open = true; root.classList.add('open'); render(); }
  // screen: 'hero' (Heróis), 'book' (Livro), 'elos' (Livro de Elos), 'bag' (Bolsa) or 'shop' (o.shop); resolves when it closes
  // o: { hero, spell, aim } opens the Livro on that hero and skill, aim puts the cursor on the targets (the Magia shortcut)
  function show(s = 'hero', o = {}) {
    if (!root) build();
    screen = s; open = true; cur = Math.min(cur, G.party.length - 1);
    view = 'stage'; choosing = false; slot = 0; skill = 0; bookPage = 'list'; tab = 0; cell = 0; aim = -1; note = '';
    if (s === 'bag') tab = Math.max(0, tabsOf().findIndex(t => t.cells.length));
    if (s === 'shop') { shop = o.shop; filt = 'all'; btnAt = 1; pickCell(0); note = ''; }
    if (o.hero) { cur = Math.max(0, G.party.findIndex(m => m.id === o.hero)); skill = Math.max(0, spellBook(pdef(hero()).spells, hero().lv).findIndex(r => r.id === o.spell)); bookPage = 'detail'; }
    root.classList.add('open'); render(); Sfx.select();
    if (o.aim) cast(); // straight onto the target cards
    timer = setInterval(() => { frame ^= 1; if (open && screen === 'hero') drawCanvas(); }, 650); // breathing, cape and hair in the wind
    return new Promise(res => { done = res; });
  }
  function close() {
    if (!open) return;
    open = false; root.classList.remove('open'); Sfx.cancel(); clearInterval(timer);
    const d = done; done = null; d && d();
  }
  return { show, close, key, isOpen: () => open, owned: ownedEquips };
})();
