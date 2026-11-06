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

const PARTY_DEFS = [
  {
    id: 'aldo', name: 'Aldo', cls: 'Guerreiro', color: '#e0a040',
    base: { hp: 48, mp: 8, atk: 13, def: 9, mag: 3, agi: 7 },
    grow: { hp: 10, mp: 1, atk: 3, def: 2, mag: 0.5, agi: 1 },
    spells: [[1, 'golpe'], [5, 'furia']], skillWord: 'Técnica',
  },
  {
    id: 'lyra', name: 'Lyra', cls: 'Maga', color: '#d070e0',
    base: { hp: 30, mp: 20, atk: 6, def: 4, mag: 12, agi: 10 },
    grow: { hp: 5, mp: 4, atk: 1, def: 1, mag: 3, agi: 1.2 },
    spells: [[1, 'fogo'], [3, 'gelo'], [6, 'raio']], skillWord: 'Magia',
  },
  {
    id: 'teo', name: 'Teo', cls: 'Clérigo', color: '#60d0a0',
    base: { hp: 36, mp: 16, atk: 9, def: 6, mag: 9, agi: 6 },
    grow: { hp: 7, mp: 3, atk: 2, def: 1.5, mag: 2, agi: 1 },
    spells: [[1, 'cura'], [2, 'luz'], [4, 'reviver'], [6, 'curaTotal']], skillWord: 'Magia',
  },
  {
    // até dizer o nome na noite da taverna (G.seen.andillaAnon), ela é a moça dos dados também no cartão e na batalha
    id: 'andilla', get name() { return typeof G !== 'undefined' && G.seen && G.seen.andillaAnon ? 'Moça dos dados' : 'Andilla'; }, cls: 'Ladina', color: '#e05a5a',
    base: { hp: 34, mp: 10, atk: 11, def: 5, mag: 4, agi: 14 },
    grow: { hp: 6, mp: 2, atk: 2.5, def: 1.2, mag: 0.5, agi: 1.6 },
    spells: [[1, 'golpeBaixo'], [4, 'leque']], skillWord: 'Truque',
  },
];

const SPELLS = {
  golpe:     { name: 'Golpe Forte', mp: 4,  target: 'enemy',      kind: 'phys',   power: 1.8, fx: 'slash', desc: 'Um golpe com toda a força.' },
  furia:     { name: 'Fúria',       mp: 8,  target: 'allEnemies', kind: 'phys',   power: 1.15, fx: 'slash', desc: 'Gira a espada contra todos.' },
  fogo:      { name: 'Fogo',        mp: 4,  target: 'enemy',      kind: 'mag',    power: 2.2, base: 8,  fx: 'fire', desc: 'Uma chama que queima um inimigo.' },
  gelo:      { name: 'Gelo',        mp: 8,  target: 'allEnemies', kind: 'mag',    power: 1.4, base: 6,  fx: 'ice', desc: 'Geada sobre todos os inimigos.' },
  raio:      { name: 'Raio',        mp: 12, target: 'enemy',      kind: 'mag',    power: 3.4, base: 16, fx: 'bolt', desc: 'Um raio forte num inimigo só.' },
  cura:      { name: 'Cura',        mp: 3,  target: 'ally',       kind: 'heal',   power: 2,   base: 20, field: true, desc: 'Fecha as feridas de um aliado.' },
  luz:       { name: 'Luz Sagrada', mp: 5,  target: 'enemy',      kind: 'holy',   power: 2,   base: 10, fx: 'holy', desc: 'Luz que fere. Dobra contra mortos-vivos.' },
  reviver:   { name: 'Reviver',     mp: 12, target: 'deadAlly',   kind: 'revive', field: true, desc: 'Põe de pé um aliado caído.' },
  curaTotal: { name: 'Cura Total',  mp: 10, target: 'allAllies',  kind: 'heal',   power: 1.5, base: 15, field: true, desc: 'Cura todo o grupo de uma vez.' },
  golpeBaixo: { name: 'Golpe Baixo',   mp: 3,  target: 'enemy',      kind: 'phys',   power: 1.4, pierce: true, fx: 'slash', desc: 'Acerta onde a armadura não cobre.' },
  leque:      { name: 'Leque de Facas', mp: 6, target: 'allEnemies', kind: 'phys',   power: 0.8, fx: 'slash', desc: 'Facas para todos os inimigos.' },
};

const ITEMS = {
  pocao:  { name: 'Poção',      desc: 'Recupera 50 PV',             target: 'ally' },
  eter:   { name: 'Éter',       desc: 'Recupera 20 PM',             target: 'ally' },
  pena:   { name: 'Pena Vital', desc: 'Revive um aliado caído',     target: 'deadAlly' },
  elixir: { name: 'Elixir',     desc: 'Restaura todo o grupo',      target: 'allAllies' },
};

