// ===== Interface: caixa de mensagens, menus e painel do grupo =====

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = (() => {
  const msgEl = document.getElementById('msg');
  const menuEl = document.getElementById('menu');
  const partyEl = document.getElementById('party');
  const infoEl = document.getElementById('info');
  const gameEl = document.getElementById('game');
  const speakerEl = document.getElementById('speaker');
  const faceEl = document.getElementById('face');
  const dialogEl = document.getElementById('dialog');
  // Battle command bar: a small icon-only window that floats above the active hero's card
  const barEl = document.createElement('div'); barEl.id = 'cmdbar';
  document.getElementById('screen').appendChild(barEl);
  let menu = null, sayR = null, sayTimer = null, typeT = null, finishType = null, hideT = null;

  // Janela de texto dentro da cena: abre quando há fala ou menu, fecha sozinha quando o jogo fica livre
  function open() { clearTimeout(hideT); dialogEl.classList.add('open'); gameEl.classList.add('talking'); }
  function closeSoon() {
    clearTimeout(hideT);
    hideT = setTimeout(() => {
      if (menu || sayR) return;
      dialogEl.classList.remove('open'); gameEl.classList.remove('talking');
    }, 80);
  }

  // Quem fala: nome em dourado e retrato na janela de cima (src/portraits.js); narração fica sem retrato
  function setSpeaker(label) {
    const { name, mood } = splitMood(label);
    speakerEl.textContent = name || '';
    const hero = PARTY_DEFS.find(d => d.name === name);   // herói fala na cor dele; moradores em tijolo
    speakerEl.style.setProperty('--c', hero ? hero.color : '');
    speakerEl.classList.toggle('hero', !!hero);
    const key = Portraits.keyFor(name);
    dialogEl.classList.toggle('has-face', !!key);
    if (!key) return;
    const fc = faceEl.getContext('2d');
    fc.imageSmoothingEnabled = false; fc.clearRect(0, 0, 32, 32); fc.drawImage(Portraits.draw(key, mood), 0, 0);
  }

  // Texto letra a letra; Enter/clique durante a digitação mostra o resto de uma vez
  function setText(t, more, instant) {
    clearInterval(typeT); typeT = null; finishType = null;
    msgEl.innerHTML = '';
    const body = document.createElement('span'); msgEl.appendChild(body);
    const done = () => {
      clearInterval(typeT); typeT = null; finishType = null;
      body.textContent = t;
      if (more) msgEl.insertAdjacentHTML('beforeend', ' <span class="more">▼</span>');
    };
    if (instant || !t) return done();
    let n = 0;
    finishType = done;
    typeT = setInterval(() => { n += 1; body.textContent = t.slice(0, n); if (n >= t.length) done(); }, 22);
  }
  function clearMenu() { menuEl.innerHTML = ''; menuEl.classList.remove('icons'); barEl.innerHTML = ''; barEl.classList.remove('open'); }

  function say(text, opts = {}) {
    clearMenu();
    const m = splitSpeaker(text);
    setSpeaker(m.who); open();
    return new Promise(res => {
      setText(m.text, !opts.auto, !!opts.auto);
      sayR = v => { clearTimeout(sayTimer); sayR = null; closeSoon(); res(v); }; // v = 'esc' when closed with Esc or ✕
      if (opts.auto) sayTimer = setTimeout(() => sayR && sayR(), opts.auto);
    });
  }
  // Aviso no alto da cena: só reaparece quando o texto muda, e some depois de alguns segundos
  let infoT = null;
  function info(text) {
    if (!menu && !sayR) closeSoon();
    if (text === infoEl.textContent && infoEl.classList.contains('shown-once')) return;
    infoEl.textContent = text; infoEl.classList.add('show', 'shown-once');
    clearTimeout(infoT); infoT = setTimeout(() => infoEl.classList.remove('show'), 6000);
  }

  // o.style: 'list' (in the dialog, default), 'bar' (floating icon bar above o.anchor) or
  // 'pointer' (nothing drawn: the caller shows the selection through o.onHover, e.g. an arrow over the target).
  // o.keys: shortcut key -> value, returned at once (e.g. '1' repeats Tática 1 from the command bar)
  // o.party: the menu is about the heroes' PV and PM, so the town shows the party strip with it
  function choose(opts, o = {}) {
    return new Promise(res => {
      menuEl.dataset.party = o.party ? '1' : '';
      const style = o.style || 'list';
      if (style === 'list') {
        if (o.title !== undefined) { const t = splitSpeaker(o.title); setSpeaker(t.who); setText(t.text, false, true); }
        open();
      } else dialogEl.classList.remove('open');
      let sel = opts.findIndex(x => !x.disabled); if (sel < 0) sel = 0;
      const start = opts.findIndex(x => !x.disabled && x.value === o.start); if (start >= 0) sel = start;
      menu = { opts, sel, res, style, anchor: o.anchor, cancel: !!o.cancel, cols: o.cols || 2, onHover: o.onHover, icons: !!o.icons, keys: o.keys };
      render(); hover();
    });
  }
  const host = () => menu.style === 'bar' ? barEl : menuEl;
  function render() {
    clearMenu();
    if (menu.style === 'pointer') return;
    if (menu.style === 'bar') {
      menu.opts.forEach((op, i) => barEl.appendChild(optEl(op, i, `<img src="${iconUrl(op.icon, iconState(op, i === menu.sel))}" alt="${esc(op.label)}">`)));
      barEl.classList.add('open'); placeBar();
      return;
    }
    menuEl.style.gridTemplateColumns = menu.icons ? `repeat(${menu.cols},auto)` : `repeat(${menu.cols},1fr)`;
    menuEl.classList.toggle('icons', menu.icons);
    msgEl.querySelector('.cmd-name')?.remove();
    if (menu.icons) msgEl.insertAdjacentHTML('beforeend', '<span class="cmd-name"></span>');
    menu.opts.forEach((op, i) => menuEl.appendChild(optEl(op, i, op.icon ? `<img src="${iconUrl(op.icon, iconState(op, i === menu.sel))}" alt=""><span>${esc(op.label)}</span>`
      : esc(op.label) + (op.icons ? `<span class="ics">${op.icons.map(id => `<img src="${iconUrl(id)}" alt="">`).join('')}</span>` : '')
        + (op.hint ? `<small>${esc(op.hint)}</small>` : ''))));
    cmdName();
  }
  function optEl(op, i, html) {
    const d = document.createElement('div');
    d.className = 'opt' + (i === menu.sel ? ' sel' : '') + (op.disabled ? ' dis' : '');
    d.innerHTML = html;
    d.onmouseenter = () => { if (!menu || menu.sel === i) return; menu.sel = i; update(); };
    d.onclick = ev => { ev.stopPropagation(); if (!menu) return; menu.sel = i; pick(); };
    return d;
  }
  // Centered over the anchor (the hero's card), just above it, never past the screen edges
  function placeBar() {
    if (!menu || menu.style !== 'bar') return;
    const scr = barEl.parentElement.getBoundingClientRect(), a = menu.anchor?.getBoundingClientRect();
    const w = barEl.offsetWidth, h = barEl.offsetHeight, pad = 8;
    const cx = a ? a.left + a.width / 2 - scr.left : scr.width / 2, bottom = a ? a.top - scr.top : scr.height - pad;
    barEl.style.left = Math.max(pad, Math.min(scr.width - w - pad, cx - w / 2)) + 'px';
    barEl.style.top = Math.max(pad, bottom - h + 4) + 'px'; // tucked onto the card's top edge
  }
  window.addEventListener('resize', placeBar);
  // Icon states follow the cursor: normal, selected (gold halo), disabled (grey)
  const iconState = (op, sel) => op.disabled ? 'dis' : sel ? 'sel' : 'normal';
  function update() {
    [...host().children].forEach((c, i) => {
      c.classList.toggle('sel', i === menu.sel);
      const op = menu.opts[i], img = op.icon && c.querySelector('img');
      if (img) img.src = iconUrl(op.icon, iconState(op, i === menu.sel));
    }); if (menu.style === 'list') menuEl.children[menu.sel]?.scrollIntoView({ block: 'nearest' }); cmdName(); hover(); }
  // Phone shows command icons only: the selected command's name goes to the prompt line
  function cmdName() { const n = msgEl.querySelector('.cmd-name'); if (n) n.textContent = menu.opts[menu.sel].label; }
  function hover() { const op = menu.opts[menu.sel]; menu.onHover && menu.onHover(op.value, op); }
  function close(v) { const m = menu; menu = null; clearMenu(); closeSoon(); m.onHover && m.onHover(null); m.res(v); }
  function pick() { const op = menu.opts[menu.sel]; if (op.disabled) { Sfx.bump(); return; } Sfx.select(); close(op.value); }
  function cancel() { if (!menu.cancel) return; Sfx.cancel(); close(null); }
  // Bar and pointer wrap around; pointer also skips what can't be chosen (fallen enemies or allies)
  function move(d) {
    const n = menu.opts.length, wrap = menu.style !== 'list';
    let s = menu.sel;
    for (let k = 0; k < n; k++) {
      s += d;
      if (wrap) s = ((s % n) + n) % n; else if (s < 0 || s >= n) return;
      if (menu.style !== 'pointer' || !menu.opts[s].disabled) break;
    }
    if (s === menu.sel) return;
    menu.sel = s; Sfx.cursor(); update();
  }
  // Mouse/touch on things outside the menu (an enemy on the canvas, a hero card)
  const optIndex = v => menu ? menu.opts.findIndex(o => o.value === v && !o.disabled) : -1;
  function pickValue(v) { const i = optIndex(v); if (i < 0) return false; menu.sel = i; pick(); return true; }
  function hoverValue(v) { const i = optIndex(v); if (i < 0 || i === menu.sel) return; menu.sel = i; Sfx.cursor(); update(); }
  // Arrow over a hero card while choosing an ally
  function markCard(m) {
    document.querySelectorAll('.card.target').forEach(c => c.classList.remove('target'));
    if (m) document.getElementById('card-' + m.id)?.classList.add('target');
  }

  function handleKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (menu) {
      const c = menu.cols;
      if (k === 'ArrowDown' || k === 's') move(c);
      else if (k === 'ArrowUp' || k === 'w') move(-c);
      else if (k === 'ArrowLeft' || k === 'a') { if (c > 1) move(-1); }
      else if (k === 'ArrowRight' || k === 'd') { if (c > 1) move(1); }
      else if ((k === 'Enter' || k === ' ' || k === 'z') && !e.repeat) pick();
      else if ((k === 'Escape' || k === 'x' || k === 'Backspace') && !e.repeat) cancel();
      else if (menu.keys && k in menu.keys && !e.repeat) { Sfx.select(); close(menu.keys[k]); }
      return true;
    }
    if (sayR) {
      if (!e.repeat && ['Enter', ' ', 'z', 'x', 'Escape'].includes(k)) { if (finishType) finishType(); else sayR(k === 'Escape' || k === 'x' ? 'esc' : undefined); }
      return true;
    }
    return false;
  }
  function advance() { if (finishType) finishType(); else if (sayR) sayR(); }
  function busy() { return !!(menu || sayR); }

  // ---- Painel do grupo ----
  function buildParty() {
    partyEl.innerHTML = '';
    for (const m of G.party) {
      const d = pdef(m);
      const card = document.createElement('div');
      card.className = 'card'; card.id = 'card-' + m.id;
      card.style.setProperty('--c', d.color);
      // Classic JRPG party strip: the hero's face on the left, name and bars on the right
      const key = Portraits.keyFor(d.name);
      card.innerHTML = `<div class="pfw">${key ? `<img class="pf" src="${Portraits.draw(key).toDataURL()}" alt="">` : ''}<span class="lv"></span></div><div class="info">
        <div class="nm${shortName(d.name).length > 6 ? ' long' : ''}"><span>${esc(shortName(d.name))}</span><img class="dfn" src="${iconUrl('def')}" alt=""></div>
        <div class="cls">${esc(d.cls)}</div>
        <div class="bar hp"><i></i></div><div class="num hpn"></div>
        <div class="bar mp"><i></i></div><div class="num mpn"></div></div>`;
      card.onclick = ev => { if (pickValue(m)) ev.stopPropagation(); };
      card.onmouseenter = () => hoverValue(m);
      partyEl.appendChild(card);
    }
    updateParty();
  }
  function updateParty(activeId) {
    for (const m of G.party) {
      const card = document.getElementById('card-' + m.id); if (!card) continue;
      const mh = maxHp(m), mm = maxMp(m);
      card.querySelector('.lv').textContent = 'Nv ' + m.lv;
      card.querySelector('.hp i').style.width = (100 * m.hp / mh) + '%';
      card.querySelector('.mp i').style.width = (mm ? 100 * m.mp / mm : 0) + '%';
      // low screens hide the labels; three-digit numbers drop the blank column of each glyph, so they fit on one line
      for (const [sel, lbl, v, max] of [['.hpn', 'PV', m.hp, mh], ['.mpn', 'PM', m.mp, mm]]) {
        const el = card.querySelector(sel);
        el.innerHTML = `<b>${lbl} </b>${v}/${max}`; el.classList.toggle('long', `${v}/${max}`.length > 5);
      }
      card.classList.toggle('dead', m.hp <= 0);
      card.classList.toggle('defending', !!m.defending && G.mode === 'battle');
      card.classList.toggle('low', m.hp > 0 && m.hp < mh * 0.3);
      if (activeId !== undefined) card.classList.toggle('active', m.id === activeId);
      const img = card.querySelector('.pf'), mood = cardMood(m.hp, mh, card.classList.contains('active') && G.mode === 'battle');
      if (img && img.dataset.mood !== mood) { img.dataset.mood = mood; img.src = faceUrl(Portraits.keyFor(pdef(m).name), mood); }
    }
  }
  const faceUrls = {};
  const faceUrl = (key, mood) => faceUrls[key + mood] || (faceUrls[key + mood] = Portraits.draw(key, mood).toDataURL());
  function cardFloat(m, text, color) {
    const card = document.getElementById('card-' + m.id); if (!card) return;
    const s = document.createElement('span'); s.className = 'float'; s.textContent = text;
    if (color === 'dmg') s.classList.add('dmg'); else s.style.color = color; // dano: vermelho da paleta com contorno
    card.appendChild(s); setTimeout(() => s.remove(), 950);
  }
  function cardHit(m) {
    const card = document.getElementById('card-' + m.id); if (!card) return;
    card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit');
  }
  function cardGlow(m) {
    const card = document.getElementById('card-' + m.id); if (!card) return;
    card.classList.remove('glow'); void card.offsetWidth; card.classList.add('glow');
  }

  const overlay = document.getElementById('overlay');
  function showOverlay(html, cls = '') { overlay.className = cls; overlay.innerHTML = html; overlay.style.display = 'flex'; }
  function hideOverlay() { overlay.style.display = 'none'; overlay.innerHTML = ''; }

  document.getElementById('screen').addEventListener('click', () => { Sfx.init(); advance(); });
  document.addEventListener('pointerdown', () => Sfx.init(), true); // o tema do título toca também para quem só usa o mouse

  return { say, info, choose, pickValue, hoverValue, markCard, placeBar, handleKey, advance, busy, buildParty, updateParty, cardFloat, cardHit, cardGlow, showOverlay, hideOverlay };
})();
