// ===== Sprites desenhados proceduralmente em canvas =====

const Sprites = (() => {
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ell(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function rg(c, x, y, r, stops) { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function lg(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function poly(c, pts, fill, stroke, lw = 1) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function line(c, pts, color, lw) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  const shadow = (c, x, y, rx) => ell(c, x, y, rx, rx * 0.18, 'rgba(0,0,0,.45)');

  const draw = {
    slime(c, p) {
      shadow(c, 32, 59, 26);
      c.beginPath(); c.moveTo(6, 58); c.bezierCurveTo(2, 30, 18, 12, 32, 12); c.bezierCurveTo(46, 12, 62, 30, 58, 58); c.closePath();
      c.fillStyle = rg(c, 26, 28, 42, [[0, p.light], [0.45, p.base], [1, p.dark]]); c.fill();
      c.strokeStyle = p.dark; c.lineWidth = 1.5; c.stroke();
      ell(c, 21, 25, 6, 4, 'rgba(255,255,255,.65)');
      ell(c, 24, 38, 5, 6, '#fff'); ell(c, 40, 38, 5, 6, '#fff');
      ell(c, 25, 40, 2.5, 3.5, '#111'); ell(c, 41, 40, 2.5, 3.5, '#111');
      c.beginPath(); c.arc(32, 46, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = '#123'; c.lineWidth = 2; c.stroke();
    },
    bat(c, p) {
      shadow(c, 32, 60, 14);
      for (const s of [-1, 1]) {
        poly(c, [32, 30, 32 + s * 10, 16, 32 + s * 30, 8, 32 + s * 28, 20, 32 + s * 31, 33, 32 + s * 22, 29, 32 + s * 18, 40, 32 + s * 11, 33],
          lg(c, 32, 8, 32, 40, [[0, p.light], [1, p.dark]]), p.dark, 1);
        line(c, [32 + s * 10, 18, 32 + s * 22, 29], p.dark, 0.8);
        line(c, [32 + s * 10, 18, 32 + s * 28, 20], p.dark, 0.8);
        poly(c, [32 + s * 4, 26, 32 + s * 7, 16, 32 + s * 9, 25], p.base);
      }
      ell(c, 32, 32, 9, 11, rg(c, 30, 28, 12, [[0, p.light], [1, p.base]]));
      ell(c, 28, 30, 2.4, 2.4, p.eye); ell(c, 36, 30, 2.4, 2.4, p.eye);
      poly(c, [29, 37, 30.5, 42, 32, 37], '#fff'); poly(c, [32, 37, 33.5, 42, 35, 37], '#fff');
    },
    rat(c, p) {
      shadow(c, 32, 59, 26);
      c.beginPath(); c.moveTo(12, 48); c.bezierCurveTo(-2, 46, 2, 26, 10, 22);
      c.strokeStyle = '#c99a8a'; c.lineWidth = 2.5; c.lineCap = 'round'; c.stroke();
      c.fillStyle = p.dark; c.fillRect(16, 52, 6, 7); c.fillRect(36, 52, 6, 7);
      ell(c, 30, 44, 20, 13, rg(c, 26, 36, 26, [[0, p.light], [0.6, p.base], [1, p.dark]]));
      ell(c, 48, 38, 11, 9, p.base);
      poly(c, [53, 32, 63, 40, 53, 45], p.base);
      ell(c, 62, 40, 1.8, 1.8, '#e88');
      ell(c, 44, 28, 5, 6, p.light); ell(c, 44, 28, 2.5, 3.5, '#d99');
      ell(c, 51, 35, 2.1, 2.1, p.eye);
      c.fillStyle = '#fff'; c.fillRect(56, 43, 2, 3);
      line(c, [58, 39, 64, 36], '#ddd', 0.6); line(c, [58, 41, 64, 42], '#ddd', 0.6);
    },
    skeleton(c, p) {
      shadow(c, 32, 60, 16);
      line(c, [28, 40, 24, 51, 24, 60], p.base, 3); line(c, [36, 40, 40, 51, 40, 60], p.base, 3);
      ell(c, 32, 40, 7, 3, p.base);
      line(c, [32, 22, 32, 40], p.base, 3);
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.ellipse(32, 25 + i * 3.6, 8 - i, 2.2, 0, 0, Math.PI);
        c.strokeStyle = p.base; c.lineWidth = 1.8; c.stroke();
      }
      line(c, [24, 24, 18, 34, 22, 43], p.base, 2.5);
      line(c, [40, 24, 47, 32, 52, 26], p.base, 2.5);
      line(c, [52, 27, 59, 3], '#c0c8d8', 2.5); line(c, [48, 25, 56, 29], '#8a6a30', 2);
      ell(c, 32, 13, 8, 8, p.light);
      c.fillStyle = p.base; c.fillRect(27, 16, 10, 6);
      ell(c, 29, 12, 2.4, 2.8, '#111'); ell(c, 35, 12, 2.4, 2.8, '#111');
      ell(c, 29, 12.5, 1, 1, p.eye); ell(c, 35, 12.5, 1, 1, p.eye);
      for (let i = 0; i < 4; i++) line(c, [28.5 + i * 2.3, 18, 28.5 + i * 2.3, 21], p.dark, 0.7);
    },
    spider(c, p) {
      shadow(c, 32, 59, 28);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const y0 = 32 + i * 3;
        const pts = [32, y0, 32 + s * (16 + i * 2), y0 - 14 + i * 3, 32 + s * (24 + i * 2), 56 + (i % 2) * 2];
        line(c, pts, p.dark, 3); line(c, pts, p.base, 1.2);
      }
      ell(c, 32, 26, 15, 13, rg(c, 28, 20, 18, [[0, p.light], [0.6, p.base], [1, p.dark]]));
      poly(c, [28, 20, 36, 20, 32, 26], '#c02020'); poly(c, [28, 32, 36, 32, 32, 26], '#c02020');
      ell(c, 32, 41, 9, 7, p.base);
      [[28, 38], [36, 38], [30, 41], [34, 41], [26, 40.5], [38, 40.5]].forEach(([x, y]) => ell(c, x, y, 1.4, 1.4, p.eye));
      line(c, [30, 46, 29, 51], '#ddd', 1.5); line(c, [34, 46, 35, 51], '#ddd', 1.5);
    },
    goblin(c, p) {
      shadow(c, 32, 60, 18);
      c.fillStyle = '#4a3020'; c.fillRect(25, 46, 5, 12); c.fillRect(34, 46, 5, 12);
      c.fillStyle = '#2a1a10'; c.fillRect(23, 57, 8, 3); c.fillRect(33, 57, 8, 3);
      poly(c, [22, 30, 42, 30, 46, 50, 18, 50], '#7a4a2a', '#3a2414');
      c.fillStyle = '#3a2414'; c.fillRect(20, 40, 24, 3);
      ell(c, 18, 36, 4, 8, p.base); ell(c, 46, 36, 4, 8, p.base);
      line(c, [47, 60, 56, 4], '#8a6a40', 2.2);
      poly(c, [56, 0, 52.5, 9, 59.5, 9], '#d0d8e0');
      ell(c, 32, 20, 11, 10, rg(c, 29, 16, 14, [[0, p.light], [1, p.base]]));
      poly(c, [23, 16, 8, 10, 23, 24], p.base, p.dark); poly(c, [41, 16, 56, 10, 41, 24], p.base, p.dark);
      ell(c, 28, 19, 2.4, 2, p.eye); ell(c, 36, 19, 2.4, 2, p.eye);
      ell(c, 28.5, 19, 1, 1.4, '#000'); ell(c, 36.5, 19, 1, 1.4, '#000');
      c.fillStyle = '#311'; c.fillRect(27, 25, 10, 2.5);
      poly(c, [28, 25, 29, 28, 30, 25], '#fff'); poly(c, [34, 25, 35, 28, 36, 25], '#fff');
    },
    knight(c, p) {
      shadow(c, 32, 60, 20);
      c.fillStyle = lg(c, 0, 44, 0, 60, [[0, p.light], [1, p.dark]]); c.fillRect(24, 44, 7, 16); c.fillRect(33, 44, 7, 16);
      poly(c, [18, 22, 46, 22, 42, 46, 22, 46], lg(c, 18, 22, 46, 46, [[0, p.light], [0.5, p.base], [1, p.dark]]), p.dark);
      c.fillStyle = '#222'; c.fillRect(22, 42, 20, 3);
      ell(c, 18, 24, 7, 5, p.light); ell(c, 46, 24, 7, 5, p.light);
      line(c, [50, 32, 59, 2], '#d0d4e0', 3); line(c, [46, 32, 55, 31], '#c9a227', 2.5);
      poly(c, [5, 26, 21, 26, 21, 40, 13, 49, 5, 40], '#5a1a1a', p.light, 1.5);
      ell(c, 13, 35, 3, 3, '#c9a227');
      c.beginPath(); c.moveTo(32, 2); c.bezierCurveTo(44, -2, 48, 6, 40, 12); c.lineTo(34, 7); c.fillStyle = '#a01818'; c.fill();
      c.fillStyle = lg(c, 23, 5, 41, 23, [[0, p.light], [1, p.base]]);
      c.beginPath(); c.moveTo(23, 23); c.lineTo(23, 11); c.quadraticCurveTo(32, 2, 41, 11); c.lineTo(41, 23); c.closePath(); c.fill();
      c.fillStyle = '#000'; c.fillRect(25, 13, 14, 3.5);
      c.fillStyle = p.eye; c.fillRect(27, 14, 3, 1.5); c.fillRect(34, 14, 3, 1.5);
    },
    ghost(c, p) {
      c.globalAlpha = 0.88;
      c.beginPath(); c.moveTo(12, 34); c.bezierCurveTo(10, 4, 54, 4, 52, 34); c.lineTo(54, 54);
      for (let i = 0; i < 5; i++) { const x0 = 54 - i * 8.4; c.quadraticCurveTo(x0 - 4.2, 62 - (i % 2) * 6, x0 - 8.4, 54); }
      c.closePath();
      c.fillStyle = lg(c, 0, 6, 0, 62, [[0, p.light], [0.5, p.base], [1, p.dark]]); c.fill();
      c.globalAlpha = 1;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(32 + s * 18, 30); c.quadraticCurveTo(32 + s * 30, 34, 32 + s * 28, 44); c.quadraticCurveTo(32 + s * 22, 38, 32 + s * 17, 40);
        c.fillStyle = p.base; c.fill();
      }
      ell(c, 25, 26, 4.5, 6.5, '#0a1020'); ell(c, 39, 26, 4.5, 6.5, '#0a1020');
      c.shadowColor = p.eye; c.shadowBlur = 6;
      ell(c, 25, 27, 1.6, 2.2, p.eye); ell(c, 39, 27, 1.6, 2.2, p.eye);
      c.shadowBlur = 0;
      ell(c, 32, 39, 4, 6, '#0a1020');
    },
    golem(c, p) {
      shadow(c, 32, 60, 26);
      const stone = lg(c, 0, 6, 0, 60, [[0, p.light], [1, p.dark]]);
      c.fillStyle = stone;
      c.fillRect(18, 46, 11, 14); c.fillRect(35, 46, 11, 14);
      c.fillRect(13, 19, 38, 29); c.fillRect(24, 6, 16, 14);
      c.fillRect(3, 21, 10, 24); c.fillRect(51, 21, 10, 24);
      c.fillRect(1, 43, 13, 10); c.fillRect(50, 43, 13, 10);
      c.strokeStyle = p.dark; c.lineWidth = 1.2;
      [[18, 46, 11, 14], [35, 46, 11, 14], [13, 19, 38, 29], [24, 6, 16, 14], [3, 21, 10, 24], [51, 21, 10, 24], [1, 43, 13, 10], [50, 43, 13, 10]]
        .forEach(r => c.strokeRect(...r));
      line(c, [16, 24, 22, 30, 20, 38], p.dark, 1); line(c, [46, 22, 42, 30, 47, 40], p.dark, 1); line(c, [6, 26, 10, 34], p.dark, 1);
      c.shadowColor = p.eye; c.shadowBlur = 10;
      ell(c, 32, 33, 4.5, 4.5, p.eye);
      c.fillStyle = p.eye; c.fillRect(27, 12, 3.5, 2.2); c.fillRect(34, 12, 3.5, 2.2);
      c.shadowBlur = 0;
    },
    lich(c, p) {
      ell(c, 64, 62, 62, 54, rg(c, 64, 62, 62, [[0, 'rgba(90,255,150,.28)'], [1, 'rgba(0,0,0,0)']]));
      line(c, [116, 14, 108, 110], '#5a3a1a', 4);
      // manto
      c.beginPath(); c.moveTo(64, 24); c.lineTo(32, 42); c.lineTo(18, 106);
      for (let i = 0; i < 8; i++) c.lineTo(18 + (i + 0.5) * 11.5, 100 + (i % 2 ? 0 : 10)), c.lineTo(18 + (i + 1) * 11.5, 106);
      c.lineTo(96, 42); c.closePath();
      c.fillStyle = lg(c, 0, 24, 0, 110, [[0, p.light], [0.45, p.base], [1, p.dark]]); c.fill();
      c.strokeStyle = p.dark; c.lineWidth = 1.5; c.stroke();
      line(c, [64, 44, 64, 104], p.dark, 1.2);
      c.strokeStyle = '#d4a72c'; c.lineWidth = 2; c.beginPath(); c.arc(64, 40, 18, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
      // mangas
      poly(c, [36, 44, 14, 70, 24, 78, 42, 58], p.base, p.dark, 1.2);
      poly(c, [92, 44, 112, 66, 104, 76, 86, 58], p.base, p.dark, 1.2);
      line(c, [18, 76, 12, 84], '#e8e0c8', 1.5); line(c, [20, 77, 18, 86], '#e8e0c8', 1.5); line(c, [22, 77, 23, 85], '#e8e0c8', 1.5);
      line(c, [106, 72, 112, 74, 114, 70], '#e8e0c8', 1.6);
      // orbe
      c.shadowColor = p.eye; c.shadowBlur = 14;
      ell(c, 116, 12, 7, 7, rg(c, 114, 10, 8, [[0, '#eaffef'], [0.4, p.eye], [1, '#106030']]));
      c.shadowBlur = 0;
      // capuz e crânio
      c.beginPath(); c.moveTo(42, 46); c.quadraticCurveTo(44, 6, 64, 6); c.quadraticCurveTo(84, 6, 86, 46); c.closePath();
      c.fillStyle = p.dark; c.fill();
      ell(c, 64, 30, 11, 12, '#e8e0c8');
      c.fillStyle = '#e8e0c8'; c.fillRect(58, 36, 12, 7);
      ell(c, 59, 29, 3.2, 3.6, '#000'); ell(c, 69, 29, 3.2, 3.6, '#000');
      c.shadowColor = p.eye; c.shadowBlur = 8;
      ell(c, 59, 29.5, 1.6, 1.6, p.eye); ell(c, 69, 29.5, 1.6, 1.6, p.eye);
      c.shadowBlur = 0;
      poly(c, [64, 32, 62, 36, 66, 36], '#222');
      for (let i = 0; i < 5; i++) line(c, [59.5 + i * 2.2, 38, 59.5 + i * 2.2, 42], '#555', 0.8);
      poly(c, [52, 22, 53, 10, 58, 17, 64, 4, 70, 17, 75, 10, 76, 22], '#d4a72c', '#8a6a10', 1);
      ell(c, 64, 15, 1.8, 1.8, '#e33');
    },
    bellringer(c, p) { // o Sineiro: esqueleto de batina rasgada, sino de bronze numa mão, corda enrolada no braço
      ell(c, 64, 64, 60, 50, rg(c, 64, 64, 60, [[0, 'rgba(160,210,255,.22)'], [1, 'rgba(0,0,0,0)']]));
      line(c, [100, 0, 100, 36, 92, 52, 96, 64], '#8a6a3a', 2.5);
      c.beginPath(); c.moveTo(64, 26); c.lineTo(36, 44); c.lineTo(24, 106);
      for (let i = 0; i < 7; i++) c.lineTo(24 + (i + 0.5) * 11.4, 98 + (i % 2 ? 0 : 9)), c.lineTo(24 + (i + 1) * 11.4, 106);
      c.lineTo(92, 44); c.closePath();
      c.fillStyle = lg(c, 0, 26, 0, 110, [[0, p.light], [0.5, p.base], [1, p.dark]]); c.fill();
      c.strokeStyle = p.dark; c.lineWidth = 1.5; c.stroke();
      line(c, [57, 42, 53, 98], '#8a7a52', 4); line(c, [71, 42, 75, 98], '#8a7a52', 4);   // estola desbotada
      poly(c, [38, 46, 20, 70, 28, 76, 44, 58], p.base, p.dark, 1.2);
      line(c, [22, 74, 18, 80], '#e8e0c8', 1.5); line(c, [25, 75, 24, 82], '#e8e0c8', 1.5);
      c.beginPath(); c.moveTo(10, 82); c.quadraticCurveTo(11, 64, 22, 62); c.quadraticCurveTo(33, 64, 34, 82); c.lineTo(39, 88); c.lineTo(5, 88); c.closePath();
      c.fillStyle = lg(c, 6, 62, 38, 88, [[0, '#f0c860'], [0.5, '#b8862a'], [1, '#6a4a14']]); c.fill();
      c.strokeStyle = '#4a3008'; c.lineWidth = 1.2; c.stroke();
      line(c, [9, 80, 35, 80], '#e8b850', 1); ell(c, 22, 91, 3, 3, '#4a3008');
      poly(c, [90, 46, 108, 68, 100, 76, 84, 58], p.base, p.dark, 1.2);
      for (let i = 0; i < 4; i++) line(c, [90 + i * 3, 52 + i * 4, 97 + i * 3, 48 + i * 4], '#8a6a3a', 1.6);
      line(c, [104, 74, 110, 78], '#e8e0c8', 1.5); line(c, [103, 76, 107, 82], '#e8e0c8', 1.5);
      c.beginPath(); c.moveTo(44, 46); c.quadraticCurveTo(46, 8, 64, 8); c.quadraticCurveTo(82, 8, 84, 46); c.closePath();
      c.fillStyle = p.dark; c.fill();
      ell(c, 64, 31, 11, 12, '#e8e0c8'); c.fillStyle = '#e8e0c8'; c.fillRect(58, 37, 12, 7);
      ell(c, 59, 30, 3.4, 4, '#000'); ell(c, 69, 30, 3.4, 4, '#000');
      c.shadowColor = p.eye; c.shadowBlur = 8;
      ell(c, 59, 30.5, 1.5, 1.5, p.eye); ell(c, 69, 30.5, 1.5, 1.5, p.eye);
      c.shadowBlur = 0;
      poly(c, [64, 33, 62, 37, 66, 37], '#222');
      for (let i = 0; i < 5; i++) line(c, [59.5 + i * 2.2, 39, 59.5 + i * 2.2, 43], '#555', 0.8);
    },
    tomb(c) { // túmulo do rei arrombado: tampa caída, interior vazio, símbolos dos paladinos, marcas de arrasto
      shadow(c, 32, 60, 28);
      c.fillStyle = lg(c, 0, 30, 0, 60, [[0, '#9a948a'], [1, '#5a5650']]); c.fillRect(6, 34, 52, 24);
      c.strokeStyle = '#2e2a26'; c.lineWidth = 1; c.strokeRect(6.5, 34.5, 51, 23);
      c.fillStyle = '#120e10'; c.fillRect(10, 34, 44, 6);
      for (const x of [11, 49]) { c.fillStyle = '#d8c890'; c.fillRect(x, 45, 4, 5); c.fillRect(x + 1.5, 42, 1, 9); c.fillStyle = '#1a1416'; c.fillRect(x, 52, 4, 3); }
      c.save(); c.translate(36, 28); c.rotate(-0.35);
      c.fillStyle = lg(c, -26, -5, 26, 5, [[0, '#b0aa9e'], [1, '#6e6a62']]); c.fillRect(-26, -5, 52, 9);
      c.strokeStyle = '#2e2a26'; c.strokeRect(-26, -5, 52, 9);
      c.beginPath(); c.moveTo(-4, -5); c.lineTo(2, 4); c.stroke(); c.restore();
      line(c, [22, 58, 15, 64], '#3a3430', 1.5); line(c, [29, 58, 24, 64], '#3a3430', 1.5);
    },
    chest(c, open) {
      shadow(c, 32, 60, 24);
      c.fillStyle = '#6a3a18'; c.fillRect(12, 38, 40, 21);
      c.strokeStyle = '#3a1e0a'; c.lineWidth = 1;
      for (let y = 44; y < 59; y += 6) { c.beginPath(); c.moveTo(12, y); c.lineTo(52, y); c.stroke(); }
      c.fillStyle = '#c9a227'; c.fillRect(17, 38, 3, 21); c.fillRect(44, 38, 3, 21); c.fillRect(12, 56, 40, 3);
      if (!open) {
        c.beginPath(); c.moveTo(12, 39); c.bezierCurveTo(12, 24, 52, 24, 52, 39); c.closePath();
        c.fillStyle = lg(c, 0, 26, 0, 39, [[0, '#a8682e'], [1, '#7a4620']]); c.fill();
        c.strokeStyle = '#3a1e0a'; c.stroke();
        c.fillStyle = '#c9a227'; c.fillRect(17, 28, 3, 11); c.fillRect(44, 28, 3, 11); c.fillRect(12, 37, 40, 2.5);
        c.fillStyle = '#ffe070'; c.fillRect(29, 35, 6, 7); c.fillStyle = '#000'; c.fillRect(31.5, 37, 1.2, 3);
      } else {
        poly(c, [12, 38, 16, 18, 48, 18, 52, 38], '#7a4620', '#3a1e0a');
        c.fillStyle = '#140a04'; c.fillRect(14, 36, 36, 6);
      }
    },
    fountain(c) {
      ell(c, 32, 34, 30, 30, rg(c, 32, 34, 30, [[0, 'rgba(120,220,255,.35)'], [1, 'rgba(0,0,0,0)']]));
      ell(c, 32, 58, 27, 5, '#3a3e4a');
      c.fillStyle = lg(c, 0, 46, 0, 58, [[0, '#8a90a0'], [1, '#4a505e']]); c.fillRect(5, 46, 54, 12);
      ell(c, 32, 46, 27, 6, '#9aa0b0');
      ell(c, 32, 46, 23, 4.5, rg(c, 32, 46, 23, [[0, '#d0f4ff'], [1, '#3a9ae0']]));
      c.fillStyle = '#7a8090'; c.fillRect(28, 22, 8, 24);
      ell(c, 32, 22, 13, 4, '#9aa0b0'); ell(c, 32, 21, 10, 2.5, '#bff0ff');
      c.strokeStyle = 'rgba(170,230,255,.8)'; c.lineWidth = 1.5;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(32 + s * 9, 21); c.quadraticCurveTo(32 + s * 18, 22, 32 + s * 20, 44); c.stroke(); }
      [[22, 30], [42, 28], [32, 12], [16, 40], [48, 38]].forEach(([x, y]) => ell(c, x, y, 1, 1, '#fff'));
    },
  };

  // Encapuzado: manto em sino, rosto na sombra, olho cortado bordado e lâmina curva
  draw.hooded = (c, p) => {
    shadow(c, 32, 60, 18);
    c.beginPath(); c.moveTo(32, 5); c.quadraticCurveTo(19, 13, 18, 30); c.lineTo(10, 58); c.lineTo(54, 58); c.lineTo(46, 30); c.quadraticCurveTo(45, 13, 32, 5); c.closePath();
    c.fillStyle = lg(c, 0, 5, 0, 58, [[0, p.light], [0.5, p.base], [1, p.dark]]); c.fill();
    c.strokeStyle = p.dark; c.lineWidth = 1.5; c.stroke();
    ell(c, 32, 22, 7, 8, '#0c0a10');
    ell(c, 29, 22, 1.6, 1.2, p.eye); ell(c, 35, 22, 1.6, 1.2, p.eye);
    line(c, [26, 33, 21, 56], p.dark, 1); line(c, [38, 33, 43, 56], p.dark, 1);
    ell(c, 32, 39, 5, 3, p.eye); ell(c, 32, 39, 1.6, 1.6, '#200');
    line(c, [26, 43, 38, 35], '#1a1a20', 1.3);
    c.beginPath(); c.moveTo(48, 42); c.quadraticCurveTo(61, 30, 56, 15); c.strokeStyle = '#d8dce4'; c.lineWidth = 2.5; c.stroke();
    ell(c, 48, 43, 3, 3, '#3a2a22');
  };

  const cache = {};
  function enemy(id) {
    if (cache[id]) return cache[id];
    const e = ENEMIES[id];
    const big = e.sprite === 'lich' || e.sprite === 'bellringer';
    const c = cv(big ? 128 : 64, big ? 112 : 64);
    draw[e.sprite](c.getContext('2d'), e.pal);
    return (cache[id] = c);
  }
  function toTex(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; return { w: c.width, h: c.height, d }; }
  function world() {
    const mk = (fn, w = 64, h = 64) => { const c = cv(w, h); fn(c.getContext('2d')); return toTex(c); };
    return {
      chest: mk(c => draw.chest(c, false)),
      chestOpen: mk(c => draw.chest(c, true)),
      fountain: mk(c => draw.fountain(c)),
      boss: toTex(enemy('sineiro')),
      tomb: mk(c => draw.tomb(c)),
    };
  }
  return { enemy, world };
})();
