// Pixel painter: shapes -> shaded parts -> colored outline -> grid of hex colors
const { inPalette } = require('/home/dani/games/dungeon-rpg/src/palette.js');

function Painter(W, H) {
  const part = Array.from({ length: H }, () => new Array(W).fill(-1)); // part index per pixel
  const flat = Array.from({ length: H }, () => new Array(W).fill(null)); // unshaded detail color
  const parts = []; // { mat, light, line }
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const newPart = (mat, o = {}) => { if (o.into !== undefined) return o.into; parts.push({ mat, light: o.light || 'tl', line: !!o.line, flatOk: o.flatOk }); return parts.length - 1; };
  const set = (p, x, y) => { x = Math.round(x); y = Math.round(y); if (inb(x, y)) { part[y][x] = p; flat[y][x] = null; } };

  const P = {
    W, H,
    ellipse(cx, cy, rx, ry, mat, o) {
      const p = newPart(mat, o);
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(p, x, y);
      }
      return p;
    },
    rect(x0, y0, w, h, mat, o) { const p = newPart(mat, o); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(p, x, y); return p; },
    poly(pts, mat, o) {
      const p = newPart(mat, o), ys = pts.map(q => q[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const yy = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
          if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) xs.push(x1 + (yy - y1) * (x2 - x1) / (y2 - y1));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) set(p, x, y);
      }
      return p;
    },
    line(x0, y0, x1, y1, mat, t = 1, o) {
      const p = newPart(mat, o), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) set(p, Math.round(x - (t - 1) / 2) + a, Math.round(y - (t - 1) / 2) + b);
      }
      return p;
    },
    // polyline through points
    path(pts, mat, t = 1, o) {
      const p = newPart(mat, o);
      for (let k = 0; k + 1 < pts.length; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) {
          const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
          for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) set(p, Math.round(x - (t - 1) / 2) + a, Math.round(y - (t - 1) / 2) + b);
        }
      }
      return p;
    },
    erase(x0, y0, w = 1, h = 1) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y)) { part[y][x] = -1; flat[y][x] = null; } },
    eraseEllipse(cx, cy, rx, ry) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) P.erase(x, y);
      }
    },
    // unshaded detail pixels (eyes, teeth, marks); they belong to the part underneath for the outline
    px(x, y, col) { if (inb(x, y)) { flat[y][x] = col; if (part[y][x] < 0) part[y][x] = parts.length ? -2 : -2; } },
    fill(x0, y0, w, h, col) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) P.px(x, y, col); },
    // put a flat color on every pixel of a part (keeps the shape, drops the shading)
    paintPart(p, col) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (part[y][x] === p) flat[y][x] = col; },
    has: (x, y) => inb(x, y) && part[y][x] !== -1,
    partAt: (x, y) => inb(x, y) ? part[y][x] : -1,

    // shade every part (3 or 4 tones), inner lines, then the colored outline
    finish(defaultOutline) {
      const out = Array.from({ length: H }, () => new Array(W).fill(null));
      const run = (x, y, dx, dy, p) => { let n = 0; while (inb(x + dx * (n + 1), y + dy * (n + 1)) && part[y + dy * (n + 1)][x + dx * (n + 1)] === p) n++; return n; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = part[y][x];
        if (flat[y][x]) { out[y][x] = flat[y][x]; continue; }
        if (p < 0) continue;
        const { mat, light } = parts[p], T = mat.tones;
        let r;
        if (light === 'below') { const a = run(x, y, 0, 1, p), b = run(x, y, 0, -1, p); r = a / (a + b + 1e-9); }
        else if (light === 'flat') r = 0.5;
        else { const a = run(x, y, 0, -1, p), b = run(x, y, 0, 1, p), c = run(x, y, -1, -1, p), d = run(x, y, 1, 1, p); r = 0.55 * a / (a + b + 1e-9) + 0.45 * c / (c + d + 1e-9); }
        const span = run(x, y, 0, -1, p) + run(x, y, 0, 1, p);
        let t;
        if (T.length >= 4) t = r < 0.16 && span > 5 ? 0 : r < 0.42 ? 1 : r < 0.78 ? 2 : 3;
        else t = r < 0.4 ? 0 : r < 0.78 ? 1 : 2;
        out[y][x] = T[t];
      }
      // inner lines: a part flagged `line` gets its outline color where it meets an earlier part
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = part[y][x]; if (p < 0 || !parts[p].line || flat[y][x]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = inb(x + dx, y + dy) ? part[y + dy][x + dx] : -1;
          if (q >= 0 && q < p) { out[y][x] = parts[p].mat.outline; break; }
        }
      }
      // outer outline: each empty pixel next to the sprite takes the outline of the part it touches
      const res = out.map(r => r.slice());
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (out[y][x]) continue;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          if (!inb(x + dx, y + dy) || !out[y + dy][x + dx]) continue;
          const q = part[y + dy][x + dx];
          res[y][x] = q >= 0 ? parts[q].mat.outline : defaultOutline; break;
        }
      }
      for (const row of res) for (const c of row) if (c && !inPalette(c)) throw new Error('not in master palette: ' + c);
      return res;
    },
  };
  return P;
}

// frames of hex grids -> { frames: [rows], pal }
// trim empty borders, using the union of all frames so they stay aligned
function trim(frames) {
  const H = frames[0].length, W = frames[0][0].length;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (const g of frames) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return frames.map(g => g.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1)));
}

function toDef(frames) {
  frames = trim(frames);
  const letters = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', map = {}, pal = {};
  let i = 0;
  const rowsOf = g => g.map(r => r.map(c => {
    if (!c) return '.';
    if (!map[c]) { if (i >= letters.length) throw new Error('too many colors'); map[c] = letters[i++]; pal[map[c]] = c; }
    return map[c];
  }).join(''));
  return { frames: frames.map(rowsOf), pal };
}

const mat = (tones, outline) => ({ tones, outline });
module.exports = { Painter, toDef, mat };
