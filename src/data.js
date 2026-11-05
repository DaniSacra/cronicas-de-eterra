// ===== Dados do jogo =====

// Nome do jogo: trocar aqui muda a tela de título e a aba do navegador ("\n" quebra a linha do logo)
const GAME = {
  title: 'CRÔNICAS\nDE ETERRA',
  subtitle: 'Os Reis Caídos',
  tab: 'Crônicas de Eterra: Os Reis Caídos', // nome na aba do navegador
  credit: '© 2026 Daniel · Uma história de Eterra',
};

// Primeira missão: uma cripta curta, de um andar só, para aprender a jogar (pedido do Daniel, 2026-11-04).
// A fonte fica no meio do caminho e Morvath no fundo.
const FLOORS = [
  {
    name: 'Cripta de Valmor', short: 'B1', seed: 7331, size: 15, rooms: 2, loops: 0.06, fountainAt: 0.5, boss: true,
    pal: { stone: [104, 98, 88], mortar: [28, 25, 22], floor: [70, 64, 56], floorJ: [30, 26, 22], ceil: [42, 38, 34], accent: [76, 94, 50] }, // calcário velho, musgo
    loot: ['pocao', 'espadaFerro', 'eter', 'cajadoRunico', 'pocao'],
    enemies: ['rato', 'morcego', 'gosma'], maxGroup: 3,
  },
];

// Andares das versões antigas, guardados para as próximas dungeons (não são usados agora)
const FLOORS_FUTURO = [
  {
    name: 'Cripta Sangrenta', short: 'B2', seed: 4242, size: 21, rooms: 3, loops: 0.07, fountainAt: 0.5,
    pal: { stone: [146, 86, 64], mortar: [58, 36, 28], floor: [94, 72, 60], floorJ: [40, 28, 22], ceil: [54, 38, 32], accent: [170, 130, 60] },
    loot: ['pena', 'pocao', 'cajadoRunico', 'cotaMalha', 'eter'],
    enemies: ['esqueleto', 'aranha', 'goblin'], maxGroup: 3,
  },
  {
    name: 'Santuário de Morvath', short: 'B3', seed: 9001, size: 23, rooms: 3, loops: 0.08, fountainAt: 0.5, boss: true,
    pal: { stone: [94, 64, 120], mortar: [34, 20, 46], floor: [66, 50, 78], floorJ: [26, 16, 32], ceil: [32, 22, 42], accent: [180, 50, 90] },
    loot: ['elixir', 'espadaPrata', 'mantoSagrado', 'pena', 'pocao', 'eter'],
    enemies: ['cavaleiro', 'espectro', 'golem'], maxGroup: 3,
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
    id: 'andilla', name: 'Andilla', cls: 'Ladina', color: '#e05a5a',
    base: { hp: 34, mp: 10, atk: 11, def: 5, mag: 4, agi: 14 },
    grow: { hp: 6, mp: 2, atk: 2.5, def: 1.2, mag: 0.5, agi: 1.6 },
    spells: [[1, 'golpeBaixo'], [4, 'leque']], skillWord: 'Truque',
  },
];

const SPELLS = {
  golpe:     { name: 'Golpe Forte', mp: 4,  target: 'enemy',      kind: 'phys',   power: 1.8, fx: 'slash' },
  furia:     { name: 'Fúria',       mp: 8,  target: 'allEnemies', kind: 'phys',   power: 1.15, fx: 'slash' },
  fogo:      { name: 'Fogo',        mp: 4,  target: 'enemy',      kind: 'mag',    power: 2.2, base: 8,  fx: 'fire' },
  gelo:      { name: 'Gelo',        mp: 8,  target: 'allEnemies', kind: 'mag',    power: 1.4, base: 6,  fx: 'ice' },
  raio:      { name: 'Raio',        mp: 12, target: 'enemy',      kind: 'mag',    power: 3.4, base: 16, fx: 'bolt' },
  cura:      { name: 'Cura',        mp: 3,  target: 'ally',       kind: 'heal',   power: 2,   base: 20, field: true },
  luz:       { name: 'Luz Sagrada', mp: 5,  target: 'enemy',      kind: 'holy',   power: 2,   base: 10, fx: 'holy' },
  reviver:   { name: 'Reviver',     mp: 12, target: 'deadAlly',   kind: 'revive', field: true },
  curaTotal: { name: 'Cura Total',  mp: 10, target: 'allAllies',  kind: 'heal',   power: 1.5, base: 15, field: true },
  golpeBaixo: { name: 'Golpe Baixo',   mp: 3,  target: 'enemy',      kind: 'phys',   power: 1.4, pierce: true, fx: 'slash' },
  leque:      { name: 'Leque de Facas', mp: 6, target: 'allEnemies', kind: 'phys',   power: 0.8, fx: 'slash' },
};

