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
  let menu = null, sayR = null, sayTimer = null, typeT = null, finishType = null, hideT = null;

  // Janela de texto dentro da cena: abre quando há fala ou menu, fecha sozinha quando o jogo fica livre
  function open() { clearTimeout(hideT); dialogEl.classList.add('open'); gameEl.classList.add('talking'); }
  function closeSoon() {
    clearTimeout(hideT);
    hideT = setTimeout(() => {
      if (menu || sayR || G.mode === 'battle') return;
      dialogEl.classList.remove('open'); gameEl.classList.remove('talking');
    }, 80);
  }

  // Quem fala: nome em dourado e retrato na janela de cima (src/portraits.js); narração fica sem retrato
  function setSpeaker(name) {
    speakerEl.textContent = name || '';
    const key = Portraits.keyFor(name);
    dialogEl.classList.toggle('has-face', !!key);
    if (!key) return;
    const fc = faceEl.getContext('2d');
    fc.imageSmoothingEnabled = false; fc.clearRect(0, 0, 32, 32); fc.drawImage(Portraits.draw(key), 0, 0);
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
  function clearMenu() { menuEl.innerHTML = ''; menuEl.classList.remove('icons'); }

  function say(text, opts = {}) {
    clearMenu();
    const m = /^([^\n:]{1,28}):\n([\s\S]+)$/.exec(text);
    setSpeaker(m ? m[1] : null); open();
    return new Promise(res => {
      setText(m ? m[2] : text, !opts.auto, !!opts.auto);
      sayR = () => { clearTimeout(sayTimer); sayR = null; closeSoon(); res(); };
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

  function choose(opts, o = {}) {
    return new Promise(res => {
      if (o.title !== undefined) { setSpeaker(null); setText(o.title, false, true); }
      open();
      let sel = opts.findIndex(x => !x.disabled); if (sel < 0) sel = 0;
      menu = { opts, sel, res, cancel: !!o.cancel, cols: o.cols || 2, onHover: o.onHover, icons: !!o.icons };
      render(); hover();
    });
  }
  function render() {
    menuEl.style.gridTemplateColumns = menu.icons ? `repeat(${menu.cols},auto)` : `repeat(${menu.cols},1fr)`;
    menuEl.classList.toggle('icons', menu.icons);
    menuEl.innerHTML = '';
    menu.opts.forEach((op, i) => {
      const d = document.createElement('div');
      d.className = 'opt' + (i === menu.sel ? ' sel' : '') + (op.disabled ? ' dis' : '');
      d.innerHTML = op.icon ? `<img src="${iconUrl(op.icon, iconState(op, i === menu.sel))}" alt=""><span>${esc(op.label)}</span>`
        : esc(op.label) + (op.hint ? `<small>${esc(op.hint)}</small>` : '');
      d.onmouseenter = () => { if (!menu || menu.sel === i) return; menu.sel = i; update(); };
      d.onclick = ev => { ev.stopPropagation(); if (!menu) return; menu.sel = i; pick(); };
      menuEl.appendChild(d);
    });
  }
  // Icon states follow the cursor: normal, selected (gold halo), disabled (grey)
  const iconState = (op, sel) => op.disabled ? 'dis' : sel ? 'sel' : 'normal';
  function update() {
    [...menuEl.children].forEach((c, i) => {
      c.classList.toggle('sel', i === menu.sel);
      const op = menu.opts[i], img = op.icon && c.querySelector('img');
      if (img) img.src = iconUrl(op.icon, iconState(op, i === menu.sel));
    }); menuEl.children[menu.sel]?.scrollIntoView({ block: 'nearest' }); hover(); }
  function hover() { menu.onHover && menu.onHover(menu.opts[menu.sel].value); }
  function close(v) { const m = menu; menu = null; clearMenu(); closeSoon(); m.onHover && m.onHover(null); m.res(v); }
  function pick() { const op = menu.opts[menu.sel]; if (op.disabled) { Sfx.bump(); return; } Sfx.select(); close(op.value); }
  function cancel() { if (!menu.cancel) return; Sfx.cancel(); close(null); }
  function move(d) {
    const n = menu.opts.length;
    let s = menu.sel + d;
    if (s < 0 || s >= n) return;
    menu.sel = s; Sfx.cursor(); update();
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
      return true;
    }
    if (sayR) {
      if (!e.repeat && ['Enter', ' ', 'z', 'x', 'Escape'].includes(k)) { if (finishType) finishType(); else sayR(); }
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
      card.innerHTML = `<div class="nm"><span>${esc(d.name)}</span><span class="lv"></span></div>
        <div class="cls">${esc(d.cls)}</div>
        <div class="bar hp"><i></i></div><div class="num hpn"></div>
        <div class="bar mp"><i></i></div><div class="num mpn"></div>`;
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
      card.querySelector('.hpn').textContent = `PV ${m.hp}/${mh}`;
      card.querySelector('.mpn').textContent = `PM ${m.mp}/${mm}`;
      card.classList.toggle('dead', m.hp <= 0);
      card.classList.toggle('low', m.hp > 0 && m.hp < mh * 0.3);
      if (activeId !== undefined) card.classList.toggle('active', m.id === activeId);
    }
  }
  function cardFloat(m, text, color) {
    const card = document.getElementById('card-' + m.id); if (!card) return;
    const s = document.createElement('span'); s.className = 'float'; s.textContent = text; s.style.color = color;
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

  return { say, info, choose, handleKey, advance, busy, buildParty, updateParty, cardFloat, cardHit, cardGlow, showOverlay, hideOverlay };
})();
