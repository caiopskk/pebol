# AGENTS.md — Pebol

Documento único com toda a lógica do projeto. Serve tanto para agentes de IA quanto para
lembrar como o jogo funciona, sem precisar reexplicar. (Para instruções de jogador, o
[README.md](README.md) basta.)

---

## 1. O que é

**Pebol** é um jogo web 1v1 de **draft de futebol** em tempo real. Dois jogadores — ou um
jogador contra a máquina — sorteiam clubes reais do **Brasileirão** e da **UEFA Champions
League** ou seleções históricas da **Copa do Mundo**, montam um XI titular escolhendo um
jogador por rodada, e os times se enfrentam numa **partida única** narrada ao vivo (com
intervalo, cartões, pênaltis, etc.).

A graça: você não escolhe quem quer; o jogo sorteia um time por turno e você pega **um**
jogador dele. Montar um time bom com sorteios aleatórios é o desafio.

---

## 2. Stack e convenções

- **TypeScript** em tudo. **pnpm** (v11) é o gerenciador — nunca use `npm`/`yarn`.
- Sem build em dev: o servidor roda com `tsx`, o client com `vite`. Importação cross-pacote
  é por caminho relativo (`../../shared/...`).
- **Comentários no código em inglês** e só os necessários. Strings de UI e narração de
  eventos ficam em **português** (é o idioma do jogo).
- Desenvolvimento em Windows (PowerShell). Use a sintaxe correta no shell.
- `pnpm-workspace.yaml` precisa de `allowBuilds: esbuild: true` — sem isso o esbuild não
  compila, `pnpm install` sai com código 1 e `pnpm dev` quebra.
- Tipos: tudo compartilhado fica em `shared/types.ts`. Validar com `npx tsc --noEmit` valida
  shared + server + client de uma vez (não há build de tipos separado).

---

## 3. Estrutura de arquivos

```
shared/                # código e dados usados por client E server
  types.ts             # TODOS os tipos (RoomState, MatchEvent, Team, etc.)
  gameMode.ts          # helpers de modo: isWorldCupMode/isHardcoreMode/gameModeLabel
  formations.ts        # 10 formações (slots com x/y) + posLabel/posName (siglas PT)
  mentalities.ts       # 6 mentalidades (modificadores de ataque/defesa)
  engine.ts            # penalidade de posição, força do time, simulação da partida
  data/teams.ts        # 68 times, 11 titulares + bench (reservas) cada
  data/managers.ts     # 37 técnicos reais (estilo + formação) usados como IA
server/src/
  index.ts             # Express + Socket.io; serve dist/ em produção; driveAI()
  rooms.ts             # salas, turnos, máquina de estados, IA do solo, re-sim do 2º tempo
  bot.ts               # adversário headless (pnpm bot <CODE>) — testar PvP sozinho
  smoke-test.ts        # teste headless PvP (2 clientes humanos)
  solo-test.ts         # teste headless do modo solo (humano + IA)
client/
  index.html
  public/pebol_logo.png  # logo (servido em /pebol_logo.png pelo Vite)
  src/main.ts          # orquestrador de estado/render; evitar colocar regra pura nova aqui
  src/net.ts           # conexão socket.io + wrappers de emit
  src/styles.css       # design system: dark UI + bento + glassmorphism atenuado
  src/styles/          # módulos CSS extraídos de styles.css (ex: overlays/notices)
  src/components/      # telas/componentes isolados (Home, Draft, Live, Result, Admin, etc.)
  src/lib/             # helpers puros (lineup, campaignData, resultSummaryData, import, notices)
  src/devPreviews*.ts  # rotas/fixtures/telas de preview de desenvolvimento
```

`main.ts` ainda centraliza o estado global e a troca de telas, mas não deve voltar a ser o
lugar de toda regra do client. Regra pura e transformação de dados vão para `client/src/lib/*`;
telas e partes reutilizáveis vão para `client/src/components/*`; fixtures e atalhos de teste
visual ficam em `client/src/devPreview*.ts`. Durante a partida ao vivo o `render()` é
**bloqueado** (`if (L.playing) return`) pra não destruir a animação — atualizações vêm por
`syncLiveUi`.

---

## 4. Lógica do jogo (a parte importante)

### 4.1 Fases da sala

