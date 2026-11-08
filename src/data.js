// ===== Dados do jogo =====

// Nome do jogo: trocar aqui muda a tela de título e a aba do navegador ("\n" quebra a linha do logo)
const GAME = {
  title: 'CRÔNICAS\nDE ETERRA',
  subtitle: 'Os Reis Caídos',
  tab: 'Crônicas de Eterra: Os Reis Caídos', // nome na aba do navegador
  credit: '© 2026 Daniel · Uma história de Eterra',
};

// Primeira missão: uma cripta curta, de um andar só, para aprender a jogar (pedido do Daniel, 2026-11-04).
// A fonte fica no meio do caminho; no fundo, o Sineiro guarda o túmulo do rei (docs/mundo/historias/prologo.md).
const FLOORS = [
  {
    name: 'Cripta da Igreja Velha', short: 'B1', seed: 7331, size: 15, rooms: 2, loops: 0.06, fountainAt: 0.5, boss: true,
    tunnels: [[0.12, 0.4], [0.58, 0.86]], // trechos de túnel cavado entre salas da cripta antiga
    clue: true, // rastro de sangue e capa marrom no túnel, antes da fonte (o mensageiro passou por ali)
    pal: { stone: [92, 94, 136], mortar: [24, 20, 44], floor: [72, 68, 104], floorJ: [26, 22, 46], ceil: [40, 34, 70], accent: [58, 128, 118] }, // pedra azulada, limo verde-água (docs/arte/estilo.md: cripta azul e roxa)
    loot: ['pocao', 'espadaFerro', 'eter', 'cajadoRunico', 'pocao'],
    enemies: ['rato', 'morcego', 'gosma'], maxGroup: 3,
  },
];
// The crypt floors keep their old numeric keys ("0:x,y" in G.opened); every floor after them has an id ("mina1:x,y").
// Saves from the 3-floor version opened chests on crypt floors 1 and 2, which no longer exist.
const CRYPT_FLOORS = 1;
const floorKey = i => (FLOORS[i] && FLOORS[i].id) || String(i);
// Which floor a save stands on: by id when it has one; old saves past the crypt's floors start the crypt over
function savedFloor(s) {
  if (s.floorId) { const i = FLOORS.findIndex(f => f.id === s.floorId); if (i >= 0) return i; }
  return s.floor > 0 && s.floor < CRYPT_FLOORS ? s.floor : 0;
}
const oldCryptKey = k => /^\d+:/.test(k) && parseInt(k, 10) >= CRYPT_FLOORS;

const PARTY_DEFS = [
  {
    id: 'aldo', name: 'Aldo', cls: 'Guerreiro', color: '#e0a040',
    base: { hp: 48, mp: 0, atk: 13, def: 22.5, res: 4, mag: 3, agi: 7 },
    grow: { hp: 10, mp: 0, atk: 3, def: 5, res: 1, mag: 0.5, agi: 1 },
    spells: [[1, 'golpe'], [6, 'quebraJunta'], [12, 'furia']], skillWord: 'Técnica', energy: true,
  },
  {
    id: 'lyra', name: 'Lyra', cls: 'Maga', color: '#d070e0',
    base: { hp: 30, mp: 20, atk: 6, def: 10, res: 12, mag: 12, agi: 10 },
    grow: { hp: 5, mp: 4, atk: 1, def: 2.5, res: 3, mag: 3, agi: 1.2 },
    spells: [[1, 'fogo'], [3, 'gelo'], [5, 'raio']], skillWord: 'Magia',
  },
  {
    id: 'teo', name: 'Teo', cls: 'Clérigo', color: '#60d0a0',
    base: { hp: 36, mp: 16, atk: 9, def: 15, res: 10, mag: 9, agi: 6 },
    grow: { hp: 7, mp: 3, atk: 2, def: 3.75, res: 3, mag: 2, agi: 1 },
    spells: [[1, 'cura'], [3, 'luz'], [5, 'reviver'], [10, 'curaTotal']], skillWord: 'Magia',
  },
  {
    // até dizer o nome na noite da taverna (G.seen.andillaAnon), ela é a moça dos dados também no cartão e na batalha
    id: 'andilla', get name() { return typeof G !== 'undefined' && G.seen && G.seen.andillaAnon ? 'Moça dos dados' : 'Andilla'; }, cls: 'Ladina', color: '#e05a5a',
    base: { hp: 34, mp: 0, atk: 11, def: 12.5, res: 6, mag: 4, agi: 14 },
    grow: { hp: 6, mp: 0, atk: 2.5, def: 3, res: 2, mag: 0.5, agi: 1.6 },
    spells: [[1, 'golpeBaixo'], [6, 'leque']], skillWord: 'Truque', energy: true,
  },
];

