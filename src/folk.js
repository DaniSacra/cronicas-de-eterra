// ===== Bonequinhos da vila: chibi de JRPG (cabeça grande, olhos de anime, contorno escuro), um jeito para cada um =====
// Cores e estilo vêm de LOOKS (src/town.js). Campos de estilo, todos opcionais:
//   hairStyle: short | spiky | messy | long | bob | bun | pony | braids | bald     hat: straw | helmet | cap | kerchief | hood | circlet | bandage
//   outfit: armor | vest | overalls      robe (saia/túnica longa) · shorts · cape · shawl · apron · belt · mark (lenço no peito) · trim (barra)
//   beard: full | mustache | stubble     tool: sword | dagger | spear | staff | rake | rod | cane | book | mug | basket | satchel
//   kid (menor) · old (olhos apertados) · blush · eye (cor da íris) · sockets (caveira) · glow (olhos acesos no capuz)
// Visto de lado é desenhado virado para a direita; a esquerda é o espelho.
const Folk = (() => {
  const W = 16, H = 24, FEET = 21, OUT = '#1c1424', cache = {};
  const sh = (col, k) => shadeHex(col, k);

  function draw(key, dir, frame) {
    const L = LOOKS[key] || LOOKS.aldo;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const px = (x, y, w, h, col) => { if (col) { c.fillStyle = col; c.fillRect(x, y, w, h); } };
    const side = dir === 1, back = dir === 0, front = dir === 2;
    const hy = L.kid ? 8 : 5, by = hy + 8, bl = L.kid ? 3 : 5, ly = by + bl; // cabeça, tronco, pernas
    const hair = L.hair, hl = sh(hair, 1.25), hd = sh(hair, 0.72), skin = L.skin, body = L.body;
    const bodyD = sh(body, 0.72), bodyL = sh(body, 1.18);
    const eye = L.eye || '#3a2a3a', dark = '#1e1626';
    const tool = L.tool;

    // ---- Ferramentas compridas atrás do corpo (de costas ficam do outro lado) ----
    const tx = back ? 2 : side ? 11 : 13;
    const longTool = () => {
      if (tool === 'spear') { px(tx, hy - 4, 1, FEET - hy + 4, '#8a5a2a'); px(tx, hy - 5, 1, 1, '#e8eef8'); px(tx - 1, hy - 4, 3, 2, '#c8d0dc'); }
      if (tool === 'staff') { px(tx, hy - 1, 1, FEET - hy + 1, '#7a4a20'); px(tx - 1, hy - 3, 3, 3, L.orb || '#9ae8ff'); px(tx, hy - 3, 1, 1, '#ffffff'); }
      if (tool === 'rake') { px(tx, hy, 1, FEET - hy, '#9a6a3a'); px(tx - 2, hy - 1, 5, 1, '#7a7a82'); px(tx - 2, hy - 2, 1, 1, '#7a7a82'); px(tx, hy - 2, 1, 1, '#7a7a82'); px(tx + 2, hy - 2, 1, 1, '#7a7a82'); }
      if (tool === 'rod') { px(tx, hy - 4, 1, FEET - hy + 3, '#a07040'); if (!back) px(tx + 1, hy - 4, 1, 7, 'rgba(230,240,255,.7)'); }
      if (tool === 'cane') { px(tx, by + 2, 1, FEET - by - 1, '#7a4a20'); px(tx - 1, by + 1, 2, 1, '#7a4a20'); }
    };
    if (back) longTool();

    // ---- Capa de costas: cobre o tronco e desce até perto do chão ----
    if (L.cape && !back) { px(side ? 3 : 3, by, side ? 2 : 10, FEET - by - 1, sh(L.cape, 0.75)); }

    // ---- Pernas ou saia ----
    const shoe = L.shoe || '#3a2418';
    if (L.robe) {
      const sx = side ? 5 : 4, sw = side ? 6 : 8;
      px(sx, ly, sw, FEET - ly, body); px(sx - 1, FEET - 1, sw + 2, 1, body);
      px(sx + sw - 1, ly, 1, FEET - ly, bodyD); px(sx - 1, FEET - 1, sw + 2, 1, bodyD);
      if (L.trim) px(sx - 1, FEET - 2, sw + 2, 1, L.trim);
      if (side) { px(frame ? 9 : 7, FEET, 3, 1, shoe); if (frame) px(4, FEET, 2, 1, shoe); }
      else { px(frame ? 4 : 5, FEET, 2, 1, shoe); px(frame ? 10 : 9, FEET, 2, 1, shoe); }
    } else {
      const leg = (x, len, col) => {
        if (L.shorts) { px(x, ly, 2, 1, col); px(x, ly + 1, 2, len - 1, skin); } else px(x, ly, 2, len, col);
      };
      const n = FEET - ly;
      if (side) {
        if (frame) { leg(5, n, sh(L.legs, 0.8)); leg(9, n, L.legs); px(4, FEET, 3, 1, shoe); px(9, FEET, 3, 1, shoe); }
        else { leg(6, n, sh(L.legs, 0.8)); leg(8, n, L.legs); px(7, FEET, 4, 1, shoe); }
      } else {
        leg(5, frame ? n - 1 : n, L.legs); leg(9, n, sh(L.legs, 0.85));
        px(5, frame ? FEET - 1 : FEET, 2, 1, shoe); px(9, FEET, 2, 1, shoe);
      }
    }

    // ---- Tronco ----
    const tx0 = side ? 5 : 4, tw = side ? 6 : 8;
    px(tx0, by, tw, bl, body); px(tx0, by + bl - 1, tw, 1, bodyD); px(tx0 + tw - 1, by, 1, bl, bodyD);
    if (!back) px(tx0 + 1, by, 1, bl - 1, bodyL);
    if (L.outfit === 'armor') { px(tx0 + 1, by + 1, 2, bl - 2, sh(body, 1.35)); if (!side) { px(3, by, 2, 2, sh(body, 1.2)); px(11, by, 2, 2, sh(body, 1.2)); } }
    if (L.outfit === 'vest' && !back) px(side ? 9 : 6, by, side ? 2 : 4, bl - 1, L.shirt || '#e8e0d0');
    if (L.outfit === 'overalls' && !back) { px(side ? 7 : 5, by + 1, side ? 4 : 6, bl - 1, L.legs); px(side ? 8 : 5, by, 1, 1, L.legs); if (!side) px(10, by, 1, 1, L.legs); }
    if (L.apron && !back) { px(side ? 9 : 5, by + 2, side ? 2 : 6, FEET - by - 3, L.apron); px(side ? 9 : 5, by + 2, side ? 2 : 6, 1, sh(L.apron, 0.85)); }
    if (L.belt && !L.robe) { px(tx0, ly - 1, tw, 1, L.belt); if (front) px(7, ly - 1, 2, 1, '#e8c050'); }
    if (L.belt && L.robe) { px(tx0, by + bl - 2, tw, 1, L.belt); }
    if (L.mark && !back) { px(side ? 8 : 5, by, side ? 3 : 6, 1, L.mark); if (front) px(9, by + 1, 1, 2, L.mark); }
    if (L.shawl) { px(side ? 4 : 3, by, side ? 8 : 10, 2, L.shawl); px(side ? 4 : 3, by + 1, side ? 8 : 10, 1, sh(L.shawl, 0.8)); }
    if (L.cape && back) { px(3, by, 10, FEET - by - 1, L.cape); px(3, by, 10, 1, sh(L.cape, 1.2)); px(12, by, 1, FEET - by - 1, sh(L.cape, 0.75)); }
    if (L.cape && front) { px(3, by, 1, 2, L.cape); px(12, by, 1, 2, L.cape); }
    if (tool === 'satchel') {
      if (front) { for (let i = 0; i < bl - 1; i++) px(5 + i, by + i, 1, 1, '#6a3a1a'); px(10, ly - 2, 3, 3, L.bag || '#8a5a2a'); }
      if (side) px(4, ly - 2, 3, 3, L.bag || '#8a5a2a');
      if (back) { for (let i = 0; i < bl - 1; i++) px(10 - i, by + i, 1, 1, '#6a3a1a'); px(3, ly - 2, 3, 3, L.bag || '#8a5a2a'); }
    }

    // ---- Braços e mãos ----
    const sleeve = L.outfit === 'vest' ? (L.shirt || '#e8e0d0') : sh(body, 0.85);
    if (side) {
      const hx = frame ? 9 : 7;
      px(7, by + 1, 2, bl - 2, sleeve); px(hx, by + bl - 1, 2, 1, sleeve); px(hx, by + bl, 2, 1, skin);
    } else {
      const s = frame ? 1 : 0;
      px(3, by + 1, 1, bl - 1, sleeve); px(12, by + 1, 1, bl - 1, sleeve);
      px(3, by + bl - s, 1, 1, skin); px(12, by + bl - 1 + s, 1, 1, skin);
    }

    // ---- Cabeça ----
    px(5, hy, 6, 8, skin); px(4, hy + 1, 8, 6, skin); px(5, hy + 7, 6, 1, sh(skin, 0.85));
    if (L.sockets) { px(5, hy + 3, 2, 3, dark); px(9, hy + 3, 2, 3, dark); }
    else if (front) {
      if (L.old) { px(5, hy + 5, 2, 1, dark); px(9, hy + 5, 2, 1, dark); }
      else {
        for (const ex of [5, 9]) { px(ex, hy + 4, 2, 2, dark); px(ex, hy + 5, 2, 1, eye); px(ex + (ex === 5 ? 1 : 0), hy + 4, 1, 1, '#ffffff'); }
      }
      px(7, hy + 7, 2, 1, sh(skin, 0.68));
      if (L.blush) { px(4, hy + 6, 1, 1, '#f08890'); px(11, hy + 6, 1, 1, '#f08890'); }
    } else if (side) {
      px(11, hy + 3, 1, 3, skin); // nariz e bochecha
      if (L.old) px(9, hy + 5, 2, 1, dark);
      else { px(9, hy + 4, 2, 2, dark); px(9, hy + 5, 1, 1, eye); px(10, hy + 4, 1, 1, '#ffffff'); }
      if (L.blush) px(10, hy + 6, 1, 1, '#f08890');
    }

    // ---- Cabelo ----
    const st = L.hairStyle || 'short';
    if (st !== 'bald' && st !== 'none') {
      if (back) {
        px(4, hy - 1, 8, 8, hair); px(3, hy, 10, 6, hair); px(5, hy - 1, 3, 1, hl); px(4, hy + 6, 8, 1, hd);
        if (st === 'long') px(4, hy + 6, 8, bl + 1, hair), px(5, hy + bl + 7, 6, 1, hd);
        if (st === 'bob') px(3, hy + 5, 10, 2, hair);
        if (st === 'pony') px(7, hy + 5, 2, bl + 3, hair), px(7, hy + 5, 2, 1, L.tie || '#e04050');
        if (st === 'braids') { px(4, hy + 6, 2, bl + 3, hair); px(10, hy + 6, 2, bl + 3, hair); px(4, hy + bl + 8, 2, 1, L.tie || '#f0f0f0'); px(10, hy + bl + 8, 2, 1, L.tie || '#f0f0f0'); }
      } else if (side) {
        px(4, hy - 1, 7, 3, hair); px(3, hy, 2, 6, hair); px(5, hy + 2, 3, 3, hair); px(10, hy + 1, 2, 2, hair); px(5, hy - 1, 4, 1, hl);
        px(5, hy + 4, 2, 1, hd);
        if (st === 'long') px(3, hy + 4, 3, bl + 3, hair), px(3, hy + bl + 6, 3, 1, hd);
        if (st === 'bob') px(3, hy + 4, 4, 3, hair);
        if (st === 'pony') px(2, hy + 1, 2, bl + 4, hair), px(3, hy + 1, 1, 1, L.tie || '#e04050');
        if (st === 'braids') px(4, hy + 6, 2, bl + 3, hair), px(4, hy + bl + 8, 2, 1, L.tie || '#f0f0f0');
      } else {
        px(4, hy - 1, 8, 3, hair); px(3, hy, 10, 4, hair); px(5, hy - 1, 3, 1, hl);
        px(4, hy + 3, 1, 1, hair); px(5, hy + 2, 2, 2, hair); px(9, hy + 2, 1, 2, hair); px(11, hy + 3, 1, 1, hair); // franja
        px(7, hy + 2, 2, 1, hair);
        if (st === 'long') { px(3, hy + 3, 1, bl + 3, hair); px(12, hy + 3, 1, bl + 3, hair); px(3, hy + bl + 5, 1, 1, hd); px(12, hy + bl + 5, 1, 1, hd); }
        if (st === 'bob') { px(3, hy + 3, 2, 4, hair); px(11, hy + 3, 2, 4, hair); px(3, hy + 6, 2, 1, hd); px(11, hy + 6, 2, 1, hd); }
        if (st === 'pony') { px(12, hy + 1, 2, bl + 3, hair); px(12, hy + 1, 2, 1, L.tie || '#e04050'); }
        if (st === 'braids') { px(2, hy + 4, 2, bl + 3, hair); px(12, hy + 4, 2, bl + 3, hair); px(2, hy + bl + 6, 2, 1, L.tie || '#f0f0f0'); px(12, hy + bl + 6, 2, 1, L.tie || '#f0f0f0'); }
      }
      if (st === 'spiky') { for (const [x, y] of [[4, -2], [6, -3], [7, -2], [9, -3], [10, -2], [12, -1], [2, 1], [13, 1]]) px(side && x > 10 ? x - 2 : x, hy + y, 1, 1, hair); px(6, hy - 2, 1, 1, hl); }
      if (st === 'messy') { px(8, hy - 2, 1, 1, hair); px(9, hy - 3, 1, 1, hair); px(5, hy - 2, 1, 1, hair); }
      if (st === 'bun') { px(6, hy - 3, 4, 3, hair); px(7, hy - 3, 1, 1, hl); px(6, hy - 1, 4, 1, hd); }
    } else if (st === 'bald') {
      px(6, hy, 2, 1, sh(skin, 1.12));
      if (front || back) { px(3, hy + 2, 2, 3, hair); px(11, hy + 2, 2, 3, hair); } else px(4, hy + 2, 3, 3, hair);
      if (back) px(4, hy + 3, 8, 3, hair);
    }

    // ---- Barba ----
    if (L.beard && !back) {
      const bx = side ? 8 : 5, bw = side ? 4 : 6;
      if (L.beard === 'full') { px(bx, hy + 5, bw, 3, hair); px(bx + 1, hy + 8, bw - 2, 1, hair); px(side ? 9 : 7, hy + 6, 2, 1, sh(skin, 0.6)); }
      if (L.beard === 'mustache') px(side ? 9 : 6, hy + 6, side ? 3 : 4, 1, hair);
      if (L.beard === 'stubble') for (const x of side ? [8, 10] : [5, 7, 9, 10]) px(x, hy + 7, 1, 1, sh(skin, 0.75));
    }

    // ---- Chapéus ----
    const h = L.hat, hc = L.hatCol || '#a0a8b8';
    if (h === 'straw') { px(2, hy + 1, 12, 1, hc); px(3, hy + 2, 10, 1, sh(hc, 0.7)); px(5, hy - 2, 6, 3, hc); px(5, hy, 6, 1, L.band || '#a04a20'); px(6, hy - 2, 2, 1, sh(hc, 1.15)); }
    if (h === 'helmet') { px(4, hy - 2, 8, 4, hc); px(3, hy, 10, 2, hc); px(3, hy + 2, 10, 1, sh(hc, 0.7)); px(5, hy - 1, 2, 2, sh(hc, 1.3)); if (front) px(7, hy + 2, 2, 2, sh(hc, 0.8)); if (L.plume) px(7, hy - 4, 2, 2, L.plume); }
    if (h === 'cap') { px(4, hy - 2, 8, 3, hc); px(3, hy + 1, 10, 1, sh(hc, 0.75)); px(7, hy - 3, 2, 1, '#f0f0f0'); px(5, hy - 2, 2, 1, sh(hc, 1.2)); }
    if (h === 'kerchief') { px(4, hy - 2, 8, 2, hc); px(3, hy, 10, 3, hc); if (!back) { px(3, hy + 3, 1, 3, hc); px(12, hy + 3, 1, 3, hc); } else px(5, hy + 3, 6, 3, hc); px(5, hy - 2, 2, 1, sh(hc, 1.2)); }
    if (h === 'hood') {
      px(4, hy - 2, 8, 2, hc); px(3, hy, 10, 8, hc); px(5, hy - 2, 3, 1, sh(hc, 1.2));
      if (front) { px(5, hy + 2, 6, 6, '#120c18'); px(6, hy + 4, 1, 1, L.glow || '#ff3040'); px(9, hy + 4, 1, 1, L.glow || '#ff3040'); }
      if (side) { px(8, hy + 2, 4, 6, '#120c18'); px(10, hy + 4, 1, 1, L.glow || '#ff3040'); }
    }
    if (h === 'circlet' && !back) { px(4, hy + 1, 8, 1, '#f0c040'); if (front) px(7, hy + 1, 2, 1, L.gem || '#40c0ff'); }
    if (h === 'bandage') { px(4, hy + 1, 8, 1, '#f4f0e8'); if (!back) px(side ? 9 : 9, hy + 1, 1, 1, '#c04040'); }

    // ---- Coisas na mão (na frente do corpo) ----
    if (!back) {
      longTool();
      const hx = side ? 10 : 11, hyy = by + bl - 2;
      if (tool === 'sword') { if (side) { px(4, ly - 1, 1, 4, '#5a3a20'); px(3, ly - 2, 3, 1, '#e8c050'); } else { px(12, ly - 1, 1, 4, '#5a3a20'); px(11, ly - 2, 3, 1, '#e8c050'); } }
      if (tool === 'dagger') px(side ? 5 : 4, ly - 1, 1, 3, '#c8d0dc');
      if (tool === 'book') { px(hx - 1, hyy, 3, 3, L.book || '#8a2a2a'); px(hx - 1, hyy, 3, 1, '#f0e8d0'); }
      if (tool === 'mug') { px(hx + 1, hyy, 2, 3, '#8a5a2a'); px(hx + 1, hyy - 1, 2, 1, '#f8f4e8'); px(hx + 3, hyy + 1, 1, 1, '#8a5a2a'); }
      if (tool === 'basket') { px(hx, hyy + 1, 4, 3, '#b08040'); px(hx, hyy + 1, 4, 1, '#d8a860'); px(hx + 1, hyy, 2, 1, '#e05a6a'); }
    }
    return cv;
  }

  // Contorno escuro de 1px em volta do boneco e sombra oval no chão
  function finish(fig, mirror) {
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const o = out.getContext('2d');
    o.fillStyle = 'rgba(0,0,0,.28)'; o.fillRect(4, FEET, 8, 2); o.fillRect(3, FEET + 1, 10, 1);
    const src = fig.getContext('2d').getImageData(0, 0, W, H).data;
    const ln = document.createElement('canvas'); ln.width = W; ln.height = H;
    const lc = ln.getContext('2d'), id = lc.createImageData(W, H), [R, G2, B] = [0x1c, 0x14, 0x24];
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] > 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (op(x, y) || !(op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) continue;
      const i = (y * W + x) * 4; id.data[i] = R; id.data[i + 1] = G2; id.data[i + 2] = B; id.data[i + 3] = 255;
    }
    lc.putImageData(id, 0, 0);
    if (mirror) { o.translate(W, 0); o.scale(-1, 1); }
    o.drawImage(ln, 0, 0); o.drawImage(fig, 0, 0);
    return out;
  }

  // dir: 0 costas · 1 direita · 2 frente · 3 esquerda
  function sprite(key, dir, frame) {
    const k = `${key}|${dir}|${frame}`;
    return cache[k] || (cache[k] = finish(draw(key, dir === 3 ? 1 : dir, frame), dir === 3));
  }
  return { sprite, OUT };
})();