`RoomState.phase`: `lobby` → `draft` → `result`. O `result` engloba a partida ao vivo
inteira (1º tempo, intervalo, 2º tempo, pênaltis, resumo) — reproduzida no client.

### 4.2 Draft

- Turnos **alternados**. **A cada turno sorteia-se um time novo** (`drawTeam`). O jogador da
  vez pega 1 jogador desse time para um slot vazio da sua formação; o time é descartado
  (`usedTeamIds`). Se o pool acabar (22 escolhas > 68 times não acontece, mas há fallback),
  recicla.
- 22 turnos no total → 11 titulares por jogador.
- A criação de sala separa **tipo de elenco** (Clubes ou Seleções) de **regra de jogo**
  (Clássico ou Hardcore). Internamente isso vira `GameMode`: `classico`, `hardcore`,
  `worldcup` ou `worldcup-hardcore`.
- Use sempre os helpers de `shared/gameMode.ts` para regra de modo. Evite comparações soltas
  como `mode === "hardcore"` quando o comportamento também vale para `worldcup-hardcore`.
- O draft de clubes online lê o pool oficial do banco. O draft PvP/PvE de seleções usa
  `WC_DRAFT_TEAMS` (seleções históricas), mas isso **não** é a campanha da Copa; é a mesma
  partida única do modo clássico usando outro pool de jogadores.
- **Reroll**: cada jogador tem "atualizações" pra descartar o time sorteado e sortear outro
  (`rerollTeam`). Quantidade por modo (`rerollsForMode`): **Clássico = 5**, **Hardcore = 3**.
  Em PvP vale para clubes e seleções. No solo contra IA, o snapshot expõe reroll nos modos
  clássicos (`classico`/`worldcup`); a IA não rerolla.
  A campanha da Copa segue regra própria (`CampaignMode`): Normal = 5, Hardcore = 3
  (definido em `c.rerollsRemaining` ao iniciar o draft, no handler `cup-start`).
- **Modo Hardcore** (`isHardcoreMode(mode)`): os ratings ficam **ocultos** durante o draft (o
  servidor zera os ratings no snapshot, não é só esconder no CSS). Nos modos clássicos ficam
  visíveis. Desbloqueia no **nível 5** (`HARDCORE_UNLOCK_LEVEL`). **Contra a máquina**, a IA
  ainda recebe um buff de força (`HARDCORE_AI_SCALE = 1.04` em `rooms.ts` →
  `SimInput.strengthScale`, aplicado em `makeSide`): vitória em times iguais cai de ~50% para
  ~40% — mais difícil, não impossível. Em PvP o buff não se aplica (seria injusto).
- **IA (modo solo)**: na vez dela, `driveAI` (em `index.ts`) espera **~3s** (pra dar pra
  acompanhar) e chama `aiPick`, que escolhe o melhor jogador para o slot de menor penalidade.

### 4.3 Penalidade de posição (`positionPenalty`, engine.ts)

Cada jogador tem uma posição natural; cada slot pede uma posição. Escalar fora da posição
penaliza o rating:

- posição exata → **0**
- mesmo grupo (ex: CB numa vaga de LB) → **−3**
- grupos adjacentes (DEF↔MID, MID↔ATT) → **−10**
- grupos distantes (DEF↔ATT) ou envolvendo GK → **−22**

`effectiveRating = max(40, rating − penalidade)`. Grupos: GK, DEF, MID, ATT (`groupOf`).

### 4.4 Força do time (`computeStrength`)

A partir dos `effectiveRating` dos 11 escalados, por linha:

- **defesa** = `(média(DEF) × 3 + goleiro × 2) / 5`
- **meio** = média(MID)
- **ataque** = média(ATT)
- **geral** = média de todos

### 4.5 Mentalidades (`mentalities.ts`)

Multiplicam a força de ataque/defesa na simulação (não os ratings em si). Há dois
grupos: o **eixo** (aura/equilibrada/retranca — puro tradeoff ataque↔defesa, fora do
triângulo) e o **triângulo de counter** (pressão→posse→contra-ataque→pressão). Os três
estilos do triângulo têm stats **net-neutros** (`attackMod + defenseMod = 2`, então ~50%
vs equilibrada) — o valor deles vem do counter. `equilibrada` é o único **imune** a counters.