// Two kinds of hero (combat design, Phase 2a): Lyra and Teo cast with PM (field `mp` on the spell); Aldo and Andilla
// fight with Energia (field `en`, PARTY_DEFS energy: true). Energia lives only in battle: it starts every fight at
// `start`, fills with attacks, defending and (per hero) taking hits or landing crits, and is gone when the fight ends.
// A technique and a miss give nothing. Costs come in three tiers.
const ENERGY = { max: 100, start: 10, attack: 15, defend: 10, hurt: { aldo: 8 }, crit: { andilla: 10 }, tiers: [20, 40, 80] };
const MAX_LEVEL = 30;

// What each hero learns and when (PARTY_DEFS spells); old saves follow it, since it depends only on the level
const SPELLS = {
  golpe:     { name: 'Golpe Forte', en: 20, target: 'enemy',      kind: 'phys',   power: 1.4, fx: 'slash', desc: 'Um golpe com toda a força.' },
  quebraJunta: { name: 'Quebra-Junta', en: 40, target: 'enemy', kind: 'phys', power: 1.35, bone: 1.5, fx: 'slash', desc: 'Mira nas juntas. Osso quebra: mais forte contra mortos-vivos.' },
  furia:     { name: 'Fúria',       en: 80, target: 'allEnemies', kind: 'phys',   power: 0.95, fx: 'slash', desc: 'Gira a espada contra todos.' },
  fogo:      { name: 'Fogo',        mp: 4,  target: 'enemy',      kind: 'mag',    power: 2.2, base: 8,  fx: 'fire', desc: 'Uma chama que queima um inimigo.' },
  gelo:      { name: 'Gelo',        mp: 8,  target: 'allEnemies', kind: 'mag',    power: 1.4, base: 6,  fx: 'ice', desc: 'Geada sobre todos os inimigos.' },
  raio:      { name: 'Raio',        mp: 12, target: 'enemy',      kind: 'mag',    power: 3.4, base: 16, fx: 'bolt', desc: 'Um raio forte num inimigo só.' },
  cura:      { name: 'Cura',        mp: 3,  target: 'ally',       kind: 'heal',   power: 2,   base: 20, field: true, desc: 'Fecha as feridas de um aliado.' },
  luz:       { name: 'Luz Sagrada', mp: 5,  target: 'enemy',      kind: 'holy',   power: 2,   base: 10, fx: 'holy', desc: 'Luz que fere. Dobra contra mortos-vivos.' },
  reviver:   { name: 'Reviver',     mp: 12, target: 'deadAlly',   kind: 'revive', field: true, desc: 'Põe de pé um aliado caído.' },
  curaTotal: { name: 'Cura Total',  mp: 10, target: 'allAllies',  kind: 'heal',   power: 1.5, base: 15, field: true, desc: 'Cura todo o grupo de uma vez.' },
  golpeBaixo: { name: 'Golpe Baixo',   en: 20, target: 'enemy',      kind: 'phys',   power: 1.3, pierce: true, fx: 'slash', desc: 'Acerta onde a armadura não cobre.' },
  leque:      { name: 'Leque de Facas', en: 20, target: 'allEnemies', kind: 'phys',   power: 0.71, fx: 'slash', desc: 'Facas para todos os inimigos.' },
};

