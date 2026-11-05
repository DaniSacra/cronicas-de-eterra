# Crônicas de Eterra: Os Reis Caídos

RPG no estilo clássico de 8/16 bits, ambientado em **Eterra**, mundo criado por Daniel.
Numa noite de geada, um mensageiro ferido do Templo chega à vila de Valmor com uma carta lacrada para a rainha.
Covas abertas, encapuzados na estrada e ossos batendo debaixo da cripta... alguma coisa está acordando.

**Jogar:** https://danisacra.github.io/cronicas-de-eterra/

## Como jogar
Abra o link acima, ou abra `index.html` no navegador (não precisa de instalação).
Para testar localmente sem cache: `python3 serve.py` e acesse http://localhost:8000.

**Na vila:** setas/WASD andam, **Espaço** fala com quem está à frente, Esc abre o menu (Itens, Magia, Status,
Diário, Salvar). Para entrar num prédio, ande até a porta. **F** liga a tela cheia.

**Na dungeon:**

| Tecla | Ação |
|---|---|
| ↑ / W, ↓ / S | andar para frente / para trás |
| ← / A, → / D | virar |
| Q / E | passo lateral |
| Espaço | interagir (baú, fonte, altar) |
| Esc / Enter | menu |
| M ou Tab | mapa |
| N | liga/desliga o som |

Nos menus: setas + Enter, e Esc para voltar. Mouse e toque também funcionam.

**Combate:** por turnos. A ordem é sorteada a cada rodada (a agilidade ajuda, mas a sorte conta), e cada luta começa
com uma rolagem de surpresa.

## Tecnologia
JavaScript puro, sem engine e sem build. Canvas 2D (dungeon em primeira pessoa por raycasting, vila vista de cima,
batalhas), pixel art e música gerados por código (Web Audio), save no `localStorage` do navegador.

## Créditos
Mundo, história e personagens de Eterra: Daniel. Todos os direitos reservados sobre o mundo e a história.
