// ===== Capítulo 1: Aldo chega sozinho, o cemitério, a noite na taverna e o grupo de quatro =====
// História e falas: docs/mundo/historias/capitulo1-aldo-sozinho.md (aprovado pelo Daniel em 2026-11-05)
// Especificação: docs/pacotes/capitulo1-aldo-sozinho.md (P2 e P3)

const TAVERN_INSIDE = { x: 7, y: 8, dir: 0 };   // ao entrar pela porta
const TAVERN_FRONT = { x: 22, y: 17, dir: 2 };  // na vila, em frente à porta
const ARRIVAL = { x: 1, y: 6, dir: 1 };         // Aldo entra pela estrada do oeste

const line = (who, text) => UI.say(`${who}:\n${text}`);
const joined = async name => { Sfx.levelup(); await UI.say(`${name} entrou para o grupo!`); };

async function walkPath(a, path, ms = 360) {
  for (const [x, y] of path) {
    a.dir = x > a.x ? 1 : x < a.x ? 3 : y > a.y ? 2 : 0;
    moveActor(a, x, y, ms);
    await wait(ms);
  }
}
function addActor(def) {
  const n = spawnNpc({ wander: 0, ...def });
  TOWN.npcs.push(n);
  return n;
}
const placeActor = (a, x, y, dir) => { a.x = a.fx = x; a.y = a.fy = y; a.t = 1; if (dir !== undefined) a.dir = dir; };

// Antes do fim a carta continua lacrada; depois de lida, mostra o texto do Daniel
async function readLetter(aloud) {
  const c = KEY_ITEMS.carta;
  if (!aloud && !G.key.lida) { for (const t of c.sealed) await UI.say(`${c.sealedName}:\n${t}`); return; }
  if (aloud) { await UI.say('Teo rompe o selo e lê a carta em voz alta.'); G.key.lida = true; }
  for (const t of c.text) await UI.say(`${c.name}:\n${t}`);
}

// ---------- Passo 0 · Chegada ----------
async function arrivalScene() {
  G.busy = true; G.fade = 1;
  enterTown(ARRIVAL, 'valmor');
  G.busy = true;
  await fadeTo(0, 900);
  await UI.say('Valmor, no sul gelado de Eterra. A geada chegou cedo este ano.');
  await UI.say('Aldo, espada nas costas e bolsa quase vazia, procura trabalho para o inverno.');
  const nino = TOWN.npcs.find(n => n.def.id === 'nino');
  if (nino) {
    nino.talking = true;
    placeActor(nino, 9, 6, 3);
    await walkPath(nino, [[8, 6], [7, 6], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6]], 260);
  }
  await line('Nino', 'Você é cavaleiro? Essa espada é de verdade?');
  await line('Aldo', 'De verdade. E com fome. Onde se come por aqui?');
  await line('Nino', 'Na Berta! O telhado vermelho, lá embaixo. Fala que fui eu que mandei!');
  if (nino) {
    await walkPath(nino, [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6]], 260);
    TOWN.npcs = TOWN.npcs.filter(n => n !== nino);
    TOWN.npcs.push(spawnNpc(nino.def));
  }
  saveGame();
  await UI.say('Objetivo: achar pouso na Taverna Poney Saltitante.\nO Diário, no menu (Esc), guarda o que você descobrir.');
  G.busy = false; townHint();
}