// Elos (combat design, Phase 3a; rules in src/elos.js): two heroes use the right skills in the same round on the same
// enemy. heroes[0] and heroes[1] are {a} and {b} in the scene; parts: the skills each hero may use for it.
// kind strike: an extra blow of dmg x (both damages) on the target, armor ignored.
// kind blessing: an extra blow of dmg x (area damage) on each enemy hit, and heal x (the heal) on the other allies.
const ELOS = {
  espadaFogo: {
    name: 'Espada de Fogo', heroes: ['aldo', 'lyra'], kind: 'strike', dmg: 0.25, fx: 'fire',
    parts: { aldo: ['golpe', 'quebraJunta', 'furia'], lyra: ['fogo'] },
    asks: 'Uma técnica de Aldo e o Fogo de Lyra no mesmo inimigo, na mesma rodada.',
    does: 'Um golpe de fogo a mais, que ignora a armadura.',
    hint: 'Dois irmãos, uma lâmina e uma chama.',
    scene: [[null, '{b} estende a mão e a chama corre pela lâmina de {a}.'], ['aldo', 'Lyra! A espada está pegando fogo!'], ['lyra', 'Então bate antes que apague!']],
  },
  lequeBencao: {
    name: 'Leque Abençoado', heroes: ['andilla', 'teo'], kind: 'blessing', dmg: 0.25, heal: 0.6, fx: 'holy',
    parts: { andilla: ['leque'], teo: ['cura'] },
    asks: 'A Cura de Teo e o Leque de Facas de Andilla na mesma rodada.',
    does: 'As facas cortam de novo e a cura chega ao resto do grupo.',
    hint: 'Facas rápidas e uma bênção na mesma rodada.',
    scene: [[null, '{b} ergue as mãos e a bênção sobe junto com as facas de {a}.'], ['andilla', 'Isso foi... quente?'], ['teo', 'Foi a luz de Eterra. Atire de novo.']],
  },
};

const ITEMS = {
  // fx: what it does (hp or mp it gives back, revive with that share of the PV, all: the whole party), read by applyItem and the target cards
  pocao:  { name: 'Poção',      desc: 'Recupera 50 PV',             target: 'ally',      fx: { hp: 50 } },
  eter:   { name: 'Éter',       desc: 'Recupera 20 PM',             target: 'ally',      fx: { mp: 20 } },
  pena:   { name: 'Pena Vital', desc: 'Revive um aliado caído',     target: 'deadAlly',  fx: { revive: 0.5 } },
  elixir: { name: 'Elixir',     desc: 'Restaura todo o grupo',      target: 'allAllies', fx: { all: true } },
  pao:    { name: 'Pão da Berta', desc: 'Recupera 30 PV',           target: 'ally',      fx: { hp: 30 } }, // the four loaves of the farewell (capítulo 1)
};

const EQUIPS = {
  espadaFerro:  { name: 'Espada de Ferro', who: 'aldo', slot: 'arma',     icon: 'espada',   bonus: { atk: 6 } },
  cotaMalha:    { name: 'Cota de Malha',   who: 'aldo', slot: 'armadura', icon: 'cota',   bonus: { def: 15 } },
  cajadoRunico: { name: 'Cajado Rúnico',   who: 'lyra', slot: 'arma',     icon: 'cajado', bonus: { mag: 6 } },
  espadaPrata:  { name: 'Espada de Prata', who: 'aldo', slot: 'arma',     icon: 'espada',   bonus: { atk: 10 } },
  mantoSagrado: { name: 'Manto Sagrado',   who: 'teo',  slot: 'armadura', icon: 'manto',   bonus: { def: 13, mag: 5 } },
  // Forja do Gaspar: aço simples de Valmor, mais fraco que o que está na cripta
  espadaCurta:   { name: 'Espada Curta',     who: 'aldo',    slot: 'arma',     icon: 'espada',   bonus: { atk: 3 } },
  gibao:         { name: 'Gibão Acolchoado', who: 'aldo',    slot: 'armadura', icon: 'couro',   bonus: { def: 5 } },
  cajadoFreixo:  { name: 'Cajado de Freixo', who: 'lyra',    slot: 'arma',     icon: 'cajado', bonus: { mag: 2 } },
  capaLa:        { name: 'Capa de Lã',       who: 'lyra',    slot: 'armadura', icon: 'manto',   bonus: { def: 4 } },
  macaFerro:     { name: 'Maça de Ferro',    who: 'teo',     slot: 'arma',     icon: 'maca',   bonus: { atk: 2 } },
  habitoForrado: { name: 'Hábito Forrado',   who: 'teo',     slot: 'armadura', icon: 'habito',   bonus: { def: 4 } },
  adagaAfiada:   { name: 'Adaga Afiada',     who: 'andilla', slot: 'arma',     icon: 'adaga',   bonus: { atk: 3 } },
  gibaoCouro:    { name: 'Gibão de Couro',   who: 'andilla', slot: 'armadura', icon: 'couro',   bonus: { def: 4 } },
  // capítulo 1: the chest behind the frozen waterfall of the southern road (above the forge, below the crypt)
  gibaoPele:     { name: 'Gibão de Pele',    who: 'andilla', slot: 'armadura', icon: 'couro',   bonus: { def: 8 } },
};

