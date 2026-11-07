# Bíblia de arte de Crônicas de Eterra

Leitura obrigatória antes de qualquer trabalho de arte (sprite, retrato, cenário, efeito, ícone).
Na dúvida, os retratos dos heróis em `src/herofaces.js` são a régua: tudo o que entra no jogo tem que parecer
do mesmo jogo que eles.

## Direção: aventura luminosa

- Referências: Dragon Quest, Chrono Trigger, Sea of Stars. Pixel art com contorno, cores vivas e
  personagens de anime.
- Medo de aventura, não de terror. O mundo tem perigo de verdade, mas a arte é colorida, expressiva e
  convidativa. Público de cerca de 15 anos: aguenta um chefe assustador e mortos-vivos, desde que o tom geral
  seja de aventura.
- O jogo terá vários ambientes, cada um com seu clima, todos com a mesma paleta e as mesmas regras.
- Tudo é original e gerado por código. Nada baixado, copiado ou redesenhado de outro jogo.

## Formato único: grade com uma letra por cor

Todo sprite é uma grade, como os retratos dos heróis:

```js
{ rows: ['..oo..', '.obbo.', ...],   // strings da mesma largura; '.' é transparente
  pal:  { o: '#14402a', b: '#4ad08a' } } // letra -> cor da paleta mestre
```

- Desenhado por `GridSprite.render(def)` (`src/gridsprite.js`), que devolve um canvas em cache.
- Variantes do mesmo personagem ou inimigo saem por troca de `pal`, nunca por uma grade nova.
- Animação: uma grade por quadro (`frames: [rows, rows]`), mesma largura e altura em todos os quadros.

## Quatro regras para tudo

1. **Escala única.** Base de 320x180: um pixel de arte vale 4 pixels de tela em 1280x720. Sempre escala
   inteira, `imageSmoothingEnabled = false`, nada fora da grade, nada desfocado. Sprites são desenhados no
   tamanho em que aparecem; não se amplia por 1,3 nem por qualquer fração.
2. **Paleta fechada.** Só cores da paleta mestre (`src/palette.js`). Cor nova só entra com motivo, e entra
   primeiro na paleta mestre. Trocar a paleta recolore o jogo.
3. **Contorno colorido.** Personagens e inimigos têm contorno escuro da própria cor (o tom mais escuro da
   família), nunca preto puro. Cenário sem contorno.
4. **Luz do alto à esquerda.** Três ou quatro tons por cor, brilho no alto à esquerda, sombra embaixo à
   direita. Sem degradê suave, sem curvas suavizadas, sem gradientes nem sombras desfocadas do canvas.

## Paleta mestre (`src/palette.js`)

| Família | Cores | Uso |
|---|---|---|
| Luz e sagrado | `#fff6c0 #f0d860 #e8b840 #c89c38 #8a5418` | Altares, cura, a estrela do título: a assinatura de Yah e Elun |
| Noite e frio | `#8ac0f0 #3a78c8 #2c3c80 #1c2860 #151e4e` | Céu, sombra do cenário, geada |
| Vida e natureza | `#90e0b0 #4ad08a #3a9a6a #2a5440 #14402a` | Grama, árvores, gosmas |
| Mistério e magia | `#f0a8f8 #a84ad8 #72308e #40145a #3a1448` | Cripta, magia, espectros |
| Neve e gelo | `#e8eff8 #cbd8ec #a4b8da #7488b8 #4a5a8c` | Chão de inverno, neve nos telhados e copas, lago congelado |
| Perigo | `#e86a7a #a8323e #7a1a24 #4a0c14 #26202e` | Olhos de inimigos, dano, chefes |
| Pele, madeira e pedra | `#f4cca0 #d8a478 #b07c58 #9a6232 #6a3a1a #a2a2ac #7a7a82 #55555e` | Rostos, casas, muros, ossos |

A paleta também guarda as demais cores que os retratos dos heróis já usam (família `retratos`), para que eles
continuem idênticos. Um teste garante que toda cor de todo sprite em grade está na paleta mestre.

## Cor de identidade dos heróis

Usada no sprite, no retrato, no cartão e no efeito de magia de cada um.

| Herói | Cores |
|---|---|
| Aldo | âmbar, marrom e azul |
| Teo | verde e branco |
| Lyra | roxo e dourado |
| Andilla | vermelho, preto e prata |

## Inimigos em escada de ameaça

- **Comuns** (gosma, rato, morcego): expressivos e com humor, olhos grandes, poses exageradas. O jogador
  aprende a lutar sorrindo.
- **Da história** (Ossada, Encapuzado): sérios, olhos brilhando no escuro, poses tensas, sem piada. Indicam
  que a trama ficou séria. Cada um carrega um detalhe ligado ao mistério do capítulo.
- **Chefes** (o Sineiro): assustadores de verdade, ocupam a tela, luz dramática vinda de baixo, animação lenta
  e pesada.

Regras de batalha para inimigos:

- Comuns com cerca de 48x48 a 64x64; chefe com cerca de 96x96.
- Dois quadros de animação parado (respirar, flutuar, chama tremendo).
- A sombra elíptica no chão é desenhada pelo renderizador, nunca dentro do sprite.

## Ambientes

Todos usam a mesma paleta mestre; o que muda é a cor da luz e o peso de cada família.
Estações e "depois da vitória" saem por troca de paleta, não por desenho novo.