| id              | nome             | ataque | defesa | counter                    |
| --------------- | ---------------- | ------ | ------ | -------------------------- |
| `aura`          | Agressivo        | ×1.12  | ×0.88  | —                          |
| `equilibrada`   | Equilibrada      | ×1.00  | ×1.00  | imune                      |
| `retranca`      | Retranca         | ×0.88  | ×1.12  | —                          |
| `pressao`       | Marcação pressão | ×1.06  | ×0.94  | neutraliza `posse`         |
| `posse`         | Posse de Bola    | ×1.03  | ×0.97  | neutraliza `contra_ataque` |
| `contra_ataque` | Contra-ataque    | ×0.96  | ×1.04  | neutraliza `pressao`       |

**Counter** (`mentalityEdge` + `applyCounter`, engine): quando o estilo de um lado
neutraliza o do outro, o vencedor ganha ataque ×1.06 / defesa ×1.02 e o neutralizado perde
ataque ×0.92 / defesa ×0.97. Vale ~76% de vitória (≈ +5/6 de overall) — é a principal leitura
tática. No 1v1 a leitura acontece no intervalo; na Copa, o adversário tem tática fixa por time
(`wcOpponentTactics`, determinística por `id:season`) e o jogador escolhe a mentalidade no
`preMatch` (com aviso de vantagem/risco). Matemática: net-neutro exige `attackMod+defenseMod=2`.

### 4.5b Foco de ataque (`AttackFocus`, engine `attackFocusMod`)

Segunda dimensão tática, **independente** da mentalidade (campo `attackFocus` em
PlayerPublic/SimInput/HalftimeLineup; setup, intervalo e preMatch da Copa têm seletor).
Valores: `equilibrado` (neutro), `lados` (usa LB/RB/LWB/RWB/LM/RM/LW/RW), `meio`
(usa CDM/CM/CAM/CF/ST). O modificador é `clamp(0.9..1.11, 1 + (médiaDaZona − overall)/120)`
multiplicando o **ataque**: canalizar pela zona forte do seu elenco dá até ~+11% de ataque
(~+5/6% de vitória); forçar pela zona fraca pune (~-5%). Premia ler o próprio draft. É uma
camada terciária (abaixo do counter e do gap de rating). Adversários da Copa também têm foco
fixo (`wcOpponentTactics`). Default `equilibrado` (back-compat: bots/testes que não enviam
`attackFocus` caem nele).

### 4.6 Simulação da partida — DOIS tempos com re-simulação no intervalo

**A partida NÃO é simulada de uma vez.** Este é o ponto mais delicado do código.

1. No fim do draft, `finishDraft` chama `simulateFirstHalf` → gera **só o 1º tempo**
   (minutos 0..45 + marcador `halftime`). No `result`: `secondHalfReady=false`,
   `winnerId=""`, `goals` = gols do 1º tempo.
2. O client toca o 1º tempo. Ao chegar no evento `halftime`, abre o **painel de intervalo**:
   trocar formação/mentalidade, **reposicionar** os 11 (ex: mover um meia pro ataque) e usar
   o **banco de reservas** (até 5 trocas).
3. Quando os **dois** clicam "voltar para o jogo" (emitem `halftimeReady` com a escalação
   nova), `readyHalftime` chama `simulateSecondHalf` com as escalações atualizadas e
   **anexa** o 2º tempo (46..90) à `result.timeline`; define `secondHalfReady=true`, gols
   totais, pênaltis e vencedor.
4. O client re-lê `L.state.result` (a variável `r` em `renderLiveMatch` é **mutável** de
   propósito) e retoma do minuto 46.

Regras que decorrem disso (cuidado ao mexer):

- O 1º tempo da timeline **nunca muda** depois de gerado, só é anexado. O `evIdx` do client
  depende disso.
- A retomada no client só acontece quando `allHalftimeReady() && result.secondHalfReady`.
- As mudanças do intervalo **importam de verdade** (o 2º tempo usa a escalação nova) e os
  eventos do 2º tempo só citam quem está em campo então.

