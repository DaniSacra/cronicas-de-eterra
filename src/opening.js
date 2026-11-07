// ===== Prólogo · O Sino de Valmor: Aldo chega sozinho, o cemitério, a noite na taverna e o grupo de quatro =====
// História e falas: docs/mundo/historias/prologo.md (nova história do Daniel, 2026-11-05)
// Especificação: docs/pacotes/capitulo1-aldo-sozinho.md (P2 e P3)

const TAVERN_INSIDE = { x: 7, y: 8, dir: 0 };   // ao entrar pela porta
const TAVERN_FRONT = { x: 22, y: 17, dir: 2 };  // na vila, em frente à porta
const ARRIVAL = { x: 1, y: 6, dir: 1 };         // Aldo entra pela estrada do oeste

const A = () => heroName('aldo'); // Lyra conta o irmão em terceira pessoa: sempre pelo nome do herói
const line = (who, text, mood) => UI.say(`${who}${mood ? '~' + mood : ''}:\n${text}`); // mood: alegre | preocupado | bravo
const joined = async name => { Sfx.join(); await UI.say(`${name} entrou para o grupo!`); };

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

// No prólogo a carta continua lacrada: só a rainha a abre
async function readLetter() {
  const c = KEY_ITEMS.carta;
  for (const t of c.sealed) await UI.say(`${c.sealedName}:\n${t}`);
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
  await line('Nino', 'E tem uma moça de capa roxa na Berta, perguntando de você desde cedo!');
  await line('Aldo', 'Capa roxa? Ah, não.', 'preocupado');
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
    quest: [() => `Encapuzados em Valmor... e a ${heroName('andilla')} com uma faca. Esta semana eu já vi de tudo.`, 'Lá embaixo não tem sopa. Comprem poções com a Dora.'],
    desceu: ['Desceram e voltaram! A sopa está quente. Contem tudo, mas comam primeiro.'],
    won: ['Eu disse que a sopa era de vocês. Sentem, heróis.', 'Agora me digam: se o túmulo estava vazio, quem é que anda por aí com um rei nas costas?'] } },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: {
    start: ['Aquela marca... Não. Não é conversa para agora.', 'Vão falar com o ancião. Eu fico aqui, fiando.'],
    quest: ['Lá embaixo, se alguém chamar vocês pelo nome... não respondam.'],
    desceu: ['Desceram... E a marca? Estava lá embaixo também?', 'Não. Não me contem. Eu já sei demais.'],
    won: ['O padre Anselmo tocava aquele sino. Naquele inverno, ele desceu na cripta com gente de capa cinza. Não voltou.', 'Não era coisa de ladrão de cova. Ladrão de cova não leva o padre junto.', 'Vou fiar um cachecol para cada um. Lá fora a geada não perdoa.'] } },
  { id: 'bruno', look: 'bruno', name: 'Bruno, soldado de folga', x: 2, y: 7, dir: 0, wander: 0, lines: {
    start: ['Vimos as lâminas e sentamos de novo. Não conta pra ninguém.'],
    quest: ['Esses dados dela são de onde? Nunca vi osso pintado assim.'],
    desceu: ['Se ela me chamar para jogar de novo, eu perco feliz.'],
    won: ['Da próxima vez, a gente levanta primeiro. Prometo.'] } },
  { id: 'caio', look: 'caio', name: 'Caio, soldado de folga', x: 4, y: 6, dir: 3, wander: 0, lines: {
    start: ['A moça me deve uma revanche. Ela diz que não. Ela tem razão.', 'Aquele olho cortado ao meio... Já vi em algum lugar. Não lembro onde.'],
    quest: ['Ainda não lembrei onde vi aquele olho. Está na ponta da língua.'],
    desceu: ['Viram aquele olho lá embaixo também? Eu sabia que conhecia de algum lugar.'],
    won: ['Lembrei! Vi aquele olho numa caravana. Ia para o norte, para Erukh.', 'À saúde dos heróis de Valmor!'] } },
];

