// ===== Heroes: the hero full body with the gear, the sheet (bars, attributes, story) and the book (skills, bag) =====
// Opens from the menu (Esc → Heróis). ←/→ (A/D) change hero, ↑/↓ walk the open list, Tab or Q/E change the page,
// Enter uses the chosen item, Esc closes. On phones the three columns become three tabs (heroViewMode).
const HeroView = (() => {
  let root, open = false, cur = 0, view = 'skills', sel = 0, frame = 0, timer = null, done = null;
  const STAGE_W = 96, STAGE_H = 78; // the hero's stage in art pixels: stained glass, pedestal and the 48x64 sprite; the slots sit on the sides

  // Equipment the party found: opened chests whose loot is an equipment (works for old saves)
  function ownedEquips() {
    const ids = [];
    for (let f = 0; f < FLOORS.length; f++) for (const o of getMap(f).objects)
      if (o.type === 'chest' && EQUIPS[o.loot] && G.opened[`${f}:${o.x},${o.y}`]) ids.push(o.loot);
    return ids;
  }
  const face = id => { const key = Portraits.keyFor(heroName(id)); return key ? Portraits.draw(key).toDataURL() : ''; };
  const icon = (id, st) => `<img class="hv-ico" src="${iconUrl(id, st)}" alt="">`;
  const flags = () => Object.assign({}, G.seen, { quest: G.quest > 0, bossDead: G.bossDead, carta: !!G.key.carta });
  const mode = () => heroViewMode(innerWidth, innerHeight);
  const views = () => heroViewViews(mode());
  const ink = c => `color-mix(in srgb, ${c} 62%, #2a1206)`; // the hero color, dark enough on parchment

  function build() {
    root = document.createElement('div');
    root.id = 'heroview';
    root.innerHTML = `<div class="hv-top win"><button class="hv-arrow" data-d="-1">◀</button><div class="hv-party"></div>
        <button class="hv-arrow" data-d="1">▶</button><button class="hv-close">✕ Fechar</button></div>
      <div class="hv-modes"></div>
      <section class="hv-col hv-c1 win"></section><section class="hv-col hv-c2 win"></section><section class="hv-col hv-c3 win"></section>`;
    document.getElementById('screen').appendChild(root);
    root.addEventListener('click', ev => {
      ev.stopPropagation();
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const { act, v } = b.dataset;
      if (act === 'close') close();
      else if (act === 'hero') pick(+v);
      else if (act === 'step') pick(cur + +v);
      else if (act === 'view') setView(v);
      else if (act === 'row') { sel = +v; Sfx.cursor(); render(); }
      else if (act === 'use') use();
    });
    root.querySelector('.hv-close').dataset.act = 'close';
    root.querySelectorAll('.hv-arrow').forEach(b => { b.dataset.act = 'step'; b.dataset.v = b.dataset.d; });
    addEventListener('resize', () => open && render());
  }

  // ---------- Column 1: the hero on the stage, the gear around, name, class, level and XP ----------
  function drawStage(cv, m) {
    const dead = m.hp <= 0, bg = HERO_FACE_BG[m.id], c = cv.getContext('2d'), R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    c.imageSmoothingEnabled = false;
    bg.forEach((col, i) => R(0, Math.round(i * STAGE_H / 4), STAGE_W, Math.ceil(STAGE_H / 4), col));
    // stained glass: an arched window in the hero's family, lead lines in the darkest tone
    const ax = 24, aw = 48, top = 2, bot = 64;
    for (let y = top; y < bot; y++) {
      const dy = y - (top + 24), half = dy < 0 ? Math.round(Math.sqrt(Math.max(0, 24 * 24 - dy * dy))) : 24;
      R(ax + 24 - half, y, half * 2, 1, bg[0]);
    }
    for (let x = ax + 8; x < ax + aw; x += 8) R(x, top + 8, 1, bot - top - 8, bg[2]);
    for (let y = top + 20; y < bot; y += 12) R(ax, y, aw, 1, bg[2]);
    for (const [x, y] of [[ax + 12, top + 14], [ax + 36, top + 26], [ax + 20, top + 38], [ax + 30, top + 50]]) R(x, y, 2, 2, '#fff6c0');
    // stone pedestal with its lit edge, and the hero's shadow on it
    const P = ['#cbd8ec', '#a2a2ac', '#7a7a82', '#55555e'];
    R(18, 66, 60, 2, P[0]); R(16, 68, 64, 4, P[1]); R(16, 72, 64, 3, P[2]); R(18, 75, 60, 3, P[3]);
    for (let x = 20; x < 76; x += 10) R(x, 72, 1, 3, P[3]);
    R(30, 66, 36, 2, '#55555e'); R(34, 65, 28, 1, '#55555e');
    const pal = bodyPal(HERO_BODY[m.id].pal, m.id, ownedEquips(), EQUIPS, GEAR_LOOK);
    const def = dead ? HERO_BODY[m.id + 'Ko'] : Object.assign({}, HERO_BODY[m.id], { pal });
    c.drawImage(GridSprite.render(def, dead ? 0 : frame), 24, 3);
  }
  function stageScale(box) {
    const dpr = devicePixelRatio || 1, s = Math.max(1, Math.floor(Math.min(box.w * dpr / STAGE_W, box.h * dpr / STAGE_H)));
    return { w: STAGE_W * s / dpr, h: STAGE_H * s / dpr };
  }
  function heroCol(m, d) {
    const dead = m.hp <= 0, slots = slotGear(m.id, ownedEquips(), EQUIPS, START_GEAR);
    const slot = s => `<div class="hv-slot"><div class="hv-box slot-frame" title="${s.label}">${icon(s.icon)}</div></div>`;
    const gear = s => `<p><small>${s.label}</small>${esc(s.name)}${s.start ? '' : ` <em>${esc(bonusText(s.bonus, STAT_NAMES))}</em>`}</p>`;
    return `<div class="hv-stage"><div class="hv-doll"><canvas class="hv-body" width="${STAGE_W}" height="${STAGE_H}"></canvas>${slot(slots[0])}${slot(slots[1])}</div></div>
      <div class="hv-gear">${gear(slots[0])}${gear(slots[1])}</div>
      <div class="hv-name"><h3 style="color:${ink(d.color)}">${esc(d.name)}</h3>${dead ? '<span class="hv-ko">Caído</span>' : ''}</div>
      <p>${esc(d.cls)} · Nível ${m.lv}</p>
      <div class="bar xp"><i style="width:${Math.min(100, 100 * m.xp / xpNext(m.lv))}%"></i></div>
      <p class="dim">${xpLeftText(m.xp, m.lv, xpNext(m.lv))}</p>`;
  }

  // ---------- Column 2: thick bars, attributes against the party, the story ----------
  function sheetCol(m) {
    const totals = G.party.map(p => ({ total: Object.fromEntries(STAT_KEYS.map(k => [k, stat(p, k)])), bonus: p.bonus }));
    const statIcon = { atk: 'atk', def: 'def', mag: 'spell', res: 'res', agi: 'run' };
    const st = storyLines(HERO_STORY[m.id].lines, flags()), q = storyQuote(HERO_STORY[m.id].quotes, flags());
    const bar = (lbl, v, max, cls) => `<div class="hv-bar"><span>${lbl}</span><b>${v}<small>/${max}</small></b></div>
      <div class="bar ${cls}"><i style="width:${max ? 100 * v / max : 0}%"></i></div>`;
    return bar('PV', m.hp, maxHp(m), '') + bar('PM', m.mp, maxMp(m), 'mp') +
      `<div class="hv-stats">${statRows(totals, cur).map(r => `<div class="hv-stat">${icon(statIcon[r.key])}<span>${STAT_FULL[r.key]}</span>
        <b>${r.value}</b><em>${r.bonus ? '+' + r.bonus : ''}</em><div class="hv-cmp"><i style="width:${Math.round(100 * r.frac)}%"></i></div></div>`).join('')}</div>
      <div class="hv-story"><small>História</small>${st.map(t => `<p>${esc(t)}</p>`).join('')}<p class="hv-quote">"${esc(q)}"</p></div>`;
  }

  // ---------- Column 3: the book, with the skills page and the bag page ----------
  function bookRows(m) {
    if (view === 'bag') return bagGroups({ inv: G.inv, key: G.key, owned: ownedEquips(), items: ITEMS, equips: EQUIPS, keyItems: KEY_ITEMS, read: !!G.key.lida }).flatMap(g => g.cells);
    return spellBook(pdef(m).spells, m.lv);
  }
  function bookCol(m, d) {
    const page = view === 'bag' ? 'bag' : 'skills', rows = bookRows(m);
    sel = Math.max(0, Math.min(sel, rows.length - 1));
    const tabs = `<div class="hv-book-tabs">${[['skills', d.skillWord], ['bag', 'Bolsa']].map(([v, l]) =>
      `<button data-act="view" data-v="${v}" class="${page === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let body, detail = '';
    if (page === 'skills') {
      body = rows.length ? rows.map((r, i) => {
        const sp = SPELLS[r.id];
        return r.known
          ? `<div class="hv-row${i === sel ? ' sel' : ''}" data-act="row" data-v="${i}">${icon(spellIcon(sp))}<div>
              <div class="hv-line"><b>${esc(sp.name)}</b><b class="hv-cost">${sp.mp} PM</b></div><p>${esc(sp.desc)}</p><small>${TARGET_TEXT[sp.target]}</small></div></div>`
          : `<div class="hv-row off${i === sel ? ' sel' : ''}" data-act="row" data-v="${i}">${icon(spellIcon(sp), 'dis')}<div>
              <div class="hv-line"><b>???</b><b class="hv-cost">Nível ${r.lv}</b></div><p>Ainda não aprendeu.</p></div></div>`;
      }).join('') : `<p class="hv-quote">"${esc(storyQuote(HERO_STORY[m.id].quotes, flags()))}"</p>`;
    } else {
      const groups = bagGroups({ inv: G.inv, key: G.key, owned: ownedEquips(), items: ITEMS, equips: EQUIPS, keyItems: KEY_ITEMS, read: !!G.key.lida });
      let i = 0;
      body = `<p class="hv-gold">${G.gold} moedas</p>` + (groups.length ? groups.map(g => `<small>${g.title}</small><div class="hv-items">${g.cells.map(c => {
        const k = i++;
        return `<button class="hv-item${k === sel ? ' sel' : ''}" data-act="row" data-v="${k}"><div class="hv-box slot-frame">${icon(ICON_ART[c.icon] ? c.icon : 'carta')}${c.n ? `<b>${c.n}</b>` : ''}</div></button>`;
      }).join('')}</div>`).join('') : '<p class="dim">A bolsa está vazia.</p>');
      const c = rows[sel];
      if (c) detail = `<div class="hv-detail"><div><b>${esc(c.name)}</b><p>${esc(c.desc)}</p></div>${c.kind !== 'equip' ? `<button data-act="use">${c.kind === 'key' ? 'Ler' : 'Usar'}</button>` : ''}</div>`;
    }
    return tabs + `<div class="hv-page">${body}</div>` + detail;
  }

  function render() {
    const m = G.party[cur], d = pdef(m), md = mode();
    if (md === 'cols' && !['skills', 'bag'].includes(view)) view = 'skills';
    root.dataset.mode = md; root.dataset.view = view;
    root.style.setProperty('--hv-bg', HERO_FACE_BG[m.id][3]);
    root.querySelector('.hv-party').innerHTML = G.party.map((p, i) =>
      `<button class="hv-mini${i === cur ? ' on' : ''}${p.hp <= 0 ? ' ko' : ''}" data-act="hero" data-v="${i}" style="--c:${pdef(p).color}"><img src="${face(p.id)}" alt="${esc(pdef(p).name)}"></button>`).join('');
    root.querySelector('.hv-modes').innerHTML = md === 'tabs'
      ? [['hero', 'Herói'], ['sheet', 'Ficha'], [view === 'bag' ? 'bag' : 'skills', 'Livro']].map(([v, l]) =>
        `<button class="win${(v === view || (l === 'Livro' && ['skills', 'bag'].includes(view))) ? ' on' : ''}" data-act="view" data-v="${v}">${l}</button>`).join('') : '';
    root.querySelector('.hv-c1').innerHTML = heroCol(m, d);
    root.querySelector('.hv-c2').innerHTML = sheetCol(m);
    root.querySelector('.hv-c3').innerHTML = bookCol(m, d);
    drawCanvas();
    const s = root.querySelector('.hv-row.sel, .hv-item.sel');
    if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function drawCanvas() {
    const cv = root.querySelector('.hv-body'), stage = root.querySelector('.hv-stage');
    if (!cv || !stage.offsetWidth) return;
    const { w, h } = stageScale({ w: stage.clientWidth, h: stage.clientHeight });
    const doll = stage.querySelector('.hv-doll');
    doll.style.width = w + 'px'; doll.style.height = h + 'px'; doll.style.setProperty('--ap', w / STAGE_W + 'px'); // one art pixel in CSS px
    drawStage(cv, G.party[cur]);
  }

  function pick(i) {
    if (i < 0 || i >= G.party.length || i === cur) return;
    cur = i; sel = 0; Sfx.cursor(); render();
  }
  function setView(v) { if (v === view) return; view = v; sel = 0; Sfx.cursor(); render(); }
  function cycle(dir) { const vs = views(), i = vs.indexOf(view); setView(vs[(i + dir + vs.length) % vs.length]); }
  function move(dir) {
    if (!['skills', 'bag'].includes(view)) return;
    const n = bookRows(G.party[cur]).length;
    if (!n) return;
    sel = (sel + dir + n) % n; Sfx.cursor(); render();
  }
  // Using a consumable or reading a key item runs the same code as the Items menu, with the screen hidden meanwhile
  async function use() {
    if (view !== 'bag') return;
    const c = bookRows(G.party[cur])[sel];
    if (!c || c.kind === 'equip') return;
    open = false; root.classList.remove('open');
    await useBagItem(c.kind === 'key' ? 'key:' + c.id : c.id);
    open = true; root.classList.add('open'); render();
  }

  function show() {
    if (!root) build();
    open = true; cur = Math.min(cur, G.party.length - 1); sel = 0; view = mode() === 'tabs' ? 'hero' : 'skills';
    root.classList.add('open'); render(); Sfx.select();
    timer = setInterval(() => { frame ^= 1; if (open) drawCanvas(); }, 650); // breathing, cape and hair in the wind
    return new Promise(res => { done = res; });
  }
  function close() {
    if (!open) return;
    open = false; root.classList.remove('open'); Sfx.cancel(); clearInterval(timer);
    const d = done; done = null; d && d();
  }
  function key(k) {
    if (k === 'ArrowLeft' || k === 'a') pick(cur - 1);
    else if (k === 'ArrowRight' || k === 'd') pick(cur + 1);
    else if (k === 'ArrowUp' || k === 'w') move(-1);
    else if (k === 'ArrowDown' || k === 's') move(1);
    else if (k === 'Tab' || k === 'e') cycle(1);
    else if (k === 'q') cycle(-1);
    else if (k === 'Enter' || k === ' ') use();
    else if (['Escape', 'x', 'Backspace'].includes(k)) close();
  }
  return { show, close, key, isOpen: () => open };
})();
