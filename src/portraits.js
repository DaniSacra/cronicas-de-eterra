// ===== Retratos de quem fala (bustos 32×32 em grade) =====
// Heróis em src/herofaces.js (com expressões); o resto do elenco em src/npcfaces.js (gerado por docs/arte/gerador/faces.cjs).
// O nome da fala ("Nome:\ntexto") escolhe o retrato; narração (sem nome) fica sem retrato.

const Portraits = (() => {
  const BY_NAME = { 'Mensageiro': 'tobias', 'Encapuzado': 'hooded', 'Guarda Hugo': 'hugo', 'Ancião Bertoldo': 'bertoldo',
    'Irmã Irene': 'irene', 'Dona Marta': 'marta', 'Bigode': 'cat', 'Bilhete': 'scroll', 'Lápide': 'stone', 'Moça dos dados': 'andilla', 'O Sineiro': 'sineiro' };
  const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function keyFor(name) {
    if (!name) return null;
    const hero = PARTY_DEFS.find(d => d.name === name);
    if (hero) return hero.id;
    if (BY_NAME[name]) return BY_NAME[name];
    if (/^Carta/.test(name)) return 'scroll';
    const first = plain(name.split(/[ ,]/)[0]);
    return NPC_FACES[first] || HERO_FACES[first] ? first : null;
  }

  // mood (alegre | preocupado | bravo) only changes the hero faces
  const draw = (key, mood) => GridSprite.render(HERO_FACES[key] ? heroFace(key, mood) : NPC_FACES[key]);

  return { keyFor, draw };
})();

if (typeof module !== 'undefined') module.exports = { Portraits };