// Tarde da chegada: só Berta, Ana e Rui (os soldados e a moça dos dados chegam à noite)
const TAVERN_AFTERNOON = [
  { id: 'berta', name: 'Berta, a taverneira', x: 10, y: 2, dir: 2, wander: 0, onTalk: bertaJob },
  { id: 'ana', name: 'Ana, a fiandeira', x: 4, y: 1, dir: 2, wander: 0, lines: { arrive: [() => G.seen.job ? `${A()}. Leve um lampião. A névoa do cemitério engole a gente.` : `Frio de rachar, ${A()}. A Berta está te esperando no balcão.`] } },
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { arrive: [() => G.seen.job ? `${A()}! Eu falei das covas e ninguém acreditou. Você acredita, né? Vai lá ver.` : `${A()}! Fala com a Berta. Ela tem uma notícia que ninguém quer ouvir.`] } },
];
async function bertaJob() {
  const back = G.party.length > 1 ? 'Voltem inteiros e o quarto é de vocês. A sopa também.' : 'Volte inteiro e o quarto é seu. A sopa também.';
  if (G.seen.job) { await line('Berta', inParty('teo') ? 'Já de volta? Contem tudo.' : back); return; }
  await line('Berta', `Olha quem a geada trouxe. ${A()}, de novo.`);
  await line('Aldo', 'Vim pelo trabalho.');
  await line('Berta', 'Claro que veio. A escola continua no mesmo lugar, se o trabalho mudar de ideia.');
  await line('Berta', 'Quarto e sopa, trinta moedas. Ou um favor, que eu conheço essa bolsa vazia.');
  await line('Rui', 'As covas do cemitério amanheceram abertas de novo. Vazias. Como se alguém tivesse saído de dentro.');
  if (inParty('lyra')) await line('Lyra', `Covas abertas por dentro? ${A()}, isso não é trabalho. É capítulo de livro.`, 'preocupado');
  await line('Berta', 'Para com isso, Rui.');
  await line('Berta', `O Hugo não pode largar a igreja velha. ${G.party.length > 1 ? 'Deem' : 'Dê'} uma olhada no cemitério, atrás da capela, no alto da vila.`);
  await line('Berta', back);
  G.seen.job = 1;
  await UI.say('Objetivo: investigar as covas abertas no cemitério, atrás da capela.\nA setinha amarela mostra o caminho.');
}

// A Lyra espera na taverna desde a primeira visita e entra no grupo ali (lyraArrives); a Andilla entra na noite dos encapuzados
const LYRA_DEF = { id: 'lyra', name: 'Lyra', x: 11, y: 6, dir: 0, wander: 0, onTalk: lyraTalk };
// Saves de antes desta noite nova: a Andilla ficou esperando na taverna (andillaTalk)
const ANDILLA_DEF = { id: 'andilla', look: 'andilla', get name() { return G.seen.andillaFuga || G.seen.andillaNome ? heroName('andilla') : 'Moça dos dados'; }, x: 12, y: 7, dir: 3, wander: 0, onTalk: andillaTalk };