const ITEMS = {
  pocao:  { name: 'Poção',      desc: 'Recupera 50 PV',             target: 'ally' },
  eter:   { name: 'Éter',       desc: 'Recupera 20 PM',             target: 'ally' },
  pena:   { name: 'Pena Vital', desc: 'Revive um aliado caído',     target: 'deadAlly' },
  elixir: { name: 'Elixir',     desc: 'Restaura todo o grupo',      target: 'allAllies' },
};

const EQUIPS = {
  espadaFerro:  { name: 'Espada de Ferro', who: 'aldo', bonus: { atk: 6 } },
  cotaMalha:    { name: 'Cota de Malha',   who: 'aldo', bonus: { def: 6 } },
  cajadoRunico: { name: 'Cajado Rúnico',   who: 'lyra', bonus: { mag: 6 } },
  espadaPrata:  { name: 'Espada de Prata', who: 'aldo', bonus: { atk: 10 } },
  mantoSagrado: { name: 'Manto Sagrado',   who: 'teo',  bonus: { def: 5, mag: 5 } },
};

const STAT_NAMES = { atk: 'ATQ', def: 'DEF', mag: 'MAG', agi: 'AGI', hp: 'PV', mp: 'PM' };

const ENEMIES = {
  rato:      { name: 'Rato Gigante',    hp: 32,  atk: 15, def: 2,  agi: 8,  xp: 6,  sprite: 'rat',
               pal: { base: '#8a6f5a', light: '#c0a088', dark: '#4a3a2e', eye: '#ff3030' }, drop: ['pocao', 0.08] },
  morcego:   { name: 'Morcego Vampiro', hp: 26,  atk: 14, def: 1,  agi: 14, xp: 5,  sprite: 'bat', float: true,
               pal: { base: '#5a4070', light: '#9a7ab8', dark: '#24142f', eye: '#ffdd33' },
               skill: { name: 'Mordida Vampira', chance: 0.3, kind: 'drain', power: 1.0 } },
  gosma:     { name: 'Gosma Verde',     hp: 40,  atk: 14, def: 5,  agi: 5,  xp: 7,  sprite: 'slime',
               pal: { base: '#4caf50', light: '#b0f090', dark: '#1e5e22', eye: '#fff' }, drop: ['eter', 0.06] },
  esqueleto: { name: 'Esqueleto',       hp: 56,  atk: 20, def: 7,  agi: 8,  xp: 16, sprite: 'skeleton', undead: true,
               pal: { base: '#ddd6c4', light: '#fffaf0', dark: '#8a8270', eye: '#ff4040' }, drop: ['pocao', 0.1] },
  aranha:    { name: 'Aranha Tumular',  hp: 48,  atk: 19, def: 5,  agi: 14, xp: 15, sprite: 'spider',
               pal: { base: '#44444f', light: '#7a7a8a', dark: '#16161c', eye: '#ff2020' },
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
  // Cemitério de Valmor: mais fracos que os da cripta, para o Aldo aprender sozinho
  ratoCova:    { name: 'Rato de Cova', hp: 14, atk: 8,  def: 1, agi: 6,  xp: 4, sprite: 'rat',
               pal: { base: '#7a7068', light: '#a89c90', dark: '#3e3830', eye: '#ff5050' } },
  morcegoCova: { name: 'Morcego',      hp: 10, atk: 8,  def: 0, agi: 12, xp: 3, sprite: 'bat', float: true,
               pal: { base: '#5a4a5a', light: '#8a7a8a', dark: '#2a1e2a', eye: '#ffdd33' } },
  ossada:      { name: 'Ossada',       hp: 22, atk: 10, def: 3, agi: 5,  xp: 6, sprite: 'skeleton', undead: true,
               pal: { base: '#c8c0aa', light: '#ece6d4', dark: '#6e6656', eye: '#c0ff60' }, drop: ['pocao', 0.2] },
  encapuzado: { name: 'Encapuzado', hp: 28, atk: 12, def: 3, agi: 6, xp: 10, sprite: 'hooded',
               pal: { base: '#6e6e78', light: '#a0a0aa', dark: '#2e2e36', eye: '#e02030' }, drop: ['pocao', 0.25] },
  morvath:   { name: 'Morvath, o Lich-Rei', hp: 310, atk: 16, def: 14, agi: 11, xp: 0, chama: 13, dreno: 16, sprite: 'lich', undead: true, boss: true, float: true,
               pal: { base: '#4a2a6a', light: '#8a5ab0', dark: '#1a0a2a', eye: '#40ff80' } },
};

// Itens de missão (não aparecem na batalha)
const KEY_ITEMS = {
  carta: { name: 'Carta de Shulkhan', desc: 'Item de missão',
    sealedName: 'Carta lacrada', sealed: ['O lacre do sumo sacerdote está inteiro.', 'Teo não vai rompê-lo. Só a rainha pode.'], text: [
    'À Lara, descendente de Hanokh e rainha de Imladrin.\nQue a luz de Elun esteja com você.',
    'Nossos espiões pagaram com a vida para obterem os relatos que trago nesta carta.',
    'Peço perdão pelas notícias pois não são boas e sei das dificuldades da guerra.',
    'Velkor, voltou-se contra Yah e está tentando invocar os reis caídos que foram selados na guerra de Elun.',
    'Humildemente peço para que sua família seja diligente por Elun como foste no passado.',
    'Toda Eterra precisa que impeça que o egresso clérigo invoque os reis do exílio.\nDe seu servo.\nShulkhan.',
  ] },
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
    : G.intro ? 'A carta lacrada' : G.seen.job ? 'As covas abertas' : 'Um pouso para o inverno',
  goal: () => G.bossDead ? 'levar a carta lacrada à rainha Lara, em Erukh.'
    : G.seen.altar ? 'derrotar Morvath antes que o selo caia.'
    : G.seen.lapide ? 'encontrar o selo de Morvath, no fundo da cripta.'
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
    { show: () => inParty('teo'), text: 'Duas Ossadas se ergueram no cemitério. Teo, noviço do Templo, veio conosco.' },
    { show: () => G.intro, text: 'Um mensageiro do Templo caiu na taverna com uma carta para a rainha.' },
    { show: () => G.intro, text: 'Dois encapuzados tentaram tomá-la. No peito, um olho cortado ao meio.' },
    { show: () => G.intro, text: 'A moça dos dados sumiu antes da luta. Usa capa cinza, como eles.' },
    { show: () => G.intro, text: 'Teo não quer romper o selo do sumo sacerdote.' },
    { show: () => G.quest, text: 'O selo é de Shulkhan, o sumo sacerdote.' },
    { show: () => G.quest, text: 'Sob a cripta dorme um rei, selado na guerra de Elun. O ancião não quis dizer o nome.' },
    { show: () => G.quest, text: 'Os paladinos que fecharam a cripta eram quatro. O ancião quer quatro para descer.' },
    { show: () => inParty('lyra'), text: 'Lyra, uma maga, quer ver a fonte de luz da cripta. Veio conosco.' },
    { show: () => inParty('andilla'), get text() { return `O estojo era de ${heroName('andilla')}. Ela não diz o que fazia no cemitério.`; } },
    { show: () => G.seen.tobias, text: 'Tobias acordou. Diz que os encapuzados não vieram só pela carta.' },
    { show: () => G.reached >= 1, text: 'A marca dos encapuzados está pintada na parede da cripta. Eles já estiveram aqui.' },
    { show: () => G.seen.lapide, text: 'Uma lápide diz o nome do rei: Morvath. Ele traiu a luz.' },
    { show: () => G.seen.bilhete, text: 'Um bilhete assinado "V.": o selo está cedendo. Quem é V.?' },
    { show: () => G.seen.altar, text: 'No altar, escreveram "O rei voltará". Os encapuzados adoram Morvath?' },
    { show: () => G.bossDead, text: 'Morvath virou pó. Antes, disse que não foi ele quem abriu o selo.' },
    { show: () => G.bossDead && inParty('andilla'), get text() { return `${heroName('andilla')} não cavou as covas. Então quem cavou, e por quê?`; } },
    { show: () => G.bossDead, text: 'Tobias pediu: a carta vai lacrada até a rainha. Em Erukh, não confiar em ninguém antes dela.' },
  ],
};
const journalGoal = () => JOURNAL.goal();
