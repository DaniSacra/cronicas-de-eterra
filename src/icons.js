// ===== Ícones de comando da batalha (pixel art 16×16, desenhados por código) =====
// Cada ícone é uma grade de letras; cada letra é uma cor da paleta. "." é transparente.
const ICON_PAL = {
  k: '#07081a', w: '#f4f0e0', s: '#b8c4d8', d: '#6a7894', g: '#ffd23f', o: '#c88a2a', b: '#7a4a22',
  r: '#e04848', R: '#8a1c2c', c: '#7fe0ff', C: '#2a7ab8', p: '#c070ff', P: '#6a2aa8', n: '#a06a3a', N: '#5a3a1e',
};
const ICON_ART = {
  atk: [ // espada
    '.............kk.', '............kwsk', '...........kwsk.', '..........kwsk..', '.........kwsk...', '........kwsk....',
    '.......kwsk.....', '..k...kwsk......', '..kgk.kwsk......', '...kgkwsk.......', '....kgsk........', '...kbkgk........',
    '..kbk.kgk.......', '.kbk...kk.......', 'kbk.............', '.k..............'],
  spell: [ // brilho mágico
    '.......k........', '......kck.......', '......kck.......', '..k...kck...k...', '..kck.kck.kck...', '...kckwwwkck....',
    '.kkkcwwwwwckkk..', 'kcccwwwwwwwccck.', '.kkkcwwwwwckkk..', '...kckwwwkck....', '..kck.kck.kck...', '..k...kck...k...',
    '......kck.......', '......kck.......', '.......k........', '................'],
  item: [ // frasco de poção
    '................', '......kkkk......', '.....knnnnk.....', '......kNNk......', '......kwsk......', '.....kwsssk.....',
    '....kwsssssk....', '...kwrrrrrrsk...', '..kwrrrrrrrrsk..', '..krrwrrrrrrRk..', '..krrrrrrrrrRk..', '..krrrrrrrrRRk..',
    '...kRrrrrrRRk...', '....kkRRRRkk....', '......kkkk......', '................'],
  def: [ // escudo
    '................', '..kkkkkkkkkkkk..', '..kssssssssssk..', '..kswwCCCCwwsk..', '..kswCCgCCCwsk..', '..kswCCgCCCwsk..',
    '..kswgggggCwsk..', '..kswCCgCCCwsk..', '..ksswCgCCwssk..', '...kswCgCCwsk...', '...ksswCCwssk...', '....kswwwwsk....',
    '.....ksswssk....', '......kssk......', '.......kk.......', '................'],
  run: [ // bota com rastro
    '................', '................', '.........kkkk...', '........knnnnk..', '........knNNnk..', 'kk......knnnnk..',
    '.......kknnnnk..', 'kkkk..kknnnnnk..', '......knnnnnnk..', '..kk.knnnnnnnk..', '....knnnnnnnnkk.', '...knnnnnnnnnnk.',
    '...kNNNNNNNNNNk.', '....kkkkkkkkkk..', '................', '................'],
};
const ICON_URL = {};
function iconUrl(id) {
  if (ICON_URL[id]) return ICON_URL[id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const c = cv.getContext('2d');
  ICON_ART[id].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { c.fillStyle = ICON_PAL[ch]; c.fillRect(x, y, 1, 1); } }));
  return (ICON_URL[id] = cv.toDataURL());
}