// "Por que descer?": a Lyra pergunta ao irmão na porta da igreja velha e lembra a resposta na estrada (G.seen.porque)
const PORQUE = {
  mortos: { label: 'Pelos mortos de Valmor.', reply: a => `${a} diz que é pelos mortos. E pela Clara, mas essa parte ${a} não diz.`,
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
// Na porta da igreja velha, depois da conversa do grupo e antes de descer (uma vez por save)
async function askWhyAtDoor() {
  if (!inParty('lyra') || G.seen.porque) return;
  await line('Lyra', 'Antes de descer, uma pergunta. Por que você vai, maninho?');
  await askPorque();
  if (inParty('andilla')) await line(heroName('andilla'), 'Vocês dois são sempre assim?');
  if (inParty('teo')) await line('Teo', 'Desde ontem, pelo menos.');
}

function lyraTalk(n) { return lyraArrives(n); } // saves antigos: ela ainda espera na taverna

async function andillaTalk(n) {
  // saves antigos em que ela nunca disse o nome: ela se apresenta antes
  if (!G.seen.andillaFuga && !G.seen.andillaNome) await line(n.def.name, 'Vocês de novo. Andilla, prazer. Ouvi dizer que o ancião quer quatro.', 'alegre');
  else await line(n.def.name, 'Demorou. Eu disse que te devia uma.', 'alegre');
  G.seen.andillaNome = 1;
  const nm = heroName('andilla');
  if (G.key.estojo) { await line('Aldo', 'Então isso aqui é seu.'); await line(nm, 'Meus ganchos!', 'alegre'); G.key.estojo = false; }
  recruit('andilla', n);
  await joined(nm);
  saveGame();
}

// Primeira visita à taverna: a Lyra, irmã caçula do Aldo, já está lá e entra no grupo (cada herói tem a sua entrada)
async function lyraArrives(lyra = TOWN.npcs.find(n => n.def.id === 'lyra')) {
  if (!lyra || inParty('lyra')) return;
  lyra.talking = true;
  const P = TOWN.p, path = [];
  for (let x = lyra.x; x !== P.x; x += Math.sign(P.x - x)) path.push([x + Math.sign(P.x - x), lyra.y]);  // anda até a frente do Aldo
  for (let y = lyra.y; y !== P.y - 1; y += Math.sign(P.y - 1 - y)) path.push([P.x, y + Math.sign(P.y - 1 - y)]);
  await UI.say('Numa mesa do canto, uma moça de capa roxa, com mais livros que bagagem, levanta num pulo.');
  Sfx.exclaim();
  await line('Lyra', `${A().toUpperCase()}!`, 'alegre');
  await walkPath(lyra, path, 200);
  lyra.dir = 2; P.dir = 0;
  await UI.say('Ela se joga no pescoço dele.');
  await line('Lyra', `${A()} vê a irmã caçula e tenta parecer bravo. ${A()} não consegue.`, 'alegre');
  await line('Aldo', 'Lyra. O que você está fazendo aqui?');
  await line('Lyra', "Sua carta dizia: 'vou a Valmor procurar trabalho'. Eu li: 'vou a Valmor ver a Clara'. Vim ajudar.");
  await line('Aldo', 'Não foi isso que eu escrevi.', 'bravo');
  await line('Lyra', 'Não com essas palavras.', 'alegre');
  await line('Berta', G.intro ? 'A pequena Lyra! Da última vez, mal alcançava o balcão. Chegou na carroça do correio e perguntou de você a manhã inteira.'
    : 'A pequena Lyra! Da última vez, mal alcançava o balcão. Chegou hoje cedo, na carroça do correio, e perguntou de você a manhã inteira.');
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
    intro: 'Dois morcegos descem do muro!', hint: () => `Atacar enche a Energia de Aldo.${inParty('lyra') ? ' Lyra gasta PM no Fogo, que derruba um morcego de uma vez.' : ''}` },
  ossada:   { foe: 'bone', name: 'Ossada',       x: 12, y: 3, dir: 2, flag: 'cem3', ids: ['ossada'],
    intro: 'Uma mão de osso rompe a terra. Uma Ossada se levanta!', hint: 'PV baixo? Item → Poção. Ainda não há ninguém no grupo que saiba curar.' },
};
const cemDone = () => G.seen.cem3 && G.seen.teoWin;

async function cemFight(n) {
  const f = CEM_FIGHTS[n.def.id];
  const r = await startBattle(f.ids, false, { intro: f.intro, hints: G.seen['dica_' + f.flag] ? [] : [typeof f.hint === 'function' ? f.hint() : f.hint] });
  G.seen['dica_' + f.flag] = 1;
  if (r === 'lose') return gameOver();
  backToArea();
  if (r === 'win') {
    G.seen[f.flag] = 1; TOWN.npcs = TOWN.npcs.filter(a => a !== n);
    if (f.flag === 'cem1') spawnRoamers(); // depois da primeira luta, a névoa começa a se mexer
  }
}

// Errantes do cemitério: nenhum antes da primeira luta fixa, dois depois dela e três depois do Teo, para treinar.
// Nascem longe do grupo e nunca pisam nas lutas fixas, no ponto da cena do Teo, no portão nem na entrada.
const cemRoamerCount = (seen, bossDead = false) => bossDead || !seen.cem1 ? 0 : seen.teoWin ? 3 : 2; // calmo depois do fim do prólogo
const CEM_ROAM_SPOTS = [[4, 6], [2, 10], [13, 10], [11, 4], [1, 10]];
const CEM_RESERVED = new Set([...Object.values(CEM_FIGHTS).map(f => f.x + ',' + f.y), '10,2', '7,2', '8,10', '8,11']);
const CEM_ROAMERS = [{ foe: 'rat', ids: ['ratoCova'], speed: 520, intro: 'Um rato sai da névoa!' },
  { foe: 'bats', ids: ['morcegoCova', 'morcegoCova'], speed: 380, intro: 'Dois morcegos mergulham da névoa!' }];
const cemRoamers = () => CEM_ROAM_SPOTS.filter(([x, y]) => (x - TOWN.p.x) ** 2 + (y - TOWN.p.y) ** 2 > 25)
  .slice(0, cemRoamerCount(G.seen, G.bossDead)).map(([x, y], i) => ({ ...CEM_ROAMERS[i % 2], x, y }));

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
    surprise: 'normal', // Aldo shouted "Abaixe-se!": nobody is caught off guard
    intro: 'Duas Ossadas se erguem atrás do clérigo!', noRun: 'As Ossadas cercam a cova. Não dá para fugir!',
    hints: G.seen.dica_teo ? [] : [G.party.some(m => m.id === 'teo' && knownSpells(m).includes('luz')) ? 'Teo cura com Magia. Contra mortos-vivos, a Luz Sagrada fere em dobro.'
      : 'Teo cura com Magia. No nível 3, ele aprende a Luz Sagrada, que fere os mortos-vivos.'],
  });
  G.seen.dica_teo = 1;
  if (r === 'lose') return gameOver();
  backToArea();
  if (r !== 'win') return; // fugiram: a luta recomeça ao voltar a este ponto
  G.seen.teoWin = 1;
  backToArea();
  await line('Teo', 'Obrigado. Sou Teo. Ainda estou aprendendo, mas um dia quero servir no Templo. Vim ajudar a irmã Irene no inverno.');
  await line('Teo', 'Rezo por estas covas há três noites. E toda noite, antes de elas abrirem, eu ouço um sino.', 'preocupado');
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
  fog: true, winter: true, dimCol: '10,24,56', vision: { radius: 4 }, roamers: cemRoamers, reserved: (x, y) => CEM_RESERVED.has(x + ',' + y),
  dim: () => (G.seen.cem3 && G.seen.teoWin) ? 0.1 : 0.3,
  music: () => 'cemetery',
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
    await UI.say(`${A()} acende o lampião. A névoa engole tudo além da luz.`);
    await line('Aldo', 'Rui não estava exagerando.', 'preocupado');
    if (inParty('lyra')) await line('Lyra', `${A()} diz que não tem medo de cemitério. ${A()} está segurando a espada com as duas mãos.`, 'alegre');
    await UI.say('Entre as covas, alguma coisa se mexe. A setinha amarela mostra onde.');
    saveGame(); // perder no cemitério volta para cá
  },
  onStep(x, y) {
    const foe = TOWN.npcs.find(n => n.def.foe && Math.abs(n.x - x) + Math.abs(n.y - y) === 1);
    if (foe) return () => cemFight(foe);
    if (x === 6 && y === 4 && !G.seen.estojo) return async () => {
      G.seen.estojo = 1; G.key.estojo = !inParty('andilla'); Sfx.keyItem(); // a clue, not a treasure
      await UI.say('Junto de uma cova cavada, um estojo de couro cheio de ganchinhos de metal.');
      await line('Aldo', 'Ferramenta de quem abre o que não é seu.');
      if (inParty('andilla')) await line(heroName('andilla'), 'Meus ganchos! Eu disse que eram meus.', 'alegre');
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
      await line('Teo', 'Esta espada erguida na lápide quebrada é o sinal de um paladino. Quem descansava aqui deu a vida por Valmor.');
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
// Depois da luta, a Berta faz cada um dizer quem é, e a moça dos dados enfim diz o nome
async function introduceAndilla() {
  const lyra = inParty('lyra'), moca = 'Moça dos dados';
  await line('Caio', 'Moça... onde você aprendeu a fazer isso com uma faca?');
  await line(moca, 'No mesmo lugar onde aprendi a jogar dados. Num lugar onde ninguém pergunta onde.');
  await line('Berta', 'Ninguém sobe para dormir sem dizer quem é. Começa você, moça.');
  delete G.seen.andillaAnon; G.seen.andillaNome = 1; UI.buildParty(); // daqui em diante, o nome dela aparece
  const nm = heroName('andilla');
  await line(nm, `Me chamam de ${nm}. Às vezes é verdade.`);
  if (lyra) { await line('Lyra', 'Isso é nome ou é ameaça?'); await line(nm, 'Depende de quem pergunta.', 'alegre'); }
  await line('Aldo', `${A()}. Espada, estrada e pouca conversa.`);
  if (lyra) { await line('Lyra', `E coração mole. ${A()} odeia que eu conte isso.`, 'alegre'); await line('Lyra', 'Lyra, irmã dele. Maga. Eu falo, ele luta.'); }
  await line('Teo', 'Teo. Aprendiz por enquanto, do Templo um dia. Curo os feridos. E agora guardo uma carta que não é minha.');
  await line(nm, 'Eu já vi essas lâminas. Anteontem, no cemitério. Gente de capa cinza cavando cova.');
  if (lyra) { await line('Lyra', 'E o que você fazia num cemitério de noite?'); await line(nm, 'Coisas minhas.', 'alegre'); }
  // the grey cloak keeps the false lead on the dice girl alive without changing the scene
  await line('Bruno', 'Capa cinza, igual à deles.');
  await line(nm, 'Capa cinza é a mais barata do sul. Metade desta taverna usa.');
  if (G.key.estojo) {
    await line('Aldo', 'Então isso aqui é seu.');
    await line(nm, 'Meus ganchos! Achei que tinham ficado para os mortos. Te devo uma, cavaleiro. Eu nunca devo duas.', 'alegre');
    G.key.estojo = false;
  } else await line(nm, 'Larguei meus ganchos lá quando eles me viram. Se acharem, são meus.');
  await line('Berta', 'Ela lutou pela minha taverna. A conta dela está paga.');
  await line(nm, 'Viu? Eu sempre ganho.', 'alegre');
  await joined(nm);
}

const NIGHT_CAST = [
  ...TAVERN_NPCS.map(d => ({ ...d, onTalk: undefined })),
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { start: ['...'] } },
  { id: 'moca', look: 'andilla', name: 'Moça dos dados', x: 1, y: 6, dir: 1, wander: 0, lines: { start: ['...'] } },
];

// From the tavern door (7, 9) up the free column to row 4, along row 4 and up to the tile right of Teo
function messengerPath(teo) {
  const tx = teo.x + 1, path = [];
  for (let y = 8; y >= 4; y--) path.push([7, y]);
  for (let x = 6; x >= tx; x--) path.push([x, 4]);
  for (let y = 3; y >= teo.y; y--) path.push([tx, y]);
  return path;
}

async function nightScene() {
  G.busy = true;
  await fadeTo(1, 300);
  enterTown(TAVERN_INSIDE, 'taverna');
  G.busy = true;
  await fadeTo(0, 300);
  await line('Berta', 'Ossadas andando? E ainda trouxeram um aprendiz de brinde. Sentem, o quarto é de vocês.');
  await UI.say('A Berta serve sopa quente. O grupo recupera as forças.');
  for (const m of G.party) fullRestore(m);
  UI.updateParty();
  await fadeTo(1, 900);

  // A noite: Aldo e Teo à mesa, soldados jogando dados com a moça de capa cinza
  enterTown({ x: 2, y: 4, dir: 0 }, 'taverna', NIGHT_CAST);
  G.busy = true;
  TOWN.followers = G.party.slice(1).map((m, i) => i ? newActor(3, 4, 0) : newActor(4, 3, 3)); // Teo e Lyra à mesa com o Aldo
  await fadeTo(0, 900);
  await UI.say('Noite de geada na Taverna Poney Saltitante.');
  const lyra = inParty('lyra'), moca = 'Moça dos dados';
  await UI.say('No canto, uma moça de capa cinza joga dados com os soldados de folga. Tem fila para perder para ela.');
  await line('Caio', 'Mais uma rodada, moça. Hoje eu ganho.');
  await line(moca, 'Você disse isso ontem, soldado.');
  await UI.say('Os dados rolam. Três seis.');
  await line('Bruno', 'Ninguém tira três seis duas vezes seguidas.');
  await line(moca, 'Ninguém tira. Eu tiro.', 'alegre');
  await line('Caio', 'Ela me ganhou o soldo do mês. E eu ainda agradeci.');
  if (lyra) { await UI.say(`${A()} não tira os olhos dos dados.`); await line('Lyra', `Você nunca vai descobrir como ela faz, ${A()}.`, 'alegre'); }
  await line('Aldo', 'Ela está trapaceando.');
  await line(moca, 'Estou ganhando. Trapaça é o nome que quem perde dá.');
  await line('Teo', 'Eu vou... rezar um pouco.', 'preocupado');
  await line(moca, 'Reza por mim também, padre. Eu preciso mais que eles.', 'alegre');

  // O mensageiro
  Music.stop(); Sfx.dark();
  TOWN.dim = 0.35;
  // he crosses the room straight to Teo, the one with the Temple's book, and stops at his side
  const tobias = addActor({ id: 'tobias', name: 'Mensageiro', x: 7, y: 9, dir: 0 });
  const teoAt = TOWN.followers[G.party.findIndex(m => m.id === 'teo') - 1] || TOWN.p;
  await walkPath(tobias, messengerPath(teoAt));
  tobias.dir = 3; teoAt.dir = 1; TOWN.p.dir = 1;
  await wait(250);
  await line('Mensageiro', 'Esta carta... tem de chegar à rainha. Ninguém mais pode ler.');
  await line('Mensageiro', 'Você é do Templo. Eu vejo pelo livro. Leve. Não deixe que eles...');
  tobias.lying = true; Sfx.fall(); shake(200);
  G.key.carta = true;
  await UI.say('O mensageiro desmaia aos pés de Teo. Nas mãos do clérigo fica um rolo fechado com o selo real: um leão de pé, em cera vermelha.');
  Sfx.keyItem();
  await UI.say('As botas dele estão cobertas de terra úmida. A capa marrom está rasgada na barra. E tem cera de vela na manga.');

  // Os encapuzados. A moça dos dados não foge: entra na briga, e no grupo, antes de dizer o nome
  const hooded = [];
  for (const path of [[[7, 8], [7, 7]], [[7, 8], [6, 8]], [[7, 8]]]) {
    const h = addActor({ id: 'h' + hooded.length, look: 'hooded', name: 'Encapuzado', x: 7, y: 9, dir: 0 });
    hooded.push(h);
    await walkPath(h, path, 300);
  }
  await line('Encapuzado', 'O homem caído vem com a gente. E ninguém mais precisa sangrar esta noite.');
  await UI.say('A moça dos dados vê as lâminas curvas e perde a cor por um instante.');
  await UI.say('Ela guarda os dados no bolso. Na outra mão, já tem uma faca.');
  await line(moca, 'Três contra a taverna inteira? Eu aposto na taverna.', 'alegre');
  TOWN.p.dir = 2;
  await line('Aldo', 'Acho que vocês erraram de taverna.', 'bravo');
  if (!inParty('andilla')) {
    G.seen.andillaAnon = 1; // até dizer o nome, ela é a moça dos dados também no cartão e na batalha
    recruit('andilla', TOWN.npcs.find(n => n.def.id === 'moca'));
  }

  const r = await startBattle(['encapuzado', 'encapuzado', 'encapuzado'], false, {
    surprise: 'ambush', grave: true,
    intro: 'Três encapuzados puxam lâminas curvas!',
    // two hints, one per hero turn: the first comes before anyone acts (the dice girl is almost always first)
    hints: ['Os inimigos agiram primeiro: a ordem de quem age está no topo. A moça dos dados é a mais rápida.',
      'Teo cura os feridos com Magia. Defender reduz o dano até a próxima vez do herói.'],
    noRun: 'Não dá para fugir: o mensageiro está caído no chão!',
  });
  if (r === 'lose') return gameOver();
  G.mode = 'town';
  TOWN.npcs = TOWN.npcs.filter(n => !hooded.includes(n));
  TOWN.dim = 0;
  Music.stop(); // silêncio até o amanhecer

  // Depois da luta
  Sfx.clue();
  await UI.say('O capuz do último encapuzado cai. No peito, bordado em vermelho, um olho cortado ao meio.');
  await line('Berta', 'Gente daqui não usa essa marca.');
  await UI.say('A velha Ana para de fiar. A moça dos dados também olha a marca. Por tempo demais.');
  await line('Aldo', 'Teo... o que diz a carta?');
  await line('Teo', 'É o selo real. O leão de Hanokh.');
  await line('Teo', 'Só quem é do sangue de Hanokh pode rompê-lo. A rainha Lara é.');
  await line('Aldo', 'Quase mataram um homem. E ele só pensava nela.', 'bravo');
  await line('Teo', 'Por isso mesmo. Ela vai fechada até a casa de Hanokh.');
  if (lyra) await line('Lyra', 'Então ninguém abre. Mas eu quero muito saber por que querem tanto esse homem.');
  await introduceAndilla();
  await line('Rui', 'As covas abertas... e agora isso. Na mesma semana.');
  await line('Berta', 'O ancião Bertoldo vai saber o que fazer. É a casa de telhado verde.');
  await line('Berta', 'Levem o homem à capela, a irmã Irene cuida dele.');

  // Passo 5 · Amanhecer
  await fadeTo(1, 800);
  await UI.say('Os soldados de folga levam o mensageiro até a capela.');
  await UI.say('Ninguém dorme. Teo passa a noite com a carta fechada no colo.');
  Sfx.bellFar();
  await UI.say('De madrugada, um sino toca ao longe, devagar. Ninguém na taverna sabe dizer quem tocou.');
  if (inParty('teo')) await UI.say('Teo levanta a cabeça. É o mesmo sino do cemitério.');
  await UI.say('Pão quente e mais sopa. O grupo recupera as forças.');
  for (const m of G.party) fullRestore(m);
  UI.updateParty();
  G.intro = 1;
  enterTown({ x: 6, y: 4, dir: 2 }, 'taverna');
  G.busy = true;
  saveGame(); // não perder a noite se o grupo cair antes de salvar
  await fadeTo(0, 800);
  await UI.say('Objetivo: falar com o ancião Bertoldo, na casa de telhado verde.\nA carta com o selo real está na Bolsa.');
  G.busy = false; townHint();
}

// ---------- Na cripta e no final ----------
// No túnel, antes do bilhete: alguém de fora dos encapuzados desceu e sangrou ali (o mensageiro)
const TUNNEL_CLUE = [[null, 'Um rastro de sangue seco e um pedaço de capa marrom, de viajante. Não é cinza.']];
// Conversas do grupo (docs/mundo/historias/prologo.md)
const TALKS = {
  pista: [['teo', 'Sangue. E não é de morto.'], ['andilla', 'Capa de estrada. Alguém desceu aqui sem ser dos deles.']],
  olho: [['andilla', 'Tinta fresca. Faz menos de uma semana.'], ['aldo', 'Eles já estiveram aqui embaixo.', 'preocupado'], ['lyra', 'Então não vieram a Valmor só pelo mensageiro.']],
  lapide: [['teo', 'Morvath. O rei que o ancião não quis nomear.'], ['andilla', 'Rei enterrado com a coroa, e a gente aqui de mão vazia.', 'alegre'],
    ['teo', () => `${heroName('andilla')}.`, 'bravo'], ['andilla', 'Brincadeira. Quase toda.', 'alegre']],
  bilhete: [['lyra', '"O homem do sumo sacerdote." Quem seria?'], ['aldo', 'O homem que caiu na taverna carregava um selo real. Não é qualquer mensageiro.'],
    ['teo', 'O mensageiro. Se ele estava aqui embaixo, foi aqui que o feriram.'], ['lyra', 'E V. queria que ele não saísse de Valmor. Quase conseguiu.', 'preocupado']],
  altar: [['teo', 'Riscaram o nome de Elun. Não basta abrir um túmulo; precisavam apagar a luz.', 'bravo'], ['aldo', '"O rei voltará." Então é por ele que eles esperam.']],
  igreja: [['lyra', 'Construíram uma igreja em cima de um túmulo. Ou queriam rezar pelo morto, ou queriam que ele não saísse.'],
    ['teo', 'Uma casa de oração vazia. Ninguém reza aqui faz cinquenta anos.'], ['andilla', 'Porta caída, telhado aberto. Pelo menos não vou precisar dos ganchos.', 'alegre']],
  fonte: [['andilla', 'Uma fonte. No meio de uma cripta. Quem constrói uma fonte numa cripta?'],
    ['lyra', 'Ninguém constrói. Elas brotam. Eu vim de longe para ver uma.', 'alegre'],
    ['lyra', 'Dizem que guardam a memória de quem passa. Esta aqui está quieta.'],
    ['teo', 'Não questionem. Bebam.', 'alegre']],
  buraco: [['teo', 'Um leão. O mesmo do selo real.', 'preocupado'], ['andilla', 'O leão da rainha numa parede de cripta?'],
    ['lyra', 'Não da rainha. Da casa dela. Os livros dizem que Hanokh lutou na guerra de Elun. Não dizem o que ele fechou aqui.'], ['aldo', 'Fiquem atrás de mim.', 'bravo'],
    ['lyra', 'Fica você atrás de mim. Eu tenho o fogo.', 'alegre']],
  sino: [['andilla', 'Sino tocando numa igreja sem ninguém. Que ótimo.', 'preocupado'], ['aldo', 'Fiquem atrás de mim.', 'bravo'], ['lyra', 'Fica você atrás de mim. Eu tenho o fogo.', 'alegre']],
  tumulo: [['lyra', 'Arrombaram a tampa. E arrastaram alguma coisa para fora.', 'preocupado'], ['teo', 'Essas quatro espadas são de paladinos. E embaixo de cada uma havia alguma coisa.'],
    ['andilla', 'E alguém levou. Não fui eu, antes que alguém olhe para mim.', 'preocupado'], ['aldo', 'Chegamos tarde.', 'bravo'],
    ['lyra', () => `${heroName('aldo')} ficou quieto. Quando ${heroName('aldo')} fica quieto assim, é raiva.`, 'preocupado']],
  estrada: [['aldo', 'Fui contratado para olhar umas covas. E agora vou para a capital.'],
    ['lyra', porqueRoad], // a resposta da porta da igreja (G.seen.porque); saves sem resposta pulam a fala
    ['aldo', 'Se alguém tirou um rei daquele buraco, não foi para deixar ele quieto. Eu vou. Por Valmor.'],
    ['lyra', 'Você diz que vai por Valmor. Eu ouço: por uma certa professora.', 'alegre'],
    ['aldo', () => `${heroName('lyra')}.`, 'bravo'],
    ['teo', 'A carta vai até a rainha. Até lá, ninguém toca nela.'], ['lyra', 'Dizem que Erukh tem fontes em todas as praças. Quero ver se alguma lembra.'],
    ['andilla', 'E é a cidade mais rica do oeste. Eu vou junto. Pela carta, claro.', 'alegre']],
};
