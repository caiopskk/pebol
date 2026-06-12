# ⚽ Pebol — Draft de Futebol 1v1

Monte um time de 11 titulares através de um **draft** dos clubes do **Brasileirão** e da
**UEFA Champions League** e desafie um amigo em tempo real (1v1, por turnos) — ou jogue
contra a **máquina**. Cada um vê as escolhas do outro ao vivo e, no fim, os times se
enfrentam numa partida simulada e narrada lance a lance.

## Como jogar

```bash
pnpm install
pnpm dev
```

- Cliente: <http://localhost:5173>
- Servidor (Socket.io): porta 3001

Um jogador clica em **Criar sala (online)** e compartilha o código de 4 letras. O outro
entra em **Entrar numa sala** com esse código. Quando os dois ficam *prontos*, o draft começa.

Para jogar sem ninguém, clique em **Jogar sozinho (vs Máquina)**: a IA assume um técnico
real (ex: Diego Simeone, Pep Guardiola) com a mentalidade e a formação típicas dele, monta
o time no draft (você vê as escolhas ao vivo) e te enfrenta na partida.

### Jogar com amigos na mesma rede

O Vite e o servidor já expõem na rede local. O amigo acessa
`http://SEU-IP:5173` (ex: `http://192.168.0.10:5173`) e o cliente conecta sozinho ao
servidor no mesmo host (porta 3001). Libere essas portas no firewall se necessário.

## Fluxo do jogo

1. **Configuração** — cada jogador escolhe uma **formação** (4-3-3, 4-4-2, 3-5-2,
   4-2-3-1, 3-4-3, 5-3-2) e uma **mentalidade**:
   - **Aura (Agressiva)**: +15% ataque, -10% defesa
   - **Equilibrada**: neutra
   - **Retranca**: +15% defesa, -10% ataque
2. **Draft (turnos alternados)** — os jogadores se revezam. **A cada turno, um novo time
   é sorteado** para quem está na vez, que escolhe **um jogador** dele e o encaixa numa
   vaga da sua formação. Aí passa a vez ao adversário, que recebe **outro time sorteado**.
   Cada time sorteado é descartado. Isso se repete até os dois preencherem os 11 titulares.
   - Escalar um jogador **fora da posição** aplica penalidade no rating
     (mesmo setor: leve; setor adjacente: média; setor oposto / goleiro na linha: pesada).
3. **Simulação ao vivo** — uma **única partida** (1º e 2º tempo, 90 min) narrada
   **minuto a minuto**: relógio correndo, placar atualizando e um feed de lances reais —
   gols (com **animação de GOL** e VAR), **cartões amarelos e vermelhos** (com animação),
   faltas, defesas, escanteios, impedimentos, substituições e até lesões. Dá pra assistir
   em **1x, 1.5x ou 2x** (ou pular). Empate no tempo normal vai para **disputa de pênaltis**,
   também cobrança a cobrança. O motor compara ataque, meio e defesa (com a mentalidade
   aplicada) e gera os gols com um fator de sorte.

> As posições usam siglas em português estilo EA FC: **GOL, ZAG, LD, LE, ALD, ALE, VOL,
> MC, MEI, MD, ME, PD, PE, SA, CA** (Centroavante).

## Modos

- **Clássico** — ratings visíveis durante o draft.
- **Pica** — ratings ocultos; você precisa conhecer o futebol pra saber quem é o craque
  do time sorteado. (O servidor oculta os ratings de verdade durante o draft.)

## Estrutura

```
shared/        # tipos, engine e dados (compartilhado por client e server)
  types.ts
  formations.ts
  mentalities.ts
  engine.ts        # penalidade de posição, força do time, simulação
  data/teams.ts    # 58 times (Brasileirão + UEFA Champions League), 11 titulares cada
  data/managers.ts # técnicos reais usados como IA (estilo + formação preferida)
server/src/
  index.ts         # Express + Socket.io (serve o client buildado em produção)
  rooms.ts         # salas, turnos, IA do modo solo e máquina de estados do draft
  bot.ts           # adversário automático (útil pra testar sozinho)
  smoke-test.ts    # teste de fumaça: simula uma partida 1v1 completa
client/
  index.html
  public/pebol_logo.png  # logo (asset estático, servido pelo Vite em /pebol_logo.png)
  src/main.ts      # toda a UI (home, lobby, draft, partida ao vivo, resultado)
  src/net.ts       # conexão socket.io
  src/styles.css   # design system (dark UI + bento + glassmorphism)
```

## Produção (porta única)

```bash
pnpm build      # gera dist/
pnpm start      # servidor serve o client + socket na porta 3001
```

## Testar sozinho

Crie uma sala na interface e, com o código, rode um bot adversário:

```bash
pnpm bot ABCD "Robô"
```

Os dados dos jogadores (`shared/data/teams.ts`) são estimativas — ajuste ratings,
times e jogadores à vontade.