// Heroes screen: attribute names in full, the starting gear of each hero (shown until something better is found)
const STAT_FULL = { atk: 'Ataque', def: 'Defesa', mag: 'Magia', res: 'Resistência', agi: 'Agilidade' };
const START_GEAR = {
  aldo:    { arma: { name: 'Espada de viagem', icon: 'espada' }, armadura: { name: 'Túnica de couro', icon: 'tunica' } },
  lyra:    { arma: { name: 'Cajado de estudo', icon: 'cajado' }, armadura: { name: 'Vestido de viagem', icon: 'tunica' } },
  teo:     { arma: { name: 'Maça de aprendiz', icon: 'maca' },   armadura: { name: 'Hábito branco', icon: 'habito' } },
  andilla: { arma: { name: 'Adaga', icon: 'adaga' },            armadura: { name: 'Capa cinza', icon: 'manto' } },
};
// The story of each hero grows with the game: a line shows once its flag is set (flags: G.seen, plus quest, bossDead, carta)
const HERO_STORY = {
  aldo: {
    lines: [
      { text: 'Chegou a Valmor sozinho, com a espada nas costas e a bolsa vazia.' },
      { text: 'Diz que veio por trabalho, mas a vila sabe que é pela Clara.' },
      { when: 'quest', text: 'Aceitou descer à cripta e descobrir o que acorda os mortos.' },
      { when: 'bossDead', text: 'O sino parou, e agora a estrada leva a Erukh.' },
    ],
    quotes: [{ text: 'Vim procurar trabalho. Só isso.' }, { when: 'bossDead', text: 'Trabalho não falta. Isso eu garanto.' }],
  },
  lyra: {
    lines: [
      { text: 'Irmã caçula do Aldo, chegou com mais livros que bagagem.' },
      { text: 'Veio pelo irmão e pela fonte de luz de Valmor.' },
      { when: 'fonteLyra', text: 'Tocou a fonte e sentiu que a água lembra de quem passa.' },
    ],
    quotes: [{ text: 'Alguém tem que contar essa história direito.' }, { when: 'talk:claraLyra', text: 'Aldo vê a professora. Aldo esquece como se anda.' }, { when: 'fonteLyra', text: 'A água lembra de quem passa. Dá para sentir.' }],
  },
  teo: {
    lines: [
      { text: 'Aprendiz, sonha servir no Templo e veio ajudar a irmã Irene.' },
      { when: 'teoWin', text: 'O grupo o achou no cemitério, cercado de mortos inquietos.' },
      { when: 'carta', text: 'Guarda uma carta com o leão de Hanokh, que só o sangue de Hanokh pode romper.' },
    ],
    quotes: [{ text: 'Os mortos merecem descanso. Os vivos também.' }],
  },
  andilla: {
    lines: [
      { text: 'Joga dados na taverna e ganha mais do que devia.' },
      { when: 'andillaNome', text: 'Diz que se chama Andilla e perdeu uns ganchos no cemitério.' },
      { when: 'bossDead', text: 'Ficou no grupo e jura que é pelo ouro.' },
    ],
    quotes: [{ text: 'Tudo tem preço. Até a coragem.' }, { when: 'porque', text: 'Porta caída, telhado aberto. Pelo menos não vou precisar dos ganchos.' }],
  },
};

// Battle lines: short, at most one of each kind per fight (src/battle.js, heroLine). fall gets the fallen hero's id and name.
const BATTLE_LINES = {
  crit: { aldo: ['Na junta.', 'Fica no chão.'], lyra: ['Viu? Eu também sei bater.'], teo: ['Desculpa. Foi sem querer. Quase.'], andilla: ['Seis no dado.', 'Eu sempre ganho.'] },
  low: { aldo: ['Ainda estou de pé.'], lyra: ['Isso doeu. Vou anotar quem foi.'], teo: ['Eu cuido dos outros. Quem cuida de mim?'], andilla: ['Hora de jogar com cuidado.'] },
  fall: {
    aldo: [(id, n) => (id === 'lyra' ? `${n}! Fica atrás de mim!` : `Aguenta, ${n}! Eu cubro.`)],
    lyra: [(id, n) => (id === 'aldo' ? 'Levanta, maninho!' : id === 'teo' ? `${n}! Quem vai curar a gente agora?` : `${n}! Teo, aqui!`)],
    teo: [(id, n) => `Calma, ${n}. Eu estou indo.`],
    andilla: [() => 'Isso não estava na aposta.'],
  },
  win: { aldo: ['Próximo.'], lyra: ['Mais uma para o livro.'], teo: ['Que descansem em paz.'], andilla: ['Fácil. Quase.'] },
};

