// ===== GridSprite: the one sprite format of the game (docs/arte/estilo.md) =====
// def = { rows: ['..ab', ...] | frames: [[rows], [rows]], pal: { a: '#rrggbb' }, bg?: ['#band', ...] }
// '.' is transparent. bg paints equal horizontal bands behind the grid (portrait windows).
const GridSprite = (() => {
  const framesOf = def => def.frames || [def.rows];
  const sizeOf = def => { const r = framesOf(def)[0]; return { w: r[0].length, h: r.length }; };

  // Pure: a grid of '#rrggbb' or null per pixel. Used by render() and by the tests.
  function toPixels(def, frame = 0) {
    const rows = framesOf(def)[frame], { w, h } = sizeOf(def), bg = def.bg;
    return rows.map((row, y) => {
      const band = bg ? bg[Math.min(bg.length - 1, Math.floor(y * bg.length / h))] : null;
      const out = new Array(w);
      for (let x = 0; x < w; x++) out[x] = row[x] === '.' ? band : def.pal[row[x]];
      return out;
    });
  }

  // Pure: problems with a definition (empty list = valid)
  function check(def) {
    const errs = [], frames = framesOf(def), { w, h } = sizeOf(def);
    frames.forEach((rows, f) => {
      if (rows.length !== h) errs.push(`frame ${f}: ${rows.length} rows, expected ${h}`);
      rows.forEach((row, y) => {
        if (row.length !== w) errs.push(`frame ${f} row ${y}: width ${row.length}, expected ${w}`);
        for (const ch of row) if (ch !== '.' && !def.pal[ch]) errs.push(`frame ${f} row ${y}: letter '${ch}' has no color`);
      });
    });
    return errs;
  }

  // Swap colors without a new grid (variants of the same enemy or character)
  const recolor = (def, pal) => Object.assign({}, def, { pal: Object.assign({}, def.pal, pal) });

  const cache = new WeakMap();
  function render(def, frame = 0) {
    let per = cache.get(def);
    if (!per) cache.set(def, per = []);
    if (per[frame]) return per[frame];
    const { w, h } = sizeOf(def), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    toPixels(def, frame).forEach((row, y) => row.forEach((col, x) => { if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } }));
    return (per[frame] = cv);
  }

  return { render, toPixels, check, recolor, sizeOf, frameCount: def => framesOf(def).length };
})();

if (typeof module !== 'undefined') module.exports = { GridSprite };
