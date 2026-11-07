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
    base: { hp: 48, mp: 8, atk: 13, def: 22.5, res: 4, mag: 3, agi: 7 },
    grow: { hp: 10, mp: 1, atk: 3, def: 5, res: 1, mag: 0.5, agi: 1 },
    spells: [[1, 'golpe'], [3, 'quebraJunta'], [5, 'furia']], skillWord: 'Técnica',
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
    spells: [[1, 'cura'], [3, 'luz'], [5, 'reviver'], [7, 'curaTotal']], skillWord: 'Magia',
  },
  {
    // até dizer o nome na noite da taverna (G.seen.andillaAnon), ela é a moça dos dados também no cartão e na batalha
    id: 'andilla', get name() { return typeof G !== 'undefined' && G.seen && G.seen.andillaAnon ? 'Moça dos dados' : 'Andilla'; }, cls: 'Ladina', color: '#e05a5a',
    base: { hp: 34, mp: 10, atk: 11, def: 12.5, res: 6, mag: 4, agi: 14 },
    grow: { hp: 6, mp: 2, atk: 2.5, def: 3, res: 2, mag: 0.5, agi: 1.6 },
    spells: [[1, 'golpeBaixo'], [3, 'leque']], skillWord: 'Truque',
  },
];

// Every hero learns something new on the odd levels (1, 3, 5, 7)
const SPELLS = {
  golpe:     { name: 'Golpe Forte', mp: 4,  target: 'enemy',      kind: 'phys',   power: 1.8, fx: 'slash', desc: 'Um golpe com toda a força.' },
  quebraJunta: { name: 'Quebra-Junta', mp: 5, target: 'enemy', kind: 'phys', power: 1.4, bone: 1.5, fx: 'slash', desc: 'Mira nas juntas. Osso quebra: mais forte contra mortos-vivos.' },
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
const KEY_ITEMS = {
  // O texto da carta fica em docs/mundo/historias/prologo.md até o capítulo em que ela for aberta
  carta: { name: 'Carta com o selo real', desc: 'Item de missão',
    sealedName: 'Carta com o selo real', sealed: ['O leão de Hanokh está inteiro.', 'Só alguém do sangue de Hanokh pode rompê-lo. Teo não vai abri-la.'] },
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

if (typeof module !== 'undefined') module.exports = { BATTLE_LINES, ENEMIES, FLOORS, PARTY_DEFS, SPELLS, ITEMS, EQUIPS, KEY_ITEMS, STAT_FULL, START_GEAR, HERO_STORY };