const STAT_NAMES = { atk: 'ATQ', def: 'DEF', mag: 'MAG', res: 'RES', agi: 'AGI', hp: 'PV', mp: 'PM' };

const ENEMIES = {
  rato:      { name: 'Rato Gigante',    hp: 52,  atk: 21, def: 4, res: 1,  agi: 8,  xp: 8,  sprite: 'rat', drop: ['pocao', 0.08] },
  morcego:   { name: 'Morcego Vampiro', hp: 38,  atk: 20, def: 2, res: 1,  agi: 14, xp: 7,  sprite: 'bat', float: true,
               skill: { name: 'Mordida Vampira', chance: 0.3, kind: 'drain', power: 1.0 } },
  gosma:     { name: 'Gosma Verde',     hp: 64,  atk: 20, def: 9, res: 4,  agi: 5,  xp: 9,  sprite: 'slime', drop: ['eter', 0.06] },
  esqueleto: { name: 'Esqueleto',       hp: 56,  atk: 20, def: 13, res: 5,  agi: 8,  xp: 16, sprite: 'skeleton', undead: true,
               recolor: { '#a8323e': '#3a78c8', '#e86a7a': '#8ac0f0', '#3a78c8': '#a8323e', '#2c3c80': '#7a1a24', '#1c2860': '#4a0c14' }, drop: ['pocao', 0.1] },
  aranha:    { name: 'Aranha Tumular',  hp: 48,  atk: 19, def: 9, res: 4,  agi: 14, xp: 15, sprite: 'spider',
               skill: { name: 'Ferroada', chance: 0.25, kind: 'phys', power: 1.5 } },
  goblin:    { name: 'Goblin Lanceiro', hp: 62,  atk: 21, def: 14, res: 6,  agi: 9,  xp: 18, sprite: 'goblin',
               pal: { base: '#6aa040', light: '#9ad06a', dark: '#2e5418', eye: '#ffe040' }, drop: ['pocao', 0.15] },
  cavaleiro: { name: 'Cavaleiro Negro', hp: 85,  atk: 27, def: 27, res: 11, agi: 8,  xp: 40, sprite: 'knight',
               pal: { base: '#3a3a4a', light: '#80809a', dark: '#141418', eye: '#ff2020' },
               skill: { name: 'Corte Brutal', chance: 0.2, kind: 'phys', power: 1.6 }, drop: ['pena', 0.08] },
  espectro:  { name: 'Espectro',        hp: 62,  atk: 22, def: 16, res: 6,  agi: 15, xp: 36, sprite: 'ghost', undead: true, float: true,
               pal: { base: '#7fb0d0', light: '#d8f0ff', dark: '#2a4a6a', eye: '#80ffff' },
               skill: { name: 'Toque Gélido', chance: 0.35, kind: 'mag', power: 30 }, drop: ['eter', 0.15] },
  golem:     { name: 'Golem de Pedra',  hp: 130, atk: 30, def: 40, res: 15, agi: 4,  xp: 48, sprite: 'golem',
               pal: { base: '#7a7266', light: '#aaa296', dark: '#3c3830', eye: '#ffa020' }, drop: ['pocao', 0.2] },
  // Cemitério de Valmor: mais fracos que os da cripta, para Aldo e Lyra aprenderem
  ratoCova:    { name: 'Rato de Cova', hp: 24, atk: 11, def: 2, res: 1, agi: 6,  xp: 4, sprite: 'rat',
               recolor: { '#b07c58': '#a2a2ac', '#9a6232': '#7a7a82', '#6a3a1a': '#55555e', '#4a2610': '#26262e' } }, // rato cinza do cemitério
  morcegoCova: { name: 'Morcego',      hp: 16, atk: 9, def: 0, res: 0, agi: 12, xp: 3, sprite: 'bat', float: true,
               recolor: { '#a84ad8': '#7a7a82', '#72308e': '#55555e', '#40145a': '#26262e', '#3a1448': '#26202e' } }, // morcego cinzento do cemitério
  ossada:      { name: 'Ossada',       hp: 44, atk: 13, def: 5, res: 2, agi: 5,  xp: 6, sprite: 'skeleton', undead: true, drop: ['pocao', 0.2] },
  // Capítulo 1 · Parte 1: a Estrada do Sul e o Pasto do Vau (nível 4 a 5)
  loboGeada: { name: 'Lobo da Geada', hp: 80, atk: 25, def: 6, res: 2, agi: 12, xp: 11, sprite: 'wolf', drop: ['pocao', 0.1],
               skill: { name: 'Mordida', chance: 0.25, kind: 'phys', power: 1.4 } },
  loboVelho: { name: 'Lobo Velho',    hp: 170, atk: 30, def: 8, res: 3, agi: 11, xp: 30, sprite: 'wolf', drop: ['eter', 0.5],
               recolor: { '#e8eff8': '#a2a2ac', '#cbd8ec': '#7a7a82', '#a4b8da': '#55555e', '#7488b8': '#26262e' }, // the grey leader of the pack
               skill: { name: 'Mordida Funda', chance: 0.3, kind: 'phys', power: 1.6 } },
  corvo:     { name: 'Corvo',         hp: 42, atk: 21, def: 2, res: 1, agi: 16, xp: 6, sprite: 'bat', float: true,
               recolor: { '#a84ad8': '#55555e', '#72308e': '#26262e', '#40145a': '#26202e', '#3a1448': '#26202e' } }, // a black crow until it has its own art
  encapuzado: { name: 'Encapuzado', hp: 44, atk: 17, def: 5, res: 2, agi: 6, xp: 10, sprite: 'hooded', drop: ['pocao', 0.25] },
  // Chefe do prólogo (prologo.md)
  sineiro:   { name: 'O Sineiro', hp: 650, atk: 24, def: 25, res: 10, agi: 11, xp: 0, chama: 20, dreno: 24, sprite: 'bellringer', undead: true, boss: true,
               say: {
                 intro: 'O Sineiro ergue o sino de bronze. Em algum lugar acima, a terra das covas estremece.\n"O último toque foi há cinquenta anos. Ninguém mais desce."',
                 enrage: 'O Sineiro sacode o sino com fúria! "Ninguém mais desce!"',
                 hit: t => `O Sineiro golpeia ${t} com o sino!`,
                 aoe: 'O Sineiro toca a Badalada! O som atravessa os ossos.',
                 drain: t => `O Sineiro entoa um dobre fúnebre por ${t}!`,
                 stagger: 'O Sineiro cambaleia...',
                 whisper: n => `O Sineiro sussurra: "${n}... o sino vai tocar por você."`, // o aviso da Ana: chamar pelo nome
                 noRun: 'O Sineiro barra a última porta. Não há para onde fugir!',
               } },
};