// ---------- Taverna: quem está lá em cada momento ----------
const TAVERN_NPCS = [
  { id: 'berta', name: 'Berta, a taverneira', x: 10, y: 2, dir: 2, wander: 0, lines: {
    start: ['O ancião Bertoldo mora na casa de telhado verde, ao norte. Vão!'],
    quest: ['Encapuzados abrindo covas... Ladrão de cova, é o que eles são.', 'Lá embaixo não tem sopa. Comprem poções com a Dora.'],
    won: ['Eu disse que a sopa estava paga. Sentem, heróis.'] },
    onTalk: n => say(n.def.name, [...byStage(n.def.lines), ...(!G.bossDead && !inParty('andilla') ? ['Ela fia a conta, mas nunca levou um pão da cozinha.'] : [])]) },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: {
    start: ['Aquela marca... Não. Não é conversa para esta noite.', 'Vão falar com o ancião. Eu fico aqui, fiando.'],
    quest: ['Lá embaixo, se alguém chamar vocês pelo nome... não respondam.'],
    won: ['Aquela marca... Eu vi uma vez, menina. Num inverno que não acabava.', 'Não era coisa de ladrão de cova. Ladrão de cova não reza.', 'Vou fiar um cachecol para cada um. Lá fora a geada não perdoa.'] } },
  { id: 'bruno', look: 'soldier', name: 'Bruno, soldado de folga', x: 2, y: 7, dir: 0, wander: 0, lines: {
    start: ['Vimos as lâminas e sentamos de novo. Não conta pra ninguém.'],
    won: ['Da próxima vez, a gente levanta primeiro. Prometo.'] } },
  { id: 'caio', look: 'soldier', name: 'Caio, soldado de folga', x: 4, y: 6, dir: 3, wander: 0, lines: {
    start: ['Aquele olho cortado ao meio... Já vi em algum lugar. Não lembro onde.'],
    quest: ['Ainda não lembrei onde vi aquele olho. Está na ponta da língua.'],
    won: ['Lembrei! Vi aquele olho numa caravana. Ia para o oeste, para Erukh.', 'À saúde dos heróis de Valmor!'] } },
];

// Tarde da chegada: só Berta, Ana e Rui (os soldados e a moça dos dados chegam à noite)
const TAVERN_AFTERNOON = [
  { id: 'berta', name: 'Berta, a taverneira', x: 10, y: 2, dir: 2, wander: 0, onTalk: bertaJob },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: { arrive: ['Leve um lampião. A névoa do cemitério engole a gente.'] } },
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { arrive: ['Eu falei das covas e ninguém acreditou. Vai lá ver, vai.'] } },
];
async function bertaJob() {
  if (G.seen.job) { await line('Berta', inParty('teo') ? 'Já de volta? Contem tudo.' : 'Volte inteiro e o quarto é seu. A sopa também.'); return; }
  await line('Berta', 'Quarto e sopa, dez moedas. Ou um favor, se o forasteiro souber usar essa espada.');
  await line('Rui', 'As covas do cemitério amanheceram abertas de novo. Vazias. Como se alguém tivesse saído de dentro.');
  await line('Berta', 'Para com isso, Rui.');
  await line('Berta', 'O Hugo não pode largar a cripta. Dê uma olhada no cemitério, atrás da capela.');
  await line('Berta', 'Volte inteiro e o quarto é seu. A sopa também.');
  G.seen.job = 1;
  await UI.say('Objetivo: investigar as covas abertas no cemitério, atrás da capela.');
}

// Manhã em diante: Lyra e a ladina esperam na taverna até entrarem no grupo
const LYRA_DEF = { id: 'lyra', name: 'Lyra', x: 11, y: 6, dir: 0, wander: 0, onTalk: lyraTalk };
const ANDILLA_DEF = { id: 'andilla', look: 'andilla', get name() { return heroName('andilla'); }, x: 12, y: 7, dir: 3, wander: 0, onTalk: andillaTalk };

