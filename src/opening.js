// ===== Capítulo 1: Aldo chega sozinho, o cemitério, a noite na taverna e o grupo de quatro =====
// História e falas: docs/mundo/historias/capitulo1.md (nova história do Daniel, 2026-11-05)
// Especificação: docs/pacotes/capitulo1-aldo-sozinho.md (P2 e P3)

const TAVERN_INSIDE = { x: 7, y: 8, dir: 0 };   // ao entrar pela porta
const TAVERN_FRONT = { x: 22, y: 17, dir: 2 };  // na vila, em frente à porta
const ARRIVAL = { x: 1, y: 6, dir: 1 };         // Aldo entra pela estrada do oeste

const A = () => heroName('aldo'); // Lyra conta o irmão em terceira pessoa: sempre pelo nome do herói
const line = (who, text, mood) => UI.say(`${who}${mood ? '~' + mood : ''}:\n${text}`); // mood: alegre | preocupado | bravo
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
  if (aloud) { await UI.say('Teo rompe o selo real e lê a carta em voz alta.'); G.key.lida = true; }
  for (const t of c.text) await UI.say(`${c.name}:\n${t}`);
}

// ---------- Passo 0 · Chegada ----------
async function arrivalScene() {
  G.busy = true; G.fade = 1;
  enterTown(ARRIVAL, 'valmor');
  G.busy = true;
  await fadeTo(0, 900);
  await UI.say('Valmor, no sul gelado de Imladrin. A geada chegou cedo este ano.');
  await UI.say(`De tempos em tempos, ${A()} volta a Valmor. Sempre diz que é pelo trabalho.`);
  const nino = TOWN.npcs.find(n => n.def.id === 'nino');
  if (nino) {
    nino.talking = true;
    placeActor(nino, 9, 6, 3);
    await walkPath(nino, [[8, 6], [7, 6], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6]], 260);
  }
  await line('Nino', `${A()}! Você voltou! Trouxe a espada?`);
  await line('Aldo', 'Trouxe. E fome. A Berta ainda está de pé?', 'alegre');
  await line('Nino', 'Está! E a professora Clara também. Ela não perguntou de você. Mas olhou pra estrada a semana inteira.');
  await line('Aldo', 'Vai brincar, Nino.', 'preocupado');
  await line('Nino', 'Vou contar pra ela que você chegou!');
  const away = nino && walkPath(nino, [[3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6]], 260); // Nino sai correndo enquanto Aldo responde
  await line('Aldo', 'Não precisa contar nada pra ninguém.');
  if (nino) {
    await away;
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
    desceu: ['Desceram e voltaram! A sopa está quente. Contem tudo, mas comam primeiro.'],
    won: ['Eu disse que a sopa estava paga. Sentem, heróis.', 'Agora me digam: se o túmulo estava vazio, quem é que anda por aí com um rei nas costas?'] },
    onTalk: n => say(n.def.name, [...byStage(n.def.lines), ...(!G.bossDead && !inParty('andilla') ? ['Ela fia a conta, mas nunca levou um pão da cozinha.'] : [])]) },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: {
    start: ['Aquela marca... Não. Não é conversa para esta noite.', 'Vão falar com o ancião. Eu fico aqui, fiando.'],
    quest: ['Lá embaixo, se alguém chamar vocês pelo nome... não respondam.'],
    desceu: ['Desceram... E a marca? Estava lá embaixo também?', 'Não. Não me contem. Eu já sei demais.'],
    won: ['Aquela marca... Eu vi uma vez, menina. Num inverno que não acabava.', 'Não era coisa de ladrão de cova. Ladrão de cova não reza.', 'Vou fiar um cachecol para cada um. Lá fora a geada não perdoa.'] } },
  { id: 'bruno', look: 'bruno', name: 'Bruno, soldado de folga', x: 2, y: 7, dir: 0, wander: 0, lines: {
    start: ['Vimos as lâminas e sentamos de novo. Não conta pra ninguém.'],
    desceu: ['Vocês desceram mesmo? Eu nem consegui levantar da cadeira aquela noite.'],
    won: ['Da próxima vez, a gente levanta primeiro. Prometo.'] } },
  { id: 'caio', look: 'caio', name: 'Caio, soldado de folga', x: 4, y: 6, dir: 3, wander: 0, lines: {
    start: ['Aquele olho cortado ao meio... Já vi em algum lugar. Não lembro onde.'],
    quest: ['Ainda não lembrei onde vi aquele olho. Está na ponta da língua.'],
    desceu: ['Viram aquele olho lá embaixo também? Eu sabia que conhecia de algum lugar.'],
    won: ['Lembrei! Vi aquele olho numa caravana. Ia para o norte, para Erukh.', 'À saúde dos heróis de Valmor!'] } },
];

