# Crônicas de Eterra

RPG em HTML, CSS e JS puro, sem dependências e sem build. Testes: `npm test` (node:test).

- Código e mensagens de commit em inglês; textos para o jogador em português, sem travessão.
- DRY e KISS. Toda lógica nova com teste. Saves antigos não podem quebrar.
- Ao mudar arquivos do jogo, atualize o `?v=` no `index.html`.

## Arte

**Leitura obrigatória antes de qualquer trabalho de arte:** [`docs/arte/estilo.md`](docs/arte/estilo.md).
Formato único de sprite (grade com uma letra por cor, `src/gridsprite.js`), paleta mestre fechada
(`src/palette.js`), escala inteira, contorno colorido e luz do alto à esquerda.
