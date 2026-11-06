// Writes src/enemyart.js: literal grids, one per enemy, two idle frames each
const fs = require('fs');
const { SPRITES, build } = require('./enemies.cjs');
const q = s => `'${s}'`;
let out = `// Chapter 1 enemies as grid sprites (docs/arte/estilo.md): two idle frames each, master palette only.
// Variants of the same enemy come from a palette swap in ENEMIES[id].recolor, never from a new grid.
const ENEMY_ART = {\n`;
for (const name of Object.keys(SPRITES)) {
  const d = build(name);
  out += `  ${name}: {\n    pal: { ${Object.entries(d.pal).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} },\n    frames: [\n`;
  for (const rows of d.frames) out += `      [\n${rows.map(r => `        ${q(r)},`).join('\n')}\n      ],\n`;
  out += `    ],\n  },\n`;
}
out += `};\n\nif (typeof module !== 'undefined') module.exports = { ENEMY_ART };\n`;
fs.writeFileSync('/home/dani/games/dungeon-rpg/src/enemyart.js', out);
console.log('ok', Object.keys(SPRITES).join(' '), Math.round(out.length / 1024) + 'KB');