const EQUIPS = {
  espadaFerro:  { name: 'Espada de Ferro', who: 'aldo', slot: 'arma',     icon: 'atk',   bonus: { atk: 6 } },
  cotaMalha:    { name: 'Cota de Malha',   who: 'aldo', slot: 'armadura', icon: 'def',   bonus: { def: 6 } },
  cajadoRunico: { name: 'Cajado Rúnico',   who: 'lyra', slot: 'arma',     icon: 'spell', bonus: { mag: 6 } },
  espadaPrata:  { name: 'Espada de Prata', who: 'aldo', slot: 'arma',     icon: 'atk',   bonus: { atk: 10 } },
  mantoSagrado: { name: 'Manto Sagrado',   who: 'teo',  slot: 'armadura', icon: 'def',   bonus: { def: 5, mag: 5 } },
};

// Heroes screen: attribute names in full, the starting gear of each hero (shown until something better is found)
const STAT_FULL = { atk: 'Ataque', def: 'Defesa', mag: 'Magia', agi: 'Agilidade' };
const START_GEAR = {
  aldo:    { arma: { name: 'Espada de viagem', icon: 'atk' },  armadura: { name: 'Túnica de couro', icon: 'def' } },
  lyra:    { arma: { name: 'Cajado de estudo', icon: 'spell' }, armadura: { name: 'Vestido de viagem', icon: 'def' } },
  teo:     { arma: { name: 'Maça de noviço', icon: 'atk' },    armadura: { name: 'Hábito branco', icon: 'def' } },
  andilla: { arma: { name: 'Adaga', icon: 'atk' },             armadura: { name: 'Capa cinza', icon: 'def' } },
};
// The story of each hero grows with the game: a line shows once its flag is set (flags: G.seen, plus quest, bossDead, carta)
const HERO_STORY = {
  aldo: {
    lines: [
      { text: 'Chegou a Valmor sozinho, com a espada nas costas e a bolsa vazia. Diz que veio procurar trabalho.' },
      { text: 'A vila inteira sabe que ele volta por causa da Clara, a professora. Ninguém diz isso na cara dele.' },
      { when: 'quest', text: 'Aceitou o pedido do ancião: descer à cripta da igreja velha e calar o sino.' },
      { when: 'bossDead', text: 'O sino de Valmor parou. Agora a estrada leva a Erukh.' },
    ],
    quotes: [{ text: 'Vim procurar trabalho. Só isso.' }, { when: 'bossDead', text: 'Trabalho não falta. Isso eu garanto.' }],
  },
  lyra: {
    lines: [
      { text: 'Irmã caçula do Aldo. Chegou na carroça do correio, com mais livros que bagagem.' },
      { text: 'Veio por duas coisas: o irmão e a fonte de luz de Valmor.' },
      { when: 'fonteLyra', text: 'Tocou a água da fonte e sentiu que ela lembra de quem passa.' },
    ],
    quotes: [{ text: 'Aldo vê a professora. Aldo esquece como se anda.' }, { when: 'fonteLyra', text: 'A água lembra de quem passa. Dá para sentir.' }],
  },
  teo: {
    lines: [
      { text: 'Noviço que veio ajudar a irmã Irene no inverno.' },
      { when: 'teoWin', text: 'O grupo o achou no cemitério, cercado de mortos que não ficavam quietos.' },
      { when: 'carta', text: 'Guarda uma carta com o selo real e não vai rompê-lo. Só a rainha pode.' },
    ],
    quotes: [{ text: 'Os mortos merecem descanso. Os vivos também.' }],
  },
  andilla: {
    lines: [
      { text: 'Joga dados na taverna e ganha mais do que devia.' },
      { when: 'andillaNome', text: 'Diz que se chama Andilla. Perdeu um estojo de ganchos no cemitério e não explica para que serve.' },
      { when: 'bossDead', text: 'Ficou no grupo. Diz que é pelo ouro.' },
    ],
    quotes: [{ text: 'Tudo tem preço. Até a coragem.' }, { when: 'porque', text: 'Porta caída, telhado aberto. Pelo menos não vou precisar dos ganchos.' }],
  },
};

const STAT_NAMES = { atk: 'ATQ', def: 'DEF', mag: 'MAG', agi: 'AGI', hp: 'PV', mp: 'PM' };