// Tarde da chegada: só Berta, Ana e Rui (os soldados e a moça dos dados chegam à noite)
const TAVERN_AFTERNOON = [
  { id: 'berta', name: 'Berta, a taverneira', x: 10, y: 2, dir: 2, wander: 0, onTalk: bertaJob },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: { arrive: [() => `${A()}. Leve um lampião. A névoa do cemitério engole a gente.`] } },
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { arrive: [() => `${A()}! Eu falei das covas e ninguém acreditou. Você acredita, né? Vai lá ver.`] } },
];
async function bertaJob() {
  const back = G.party.length > 1 ? 'Voltem inteiros e o quarto é de vocês. A sopa também.' : 'Volte inteiro e o quarto é seu. A sopa também.';
  if (G.seen.job) { await line('Berta', inParty('teo') ? 'Já de volta? Contem tudo.' : back); return; }
  await line('Berta', `Olha quem a geada trouxe. ${A()}, de novo.`);
  await line('Aldo', 'Vim pelo trabalho.');
  await line('Berta', 'Claro que veio. A escola continua no mesmo lugar, se o trabalho mudar de ideia.');
  await line('Berta', 'Quarto e sopa, dez moedas. Ou um favor, que eu conheço essa bolsa vazia.');
  await line('Rui', 'As covas do cemitério amanheceram abertas de novo. Vazias. Como se alguém tivesse saído de dentro.');
  if (inParty('lyra')) await line('Lyra', `Covas abertas por dentro? ${A()}, isso não é trabalho. É capítulo de livro.`, 'preocupado');
  await line('Berta', 'Para com isso, Rui.');
  await line('Berta', `O Hugo não pode largar a igreja velha. ${G.party.length > 1 ? 'Deem' : 'Dê'} uma olhada no cemitério, atrás da capela, no alto da vila.`);
  await line('Berta', back);
  G.seen.job = 1;
  await UI.say('Objetivo: investigar as covas abertas no cemitério, atrás da capela.\nA setinha amarela mostra o caminho.');
}

// A Lyra espera na taverna desde a primeira visita e entra no grupo ali (lyraArrives); a ladina espera até as apresentações
const LYRA_DEF = { id: 'lyra', name: 'Lyra', x: 11, y: 6, dir: 0, wander: 0, onTalk: lyraTalk };
const ANDILLA_DEF = { id: 'andilla', look: 'andilla', get name() { return heroName('andilla'); }, x: 12, y: 7, dir: 3, wander: 0, onTalk: andillaTalk };

// "Por que descer?": a Lyra pergunta ao irmão nas apresentações e lembra a resposta na estrada (G.seen.porque)
const PORQUE = {
  mortos: { label: 'Pelos mortos de Valmor.', reply: a => `${a} diz que é pelos mortos. ${a} acredita nisso. Quase todo.`,
    road: a => `${a} desceu pelos mortos. Eles dormem de novo. ${a} está orgulhoso e não vai dizer.` },
  carta: { label: 'Pela carta.', reply: a => `${a} diz que é pela carta. ${a} gosta de coisas que cabem na mão.`,
    road: a => `${a} desceu pela carta. Ela continua inteira. ${a} também.` },
  ouro: { label: 'Pelo ouro.', mood: 'alegre', reply: a => `${a} diz que é pelo ouro. Com essa bolsa vazia, essa até é verdade.`,
    road: a => `${a} desceu pelo ouro. Voltou sem nenhum. ${a} está feliz mesmo assim.` },
};
async function askPorque() {
  const k = await UI.choose(Object.entries(PORQUE).map(([value, p]) => ({ label: p.label, value })), { title: 'Por que descer à cripta?', cols: 1 });
  G.seen.porque = k;
  await line('Lyra', PORQUE[k].reply(A()), PORQUE[k].mood);
}
const porqueRoad = () => PORQUE[G.seen.porque] ? PORQUE[G.seen.porque].road(A()) : null; // saves antigos não têm resposta

