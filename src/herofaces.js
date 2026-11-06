// Hero portraits, 32x32 pixel grids. '.' = transparent (background shows through).
const HERO_FACES = {
  aldo: {
    pal: { b: '#f0b050', c: '#d08a30', d: '#a0601c', e: '#3a78c8', f: '#1a2a5a', g: '#8ac0f0', h: '#6a3a1a', i: '#4a2610', j: '#9a6232', k: '#2a1408', m: '#8a3a2a', n: '#2a140c', o: '#6a3020', q: '#3a2010', s: '#f0c090', t: '#d09868', u: '#a8704a', v: '#f0d070', w: '#ffffff', x: '#7a4a24', y: '#4e2c14', z: '#a87040' },
    rows: [
      '............khk....khk..........',
      '..........kkhjhk..khhhk.........',
      '........kkhjjhhhkkhjhhhk........',
      '.......khjjjhhjjhhhhhiihk.......',
      '....kkkhjjhhhjjjhhhhhiiihk......',
      '...khhhjhhhhjjhhhhhhhhiiihk.....',
      '..khhhhhhhhihhhhhhhhihiiiik.....',
      '...khhhhhhihhhhhihhihhiiiihk....',
      '....khhhhihhhhhihhihhhiiiihk....',
      '...khhhhhhhhhhihhhhhhhiiihk.....',
      '....kkhhhhhthhhhthhhhthiihk.....',
      '....khhhhhtsnhhttshhtshiihk.....',
      '.....kkhhhtnnnssssnnnthihk......',
      '......khhswwfessssefwwtihk......',
      '......khhswefessssefewthhk......',
      '.......khssggssssssggsthk.......',
      '........ksstsssssssststk........',
      '.........osssssstssssto.........',
      '.........ossssssumsssto.........',
      '..........osssmmmsstto..........',
      '...........osssssstto...........',
      '............osssstto............',
      '..........qqqtsstttqqq..........',
      '.......qqqcqxxuuuuxxqcqqq.......',
      '.....qzzzxqqyxttttxyqqxzzzq.....',
      '...qzzzzxxqcccutttcccqzzzzxxq...',
      '..qzzxvxxyxqcccccbcccqxxzvxxyq..',
      '.qzxxxxxyyyxqcccbccccqxxxxxxyyq.',
      '.qxyvyyyyxqyxqcccccdcqxyyyyvyxq.',
      '.qqyyyyyyqccqvzqcccddcqyyyyyyqq.',
      '.qcqqqqqqcccqvvqccddccdqqqqqqcq.',
      '.qcddcccccccccyxqcdcccddddddccq.',
    ],
  },
  teo: {
    pal: { b: '#ffffff', c: '#e8f0e8', d: '#b0bcc4', e: '#3a9a6a', f: '#14402a', g: '#90e0b0', h: '#3a2a1a', i: '#24180c', j: '#6a5034', k: '#140c06', m: '#8a4a3a', n: '#1e140a', o: '#6a3a22', p: '#f0a080', q: '#4a5a6a', r: '#4ad08a', s: '#e8b888', t: '#c89464', u: '#a07048', v: '#e8c050', w: '#ffffff', x: '#4a8a6a', y: '#2a5440', z: '#7ac09a' },
    rows: [
      '.............kkkkkk.............',
      '..........kkkhhhhhhkkk..........',
      '........kkhhhhjjhhhhhhkk........',
      '.......khhhjjjhhhjjhhhhhk.......',
      '......khhjjhhhhhhhhjhhhhhk......',
      '.....khjhhhhihhhhhhhhhhiihk.....',
      '.....khhhhhhijhihhhhhhhiiik.....',
      '....khhhhhhhihjhihhihhhhiihk....',
      '....khhhhhhihhhhhihhihhhiihk....',
      '.....khhhhhihhhhhhihhihiihk.....',
      '.....khhhhhitthhhhhihhihhhk.....',
      '.....khhhhtttttthhhhihhiihk.....',
      '......khhhtnnnssstthhhhihk......',
      '......khhsnwfessssefwthhhk......',
      '......khhswefessssefewthhk......',
      '.......kkssggssssssggsthhk......',
      '........ossssssssssssstkhk......',
      '.........ospsssstssspto.k.......',
      '.........ossssssussssto.........',
      '..........ossssmmsstto..........',
      '..........qqssssssttqq..........',
      '.........qbbcssssttcddq.........',
      '........qbccctsstttccddq........',
      '.......qqccyytuuuutyydcqq.......',
      '.....qqcbbyzxqttttqzxycccqq.....',
      '...qqcbbbcyxxqqttqqxxyccddcqq...',
      '..qcbbbcccyzxyqqqqyzxycddddccq..',
      '.qcbbcccccyxxyqvvqyxxycddddddcq.',
      '.qcddcccccyzxqvrrvqzxycddddddcq.',
      '.qcddcccccyxxyqvvqyxxycddddddcq.',
      '.qcddcccccyzxycqqcyzxycddddddcq.',
      '.qcddcccccyxxyccccyxxycddddddcq.',
    ],
  },
  lyra: {
    pal: { b: '#c880e0', c: '#a050c0', d: '#72308e', e: '#a84ad8', f: '#40145a', g: '#f0a8f8', h: '#f0d860', i: '#c89c38', j: '#fff6c0', k: '#8a5418', m: '#9a3a40', n: '#3a1a40', p: '#f8a0a0', q: '#3a1448', r: '#e86a7a', s: '#f4cca0', t: '#d8a478', u: '#b07c58', v: '#40e0d8', w: '#ffffff', x: '#e8b840', y: '#9a6a18' },
    rows: [
      '................khk.............',
      '...........kkkkkhjkkk...........',
      '.........kkhjjhhhjjhhkk.........',
      '........khhqqqqqqqqqqhhk........',
      '.......khqqcbbcccccccqqhk.......',
      '......khqccdddxvvxdddccqhk......',
      '.....khqdqqqqqqqqqqqqqqdqhk.....',
      '.....khhhjjjhhhhhhjjjhhiihk.....',
      '....kihhjjhhihhihhhijjhiiiik....',
      '...kiihjhhhhihihhhhhihhiiiiik...',
      '...kiihjhhhhhtthhhhhhihhihiik...',
      '...kiihjhhhtttssthhhhhhhihiik...',
      '...kiihjhitnnnssssnnthhhihiik...',
      '...kiihjhiwwfessssefwwhhihiik...',
      '...kiihjhiwefessssefewhhihiik...',
      '...kiihjhigggesssseggghhihiik...',
      '...kiihjhisssssssssssshhihiik...',
      '...kiihjhippsssstssspphhihiik...',
      '...kiihjhissssmsssmsskhhihiik...',
      '...kiiijjihssssmrmstkhhhiiiik...',
      '...kiiijhihkssssssttkhhhiiiik...',
      '...kiiijhihkcssssttckhhhiiiik...',
      '...kiiijhihkctsstttckhhhiiiik...',
      '...kiiihjhhkccuuuucckhhhhiiik...',
      '...kiiikhhhkcccttccckhhhkiiik...',
      '...qicckhhhkxxxttxxxkhhhkdciq...',
      '..qccbbkhhkcccxyyxccckhhkddccq..',
      '.qcddcckhkccccyvvycccckhkddddcq.',
      '.qcddccckccccccyycccccckdddddcq.',
      '.qcddccccccccccxxccccccddddddcq.',
      '.qcddccccccccccxxccccccddddddcq.',
      '.qcddccccccccccxxccccccddddddcq.',
    ],
  },
  andilla: {
    pal: { b: '#a2a2ac', c: '#7a7a82', d: '#55555e', e: '#e0a030', f: '#5a2a08', g: '#ffe080', h: '#26202e', i: '#141018', j: '#5c5a7e', k: '#060408', m: '#8a2a30', n: '#120c14', o: '#5a2a24', q: '#26262e', s: '#e8c0a0', t: '#c89878', u: '#a07458', v: '#f0c850', w: '#ffffff', x: '#7a1a24', y: '#4a0c14', z: '#a8323e' },
    rows: [
      '............kkkkkkk.............',
      '.........kkkhhhhhhhkkk..........',
      '........khhhhjjhhhhhhhkk........',
      '.......khhhjjjhhhhhhhhhhk.......',
      '......khhhjhhhhjjjhhhhhhhk......',
      '.....khhhjhhhhhhhhjjhhhhhhk.....',
      '.....khhjhhhhhhhhhhhjhhiihk.....',
      '.....khhhihhhhhhhhhhhjhhihk.....',
      '.....khhhhihhhihhhhhhhhhihk.....',
      '.....khhhhhhihhihhhhhhhhihk.....',
      '.....khhhhttthhhhihhhhhhihk.....',
      '....khhhhtttttthhhhihhhhhhk.....',
      '.....khhhnnnnnsstkhhiihhhhk.....',
      '......kksnfwwwssssfkhhihhhk.....',
      '.......otsegwsssssegkhhhihk.....',
      '.......vossttssssssttkhhihk.....',
      '......qvqsssssssssssskhhihk.....',
      '.....qddddssssstssssskhhhhk.....',
      '....qdbbddsssssusmssstkhhhkq....',
      '...qdbdddddssmmmmssttdkhhkddq...',
      '...qdddddddqsssswsttqddkkdddq...',
      '...qddddddqzzssssttxxqddddddq...',
      '...qdddddqzzzxssttxyyxqdddddq...',
      '...qdddddqxxxyyyyxxyyyqdddddq...',
      '....qqqcbbqxxxxxxxyyxqcccqqq....',
      '...qqcbbcccqqqqqqzyxxqccddcqq...',
      '..qcbbccccccccccqxyyxqcddddccq..',
      '.qcddccccccccccqdqxyxqcddddddcq.',
      '.qcddccccccccccqdqxxqccddddddcq.',
      '.qcddccccccccccqdcqqcccddddddcq.',
      '.qcddccccccccccqdccccccddddddcq.',
      '.qcddccccccccccqdccccccddddddcq.',
    ],
  },
};
const HERO_FACE_BG = {
  aldo: ['#2c3c80', '#243270', '#1c2860', '#151e4e'],
  teo: ['#205e54', '#1a5048', '#15433c', '#103630'],
  lyra: ['#432c78', '#38246a', '#2e1e5a', '#24184a'],
  andilla: ['#62202e', '#541a28', '#461622', '#38111c'],
};
// Expressions (worried = small open mouth and a sweat drop; angry = brows down to the middle): patches [row, col, letters] over the normal face. Every face uses the same letters for skin (s),
// brow (n), mouth (m) and eye white (w); P (blush) and G (sweat drop) are added to every palette.
const MOOD_PAL = { P: '#f8a0a0', G: '#8ac0f0' };
const HERO_MOODS = {
  aldo: {
    alegre: [[13, 10, 'snns'], [14, 10, 'nssn'], [15, 11, 'ss'], [13, 18, 'snns'], [14, 18, 'nssn'], [15, 19, 'ss'], [16, 10, 'PP'], [16, 20, 'PP'], [19, 13, 'mwwwm'], [20, 14, 'mmm']],
    preocupado: [[12, 11, 'nns'], [11, 13, 'n'], [12, 18, 'snn'], [11, 18, 'n'], [19, 14, 'smms'], [20, 15, 'mm'], [13, 22, 'G'], [14, 22, 'G']],
    bravo: [[11, 11, 'n'], [12, 11, 'snn'], [13, 13, 'n'], [11, 21, 'n'], [12, 18, 'nns'], [13, 18, 'n'], [19, 13, 'mmmmm']],
  },
  teo: {
    alegre: [[13, 10, 'snns'], [14, 10, 'nssn'], [15, 11, 'ss'], [13, 18, 'snns'], [14, 18, 'nssn'], [15, 19, 'ss'], [16, 10, 'PP'], [16, 20, 'PP'], [19, 14, 'mwwm'], [20, 15, 'mm']],
    preocupado: [[12, 11, 'nns'], [11, 13, 'n'], [20, 15, 'mm'], [13, 22, 'G'], [14, 22, 'G']],
    bravo: [[11, 11, 'n'], [12, 11, 'snn'], [13, 13, 'n'], [12, 18, 'nn'], [13, 18, 'n'], [19, 14, 'mmmm']],
  },
  lyra: {
    alegre: [[13, 10, 'snns'], [14, 10, 'nssn'], [15, 10, 'ssss'], [13, 18, 'snns'], [14, 18, 'nssn'], [15, 18, 'ssss'], [19, 14, 'mwwwm'], [20, 15, 'mmm']],
    preocupado: [[12, 11, 'nns'], [11, 13, 'n'], [12, 18, 'snn'], [11, 18, 'n'], [18, 14, 's'], [18, 18, 's'], [19, 15, 'smm'], [20, 16, 'mm'], [13, 22, 'G'], [14, 22, 'G']],
    bravo: [[11, 11, 'n'], [12, 11, 'snn'], [13, 13, 'n'], [11, 20, 'n'], [12, 18, 'nns'], [13, 18, 'n'], [18, 14, 's'], [18, 18, 's'], [19, 14, 'mmmmm']],
  },
  andilla: {
    alegre: [[13, 10, 'snns'], [14, 10, 'nssn'], [13, 18, 'n'], [14, 18, 'ss'], [16, 10, 'PP'], [16, 18, 'P'], [18, 17, 's'], [19, 13, 'mwwm'], [20, 14, 'mm']],
    preocupado: [[12, 12, 'ss'], [11, 12, 'nn'], [18, 17, 's'], [19, 13, 'smms'], [20, 14, 'mm'], [13, 20, 'G'], [14, 20, 'G']],
    bravo: [[11, 9, 'nn'], [12, 9, 'ss'], [13, 13, 'n'], [18, 17, 's'], [19, 12, 'mmmmmm']],
  },
};
const MOODS = ['normal', 'alegre', 'preocupado', 'bravo'];

const applyPatches = (rows, patches) => rows.map((row, y) => {
  let r = row;
  for (const [py, x, str] of patches) if (py === y) r = r.slice(0, x) + str + r.slice(x + str.length);
  return r;
});

// A hero portrait as a GridSprite definition: the face grid (with an expression) over its window bands.
// Memoized so GridSprite's canvas cache keeps working.
const heroFaceMemo = {};
const heroFace = (key, mood = 'normal') => {
  const id = `${key}|${mood}`;
  if (heroFaceMemo[id]) return heroFaceMemo[id];
  const f = HERO_FACES[key], patches = (HERO_MOODS[key] || {})[mood];
  const def = Object.assign({}, f, { bg: HERO_FACE_BG[key] || ['#2c3c80', '#243270', '#1c2860', '#151e4e'] });
  if (patches) Object.assign(def, { rows: applyPatches(f.rows, patches), pal: Object.assign({}, f.pal, MOOD_PAL) });
  return (heroFaceMemo[id] = def);
};

if (typeof module !== 'undefined') module.exports = { HERO_FACES, HERO_FACE_BG, HERO_MOODS, MOODS, heroFace };