const ENEMIES = {
  rato:      { name: 'Rato Gigante',    hp: 52,  atk: 21, def: 2,  agi: 8,  xp: 8,  sprite: 'rat', drop: ['pocao', 0.08] },
  morcego:   { name: 'Morcego Vampiro', hp: 38,  atk: 20, def: 1,  agi: 14, xp: 7,  sprite: 'bat', float: true,
               skill: { name: 'Mordida Vampira', chance: 0.3, kind: 'drain', power: 1.0 } },
  gosma:     { name: 'Gosma Verde',     hp: 64,  atk: 20, def: 5,  agi: 5,  xp: 9,  sprite: 'slime', drop: ['eter', 0.06] },
  esqueleto: { name: 'Esqueleto',       hp: 56,  atk: 20, def: 7,  agi: 8,  xp: 16, sprite: 'skeleton', undead: true,
               recolor: { '#a8323e': '#3a78c8', '#e86a7a': '#8ac0f0', '#3a78c8': '#a8323e', '#2c3c80': '#7a1a24', '#1c2860': '#4a0c14' }, drop: ['pocao', 0.1] },
  aranha:    { name: 'Aranha Tumular',  hp: 48,  atk: 19, def: 5,  agi: 14, xp: 15, sprite: 'spider',
               skill: { name: 'Ferroada', chance: 0.25, kind: 'phys', power: 1.5 } },
  goblin:    { name: 'Goblin Lanceiro', hp: 62,  atk: 21, def: 8,  agi: 9,  xp: 18, sprite: 'goblin',
               pal: { base: '#6aa040', light: '#9ad06a', dark: '#2e5418', eye: '#ffe040' }, drop: ['pocao', 0.15] },
  cavaleiro: { name: 'Cavaleiro Negro', hp: 85,  atk: 27, def: 15, agi: 8,  xp: 40, sprite: 'knight',
               pal: { base: '#3a3a4a', light: '#80809a', dark: '#141418', eye: '#ff2020' },
               skill: { name: 'Corte Brutal', chance: 0.2, kind: 'phys', power: 1.6 }, drop: ['pena', 0.08] },
  espectro:  { name: 'Espectro',        hp: 62,  atk: 22, def: 9,  agi: 15, xp: 36, sprite: 'ghost', undead: true, float: true,
               pal: { base: '#7fb0d0', light: '#d8f0ff', dark: '#2a4a6a', eye: '#80ffff' },
               skill: { name: 'Toque Gélido', chance: 0.35, kind: 'mag', power: 30 }, drop: ['eter', 0.15] },
  golem:     { name: 'Golem de Pedra',  hp: 130, atk: 30, def: 22, agi: 4,  xp: 48, sprite: 'golem',
               pal: { base: '#7a7266', light: '#aaa296', dark: '#3c3830', eye: '#ffa020' }, drop: ['pocao', 0.2] },
  // Cemitério de Valmor: mais fracos que os da cripta, para Aldo e Lyra aprenderem
  ratoCova:    { name: 'Rato de Cova', hp: 24, atk: 11, def: 1, agi: 6,  xp: 4, sprite: 'rat',
               recolor: { '#b07c58': '#a2a2ac', '#9a6232': '#7a7a82', '#6a3a1a': '#55555e', '#4a2610': '#26262e' } }, // rato cinza do cemitério
  morcegoCova: { name: 'Morcego',      hp: 16, atk: 10, def: 0, agi: 12, xp: 3, sprite: 'bat', float: true,
               recolor: { '#a84ad8': '#7a7a82', '#72308e': '#55555e', '#40145a': '#26262e', '#3a1448': '#26202e' } }, // morcego cinzento do cemitério
  ossada:      { name: 'Ossada',       hp: 44, atk: 13, def: 3, agi: 5,  xp: 6, sprite: 'skeleton', undead: true, drop: ['pocao', 0.2] },
  encapuzado: { name: 'Encapuzado', hp: 44, atk: 17, def: 3, agi: 6, xp: 10, sprite: 'hooded', drop: ['pocao', 0.25] },
  // Chefe do prólogo (prologo.md)
  sineiro:   { name: 'O Sineiro', hp: 600, atk: 24, def: 14, agi: 11, xp: 0, chama: 20, dreno: 24, sprite: 'bellringer', undead: true, boss: true,
               say: {
                 intro: 'O Sineiro ergue o sino de bronze.\n"A missa acabou faz cinquenta anos. Ninguém mais desce."',
                 enrage: 'O Sineiro sacode o sino com fúria! "Ninguém mais desce!"',
                 hit: t => `O Sineiro golpeia ${t} com o sino!`,
                 aoe: 'O Sineiro toca a Badalada! O som atravessa os ossos.',
                 drain: t => `O Sineiro entoa um dobre fúnebre por ${t}!`,
                 stagger: 'O Sineiro cambaleia...',
                 whisper: n => `O Sineiro sussurra: "${n}... a missa vai começar."`, // o aviso da Ana: chamar pelo nome
                 noRun: 'O Sineiro barra a última porta. Não há para onde fugir!',
               } },
};