**Matemática dos gols** (`expectedGoals` + `poisson`): para cada lado,
`xg = 0.78 + (ataque − defesaAdv)/15 + (meio − meioAdv)/48 + (nMeio − nMeioAdv)×0.05`,
limitado a `[0.15, 2.7]`, e **× 0.5 por tempo**. O nº de gols do tempo é uma amostra de
Poisson com esse xg. `nMeio` = nº de slots do grupo MID na formação (superioridade numérica
de meio; alas LWB/RWB contam como DEF). O gap de rating pesa bastante de propósito (menos
sorte: o time ~5 de overall melhor ganha ~74%, empate ~50%). A base baixa (0.78) reduz "gol
grátis". O 1º tempo usa as forças iniciais; o 2º usa as forças pós-intervalo. Os mods de
mentalidade e o counter (`applyCounter`) são aplicados **antes** do xg.

**Empate no tempo normal** → disputa de pênaltis (`runShootout`): 5 cobranças cada +
morte súbita, ~26% de chance de erro por cobrança, cobradores ordenados pelos melhores
finalizadores.

### 4.7 Eventos da partida (`MatchEvent`)

Gerados no servidor (`buildHalfTimeline`, engine.ts), reproduzidos no client
(`renderLiveMatch`). Cada evento:

```ts
{ minute, type, side: "home"|"away"|null, text, bx, by, player?, assist?, card? }
```

- `bx` (1..105) / `by` (1..68) = **coordenadas de campo**; o lado "home" ataca para `bx=105`.
  O client desenha um mini-campo SVG e move uma **bola 3D** para `bx,by` a cada evento, com
  transição suave. Se "você" é o visitante, o campo gira 180° pra você sempre atacar à
  direita. `ballSpot(type, side)` define a zona por tipo (gol perto da trave adversária,
  escanteio na extremidade, defesa perto do próprio gol, posse no meio…).
- **Tipos**: `kickoff, goal, chance, save, corner, offside, foul, card, injury, var,
possession, halftime, fulltime, penalty, info`.
- `possession` preenche **todo minuto vazio** → sensação minuto-a-minuto; tem delay curto.
- **Expulsão**: o cartão vermelho é decidido primeiro em `buildHalfTimeline`; depois todo
  evento usa `availSide(key, minute)` pra **excluir o expulso** das citações a partir do
  minuto da expulsão. A lista de expulsos cruza os tempos via `room.expelled` (passada do 1º
  para o 2º). Observação: o time expulso ainda conta 11 na força (não há "jogar com 10").
- **Gols** vêm com sequência de 3 eventos (construção → passe final → gol) e podem ter
  assistência e tag de VAR.

### 4.8 Ritmo da reprodução

`eventDelay()` e `TICK_BASE_MS` controlam quanto tempo o feed pausa em cada evento. O "1x"
atual já é rápido (era o "2x" antigo). **PvP fica travado em 1x**; o solo permite
1x/1.5x/2x. Gols pausam mais (~2s), posse passa rápido (~340ms).

### 4.9 Resultado

Tela estilo transmissão: hero com placar (e pênaltis se houve), **Match Leaders** (artilheiro,
assistência, craque do jogo, calculados da timeline), comparação de forças e as duas
escalações. "Jogar de novo" (`rematch`) volta ao lobby mantendo formação/mentalidade.

### 4.10 Modo Copa do Mundo (campanha)

Modo single-player em formato **Copa 48 seleções** totalmente **client-side** (não usa
socket/sala). O estado fica em `L.campaign`; telas vivem nos componentes `Campaign*`;
cálculos/derivações de UI ficam em `client/src/lib/campaignData.ts`; dados vêm de
`shared/data/worldcup.ts`; simulação vem de `simulateGauntletMatch` (engine).

- **Objetivo**: passar por 3 jogos de fase de grupos e depois vencer 5 jogos de mata-mata
  (16-avos, oitavas, quartas, semifinal, final). No mata-mata, **empate OU derrota = game
  over** (não há pênaltis aqui; `simulateGauntletMatch` não desempata).
- **Fase de grupos**: acompanha tabela do grupo do time montado (pontos, saldo, gols marcados).
  Classificam os 2 primeiros e o 3º se cumprir a regra simplificada dos melhores terceiros
  (4+ pontos ou 3 pontos com saldo não negativo).
- **Chaveamento**: depois da classificação, gera e mostra a rota do time montado nos 5 jogos
  eliminatórios, começando pelos 16-avos.