// Com a licença do ancião, a Berta chama quem mais quer descer (só a Andilla) e todos se apresentam
const needsIntroductions = () => G.quest && !G.bossDead && G.party.length < 4 && !G.seen.apresentacao;
async function introductions() {
  G.busy = true; G.seen.apresentacao = 1;
  const andilla = !inParty('andilla') && TOWN.npcs.find(n => n.def.id === 'andilla'), nm = heroName('andilla');
  await line('Berta', 'Licença do ancião? Então vocês não são os únicos querendo descer.');
  if (andilla) {
    await line('Berta', 'Ei, você! Venha cá. Esse povo vai descer.');
    await walkPath(andilla, [[11, 7], [10, 7], [9, 7], [9, 8]]);
    andilla.dir = 3;
  }
  TOWN.p.dir = 1;
  await line('Berta', 'Ninguém desce sozinho. Cada um diz quem é, e eu sirvo a sopa.');
  await line('Aldo', `${A()}. Espada, estrada e pouca conversa.`);
  const lyra = inParty('lyra');
  if (lyra) await line('Lyra', `E coração mole. ${A()} odeia que eu conte isso.`, 'alegre');
  if (inParty('teo')) await line('Teo', 'Teo, noviço da Ordem de Erukh. Eu curo os feridos. E guardo uma carta que não é minha.');
  if (lyra) await line('Lyra', 'Lyra, irmã dele. Maga. Eu falo, ele luta. Funciona há vinte anos.');
  if (andilla) {
    await andillaReveal();
    await line(nm, `${nm}. Abro o que está fechado e desarmo o que não devia estar armado.`);
    if (G.key.estojo) {
      await line(nm, 'E esse estojo aí é meu. Meus ganchos! Não, não vou contar o que eu fazia no cemitério.');
      G.key.estojo = false;
    } else await line(nm, 'Perdi meus ganchos no cemitério, quando corri. Se acharem um estojo de couro, é meu. Até lá, me viro com grampo.');
    await line(nm, 'Lá embaixo tem tranca e armadilha. E dizem que enterraram um rei com a coroa. Rei morto não precisa de coroa.');
    recruit('andilla', andilla); await joined(nm);
  }
  if (lyra) {
    await line('Lyra', 'Antes de descer, uma pergunta. Por que você vai, maninho?');
    await askPorque();
    if (inParty('andilla')) await line(nm, 'Vocês dois são sempre assim?');
    if (inParty('teo')) await line('Teo', 'Desde ontem, pelo menos.');
  }
  await line('Berta', G.party.length >= 4 ? 'Quatro. Agora o Hugo deixa passar. Voltem vivos, que a sopa de amanhã já está paga.'
    : 'Falta um. A pequena Lyra está ali no canto, querendo ver o irmão.');
  saveGame();
  G.busy = false; townHint();
}

function lyraTalk(n) { return lyraArrives(n); } // saves antigos: ela ainda espera na taverna

async function andillaTalk(n) {
  const nm = heroName('andilla');
  if (!G.key.estojo) {
    await line(nm, 'Eu não fujo de briga. Fujo de lâmina curva. É diferente.');
    await line(nm, 'Perdi um estojo de couro. Se acharem, tem recompensa. E não perguntem onde perdi.');
    return;
  }
  await andillaReveal();
  await line(nm, 'Meus ganchos! E não, não vou contar o que eu fazia no cemitério.');
  await line(nm, 'Lá embaixo tem tranca e armadilha. Vocês precisam de mim, e eu preciso passar pelo Hugo.');
  await line(nm, 'Dizem que enterraram um rei com a coroa. Rei morto não precisa de coroa.');
  G.key.estojo = false;
  recruit('andilla', n);
  await joined(nm);
  saveGame();
}

// Caio reconhece a moça dos dados, a Berta cobra a fuga e ela conta das lâminas curvas (uma vez só)
async function andillaReveal() {
  if (G.seen.andillaFuga) return;
  G.seen.andillaFuga = 1;
  const nm = heroName('andilla');
  await line('Caio', 'Espera. Eu conheço essa capa. É a moça dos dados!');
  await line('Berta', 'É ela mesma. Sumiu antes da primeira lâmina e deixou a conta. Explica isso, menina.');
  await line(nm, 'Eu já tinha visto aquelas lâminas curvas. No cemitério, de noite, com gente de capa cinza cavando.');
  await line(nm, 'Quando eles entraram aqui, eu soube quem eram. Saí antes que me reconhecessem.');
  await line('Berta', 'Fugir eu entendo. Deixar a conta, não.');
}

