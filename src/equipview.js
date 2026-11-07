// ===== Heróis, Livro and Bolsa: three screens from the camp menu, one overlay =====
// Heróis: the stage (name, XP, the hero full body, the gear slots) and the sheet (bars, attributes, story);
// a slot opens the equipment choice. Livro: an open book with a ribbon per hero, skills on the left, the chosen one
// on the right. Bolsa: coins, three tabs and a grid of items.
// Keys: arrows move, Enter chooses or uses, Tab or Q/E change tabs, Esc goes back one level (choice → sheet → menu).
// On phones (heroViewMode 'tabs'): Heróis has two tabs (Palco, Ficha), the Livro shows one page at a time, the Bolsa one column.
const HeroView = (() => {
  let root, open = false, screen = 'hero', cur = 0, frame = 0, timer = null, done = null;
  let view = 'stage', slot = 0, choosing = false, pick = 0; // Heróis
  let skill = 0, bookPage = 'list'; // Livro
  let tab = 0, cell = 0; // Bolsa
  const STAGE_W = 64, STAGE_H = 72; // the hero's stage in art pixels: stained glass, the 48x64 sprite and the pedestal

  // Equipment the party found: opened chests whose loot is an equipment; saves from the 3-floor version also opened
  // chests on floors that no longer exist, so that gear is read from the bonus it left
  function ownedEquips() {
    const ids = [];
    for (let f = 0; f < FLOORS.length; f++) for (const o of getMap(f).objects)
      if (o.type === 'chest' && EQUIPS[o.loot] && G.opened[`${f}:${o.x},${o.y}`]) ids.push(o.loot);
    const old = Object.keys(G.opened || {}).some(k => parseInt(k, 10) >= FLOORS.length);
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
      else if (act === 'skill') { skill = n; bookPage = 'detail'; Sfx.cursor(); render(); }
      else if (act === 'cast') cast();
      else if (act === 'tab') { tab = n; cell = 0; Sfx.cursor(); render(); }
      else if (act === 'cell') { if (cell === n) useCell(); else { cell = n; Sfx.cursor(); render(); } }
      else if (act === 'use') useCell();
    });
    addEventListener('resize', () => open && render());
  }

  // ---------- Top bar: mini portraits with the arrows next to the first and the last, Fechar on the right ----------
  function heroStrip() {
    const minis = G.party.map((p, i) => `<button class="hv-mini${i === cur ? ' on' : ''}${p.hp <= 0 ? ' ko' : ''}" data-act="hero" data-v="${i}"
      style="--c:${pdef(p).color}" aria-label="${esc(pdef(p).name)}"><img src="${face(p.id)}" alt=""></button>`).join('');
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
      <span class="hv-box slot-frame">${icon(s.icon)}</span><span>${esc(s.name)}<br>${s.start ? '<i class="dim">sem bônus</i>' : `<em>${esc(bonusText(s.bonus, STAT_NAMES))}</em>`}</span></button>`;
    return `<section class="hv-stage-col" style="--b0:${bg[0]};--b1:${bg[1]};--b2:${bg[2]};--b3:${bg[3]}">
      <div class="hv-band"><p><span class="hv-name" style="color:${d.color}">${esc(d.name)}</span> ${esc(d.cls)} · Nível ${m.lv}${dead ? '<span class="hv-ko">Caído</span>' : ''}</p><div class="bar xp"><i style="width:${Math.min(100, 100 * m.xp / xpNext(m.lv))}%"></i></div>
        <p>${xpLeftText(m.xp, m.lv, xpNext(m.lv))}</p></div>
      <div class="hv-scene"><canvas class="hv-body" width="${STAGE_W}" height="${STAGE_H}"></canvas></div>
      <div class="hv-slots">${slots.map(slotBtn).join('')}</div></section>`;
  }

  // ---------- Heróis: the sheet, or the equipment choice in its place ----------
  function sheetCol(m) {
    if (choosing) return choiceCol(m);
    const totals = G.party.map(p => ({ total: Object.fromEntries(STAT_KEYS.map(k => [k, stat(p, k)])), bonus: p.bonus }));
    const statIcon = { atk: 'atk', def: 'def', mag: 'spell', res: 'res', agi: 'run' };
    const st = storyLines(HERO_STORY[m.id].lines, flags()), q = storyQuote(HERO_STORY[m.id].quotes, flags());
    const bar = (lbl, v, max, cls) => `<div class="hv-bar"><span>${lbl}</span><b>${v}<small>/${max}</small></b></div>
      <div class="bar ${cls}"><i style="width:${max ? 100 * v / max : 0}%"></i></div>`;
    return `<section class="hv-sheet win">` + bar('PV', m.hp, maxHp(m), '') + bar('PM', m.mp, maxMp(m), 'mp') +
      `<div class="hv-stats">${statRows(totals, cur).map(r => `<div class="hv-stat">${icon(statIcon[r.key])}<span>${STAT_FULL[r.key]}</span>
        <b>${r.key === 'def' || r.key === 'res' ? guardText(r.value) : r.value}</b><em>${r.bonus ? '+' + r.bonus : ''}</em></div>`).join('')}</div>
      <div class="hv-story">${st.map(t => `<p>${esc(t)}</p>`).join('')}<p class="hv-quote">"${esc(q)}"</p></div></section>`;
  }
  const choices = m => gearChoices(m.id, GEAR_SLOTS[slot][0], ownedEquips(), EQUIPS, choice());
  function choiceCol(m) {
    const list = choices(m), diff = d => Object.entries(d).map(([k, v]) => `<i class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'} ${STAT_NAMES[k]} ${Math.abs(v)}</i>`).join(' ');
    const rows = list.map((c, i) => `<button class="hv-row${i === pick ? ' sel' : ''}" data-act="gear" data-v="${i}">${icon(c.icon)}<span>
      <b>${esc(c.name)}</b> <em>${esc(bonusText(c.bonus, STAT_NAMES))}</em><br>${c.equipped ? '<span class="hv-seal">Equipado</span>' : diff(c.diff) || '<i>igual</i>'}</span></button>`).join('');
    return `<section class="hv-sheet hv-choice win"><h4>${GEAR_SLOTS[slot][1]} ${midName(pdef(m).name, 'de')}</h4>
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
        <b>${r.known ? esc(s.name) : '???'}</b><b class="hv-cost">${r.known ? s.mp + ' PM' : 'Nível ' + r.lv}</b></button>`;
    }).join('');
    let detail = '';
    if (sp && known) {
      const u = fieldUse(sp, m);
      detail = `${icon(spellIcon(sp), 'normal', 'bk-big')}<h3>${esc(sp.name)}</h3><p class="hv-cost">${sp.mp} PM · ${TARGET_TEXT[sp.target]}</p>
        <p>${esc(sp.desc)}</p><p class="bk-fx">${spellEffect(sp, statsOf(m))}.</p>
        ${u.field ? `<div class="hv-actions">${btn('cast', 0, 'Usar', `hv-btn${u.ok ? '' : ' dis'}`)}${u.ok ? '' : `<span class="dim">${u.why}</span>`}</div>` : `<p class="dim">${u.why}.</p>`}`;
    } else if (sp) detail = `${icon(spellIcon(sp), 'dis', 'bk-big')}<h3>???</h3><p class="dim">${esc(d.name)} aprende no nível ${book[skill].lv}.</p>`;
    const back = mode() === 'tabs' ? btn('back', 0, '◀ Lista', 'hv-btn') : '';
    return `<div class="hv-top win"><h3 class="bk-title">Livro</h3>${btn('close', 0, 'Fechar', 'hv-close')}</div>
      <div class="bk" data-page="${bookPage}"><div class="bk-ribbons">${ribbons}</div>
        <section class="bk-page bk-left"><h3 style="color:${ink(d.color)}">${esc(d.skillWord)}</h3>${list}</section>
        <section class="bk-page bk-right">${back}${detail}</section></div>`;
  }
  async function cast() {
    const m = hero(), r = spellBook(pdef(m).spells, m.lv)[skill], sp = r && r.known && SPELLS[r.id];
    if (!sp || !fieldUse(sp, m).ok) return Sfx.cancel();
    hide();
    const t = sp.target === 'allAllies' ? 'all' : await pickAlly(sp.target, `${sp.name} em quem?`);
    if (t != null) { m.mp -= sp.mp; UI.updateParty(); await UI.say(castSupport(m, r.id, t)); }
    reshow();
  }

  // ---------- Bolsa: coins, three tabs, a grid of cells and the strip of the chosen one ----------
  const tabsOf = () => bagTabs({ inv: G.inv, key: G.key, owned: ownedEquips(), items: ITEMS, equips: EQUIPS, keyItems: KEY_ITEMS, read: !!G.key.lida, equip: choice() });
  function bagScreen() {
    const tabs = tabsOf(), cells = tabs[tab].cells, c = cells[cell];
    const who = c => (c.who ? `<img class="bg-who${c.inUse ? ' on' : ''}" src="${face(c.who)}" alt="">` : '');
    const grid = cells.map((x, i) => `<button class="bg-cell${i === cell ? ' sel' : ''}" data-act="cell" data-v="${i}"><span class="hv-box slot-frame">${icon(x.icon, 'normal', 'bg-ico')}
      ${x.n ? `<b>${x.n}</b>` : ''}${who(x)}</span><span class="bg-name">${esc(x.name)}</span></button>`).join('');
    const user = c && c.who ? `, ${bonusText(EQUIPS[c.id].bonus, STAT_NAMES)}. ${c.inUse ? 'Em uso por' : 'Guardada, serve para'} ${heroName(c.who)}.` : '';
    const strip = c ? `<div class="bg-strip win"><div><b>${esc(c.name)}</b><p>${esc(c.desc)}${user}</p></div>
      ${c.kind !== 'equip' ? btn('use', 0, c.kind === 'key' ? 'Ler' : 'Usar', 'hv-btn') : ''}</div>` : '';
    return `<div class="hv-top win"><span class="bg-gold">${G.gold} moedas</span>
      <div class="bg-tabs">${tabs.map((t, i) => btn('tab', i, t.title, i === tab ? 'on' : '')).join('')}</div>${btn('close', 0, 'Fechar', 'hv-close')}</div>
      <section class="bg-grid win">${grid || `<p class="dim">Nada aqui.</p>`}</section>${strip}`;
  }
  async function useCell() {
    const c = tabsOf()[tab].cells[cell];
    if (!c || c.kind === 'equip') return;
    hide(); await useBagItem(c.kind === 'key' ? 'key:' + c.id : c.id); reshow();
    cell = Math.min(cell, Math.max(0, tabsOf()[tab].cells.length - 1)); render();
  }
  function bagCols() {
    const g = root.querySelector('.bg-grid');
    return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 1;
  }

  function render() {
    const m = hero(), d = pdef(m), md = mode();
    root.dataset.mode = md; root.dataset.screen = screen; root.dataset.view = view;
    root.style.setProperty('--hv-bg', HERO_FACE_BG[m.id][3]);
    if (screen === 'hero') {
      const tabs = md === 'tabs' ? `<div class="hv-modes">${[['stage', 'Palco'], ['sheet', 'Ficha']].map(([v, l]) => btn('view', v, l, `win${v === view ? ' on' : ''}`)).join('')}</div>` : '';
      root.innerHTML = heroStrip() + tabs + `<div class="hv-cols">${stageCol(m, d)}${sheetCol(m)}</div>`;
      drawCanvas();
    } else if (screen === 'book') root.innerHTML = bookScreen();
    else root.innerHTML = bagScreen();
    const s = root.querySelector('.hv-row.sel, .bg-cell.sel');
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
    cur = i; choosing = false; skill = 0; bookPage = 'list'; Sfx.cursor(); render();
  }
  // Esc: back one level (the choice to the sheet, the skill page to the list), then to the menu
  function back() {
    if (screen === 'hero' && choosing) { choosing = false; Sfx.cancel(); render(); }
    else if (screen === 'book' && bookPage === 'detail' && mode() === 'tabs') { bookPage = 'list'; Sfx.cancel(); render(); }
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
    if (k === 'ArrowUp' || k === 'ArrowDown') { skill = wrap(skill + (k === 'ArrowUp' ? -1 : 1), n); Sfx.cursor(); return render(); }
    if (k === 'Enter') { if (mode() === 'tabs' && bookPage === 'list') { bookPage = 'detail'; Sfx.select(); render(); } else cast(); }
  }
  function bagKey(k) {
    const n = tabsOf()[tab].cells.length, cols = bagCols();
    if (k === 'Tab') { tab = wrap(tab + 1, 3); cell = 0; Sfx.cursor(); return render(); }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[k];
    if (step && n) { cell = Math.max(0, Math.min(n - 1, cell + step)); Sfx.cursor(); return render(); }
    if (k === 'Enter') useCell();
  }
  const KEY_ALIAS = { a: 'ArrowLeft', d: 'ArrowRight', w: 'ArrowUp', s: 'ArrowDown', ' ': 'Enter', e: 'Tab', q: 'ShiftTab' };
  function key(k0) {
    let k = KEY_ALIAS[k0] || k0;
    if (['Escape', 'x', 'Backspace'].includes(k)) return back();
    if (k === 'ShiftTab') { // Q: the tab before
      if (screen === 'bag') { tab = wrap(tab - 1, 3); cell = 0; Sfx.cursor(); return render(); }
      if (screen === 'book') return setHero(wrap(cur - 1, G.party.length));
      k = 'Tab';
    }
    (screen === 'hero' ? heroKey : screen === 'book' ? bookKey : bagKey)(k);
  }

  // The screen hides while a picker or a message runs (using an item or a skill), then comes back as it was
  function hide() { open = false; root.classList.remove('open'); }
  function reshow() { open = true; root.classList.add('open'); render(); }
  // screen: 'hero' (Heróis), 'book' (Livro) or 'bag' (Bolsa); resolves when it closes
  function show(s = 'hero') {
    if (!root) build();
    screen = s; open = true; cur = Math.min(cur, G.party.length - 1);
    view = 'stage'; choosing = false; slot = 0; skill = 0; bookPage = 'list'; tab = 0; cell = 0;
    if (s === 'bag') tab = Math.max(0, tabsOf().findIndex(t => t.cells.length));
    root.classList.add('open'); render(); Sfx.select();
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