// Itens de missão (não aparecem na batalha)
// ---------- Field exploration (src/field.js) ----------
// Each hero's way of changing the world outside battle. No PM, no Energia. first: what the party says the first time
// the verb is used (G.seen 'campo:<verb>'), never again
const FIELD_VERBS = {
  acende:    { hero: 'lyra',    word: 'acende',    fx: 'fire',  first: [[null, 'Lyra estala os dedos e a chama pula para o pavio.'], ['lyra', 'Acender coisas é a melhor parte de ser maga.', 'alegre']] },
  derrete:   { hero: 'lyra',    word: 'derrete',   fx: 'fire' },
  congela:   { hero: 'lyra',    word: 'congela',   fx: 'ice',   first: [['lyra', 'Se eu congelar o riacho, a gente passa. Se eu errar, a gente nada.'], ['teo', 'Então não erre.']] },
  empurra:   { hero: 'aldo',    word: 'empurra',   fx: 'push',  first: [['andilla', 'Eu ia sugerir dar a volta.'], ['aldo', 'Esse é o caminho.']] },
  atravessa: { hero: 'andilla', word: 'atravessa', fx: 'step',  first: [['andilla', 'Ninguém olhe para baixo. Eu já olhei. Não ajuda.']] },
  abre:      { hero: 'andilla', word: 'abre',      fx: 'step',  first: [['andilla', 'Fechadura de estrada. Quem fez queria que alguém abrisse.', 'alegre']] },
  ilumina:   { hero: 'teo',     word: 'ilumina',   fx: 'holy' },
  cura:      { hero: 'teo',     word: 'cura',      fx: 'heal',  first: [['teo', 'Calma. Ninguém vai te deixar aqui.'], ['aldo', 'Ele confia mais em você do que em mim.'], ['teo', 'Cavalo sabe de quem gostar.', 'alegre']] },
};
// Kinds of field object: the verb that acts on it, whether it stops the party, whether it goes away once done
// (melted ice), whether it can be pushed and how far its light reaches once lit (tiles)
const FIELD_KINDS = {
  lamp:     { verb: 'acende',    block: true, light: 3 },
  fire:     { verb: 'acende',    block: true, light: 3 },
  iceBlock: { verb: 'derrete',   block: true, gone: true },
  icicles:  { verb: 'derrete',   block: true, gone: true },
  log:      { verb: 'empurra',   block: true, push: true },
  rock:     { verb: 'empurra',   block: true, push: true },
  post:     { verb: 'empurra',   block: true, push: true },
  beam:     { verb: 'atravessa', block: true },
  chest:    { verb: 'abre',      block: true },
  rune:     { verb: 'ilumina',   block: true },
  hurt:     { verb: 'cura',      block: true },
  sign:     { block: true },               // a stone with something to read (look)
  rope:     { gone: true },                // the loose rope bridge, drawn over the ravine until it is tied
};