- **Draft**: 11 rodadas sorteando **seleções históricas** (`WC_DRAFT_TEAMS`, 1950–2022).
  O pool tem **25 lendas (OVR ~82–90)** + **15 seleções fracas (OVR ~53–65)** marcadas com id
  `wc-weak-*` — essas dão variedade/aleatoriedade ao draft (você nem sempre tira um craque; dá
  pra rerollar). **Sem penalidade de posição**: o jogador só encaixa em vaga do **mesmo setor**
  (GK/DEF/MID/ATT); quem não encaixa em nenhuma vaga aberta fica apagado (`campaignSelectable`).
  `effectiveRating = rating` (cheio). Se um time sorteado não tiver ninguém compatível,
  sorteia outro. (As fracas também existem como JSON em `client/public/import_selecoes_fracas.json`.)
- **Adversários** (`wcOpponentTeam`): cada rodada (`WC_LADDER`) sorteia uma seleção histórica
  de um conjunto de elencos autorais com escalação fixa (`WC_OPPONENT_TEAMS` + algumas de
  `WC_DRAFT_TEAMS`). Eles **não** são gerados por sobrenomes/over aleatório.
- **Final** (`wcOpponentTeam`, última rodada): **não é mais sempre o Brasil 1970**. Sorteia uma
  das melhores seleções de todos os tempos (`WC_FINALISTS`, ~15 ids incluindo o `WC_BOSS`) e
  aplica um buff de **+`FINAL_BUFF` (4) por rating** (`buffTeam`, cap 99) — a final fica difícil
  de propósito e com variedade. Um draft ótimo (~88-90) vence ~15-30% conforme o finalista; a
  leitura de counter/foco no `preMatch` melhora bastante essas chances.
- **Mentalidade com peso dobrado**: `applyMentality(..., weight=2)` — amplifica o desvio do
  neutro. Cria estratégia real (mentalidades defensivas reduzem empates/derrotas). Cada
  adversário tem tática fixa (`wcOpponentTactics`), mostrada no `preMatch`; escolher o counter
  certo (ou evitar ser neutralizado) é a leitura principal antes de cada jogo.
- **Fluxo de fases** (`CampaignState.phase`): `setup → draft → preMatch → match →
grupos/preMatch... → mata-mata/preMatch... → victory | gameover`. A partida reusa o campo+bola
  e o feed, mas é uma simulação contínua (sem intervalo interativo).
- **Balanceamento**: difícil de propósito. Atenção: o rework do engine (4.5/4.6) aumentou o
  peso do rating e adicionou counters, então as taxas antigas (~80% nas primeiras, ~40-50%
  nas finais) mudaram — re-rode o Monte Carlo se for recalibrar. A leitura de tática no
  `preMatch` agora é um fator real de quem joga bem.

Decisões de design tomadas (ajustáveis): posição por **setor** (não idêntica); partidas com
**narração ao vivo** (com pular); adversários históricos com escalação fixa + chefe real.

---

## 5. Modelo de dados

- **Time** (`teams.ts`): `{ id, name, season, league, players: Player[11], bench?: Player[] }`.
  `Player = { name, pos, rating(60-99) }`.
- **Position** (15): `GK, RB, LB, CB, RWB, LWB, CDM, CM, CAM, RM, LM, RW, LW, CF, ST`.
  Siglas em PT (estilo EA FC) via `posLabel`: GOL, LD, LE, ZAG, ALD, ALE, VOL, MC, MEI, MD,
  ME, PD, PE, SA, CA.
- **Formação** (`formations.ts`): 11 slots `{ id, pos, x, y }` (x/y em % do campo, y=0 é o
  próprio gol). 10 formações: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2, 4-2-4, 3-4-2-1,
  4-1-3-2, 4-1-4-1.
- **Técnico** (`managers.ts`): `{ name, club, mentality, formationId }`; `randomManager()` é
  a IA do solo (mapeia agressivo→aura, equilibrado→equilibrada, defensivo→retranca).

---

## 6. Rodar, buildar, produção

```bash
pnpm install
pnpm dev          # client :5173, server :3001 (o client conecta direto, sem proxy)
pnpm build        # gera dist/ (vite)
pnpm start        # produção: o server serve dist/ + socket na :3001 (usa $PORT)
pnpm bot ABCD     # entra na sala ABCD como bot (testar PvP sozinho)
```

