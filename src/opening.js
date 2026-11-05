// ===== Abertura: "O mensageiro ferido", na Taverna do Caldeirão Partido =====
// História e falas: docs/mundo/historias/abertura-o-mensageiro-ferido.md
// Especificação: docs/pacotes/abertura-taverna.md

const TAVERN_INSIDE = { x: 7, y: 8, dir: 0 };   // ao entrar pela porta
const TAVERN_FRONT = { x: 22, y: 17, dir: 2 };  // na vila, em frente à porta

// Moradores fixos da taverna, depois da cena
const TAVERN_NPCS = [
  { id: 'berta', name: 'Berta, a taverneira', x: 10, y: 2, dir: 2, wander: 0, lines: {
    start: ['O ancião Bertoldo mora na casa de telhado verde, ao norte. Vão!'],
    quest: ['Encapuzados abrindo covas... Ladrão de cova, é o que eles são.', 'Lá embaixo não tem sopa. Comprem poções com a Dora.'],
    won: ['Eu disse que a sopa estava paga. Sentem, heróis.'] } },
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

const OPENING_CAST = [
  ...TAVERN_NPCS,
  { id: 'rui', name: 'Rui', x: 1, y: 3, dir: 1, wander: 0, lines: { start: ['...'] } },
];

const line = (who, text) => UI.say(`${who}:\n${text}`);

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

// Antes do fim a carta continua lacrada; depois de lida, mostra o texto do Daniel
async function readLetter(aloud) {
  const c = KEY_ITEMS.carta;
  if (!aloud && !G.key.lida) { for (const t of c.sealed) await UI.say(`${c.sealedName}:\n${t}`); return; }
  if (aloud) { await UI.say('Teo rompe o selo e lê a carta em voz alta.'); G.key.lida = true; }
  for (const t of c.text) await UI.say(`${c.name}:\n${t}`);
}

async function openingScene() {
  G.busy = true; G.fade = 1;
  // Cena 1 · A sopa
  enterTown({ x: 2, y: 4, dir: 0 }, 'taverna', OPENING_CAST);
  TOWN.followers = [newActor(3, 4, 0), newActor(4, 3, 3)];
  await fadeTo(0, 900);
  await UI.say('Valmor, no sul gelado de Eterra. Uma noite de geada na Taverna do Caldeirão Partido.');
  await line('Berta', 'Comam. A estrada até Erukh é longa, e o frio do sul não perdoa ninguém.');
  await line('Rui', 'As covas do cemitério amanheceram abertas de novo. Vazias. Como se alguém tivesse saído de dentro.');
  await line('Berta', 'Para com isso, Rui. Assim ninguém dorme.');

  // Cena 2 · O mensageiro
  Sfx.dark();
  TOWN.dim = 0.35;
  const tobias = addActor({ id: 'tobias', name: 'Mensageiro', x: 7, y: 9, dir: 0 });
  await walkPath(tobias, [[7, 8], [7, 7], [7, 6], [7, 5], [7, 4], [8, 4]]);
  tobias.dir = 0;
  TOWN.p.dir = 1; TOWN.followers[0].dir = 1; TOWN.followers[1].dir = 2;
  await wait(250);
  await line('Mensageiro', 'Esta carta... tem de chegar à rainha. Ninguém mais pode ler.');
  await line('Mensageiro', 'Você é do Templo. Eu vejo pelo livro. Leve. Não deixe que eles...');
  tobias.lying = true; Sfx.hurt(); shake(200);
  G.key.carta = true;
  await UI.say('O mensageiro desmaia. Teo recebe um rolo lacrado com o selo do sumo sacerdote.');
  Sfx.chest();

  const hooded1 = addActor({ id: 'h1', look: 'hooded', name: 'Encapuzado', x: 7, y: 9, dir: 0 });
  await walkPath(hooded1, [[7, 8], [7, 7]], 300);
  const hooded2 = addActor({ id: 'h2', look: 'hooded', name: 'Encapuzado', x: 7, y: 9, dir: 0 });
  await walkPath(hooded2, [[7, 8]], 300);
  await line('Encapuzado', 'A carta. E ninguém mais precisa sangrar esta noite.');
  TOWN.p.dir = 2;
  await line('Aldo', 'Acho que vocês erraram de taverna.');

  // Cena 3 · A luta (tutorial)
  const r = await startBattle(['encapuzado', 'encapuzado'], false, {
    surprise: 'ambush',
    intro: 'Dois encapuzados puxam lâminas curvas!',
    hints: ['Os inimigos agiram primeiro. No topo da tela está a ordem de quem age.', 'Lyra ataca com Magia; Teo cura os feridos com Magia.', 'Defender reduz o dano até a próxima vez daquele herói.'],
    noRun: 'Não dá para fugir: o mensageiro está caído no balcão!',
  });
  if (r === 'lose') return gameOver();
  G.mode = 'town';
  TOWN.npcs = TOWN.npcs.filter(n => n !== hooded1 && n !== hooded2);
  TOWN.dim = 0;
  Music.play('town');

  // Cena 4 · A carta
  await UI.say('O capuz do último encapuzado cai. No peito, bordado em vermelho, um olho cortado ao meio.');
  await line('Berta', 'Gente daqui não usa essa marca.');
  await UI.say('A velha Ana para de fiar. Olha a marca por muito tempo e não diz nada.');
  await line('Lyra', 'Teo... o que diz a carta?');
  await line('Teo', 'É o selo do sumo sacerdote. Não cabe a mim rompê-lo.');
  await line('Aldo', 'Quase mataram um homem por ela, Teo.');
  await line('Teo', 'Por isso mesmo. Quem abrir tem de ter o direito.');
  await line('Rui', 'As covas abertas... e agora isso. Na mesma semana.');
  await line('Berta', 'O ancião Bertoldo vai saber o que fazer. É a casa de telhado verde.');
  await line('Berta', 'Levem o homem à capela, a irmã Irene cuida dele. E voltem vivos: a sopa de amanhã já está paga.');

  // Amanhecer
  await fadeTo(1, 800);
  await UI.say('Os soldados de folga levam o mensageiro até a capela.');
  await UI.say('Ninguém dorme. Teo passa a noite com a carta fechada no colo.');
  await UI.say('Ao amanhecer, a sopa da Berta devolve as forças ao grupo.');
  for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); }
  UI.updateParty();
  G.intro = 1;
  enterTown({ x: 6, y: 4, dir: 2 }, 'taverna');
  saveGame(); // não perder a abertura se o grupo cair antes de salvar
  await fadeTo(0, 800);
  await UI.say('Nova missão: falar com o ancião Bertoldo, na casa de telhado verde.\nA carta lacrada está em Itens. O Diário, no menu (Esc), guarda o que vocês descobrirem.');
  G.busy = false; townHint();
}