// Primeira visita à taverna: a Lyra, irmã caçula do Aldo, já está lá e entra no grupo (cada herói tem a sua entrada)
async function lyraArrives(lyra = TOWN.npcs.find(n => n.def.id === 'lyra')) {
  if (!lyra || inParty('lyra')) return;
  lyra.talking = true;
  const P = TOWN.p, path = [];
  for (let x = lyra.x; x !== P.x; x += Math.sign(P.x - x)) path.push([x + Math.sign(P.x - x), lyra.y]);  // anda até a frente do Aldo
  for (let y = lyra.y; y !== P.y - 1; y += Math.sign(P.y - 1 - y)) path.push([P.x, y + Math.sign(P.y - 1 - y)]);
  await UI.say('Numa mesa do canto, uma moça de capa roxa, com mais livros que bagagem, levanta num pulo.');
  await line('Lyra', `${A().toUpperCase()}!`, 'alegre');
  await walkPath(lyra, path, 200);
  lyra.dir = 2; P.dir = 0;
  await UI.say('Ela se joga no pescoço dele.');
  await line('Lyra', `${A()} vê a irmã caçula e tenta parecer bravo. ${A()} não consegue.`, 'alegre');
  await line('Aldo', 'Lyra. O que você está fazendo aqui?');
  await line('Lyra', "Sua carta dizia: 'vou a Valmor procurar trabalho'. Eu li: 'vou a Valmor ver a Clara'. Vim ajudar.");
  await line('Aldo', 'Não foi isso que eu escrevi.', 'bravo');
  await line('Lyra', 'Não com essas palavras.', 'alegre');
  await line('Berta', 'A pequena Lyra! Da última vez, mal alcançava o balcão. Chegou hoje cedo, na carroça do correio, e perguntou de você a manhã inteira.');
  await line('Lyra', 'E dizem que Valmor tem uma fonte de luz lá embaixo. Duas coisas para ver nesta vila.');
  await line('Lyra', `Aonde ${A()} for, eu vou junto. Alguém tem que contar essa história direito.`, 'alegre');
  recruit('lyra', lyra);
  await joined('Lyra');
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
    intro: 'Um rato do tamanho de um gato sai de uma cova!', hint: 'Cada golpe conta. Escolha Atacar e o alvo.' },
  morcegos: { foe: 'bats', name: 'Morcegos',     x: 10, y: 4, dir: 3, flag: 'cem2', ids: ['morcegoCova', 'morcegoCova'],
    intro: 'Dois morcegos descem do muro!', hint: () => `Técnica e Magia gastam PM: o Golpe Forte de Aldo bate quase em dobro${inParty('lyra') ? ', e o Fogo de Lyra queima os dois de uma vez' : ''}. Defender segura o golpe seguinte.` },
  ossada:   { foe: 'bone', name: 'Ossada',       x: 12, y: 3, dir: 2, flag: 'cem3', ids: ['ossada'],
    intro: 'Uma mão de osso rompe a terra. Uma Ossada se levanta!', hint: 'PV baixo? Item → Poção. Ainda não há ninguém no grupo que saiba curar.' },
};
const cemDone = () => G.seen.cem3 && G.seen.teoWin;

async function cemFight(n) {
  const f = CEM_FIGHTS[n.def.id];
  const r = await startBattle(f.ids, false, { intro: f.intro, hints: G.seen['dica_' + f.flag] ? [] : [typeof f.hint === 'function' ? f.hint() : f.hint] });
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
    await line('Aldo', 'Abaixe-se!', 'bravo');
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
  await line('Teo', 'Rezo por estas covas há três noites e elas continuam abrindo.', 'preocupado');
  await line('Teo', `Mortos não se levantam sozinhos. Vou com ${G.party.length > 2 ? 'vocês' : 'você'} até descobrir quem os chama.`, 'bravo');
  await joined('Teo');
  if (inParty('lyra')) {
    await line('Teo', 'Vocês são irmãos?');
    await line('Lyra', 'Ele é o mais velho. Eu sou a mais esperta.', 'alegre');
    await line('Aldo', 'Ela é a que fala.');
  }
  saveGame();
  await UI.say('Objetivo: voltar à taverna e contar à Berta o que viram.');
}