- **Vila de Valmor:** inverno aconchegante, neve nos telhados, janelas âmbar, fumaça nas chaminés, lampiões
  com poças de luz.
  Feito em `src/townart.js`: a área com `winter` troca grama por neve, folhas pela família vida, põe gorro de
  neve nas copas e nos telhados e acende as janelas. A área com `dusk` ganha a camada de luz: um véu azul de
  anoitecer (`#1c2860`) com poças em três anéis de degrau, que tiram o véu e põem âmbar. Fumaça e neve caindo
  são desenhadas por quadro, em pixels inteiros. Lampiões ficam em `LAMPS` (`src/town.js`).
- **Cripta:** azul e roxo, velas, cogumelos que brilham. Tocha quente perto do grupo, escuro com a distância.
  Feito: pedra azulada com limo verde-água (`FLOORS[0].pal`), paredes com velas e com cogumelos emissivos
  (`src/textures.js`, variantes 6 e 7) e a cor da luz por distância em `torchTint` (`src/uirules.js`).
- **Tela de título (amanhecer sobre Erukh):** céu em faixas da noite ao dourado com pontilhado Bayer só na
  borda de cada faixa e um brilho atrás da capital; a estrela do título acima de Erukh; nuvens em duas camadas com
  a borda de baixo dourada; cordilheira azulada com neve acesa do lado do sol; colinas mais claras e azuis com a
  distância; rio em S com estrada até o portão. Erukh tem 64x44, com muralha, torres, telhados pontudos, cúpula do
  templo, estandartes e janelas âmbar. Aldo (sentado) e Lyra (em pé, apontando, capa ao vento) de costas, em grade,
  dois quadros, sobre a ruína com musgo e um entalhe gasto, no terço direito. A câmera desce do céu em 2 s
  (qualquer tecla pula). Feito em `src/titlebg.js`; `titleLayout` dá os retângulos e o teste garante que logo e
  menu nunca cobrem Erukh nem os irmãos. Em pé, o horizonte sobe para pouco além do meio e a ruína vai junto.

- **Fundos de batalha (pseudo 3D):** cada luta mostra o lugar visto pelos heróis: o fundo (céu, muro, parede) até o
  horizonte em 40% da altura e um chão em perspectiva com ponto de fuga no centro; lápides, barris e mesas diminuem com a
  distância. Cemitério à noite, taverna, cripta, sala do chefe e rua da vila. Os inimigos ficam de pé no chão, em duas
  fileiras (o primeiro, o terceiro... mais ao fundo). Pintado na escala dos inimigos, em `src/battlebg.js`
  (`battlePlace` escolhe o lugar; um andar novo da masmorra pode ter `battle: 'mina'` quando a cena existir).

## NPCs e heróis ganham vida

- **NPCs:** chibi com cerca de 2,5 cabeças de altura, como hoje. Silhueta por profissão: reconhecível só pela
  sombra. Dois quadros de respiração parado; quatro de caminhada em quatro direções. NPCs da história (Berta,
  Clara, Hugo, o ancião) ganham retrato no estilo dos heróis.
- **Heróis:** retratos atuais mantidos como estão. Quatro expressões cada: normal, alegre, preocupado, bravo.
  Sprite chibi com o mesmo cabelo, roupa e acessório do retrato. Cor de identidade no cartão, no golpe e na magia.
- **Heróis de corpo inteiro (tela de Heróis):** 48x64, de frente, mesmo cabelo, olhos e roupa do retrato, contorno da
  própria cor, dois quadros parado (respira; capa e cabelo ao vento) e uma pose de caído (ajoelhado, nos cinzas da
  paleta). A arma está sempre na mão; o equipamento achado muda o sprite por troca de cores (`GEAR_LOOK`), nunca
  por grade nova. Gerados por `docs/arte/gerador/herobody.cjs` → `src/herobody.js`. Ficam num palco de 96x78 com
  vitral na família do herói (`HERO_FACE_BG`) e pedestal de pedra, em escala inteira.

## Feito até agora

- Etapas 1 a 5 aplicadas (novembro de 2026). Expressões dos heróis em `HERO_MOODS` (`src/herofaces.js`); quem fala
  escolhe o rosto com `Nome~alegre`, `Nome~preocupado` ou `Nome~bravo`. Retratos de Berta, Clara, Hugo e do ancião
  saem de `docs/arte/gerador/faces.cjs`. NPCs andam em quatro tempos e respiram parados (`Folk.pose`).
- A fonte pixel da interface é a Press Start 2P (Google Fonts). Uma fonte própria, desenhada em grade, fica para
  depois: exige gerar um arquivo de fonte ou desenhar todo texto no canvas.
- Tela de título nova (v63): amanhecer sobre Erukh com os irmãos na ruína, menu compacto translúcido no canto de
  baixo à esquerda, logo no alto sem moldura de pergaminho.
- Tela de Heróis nova (v65): herói de corpo inteiro no vitral com Arma e Armadura ao lado, ficha com barras grossas,
  atributos comparados ao grupo e a história que cresce com o jogo, e o livro com habilidades (as futuras em "???")
  e a bolsa. Ícones novos: `raio` e `luz`. Texto nunca menor que o dos menus; no celular, três abas.

## Ordem de produção

1. Paleta mestre e formato de sprite por grade, aplicados ao código.
2. Inimigos redesenhados, começando pela gosma e terminando no Sineiro.
3. Vila de inverno com camada de luz e sombra.
4. Animação dos NPCs e expressões dos heróis.
5. Fonte pixel na interface e acabamento da cripta.