// Com a licença do ancião, a Berta apresenta quem espera para descer à cripta e todos se apresentam
const needsIntroductions = () => G.quest && !G.bossDead && G.party.length < 4 && !G.seen.apresentacao;
async function introductions() {
  G.busy = true; G.seen.apresentacao = 1;
  const actor = id => TOWN.npcs.find(n => n.def.id === id);
  const lyra = !inParty('lyra') && actor('lyra'), andilla = !inParty('andilla') && actor('andilla'), nm = heroName('andilla');
  await line('Berta', 'Licença do ancião? Então vocês não são os únicos. Tem gente aqui esperando o Hugo abrir a cripta faz dias.');
  await line('Berta', 'Ei, vocês duas! Venham cá. Esse povo vai descer.');
  await Promise.all([
    lyra && walkPath(lyra, [[10, 6], [9, 6], [8, 6], [8, 7]]),
    andilla && walkPath(andilla, [[11, 7], [10, 7], [9, 7], [9, 8]]),
  ]);
  if (lyra) lyra.dir = 3;
  if (andilla) andilla.dir = 3;
  TOWN.p.dir = 1;
  await line('Berta', 'Ninguém desce sozinho. Cada um diz quem é, e eu sirvo a sopa.');
  await line('Aldo', 'Aldo. Espada, estrada e pouca conversa. Cheguei ontem procurando pouso.');
  if (inParty('teo')) await line('Teo', 'Teo, noviço do Templo de Erukh. Eu curo os feridos. E guardo uma carta que não é minha.');
  if (lyra) {
    await line('Lyra', 'Lyra. Maga, vinda de longe, com mais livros que bagagem.');
    await line('Lyra', 'Lá embaixo há fontes de luz que guardam a memória de quem passa. Quero ver uma.');
    await line('Lyra', 'Antes, me digam: por que vocês vão descer?');
    const r = await UI.choose([
      { label: 'Pelos mortos de Valmor.', value: 'Resposta de herói. Gosto.' },
      { label: 'Pela carta.', value: 'Resposta de mensageiro. Serve.' },
      { label: 'Pelo ouro.', value: 'Resposta honesta. Essa é rara.' },
    ], { title: 'Por que descer à cripta?', cols: 1 });
    await line('Lyra', r);
    await line('Lyra', 'Vocês têm a licença; eu tenho o fogo.');
    recruit('lyra', lyra); await joined('Lyra');
  }
  if (andilla) {
    await line(nm, `${nm}. Abro o que está fechado e desarmo o que não devia estar armado.`);
    if (G.key.estojo) {
      await line(nm, 'E esse estojo aí é meu. Meus ganchos! Não, não vou contar o que eu fazia no cemitério.');
      G.key.estojo = false;
    } else await line(nm, 'Perdi meus ganchos por aí. Se acharem um estojo de couro, é meu. Até lá, me viro com grampo.');
    await line(nm, 'Lá embaixo tem tranca e armadilha. E dizem que enterraram um rei com a coroa. Rei morto não precisa de coroa.');
    recruit('andilla', andilla); await joined(nm);
  }
  await line('Berta', 'Quatro. Agora o Hugo deixa passar. Voltem vivos, que a sopa de amanhã já está paga.');
  saveGame();
  G.busy = false; townHint();
}

async function lyraTalk(n) {
  if (!G.quest) {
    await line('Lyra', 'Fontes de luz que guardam a memória de quem passa. Vim de longe para ver uma.');
    await line('Lyra', 'Mas o guarda não deixa passar nem uma maga educada.');
    return;
  }
  await line('Lyra', 'Licença do ancião, é? Então me digam: por que vocês vão descer?');
  const r = await UI.choose([
    { label: 'Pelos mortos de Valmor.', value: 'Resposta de herói. Gosto.' },
    { label: 'Pela carta.', value: 'Resposta de mensageiro. Serve.' },
    { label: 'Pelo ouro.', value: 'Resposta honesta. Essa é rara.' },
  ], { title: 'Por que descer à cripta?', cols: 1 });
  await line('Lyra', r);
  await line('Lyra', 'Eu desço pela fonte. Vocês têm a licença; eu tenho o fogo.');
  recruit('lyra', n);
  await joined('Lyra');
  saveGame();
}
async function andillaTalk(n) {
  const nm = heroName('andilla');
  if (!G.key.estojo) {
    await line(nm, 'Eu não fujo de briga. Fujo de lâmina curva. É diferente.');
    await line(nm, 'Perdi um estojo de couro. Se acharem, tem recompensa. E não perguntem onde perdi.');
    return;
  }
  await line(nm, 'Meus ganchos! E não, não vou contar o que eu fazia no cemitério.');
  await line(nm, 'Lá embaixo tem tranca e armadilha. Vocês precisam de mim, e eu preciso passar pelo Hugo.');
  await line(nm, 'Dizem que enterraram um rei com a coroa. Rei morto não precisa de coroa.');
  G.key.estojo = false;
  recruit('andilla', n);
  await joined(nm);
  saveGame();
}