function graveSeen(kind) {
  G.seen[kind] = 1;
  if (G.seen.covaU && G.seen.covaO && !G.seen.covas) { G.seen.covas = 1; return line('Aldo', 'Uma cavada de fora, outra aberta por dentro. São duas coisas diferentes.'); }
}

AREAS.cemiterio = makeArea('Cemitério de Valmor', 'CEMITERIO', 16, 12, buildCemeteryMap(), [], TILE.DEADTREE);
Object.assign(AREAS.cemiterio, {
  fog: true, winter: true, dimCol: '10,24,56',
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
    await UI.say('O cemitério de Valmor. Névoa baixa, corvos no muro e covas abertas por toda parte.');
    await line('Aldo', 'Rui não estava exagerando.', 'preocupado');
    if (inParty('lyra')) await line('Lyra', `${A()} diz que não tem medo de cemitério. ${A()} está segurando a espada com as duas mãos.`, 'alegre');
    await UI.say('Entre as covas, alguma coisa se mexe. A setinha amarela mostra onde.');
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
    if (t === TILE.GRAVE_OLD) return async () => {
      if (!inParty('teo')) return UI.say('Uma cova antiga, de lápide rachada.');
      await UI.say('A cova mais antiga de Valmor. A terra ainda está fofa.');
      await line('Teo', 'Este símbolo na lápide quebrada é de um paladino. Quem descansava aqui deu a vida por Valmor.');
      G.seen.paladino = 1;
    };
    return null;
  },
});

// Portão do cemitério na vila e porta da taverna
AREAS.valmor.exits = [{ x: 5, y: 3, to: 'cemiterio', pos: { x: 8, y: 10, dir: 0 },
  check: () => G.seen.job ? null : 'O portão do cemitério está amarrado com corda. Melhor perguntar na vila antes.' }];
AREAS.taverna.exits = [{ x: 7, y: 9, enter: () => leaveTavern() }];
AREAS.taverna.cast = () => [...(!G.intro ? TAVERN_AFTERNOON : TAVERN_NPCS), ...(inParty('lyra') ? [] : [LYRA_DEF]),
  ...(!G.intro || inParty('andilla') ? [] : [ANDILLA_DEF])];

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
  TOWN.followers = G.party.slice(1).map((m, i) => i ? newActor(3, 4, 0) : newActor(4, 3, 3)); // Teo e Lyra à mesa com o Aldo
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
  await UI.say('O mensageiro desmaia. Teo recebe um rolo fechado com o selo real.');
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
  await line('Aldo', 'Acho que vocês erraram de taverna.', 'bravo');

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
  await line('Teo', 'É o selo real. Não cabe a mim rompê-lo.');
  await line('Aldo', 'Quase mataram um homem por ela.', 'bravo');
  await line('Teo', 'Por isso mesmo. Quem abrir tem de ter o direito.');
  if (inParty('lyra')) await line('Lyra', 'Então ninguém abre. Mas eu quero muito saber quem a quer tanto assim.');
  await line('Caio', 'E a moça dos dados? Sumiu antes da primeira lâmina.');
  await line('Berta', 'Capa cinza, igual à deles. Eu sabia que não devia fiar a conta dela.');
  await line('Rui', 'As covas abertas... e agora isso. Na mesma semana.');
  await line('Berta', 'O ancião Bertoldo vai saber o que fazer. É a casa de telhado verde.');
  await line('Berta', 'Levem o homem à capela, a irmã Irene cuida dele. E voltem vivos: a sopa de amanhã já está paga.');

  // Passo 5 · Amanhecer
  await fadeTo(1, 800);
  await UI.say('Os soldados de folga levam o mensageiro até a capela.');
  await UI.say('Ninguém dorme. Teo passa a noite com a carta fechada no colo.');
  await UI.say('De madrugada, um sino toca ao longe, devagar. Ninguém na taverna sabe dizer quem tocou.');
  await UI.say('A sopa da Berta devolve as forças ao grupo.');
  for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); }
  UI.updateParty();
  G.intro = 1;
  enterTown({ x: 6, y: 4, dir: 2 }, 'taverna');
  G.busy = true;
  saveGame(); // não perder a noite se o grupo cair antes de salvar
  await fadeTo(0, 800);
  await UI.say('Objetivo: falar com o ancião Bertoldo, na casa de telhado verde.\nA carta com o selo real está em Itens.');
  G.busy = false; townHint();
}
