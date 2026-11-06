// ===== Master palette: every color a grid sprite may use (docs/arte/estilo.md) =====
// Families are ordered light to dark. A new color needs a reason and goes here first.
const PALETTE = {
  luz:      ['#fff6c0', '#f0d860', '#e8b840', '#c89c38', '#8a5418'], // light and the sacred: altars, healing, the title star
  noite:    ['#8ac0f0', '#3a78c8', '#2c3c80', '#1c2860', '#151e4e'], // night and cold: sky, scenery shade, frost
  vida:     ['#90e0b0', '#4ad08a', '#3a9a6a', '#2a5440', '#14402a'], // life and nature: grass, trees, slimes
  misterio: ['#f0a8f8', '#a84ad8', '#72308e', '#40145a', '#3a1448'], // mystery and magic: crypt, spells, spectres
  perigo:   ['#e86a7a', '#a8323e', '#7a1a24', '#4a0c14', '#26202e'], // danger: enemy eyes, damage, bosses
  materia:  ['#f4cca0', '#d8a478', '#b07c58', '#9a6232', '#6a3a1a', '#a2a2ac', '#7a7a82', '#55555e'], // skin, wood and stone
  // Every other color the hero portraits (src/herofaces.js) already use, so they stay pixel-identical
  retratos: ['#ffffff', '#ffe080', '#f8a0a0', '#f0d070', '#f0c850', '#f0c090', '#f0b050', '#f0a080', '#e8f0e8', '#e8c0a0',
    '#e8c050', '#e8b888', '#e0a030', '#d09868', '#d08a30', '#c89878', '#c89464', '#c880e0', '#b0bcc4', '#a8704a', '#a87040',
    '#a07458', '#a07048', '#a0601c', '#a050c0', '#9a6a18', '#9a3a40', '#8a4a3a', '#8a3a2a', '#8a2a30', '#7ac09a', '#7a4a24',
    '#6a5034', '#6a3a22', '#6a3020', '#62202e', '#5c5a7e', '#5a2a24', '#5a2a08', '#541a28', '#4e2c14', '#4a8a6a', '#4a5a6a',
    '#4a2610', '#461622', '#432c78', '#40e0d8', '#3a2a1a', '#3a2010', '#3a1a40', '#38246a', '#38111c', '#2e1e5a', '#2a140c',
    '#2a1408', '#26262e', '#243270', '#24184a', '#24180c', '#205e54', '#1e140a', '#1a5048', '#1a2a5a', '#15433c', '#141018',
    '#140c06', '#120c14', '#103630', '#060408'],
};
const PALETTE_ALL = new Set(Object.values(PALETTE).flat());
const inPalette = hex => PALETTE_ALL.has(String(hex).toLowerCase());

if (typeof module !== 'undefined') module.exports = { PALETTE, PALETTE_ALL, inPalette };
