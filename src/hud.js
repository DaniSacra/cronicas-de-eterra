// ===== HUD: labels that used to be drawn on the canvas, now DOM text on the same type scale =====
// Immediate mode: each frame calls HUD.begin(), then the draw code sets what it needs, then HUD.end()
// hides whatever was not set. DOM is only touched when a value changes.
const HUD = (() => {
  const layer = document.getElementById('hud');     // covers the canvas exactly (sized in layout.js)
  const bar = document.getElementById('hudbar');    // top-left row: place + coins, MUNDO
  const top = document.getElementById('hudtop');    // top-center column: boss bar, turn queue, notes
  const make = (parent, cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; e.hidden = true; parent.appendChild(e); return e; };

  const place = make(bar, 'chip', '<span class="pl"></span><span class="coin"></span><span class="gd"></span>');
  bar.prepend(place);
  const boss = make(top, 'win danger-frame boss', '<div class="nm"></div><div class="bar"><i></i></div>');
  const queue = make(top, 'queue');
  const label = make(top, 'win label');
  const note = make(top, 'win note');
  const compass = make(layer, 'compass');
  const title = make(layer, 'maptitle');
  const all = [place, boss, queue, label, note, compass, title];
  let used = new Set();

  const text = (el, t) => { if (el._t !== t) { el._t = t; el.textContent = t; } };
  const show = el => { used.add(el); if (el.hidden) el.hidden = false; };
  const at = (el, x, y) => { // canvas coordinates → % of the HUD layer
    const k = `${x},${y}`;
    if (el._at !== k) { el._at = k; el.style.left = (100 * x / VW) + '%'; el.style.top = (100 * y / VH) + '%'; }
  };

  return {
    begin() { used = new Set(); },
    end() { for (const el of all) if (!used.has(el) && !el.hidden) el.hidden = true; },
    place(p) {
      if (!p) return;
      text(place.querySelector('.pl'), p.text); text(place.querySelector('.gd'), String(p.gold)); show(place);
    },
    compass(letter, x, y) { text(compass, letter); at(compass, x, y); show(compass); },
    title(t, x, y) { text(title, t); at(title, x, y); show(title); },
    note(t) { text(note, t); show(note); },
    label(t) { text(label, t); show(label); },
    boss(name, frac, enraged) {
      text(boss.querySelector('.nm'), name);
      const w = Math.round(1000 * frac) / 10 + '%', fill = boss.querySelector('i');
      if (fill._w !== w) { fill._w = w; fill.style.width = w; }
      boss.classList.toggle('enraged', !!enraged); show(boss);
    },
    // items: [{ label, color, state: 'done' | 'cur' | 'next' | 'gone' }]; round: number to flash or 0; tag: the tactic running
    queue(items, round, tag = '') {
      const key = items.map(i => i.label + i.state + i.color).join('|') + '#' + round + tag;
      if (queue._k !== key) {
        queue._k = key;
        queue.innerHTML = items.map(i => `<div class="qs ${i.state}${i.state === 'cur' ? ' sel-frame' : ''}"><span>${esc(i.label)}</span><i style="background:${i.color}"></i></div>`).join('') +
          (round ? `<div class="round">Rodada ${round}</div>` : '') + (tag ? `<div class="round tag">${esc(tag)}</div>` : '');
      }
      show(queue);
    },
  };
})();