// Itens de missão (não aparecem na batalha)
const KEY_ITEMS = {
  // O texto da carta fica em docs/mundo/historias/prologo.md até o capítulo em que ela for aberta
  carta: { name: 'Carta com o selo real', desc: 'Item de missão',
    sealedName: 'Carta com o selo real', sealed: ['O selo real está inteiro.', 'Teo não vai rompê-lo. Só a rainha pode.'] },
  estojo: { name: 'Estojo de ganchos', desc: 'Item de missão',
    text: ['Um estojo de couro cheio de ganchinhos de metal.', 'Ferramenta de quem abre o que não é seu.'] },
};

function xpNext(lv) { return Math.floor(12 * Math.pow(lv, 1.9)); }

// ===== Diário de missões =====
// Textos do storyteller (docs/mundo/historias/abertura-o-mensageiro-ferido.md, "Diário de missões").
// O título e o objetivo mudam com a etapa; as anotações se acumulam conforme o grupo descobre as coisas.
const four = () => G.party.length === 4;
const JOURNAL = {
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
    { show: () => G.seen.job, text: 'A Berta troca o quarto por um favor: ver as covas abertas do cemitério.' },
    { show: () => G.seen.covas, text: 'Algumas covas foram cavadas de fora, com pá. Outras foram abertas por dentro.' },
    { show: () => G.key.estojo || inParty('andilla'), text: 'Junto de uma cova cavada, um estojo de ganchos de ladrão. De quem?' },
    { show: () => inParty('teo'), text: 'Duas Ossadas se ergueram no cemitério. Teo, noviço da Ordem de Erukh, veio conosco.' },
    { show: () => G.intro, text: 'Um mensageiro ferido caiu na taverna com uma carta para a rainha.' },
    { show: () => G.intro, text: 'Os encapuzados tentaram tomá-la. No peito, um olho cortado ao meio.' },
    { show: () => G.intro && inParty('andilla'), get text() { return `A moça dos dados se chama ${heroName('andilla')}. Ganha no dado e na faca. Não diz de onde vem.`; } },
    { show: () => G.intro && inParty('andilla'), get text() { return `${heroName('andilla')} viu gente de capa cinza cavando no cemitério. Não diz o que fazia lá.`; } },
    { show: () => G.intro, text: 'A carta tem o selo real. Teo não quer rompê-lo: quem abrir tem de ter o direito.' },
    { show: () => G.intro, text: 'De madrugada, um sino tocou ao longe. Ninguém sabe quem tocou.' },
    { show: () => G.quest, text: 'O mensageiro delira "o selo... o selo" e não diz o próprio nome.' },
    { show: () => G.quest, text: 'O sino era o da igreja velha, vazia há cinquenta anos. Sob ela, no fundo da cripta, dorme um rei. O ancião não quis dizer o nome.' },
    { show: () => G.quest, text: 'Os paladinos que fecharam a cripta eram quatro. O ancião quer quatro para descer.' },
    { show: () => inParty('lyra'), get text() { return `Lyra, irmã caçula de ${heroName('aldo')}, chegou na carroça do correio. Veio ver o irmão e a fonte de luz da cripta.`; } },
    { show: () => G.seen.paladino, text: 'Na lápide da cova mais antiga, o símbolo de um paladino.' },
    { show: () => G.reached >= 1, text: 'A marca dos encapuzados está pintada na parede da cripta. Eles já estiveram aqui.' },
    { show: () => G.seen.lapide, text: 'Uma lápide diz o nome do rei: Morvath. Ele traiu a luz.' },
    { show: () => G.seen.pistaTunel, text: 'No túnel da cripta, sangue seco e um pedaço de capa marrom, de viajante. Alguém desceu ali sem ser dos encapuzados.' },
    { show: () => G.seen.bilhete, text: 'Um bilhete assinado "V.": o selo cede, e "o homem do sumo sacerdote" não pode sair de Valmor. Quem é V.?' },
    { show: () => G.seen.altar, text: 'No altar, escreveram "O rei voltará". Os encapuzados adoram Morvath?' },
    { show: () => G.bossDead, text: 'O Sineiro, um morto da igreja velha, guardava a última porta. Era ele quem tocava o sino.' },
    { show: () => G.bossDead, text: 'O túmulo de Morvath estava arrombado e vazio. Sob os símbolos dos paladinos, quatro nichos vazios. Alguém levou o que estava lá.' },
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

if (typeof module !== 'undefined') module.exports = { ENEMIES, FLOORS, PARTY_DEFS, SPELLS, ITEMS, EQUIPS, KEY_ITEMS, STAT_FULL, START_GEAR, HERO_STORY };