Em produção é **porta única**: o Express serve o `dist/` e o Socket.io na mesma porta, então
o client conecta na mesma origem. Em dev o client conecta direto em `:3001`.

---

## 6.5 Banco de dados, autenticação e API

Os times agora vivem num banco **libSQL/Turso** (SQLite-compatível). Em dev, sem env vars,
cai num arquivo local `data/pebol.db`; em produção (Render) use as env vars.

- `server/src/db.ts` — conexão, schema (`users`, `teams`, `players`, conquistas e
  `feedbacks`), **seed** a partir dos times hardcoded (clubes de `teams.ts` como
  `kind='club'`; seleções de `worldcup.ts` como `kind='national'`) só se a tabela estiver
  vazia, e funções de CRUD. Times com `owner_id IS NULL` são **oficiais** (só admin edita);
  com `owner_id` são do usuário.
- `server/src/auth.ts` — signup/login com **bcryptjs + JWT**. Papéis `user`/`admin`. O
  **primeiro** usuário registrado vira admin (e qualquer nome em `ADMIN_USERS`).
- `server/src/api.ts` — rotas: `POST /api/auth/signup|login`, `GET /api/me`, e CRUD
  `GET/POST/PUT/DELETE /api/teams[/:id]` com autorização (oficial→admin; do usuário→dono),
  conquistas/progresso e feedback.
  Registradas **antes** do fallback SPA (que exclui `/api` e `/socket.io`).
- O draft **online 1v1** lê os clubes oficiais do banco (`rooms.ts` `setTeamPool`, recarregado
  por `refreshTeamCache` no startup e quando um time oficial muda).
- Feedback de usuário fica salvo no banco com limite de **3 feedbacks por usuário** para
  evitar flood. Usuário autenticado envia pela tela de feedback; admin visualiza no painel
  `AdminFeedbacks`. A listagem/admin deve continuar protegida por papel `admin`.

**Env vars (produção / Render):**

- `TURSO_DATABASE_URL` (ex: `libsql://...turso.io`) e `TURSO_AUTH_TOKEN` (token do `turso db tokens create`).
- `JWT_SECRET` (segredo forte para assinar os tokens).
- `ADMIN_USERS` (opcional, csv de usernames admin).

**Render + SQLite:** o disco do Render é efêmero (zera no deploy/restart). Por isso usamos
**Turso** (libSQL hospedado, persiste). Sem as env vars, o servidor usa o arquivo local
(some no deploy — serve só pra dev).

**Pendente (próximo passo):** fazer a campanha da Copa ler seleções `national` do banco
quando houver customização via CRUD; hoje ela usa os elencos autorais do bundle no client.

## 7. Testar e verificar (sempre faça)

Real-time não dá pra validar só com "buildou". Exercite o fluxo.

```bash
npx tsc --noEmit                                  # valida shared+server+client
pnpm test:engine:all                              # property + balance test da engine
pnpm test:achievements                            # combinações de modo PvP/seleções/conquistas
node_modules/.bin/tsx server/src/index.ts &       # sobe o backend :3001
node_modules/.bin/tsx server/src/solo-test.ts     # humano + IA, partida completa
node_modules/.bin/tsx server/src/smoke-test.ts    # PvP, 2 clientes headless
```

Ambos: draft → 1º tempo → emitem `halftimeReady` → 2º tempo → resultado. Imprimem placar,
tipos de evento e se `secondHalfReady` virou true.

**Gotchas dos testes:**

- A IA leva **3s por escolha** no draft → o solo-test demora ~35s. Se um teste estourar no
  meio do draft, o `guard` do loop está baixo, não é bug.
- Depois do draft o resultado só tem o 1º tempo (`secondHalfReady:false`); é preciso emitir
  `halftimeReady` (com a escalação) pra disparar o 2º tempo.

**Verificação visual (navegador):** use as rotas de preview (`/#preview-*`) e os botões de
"Previews rápidos" em ambiente dev. O backend (`:3001`) precisa estar rodando à parte; o
preview só sobe o Vite (lê `.claude/launch.json` → `pnpm dev:client`). Os previews vivem em
`client/src/devPreviews.ts`, `devPreviewFixtures.ts`, `devPreviewScreens.ts` e
`devPreviewChrome.ts`; ao adicionar uma tela ou modal novo, crie fixture e rota de preview
também. Para chegar ao ao vivo num teste automatizado: dirija o draft clicando
`.pl-item.clickable` + `.you-board .slot.empty.open` por turno (em chunks, porque o cap de
30s do eval não cobre os ~35s do draft). No ao vivo, `.spd[data-spd="2"]` acelera (solo);
detecte o intervalo pelo `#half-panel` deixar de ser `hidden`; `#skip` pula pro resumo.

