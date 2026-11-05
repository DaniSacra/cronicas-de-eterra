// ===== Heróis: tela com atributos, equipamento de cada herói e a bolsa do grupo =====
// Abre pelo menu (Esc → Heróis). Setas ←/→ trocam de herói; Esc, Enter ou "Fechar" saem.
const HeroView = (() => {
  let root, open = false, cur = 0, done = null;

  // Equipamentos que o grupo já achou: baús abertos cujo conteúdo é um equipamento (vale para saves antigos)
  function ownedEquips() {
    const ids = [];
    for (let f = 0; f < FLOORS.length; f++) for (const o of getMap(f).objects)
      if (o.type === 'chest' && EQUIPS[o.loot] && G.opened[`${f}:${o.x},${o.y}`]) ids.push(o.loot);
    return ids;
  }
  const face = id => { const key = Portraits.keyFor(heroName(id)); return key ? Portraits.draw(key).toDataURL() : ''; };
  const icon = (id, st) => `<img class="hv-ico" src="${iconUrl(id, st)}" alt="">`;

  function build() {
    root = document.createElement('div');
    root.id = 'heroview';
    root.innerHTML = `<div class="hv-head win"><span>Heróis</span><button class="hv-close">✕ Fechar</button></div>
      <div class="hv-tabs"></div><div class="hv-hero win"></div><div class="hv-bag win"></div>`;
    document.getElementById('screen').appendChild(root);
    root.querySelector('.hv-close').onclick = ev => { ev.stopPropagation(); close(); };
    root.addEventListener('click', ev => ev.stopPropagation());
  }

  function render() {
    const owned = ownedEquips();
    root.querySelector('.hv-tabs').innerHTML = G.party.map((m, i) =>
      `<button class="hv-tab${i === cur ? ' sel-frame' : ''}" data-i="${i}" style="--c:${pdef(m).color}"><img src="${face(m.id)}" alt=""><span>${esc(pdef(m).name)}</span></button>`).join('');
    root.querySelectorAll('.hv-tab').forEach(b => b.onclick = ev => { ev.stopPropagation(); pick(+b.dataset.i); });

    const m = G.party[cur], d = pdef(m), dead = m.hp <= 0;
    const st = k => { const b = m.bonus[k] || 0; return `<div><b>${STAT_NAMES[k]}</b> ${stat(m, k)}${b ? `<em>+${b}</em>` : ''}</div>`; };
    const gear = heroGear(m.id, owned, EQUIPS).map(s => `<div class="hv-slot"><div class="hv-box slot-frame">${s.items.length ? icon(s.items.at(-1).icon) : ''}</div>
        <div><small>${s.label}</small>${s.items.length ? s.items.map(it => `<p>${esc(it.name)} <em>${bonusText(it.bonus, STAT_NAMES)}</em></p>`).join('')
          : '<p class="dim">Equipamento de viagem</p>'}</div></div>`).join('');
    const spells = knownSpells(m);
    root.querySelector('.hv-hero').innerHTML = `
      <div class="hv-id"><img class="hv-face slot-frame" src="${face(m.id)}" alt="">
        <div><h3 style="color:color-mix(in srgb, ${d.color} 62%, #2a1206)">${esc(d.name)}</h3><p>${esc(d.cls)} · Nível ${m.lv}</p><p class="dim">XP ${m.xp}/${xpNext(m.lv)}</p>${dead ? '<p class="hv-ko">Caído</p>' : ''}</div></div>
      <div class="hv-bars"><div>PV ${m.hp}/${maxHp(m)}</div><div class="bar"><i style="width:${100 * m.hp / maxHp(m)}%"></i></div>
        <div>PM ${m.mp}/${maxMp(m)}</div><div class="bar mp"><i style="width:${maxMp(m) ? 100 * m.mp / maxMp(m) : 0}%"></i></div></div>
      <div class="hv-stats">${['atk', 'def', 'mag', 'agi'].map(st).join('')}</div>
      <div class="hv-gear">${gear}</div>
      ${spells.length ? `<div class="hv-spells"><small>${esc(d.skillWord)}</small><p>${spells.map(s => esc(SPELLS[s].name)).join(' · ')}</p></div>` : ''}`;

    const items = Object.keys(ITEMS).filter(k => G.inv[k] > 0), keys = Object.keys(KEY_ITEMS).filter(k => G.key[k]);
    const cell = (ic, name, n, desc) => `<div class="hv-item" title="${esc(desc)}"><div class="hv-box slot-frame">${icon(ic)}${n ? `<b>${n}</b>` : ''}</div><span>${esc(name)}</span></div>`;
    root.querySelector('.hv-bag').innerHTML = `<h4>Bolsa do grupo · ${G.gold} moedas</h4>` +
      (items.length || keys.length
        ? `<div class="hv-items">${items.map(k => cell(k, ITEMS[k].name, G.inv[k], ITEMS[k].desc)).join('')}${keys.map(k => {
            const ki = KEY_ITEMS[k], nm = G.key.lida || !ki.sealedName ? ki.name : ki.sealedName;
            return cell(ICON_ART[k] ? k : 'carta', nm, 0, ki.desc);
          }).join('')}</div>`
        : '<p class="dim">A bolsa está vazia.</p>');
  }
  function pick(i) { if (i < 0 || i >= G.party.length || i === cur) return; cur = i; Sfx.cursor(); render(); }

  function show() {
    if (!root) build();
    open = true; cur = Math.min(cur, G.party.length - 1); root.classList.add('open'); render(); Sfx.select();
    return new Promise(res => { done = res; });
  }
  function close() {
    if (!open) return;
    open = false; root.classList.remove('open'); Sfx.cancel();
    const d = done; done = null; d && d();
  }
  function key(k) {
    if (k === 'ArrowLeft' || k === 'a') pick(cur - 1);
    else if (k === 'ArrowRight' || k === 'd') pick(cur + 1);
    else if (['Escape', 'Enter', ' ', 'x', 'Backspace'].includes(k)) close();
  }
  return { show, close, key, isOpen: () => open };
})();