const KEY_ITEMS = {
  // O texto da carta fica em docs/mundo/historias/prologo.md até o capítulo em que ela for aberta
  carta: { name: 'Carta com o selo real', desc: 'Item de missão',
    sealedName: 'Carta com o selo real',
    get sealed() { return [...(typeof G !== 'undefined' && G.chapter >= 1 ? ['Teo guarda a carta num estojo de couro, por dentro da roupa, junto ao peito.'] : []), 'O leão de Hanokh está inteiro.', 'Só alguém do sangue de Hanokh pode rompê-lo. Teo não vai abri-la.']; } },
  // Capítulo 1: what Clara gave Aldo at the west road of Valmor. Closed; it opens only in Erukh
  bilhete: { name: 'Bilhete da Clara', desc: 'Item de missão',
    get text() { return ['Um bilhete dobrado, fechado com um pingo de cera.', `"Abre quando chegar em Erukh." ${heroName('aldo')} não abre.`]; } },
  estojo: { name: 'Estojo de ganchos', desc: 'Item de missão',
    text: ['Um estojo de couro cheio de ganchinhos de metal.', 'Ferramenta de quem abre o que não é seu.'] },
};

function xpNext(lv) { return Math.floor(12 * Math.pow(lv, 1.9)); }

// ===== Diário de missões =====
// Textos do storyteller (docs/mundo/historias/abertura-o-mensageiro-ferido.md, "Diário de missões").
// O título e o objetivo mudam com a etapa; as anotações se acumulam conforme o grupo descobre as coisas.
const four = () => G.party.length === 4;
const JOURNAL = {
  // 'Quatro cantos' and 'reunir um grupo de quatro': only old saves reach them (the party is four since the tavern night)
  title: () => G.bossDead ? 'A caminho de Erukh' : G.seen.lapide ? 'O rei sob a cripta'
    : G.quest && four() ? 'O que acorda os mortos' : G.quest ? 'Quatro cantos'
    : G.intro ? 'A carta com o selo real' : G.seen.job ? 'As covas abertas' : 'Um pouso para o inverno',
  goal: () => G.bossDead ? 'levar a carta com o selo real à rainha Lara, em Erukh.'
    : G.seen.altar ? 'passar por quem guarda a última porta da cripta.'
    : G.seen.lapide ? 'seguir o túnel até o túmulo do rei, no fundo da cripta.'
    : G.reached >= 1 ? 'explorar a cripta. A fonte de luz cura e salva.'
    : G.quest && four() ? 'descer à cripta e descobrir o que acorda os mortos.'
    : G.quest ? 'reunir um grupo de quatro. Há gente de estrada na taverna.'
    : G.intro ? 'falar com o ancião Bertoldo, na casa de telhado verde.'
    : inParty('teo') ? 'voltar à taverna e contar à Berta o que viram.'
    : G.seen.job ? 'investigar as covas abertas no cemitério, atrás da capela.'
    : 'achar pouso na Taverna Poney Saltitante.',
  notes: [
    { show: () => inParty('lyra'), get text() { return `Lyra, irmã caçula de ${heroName('aldo')}, chegou na carroça do correio. Veio ver o irmão e a fonte de luz da cripta.`; } },
    { show: () => G.seen.job, text: 'A Berta troca o quarto por um favor: ver as covas abertas do cemitério.' },
    { show: () => G.seen.covas, text: 'Algumas covas foram cavadas de fora, com pá. Outras foram abertas por dentro.' },
    { show: () => G.seen.estojo && !G.seen.andillaNome, text: 'Junto de uma cova cavada, um estojo de ganchos de ladrão. De quem?' },
    { show: () => G.seen.estojo && G.seen.andillaNome, text: () => `Junto de uma cova cavada, um estojo de ganchos. Era da ${heroName('andilla')}.` },
    { show: () => inParty('teo'), text: 'Duas Ossadas se ergueram no cemitério. Teo, aprendiz que sonha servir no Templo, veio conosco.' },
    { show: () => G.intro, text: 'Um mensageiro ferido caiu na taverna com uma carta para a rainha.' },
    { show: () => G.intro, text: 'Os encapuzados vieram atrás dele. No peito, um olho cortado ao meio.' },
    { show: () => G.intro && inParty('andilla'), get text() { return `A moça dos dados se chama ${heroName('andilla')}. Ganha no dado e na faca. Não diz de onde vem.`; } },
    { show: () => G.intro && inParty('andilla'), get text() { return `${heroName('andilla')} viu gente de capa cinza cavando no cemitério. Não diz o que fazia lá.`; } },
    { show: () => G.intro, text: 'A carta tem o selo real, o leão de Hanokh. Só o sangue de Hanokh pode rompê-lo, e a rainha Lara é desse sangue.' },
    { show: () => G.intro, text: 'De madrugada, um sino tocou ao longe. Ninguém sabe quem tocou.' },
    { show: () => G.intro, text: 'Toda noite em que o sino toca, mais covas amanhecem abertas por dentro.' },
    { show: () => G.quest, text: 'O mensageiro delira "o selo... o selo" e não diz o próprio nome.' },
    { show: () => G.quest, text: 'O sino era o da igreja velha, vazia há cinquenta anos. Sob ela, no fundo da cripta, dorme um rei. O ancião não quis dizer o nome.' },
    { show: () => G.quest, text: 'Os paladinos que fecharam a cripta eram quatro. O ancião quer quatro para descer.' },
    { show: () => G.seen.paladino, text: 'Na lápide da cova mais antiga, uma espada erguida: o sinal de um paladino.' },
    { show: () => G.reached >= 1, text: 'A marca dos encapuzados está pintada na parede da cripta. Eles já estiveram aqui.' },
    { show: () => G.seen.lapide, text: 'Uma lápide diz o nome do rei: Morvath. Ele traiu a luz.' },
    { show: () => G.seen.pistaTunel, text: 'No túnel da cripta, sangue seco e um pedaço de capa marrom, de viajante. Alguém desceu ali sem ser dos encapuzados.' },
    { show: () => G.seen.bilhete, text: 'Um bilhete assinado "V.": o selo cede, e "o homem do sumo sacerdote" não pode sair de Valmor. Quem é V.?' },
    { show: () => G.seen.altar, text: 'No altar, escreveram "O rei voltará". Os encapuzados servem a Morvath?' },
    { show: () => G.seen.buraco, text: 'No fundo da cripta, uma parede arrombada. Em cima do buraco, entalhado na pedra, o leão de Hanokh, rachado de cima a baixo.' },
    { show: () => G.bossDead, text: 'O Sineiro, um morto da igreja velha, guardava a última porta. Era ele quem tocava o sino, e o sino acordava os mortos.' },
    { show: () => G.bossDead, text: 'O túmulo de Morvath estava arrombado e vazio, com o leão da tampa partido ao meio. Sob as quatro espadas erguidas dos paladinos, quatro nichos vazios. Alguém levou o que estava lá.' },
    { show: () => G.bossDead && inParty('andilla'), get text() { return `${heroName('andilla')} não cavou as covas. Então quem cavou, e por quê?`; } },
    { show: () => G.bossDead, text: 'O mensageiro acordou. Disse o nome: Tobias. Perguntou se a carta continuava fechada e chorou.' },
    { show: () => G.bossDead, text: 'Tobias pediu: a carta vai fechada até a rainha. Em Erukh, não confiar em ninguém antes dela.' },
  ],
};
const journalGoal = () => JOURNAL.goal();

// Diário · dicas: what the game has explained so far
const TIPS = [
  { show: () => G.seen.dicaTatica || G.seen.macro, get text() { return MACRO_TIP + ' Esc interrompe.'; } },
];

if (typeof module !== 'undefined') module.exports = { ENERGY, MAX_LEVEL, ELOS, BATTLE_LINES, ENEMIES, FLOORS, CRYPT_FLOORS, floorKey, savedFloor, oldCryptKey, PARTY_DEFS, SPELLS, ITEMS, EQUIPS, KEY_ITEMS, STAT_FULL, START_GEAR, HERO_STORY, FIELD_VERBS, FIELD_KINDS };