// ---------- Passo 2 · O cemitério (área de cima, atrás da capela) ----------
const CEM_PLAN = [
  '================',
  '=YLLOLLALULLYLY=',
  '=YLBLLL::::::LY=',
  '=LOLULULOLBL:LY=',
  '=YB::::::::::LY=',
  '=LL:LOLLULLYLBY=',
  '=YL:.LLYLLOLLLY=',
  '=LU:LLOLLBYLBLY=',
  '=YL::::::LULLBY=',
  '=YBLOLLB:BLYLYY=',
  '=......B:B.....=',
  '========G=======',
];
function buildCemeteryMap() {
  const key = { '=': TILE.MURO, '.': TILE.GRASS, ':': TILE.PATH, L: TILE.TOMB, O: TILE.GRAVE_O, U: TILE.GRAVE_U,
    A: TILE.GRAVE_OLD, Y: TILE.DEADTREE, B: TILE.BUSH, G: TILE.GATE };
  return Uint8Array.from(CEM_PLAN.join(''), ch => key[ch]);
}

// Três lutas de aprendizado, visíveis e fixas, uma dica cada
const CEM_FIGHTS = {
  rato:     { foe: 'rat',  name: 'Rato de Cova', x: 5,  y: 8, dir: 1, flag: 'cem1', ids: ['ratoCova'],
    intro: 'Um rato do tamanho de um gato sai de uma cova!', hint: 'Sozinho, cada golpe conta. Escolha Atacar e o alvo.' },
  morcegos: { foe: 'bats', name: 'Morcegos',     x: 10, y: 4, dir: 3, flag: 'cem2', ids: ['morcegoCova', 'morcegoCova'],
    intro: 'Dois morcegos descem do muro!', hint: 'Técnica gasta PM: o Golpe Forte de Aldo bate quase em dobro. Defender segura o golpe seguinte.' },
  ossada:   { foe: 'bone', name: 'Ossada',       x: 12, y: 3, dir: 2, flag: 'cem3', ids: ['ossada'],
    intro: 'Uma mão de osso rompe a terra. Uma Ossada se levanta!', hint: 'PV baixo? Item → Poção. Sozinho, ninguém cura você.' },
};
const cemDone = () => G.seen.cem3 && G.seen.teoWin;

async function cemFight(n) {
  const f = CEM_FIGHTS[n.def.id];
  const r = await startBattle(f.ids, false, { intro: f.intro, hints: G.seen['dica_' + f.flag] ? [] : [f.hint] });
  G.seen['dica_' + f.flag] = 1;
  if (r === 'lose') return gameOver();
  G.mode = 'town';
  if (r === 'win') { G.seen[f.flag] = 1; TOWN.npcs = TOWN.npcs.filter(a => a !== n); }
  TOWN.dim = AREAS.cemiterio.dim();
  Music.play(AREAS.cemiterio.music());
}

const TEO_DEF = { id: 'teo', name: 'Teo', x: 7, y: 2, dir: 0, wander: 0,
  onTalk: () => line('Teo', '...que os que dormem fiquem em paz.') };