**Restart limpo:** mudanças no engine/server exigem reiniciar o backend. `taskkill //F //IM
node.exe` derruba o Vite do preview também — reinicie o `preview_start` depois. Mudanças só
no client têm hot-reload.

---

## 8. Como estender

### Adicionar um time (`shared/data/teams.ts`)

Adicione ao array `TEAMS`: `id` único, `name`, `season`, `league`, **exatamente 11**
`players` (spread sensato: 1 GK, ~4 DEF, ~3 MID, ~3 ATT), `pos` válidas, `rating` 60-99,
`bench` opcional (melhora o intervalo). Ratings plausíveis em relação aos existentes (estrelas
UCL ~88-94, titulares ~80-86, Brasileirão ~72-84). Valide:

```bash
node_modules/.bin/tsx -e "import {TEAMS} from './shared/data/teams.ts';
const v=new Set(['GK','RB','LB','CB','RWB','LWB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST']);
let bad=0,ids=new Set(); for(const t of TEAMS){ if(t.players.length!==11){console.log('!!',t.name);bad++;}
 if(ids.has(t.id)){console.log('dup',t.id);bad++;} ids.add(t.id);
 for(const p of t.players){ if(!v.has(p.pos)||p.rating<60||p.rating>99){console.log('!!',t.name,p.name);bad++;} } }
console.log('teams',TEAMS.length,'problems',bad);"
```

### Adicionar um tipo de lance/evento

Toca engine + client + CSS:

1. `MatchEventType` em `shared/types.ts` → adicione `"foo"`.
2. `ballSpot()` (engine) → `case "foo"` com a zona de campo.
3. `buildHalfTimeline` (engine) → banco de texto em `TXT` + emissão (use `sprinkle(...)` pra
   lances aleatórios). **Sempre selecione jogadores via `availSide(key, minute)`** (respeita
   expulsões). Nomes vêm por `fill(template, side, rng, weight)` com `{p}`, `{gk}`, `{team}`.
4. `eventDelay()` (client) → `case "foo"` com o tempo de pausa no feed.
5. `.ev.foo { }` em `styles.css` (ex: `border-left-color`).
6. Animação especial (opcional) só se precisar mais que uma linha de feed → branch em
   `processEvent`.

### Adicionar uma formação (`shared/formations.ts`)

11 slots `{ id, pos, x, y }`. `x` 0-100 (esquerda→direita), `y` 0-100 (0 = próprio gol, 100 =
ataque). Copie uma existente e ajuste as coordenadas.

### Adicionar um técnico/IA (`shared/data/managers.ts`)

`{ name, club, mentality, formationId }`. A `mentality` e a `formationId` precisam existir.

---

## 9. Regras de ouro ao editar

- Tipo novo → `shared/types.ts`, importado dos dois lados.
- Modo de jogo novo ou regra de modo → atualize `shared/gameMode.ts` e use os helpers no
  client/server. Não espalhe comparações de string por `main.ts`, `rooms.ts` ou componentes.
- Mexeu na simulação/engine → rode `solo-test.ts` **e** `smoke-test.ts` + confira o ao vivo
  no navegador, e reinicie o backend.
- Mantenha os eventos coerentes: nada de citar quem saiu de campo (use `availSide`).
- Tela/modal novo → adicione preview de dev, inclusive estados de tema claro/escuro quando
  houver risco visual.
- UI nova → prefira componente isolado em `client/src/components/*`. Cálculo de dados,
  seleção de listas, importação, montagem de elenco e derivação de resumo devem ficar em
  `client/src/lib/*`, com funções puras quando possível.
- `main.ts` deve continuar encolhendo: ele pode orquestrar estado, eventos globais e troca de
  tela, mas não deve receber novas ilhas grandes de marcação ou regra de negócio.
- `npx tsc --noEmit` antes de considerar pronto.
- Commit/push só quando pedido.