async function teoScene() {
  const teo = TOWN.npcs.find(n => n.def.id === 'teo');
  if (!inParty('teo')) {
    TOWN.p.dir = 3;
    await line('Teo', '...que os que dormem fiquem em paz, pela luz de Elun.');
    Sfx.dark(); shake(300);
    await UI.say('A terra da cova estremece. Duas Ossadas se erguem atrás do clérigo.');
    await line('Aldo', 'Abaixe-se!');
    if (teo) { await walkPath(teo, [[8, 2], [9, 2]], 220); teo.dir = 2; }
    recruit('teo', teo);
  }
  const r = await startBattle(['ossada', 'ossada'], false, {
    surprise: 'advantage', intro: 'Duas Ossadas se erguem atrás do clérigo!',
    hints: G.seen.dica_teo ? [] : ['Teo cura com Magia. Contra mortos-vivos, a Luz Sagrada fere em dobro.'],
  });
  G.seen.dica_teo = 1;
  if (r === 'lose') return gameOver();
  G.mode = 'town';
  TOWN.dim = AREAS.cemiterio.dim();
  Music.play(AREAS.cemiterio.music());
  if (r !== 'win') return; // fugiram: a luta recomeça ao voltar a este ponto
  G.seen.teoWin = 1;
  TOWN.dim = AREAS.cemiterio.dim(); Music.play(AREAS.cemiterio.music());
  await line('Teo', 'Obrigado. Sou Teo, noviço do Templo. Vim ajudar a irmã Irene no inverno.');
  await line('Teo', 'Rezo por estas covas há três noites e elas continuam abrindo.');
  await line('Teo', 'Mortos não se levantam sozinhos. Vou com você até descobrir quem os chama.');
  await joined('Teo');
  saveGame();
  await UI.say('Objetivo: voltar à taverna e contar à Berta o que viram.');
}

function graveSeen(kind) {
  G.seen[kind] = 1;
  if (G.seen.covaU && G.seen.covaO && !G.seen.covas) { G.seen.covas = 1; return line('Aldo', 'Uma cavada de fora, outra aberta por dentro. São duas coisas diferentes.'); }
}

AREAS.cemiterio = makeArea('Cemitério de Valmor', 'CEMITERIO', 16, 12, buildCemeteryMap(), [], TILE.DEADTREE);
Object.assign(AREAS.cemiterio, {
  fog: true, dimCol: '10,24,56',
  dim: () => (G.seen.cem3 && G.seen.teoWin) ? 0.1 : 0.3,
  music: () => cemDone() ? 'town' : 'cemetery',
  cast: () => [
    ...Object.entries(CEM_FIGHTS).filter(([, f]) => !G.seen[f.flag]).map(([id, f]) => ({ id, foe: f.foe, name: f.name, x: f.x, y: f.y, dir: f.dir, wander: 0, onTalk: cemFight })),
    ...(inParty('teo') ? [] : [TEO_DEF]),
  ],
  exits: [{ x: 8, y: 11, to: 'valmor', pos: { x: 5, y: 4, dir: 2 } }],
  async onEnter() {
    if (G.seen.cemEntrou) return;
    G.seen.cemEntrou = 1;
    G.busy = true;
    await UI.say('O cemitério de Valmor. Névoa baixa, corvos no muro e cinco covas abertas.');
    await line('Aldo', 'Rui não estava exagerando.');
    saveGame(); // perder no cemitério volta para cá
  },
  onStep(x, y) {
    const foe = TOWN.npcs.find(n => n.def.foe && Math.abs(n.x - x) + Math.abs(n.y - y) === 1);
    if (foe) return () => cemFight(foe);
    if (x === 6 && y === 4 && !G.seen.estojo) return async () => {
      G.seen.estojo = 1; G.key.estojo = !inParty('andilla'); Sfx.chest();
      await UI.say('Junto de uma cova cavada, um estojo de couro cheio de ganchinhos de metal.');
      await line('Aldo', 'Ferramenta de quem abre o que não é seu.');
    };
    if (x === 10 && y === 2 && G.seen.cem3 && !G.seen.teoWin) return teoScene;
    return null;
  },
  look(x, y) {
    const t = TOWN.tileAt(x, y);
    if (t === TILE.GRAVE_U) return async () => { await UI.say('Esta foi cavada de fora. Marcas de pá, terra amontoada do lado.'); await graveSeen('covaU'); };
    if (t === TILE.GRAVE_O) return async () => { await UI.say('Nesta, a terra foi empurrada para cima. Por dentro.'); await graveSeen('covaO'); };
    if (x === 3 && y === 3) return () => line('Lápide', '"Aqui descansa Mestre Olavo, que fazia o melhor pão do sul."');
    if (t === TILE.TOMB) return () => UI.say('Uma lápide gasta. O nome já se apagou.');
    if (t === TILE.GRAVE_OLD) return () => UI.say(inParty('teo') ? 'A cova mais antiga de Valmor. A terra ainda está fofa.' : 'Uma cova antiga, de lápide rachada.');
    return null;
  },
});

// Portão do cemitério na vila e porta da taverna
AREAS.valmor.exits = [{ x: 5, y: 3, to: 'cemiterio', pos: { x: 8, y: 10, dir: 0 },
  check: () => G.seen.job ? null : 'O portão do cemitério está amarrado com corda. Melhor perguntar na vila antes.' }];
AREAS.taverna.exits = [{ x: 7, y: 9, enter: () => leaveTavern() }];
AREAS.taverna.cast = () => !G.intro ? TAVERN_AFTERNOON
  : [...TAVERN_NPCS, ...(inParty('lyra') ? [] : [LYRA_DEF]), ...(inParty('andilla') ? [] : [ANDILLA_DEF])];

// ---------- Passo 4 · A noite na taverna ----------
const NIGHT_CAST = [
  ...TAVERN_NPCS.map(d => ({ ...d, onTalk: undefined })),
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { start: ['...'] } },
  { id: 'moca', look: 'andilla', name: 'Moça dos dados', x: 1, y: 6, dir: 1, wander: 0, lines: { start: ['...'] } },
];

async function nightScene() {
  G.busy = true;
  await fadeTo(1, 300);
  enterTown(TAVERN_INSIDE, 'taverna');
  G.busy = true;
  await fadeTo(0, 300);
  await line('Berta', 'Ossadas andando? E ainda trouxe um noviço de brinde. Sentem, o quarto é de vocês.');
  await fadeTo(1, 900);

  // A noite: Aldo e Teo à mesa, soldados jogando dados com a moça de capa cinza
  enterTown({ x: 2, y: 4, dir: 0 }, 'taverna', NIGHT_CAST);
  G.busy = true;
  TOWN.followers = [newActor(4, 3, 3)];
  await fadeTo(0, 900);
  await UI.say('Noite de geada na Taverna Poney Saltitante.');
  await line('Caio', 'Mais uma rodada, moça. Hoje eu ganho.');
  await line('Moça dos dados', 'Você disse isso ontem, soldado.');

  // O mensageiro
  Sfx.dark();
  TOWN.dim = 0.35;
  const tobias = addActor({ id: 'tobias', name: 'Mensageiro', x: 7, y: 9, dir: 0 });
  await walkPath(tobias, [[7, 8], [7, 7], [7, 6], [7, 5], [7, 4], [8, 4]]);
  tobias.dir = 0;
  TOWN.p.dir = 1; TOWN.followers[0].dir = 2;
  await wait(250);
  await line('Mensageiro', 'Esta carta... tem de chegar à rainha. Ninguém mais pode ler.');
  await line('Mensageiro', 'Você é do Templo. Eu vejo pelo livro. Leve. Não deixe que eles...');
  tobias.lying = true; Sfx.hurt(); shake(200);
  G.key.carta = true;
  await UI.say('O mensageiro desmaia. Teo recebe um rolo lacrado com o selo do sumo sacerdote.');
  Sfx.chest();

  // Os encapuzados; quando o primeiro aparece na porta, a moça dos dados some
  const hooded1 = addActor({ id: 'h1', look: 'hooded', name: 'Encapuzado', x: 7, y: 9, dir: 0 });
  TOWN.npcs = TOWN.npcs.filter(n => n.def.id !== 'moca');
  await walkPath(hooded1, [[7, 8], [7, 7]], 300);
  const hooded2 = addActor({ id: 'h2', look: 'hooded', name: 'Encapuzado', x: 7, y: 9, dir: 0 });
  await walkPath(hooded2, [[7, 8]], 300);
  await line('Encapuzado', 'A carta. E ninguém mais precisa sangrar esta noite.');
  await UI.say('Quando Aldo olha de novo, a cadeira da moça dos dados está vazia.');
  TOWN.p.dir = 2;
  await line('Aldo', 'Acho que vocês erraram de taverna.');

  const r = await startBattle(['encapuzado', 'encapuzado'], false, {
    surprise: 'ambush',
    intro: 'Dois encapuzados puxam lâminas curvas!',
    hints: ['Os inimigos agiram primeiro. No topo da tela está a ordem de quem age.', 'Teo cura os feridos com Magia; não espere alguém cair.', 'Defender reduz o dano até a próxima vez daquele herói.'],
    noRun: 'Não dá para fugir: o mensageiro está caído no balcão!',
  });
  if (r === 'lose') return gameOver();
  G.mode = 'town';
  TOWN.npcs = TOWN.npcs.filter(n => n !== hooded1 && n !== hooded2);
  TOWN.dim = 0;
  Music.play('town');

  // Depois da luta
  await UI.say('O capuz do último encapuzado cai. No peito, bordado em vermelho, um olho cortado ao meio.');
  await line('Berta', 'Gente daqui não usa essa marca.');
  await UI.say('A velha Ana para de fiar. Olha a marca por muito tempo e não diz nada.');
  await line('Aldo', 'Teo... o que diz a carta?');
  await line('Teo', 'É o selo do sumo sacerdote. Não cabe a mim rompê-lo.');
  await line('Aldo', 'Quase mataram um homem por ela.');
  await line('Teo', 'Por isso mesmo. Quem abrir tem de ter o direito.');
  await line('Caio', 'E a moça dos dados? Sumiu antes da primeira lâmina.');
  await line('Berta', 'Capa cinza, igual à deles. Eu sabia que não devia fiar a conta dela.');
  await line('Rui', 'As covas abertas... e agora isso. Na mesma semana.');
  await line('Berta', 'O ancião Bertoldo vai saber o que fazer. É a casa de telhado verde.');
  await line('Berta', 'Levem o homem à capela, a irmã Irene cuida dele. E voltem vivos: a sopa de amanhã já está paga.');

  // Passo 5 · Amanhecer
  await fadeTo(1, 800);
  await UI.say('Os soldados de folga levam o mensageiro até a capela.');
  await UI.say('Ninguém dorme. Teo passa a noite com a carta fechada no colo.');
  await UI.say('Ao amanhecer, chega a carroça do correio. Dela desce uma moça de capa roxa, com mais livros que bagagem.');
  await UI.say('A sopa da Berta devolve as forças ao grupo.');
  for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); }
  UI.updateParty();
  G.intro = 1;
  enterTown({ x: 6, y: 4, dir: 2 }, 'taverna');
  G.busy = true;
  saveGame(); // não perder a noite se o grupo cair antes de salvar
  await fadeTo(0, 800);
  await UI.say('Objetivo: falar com o ancião Bertoldo, na casa de telhado verde.\nA carta lacrada está em Itens.');
  G.busy = false; townHint();
}
