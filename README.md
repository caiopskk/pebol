# Pebol — Draft Game

Pebol é um jogo web de draft de futebol em tempo real. Você monta um XI titular a partir
de times sorteados, ajusta formação, mentalidade e foco de ataque, e assiste a uma partida
narrada lance a lance contra outro jogador ou contra a máquina.

O projeto também tem campanha de Copa do Mundo, contas de usuário, CRUD de times e
jogadores, importação por JSON, conquistas e deploy em porta única para produção.

## Funcionalidades

- **1v1 online em tempo real** com salas por código, turnos sincronizados e Socket.io.
- **Modo solo vs Máquina** com técnico controlado pela IA e draft automático do adversário.
- **Modo Clássico** com ratings visíveis durante o draft.
- **Modo Hardcore** com ratings ocultos durante o draft, desbloqueado ao atingir o nível 5.
- **XP, níveis e títulos**: ganhe experiência jogando partidas, avançando fases da Copa e
  desbloqueando conquistas; cada 100 XP é um nível, com títulos de Aspirante a Imortal.
- **Leaderboard por nível** na home, com pódio destacado e seu próprio nome em evidência.
- **3 atualizações de time/seleção** no draft quando o modo permite reroll.
- **10 formações** e **6 mentalidades** para montar o time.
- **Foco de ataque**: equilibrado, pelos lados ou pelo meio.
- **Jogadores com posições alternativas**, penalidade por improviso e cálculo de overall.
- **Partida ao vivo** com placar, campo visual, feed de eventos, gols, cartões, VAR,
  faltas, escanteios, impedimentos, defesas, lesões, posse de bola e pênaltis.
- **Participações em gol** durante a partida e líderes no resultado final.
- **Intervalo interativo** em modal: trocar formação, mentalidade, foco, reposicionar
  jogadores e fazer até 5 substituições.
- **Resultado completo** com destaques, eventos importantes, todos os logs e botões para
  jogar novamente ou voltar ao início.
- **Campanha Copa do Mundo 48 seleções** com draft de seleções históricas, fase de grupos,
  mata-mata, chaveamento, adversários históricos, bandeiras, pênaltis e final.
- **Autenticação** com cadastro/login, JWT e papéis de usuário/admin.
- **CRUD de times e jogadores** para usuários e admins.
- **Importação de times por JSON** com arquivo modelo para baixar.
- **Conquistas** com tela de progresso e popups no estilo Steam quando desbloqueadas.
- **Modo carreira** e **Modo liga** já aparecem na home como modos futuros.

## Como rodar em desenvolvimento

```bash
pnpm install
pnpm dev
```

- Client: <http://localhost:5173>
- Server/API/Socket.io: <http://localhost:3001>

O comando `pnpm dev` sobe o Vite e o servidor Express juntos. Em desenvolvimento, o client
conecta direto no servidor da porta 3001.

Para testar na mesma rede, outro dispositivo pode acessar `http://SEU-IP:5173`. Se não
conectar, confira firewall e liberação das portas 5173 e 3001.

## Como jogar

### Online 1v1

1. Um jogador clica em **Criar sala (online)**.
2. O outro entra em **Entrar numa sala** usando o código.
3. Os dois escolhem formação, mentalidade e foco.
4. O draft alternado começa.
5. Depois dos 22 picks, a partida é narrada ao vivo.
6. No intervalo, os dois precisam clicar em **Voltar para o jogo** para sincronizar o
   segundo tempo.

### Solo vs Máquina

Clique em **Jogar sozinho (vs Máquina)**. A máquina sorteia um técnico, escolhe jogadores
automaticamente e espera alguns segundos por rodada para o draft ficar acompanhável.

No solo, a velocidade da partida pode ser alterada entre 1x, 1.5x e 2x.

### Copa do Mundo

Clique em **Jogar campanha** no card da Copa do Mundo. Você monta uma seleção no draft,
disputa 3 jogos de grupo e tenta avançar pelo mata-mata de 32 times até a final.

Durante a campanha, a tela mostra a classificação do grupo ou o chaveamento, o adversário
atual, ano, bandeira, overall e estratégia.

## Draft e escalação

O draft sorteia um time por rodada. Quem está na vez escolhe um jogador e encaixa em uma
vaga aberta da formação.

As posições usam siglas em português na interface:

| Sigla     | Posição          |
| --------- | ---------------- |
| GOL       | Goleiro          |
| LD / LE   | Laterais         |
| ZAG       | Zagueiro         |
| ALD / ALE | Alas             |
| VOL       | Volante          |
| MC        | Meia central     |
| MEI       | Meia ofensivo    |
| MD / ME   | Meias laterais   |
| PD / PE   | Pontas           |
| SA        | Segundo atacante |
| CA        | Centroavante     |

Escalar fora da posição reduz o rating efetivo. A penalidade é leve para posições parecidas,
média entre setores próximos e pesada para setores distantes ou goleiro improvisado.
Jogadores podem ter `altPositions`, que também são consideradas na montagem.

O overall do time considera rating efetivo por linha: defesa, meio, ataque e média geral.

## Formações e estratégia

Formações disponíveis:

- 4-3-3
- 4-4-2
- 3-5-2
- 4-2-3-1
- 3-4-3
- 5-3-2
- 4-2-4
- 3-4-2-1
- 4-1-3-2
- 4-1-4-1

Mentalidades disponíveis. Há um **eixo** (puro tradeoff ataque↔defesa) e um **triângulo de
counter**, onde escolher o estilo certo contra o do adversário rende uma grande vantagem
tática (vale ~+5/6 de overall):

- **Agressivo**: bem mais ataque, bem menos defesa.
- **Equilibrada**: sem bônus, mas imune a counters (nenhum estilo te neutraliza).
- **Retranca**: bem mais defesa, bem menos ataque.
- **Marcação pressão**: ataque com risco defensivo. **Neutraliza Posse de Bola.**
- **Posse de Bola**: controle do ritmo. **Neutraliza Contra-ataque.**
- **Contra-ataque**: bloco baixo e transição. **Neutraliza Marcação pressão.**

Os três estilos do triângulo têm stats equilibrados (nenhum é dominante): o valor deles vem
do counter. Como o resultado pesa bastante no rating do elenco (o time claramente melhor
ganha ~74%), o jogo é mais tático e menos sorte; mesmo com o counter a favor, o time mais
forte ainda pode vencer.

O **foco de ataque** muda por onde o time cria chances: distribuído, pelos lados (premia
boas pontas/laterais) ou pelo meio (premia o miolo). Um aviso compara o elenco montado com o
foco escolhido. A **formação** também conta: mais jogadores de meio-campo dão superioridade
numérica no setor.

No modo solo da Copa, o adversário de cada jogo tem formação, mentalidade e foco próprios,
mostrados antes da partida — escolher como contra-atacar a estratégia dele é parte do desafio.

## Partida ao vivo

A partida é simulada em dois tempos. O primeiro tempo é gerado ao fim do draft. No intervalo,
os jogadores podem mudar escalação e substituições; depois que ambos confirmam, o servidor
gera o segundo tempo com os ajustes aplicados.

O feed mostra eventos de jogo com ritmo próprio: gols e cartões pausam mais, lances comuns
passam mais rápido e posse de bola preenche os minutos sem lance principal.

Empates podem ir para pênaltis. A disputa mostra cobrador por cobrador, incluindo morte
súbita quando necessário.

## Copa do Mundo

O modo Copa do Mundo é uma campanha single-player com 48 seleções:

- Draft com seleções históricas.
- 3 jogos de fase de grupos.
- Classificação dos 2 primeiros de cada grupo e melhores terceiros.
- Mata-mata com 16-avos, oitavas, quartas, semifinal e final.
- Adversários com escalações históricas, ano e bandeira.
- Chaveamento escondendo adversários futuros quando apropriado.
- Pênaltis em empates no mata-mata.
- Estatísticas acumuladas de gols e assistências na campanha.

O troféu usado na interface fica em:

```text
client/public/world_cup_trophy.png
```

## Contas, times e jogadores

A aplicação tem autenticação com usuário e senha:

- O primeiro usuário cadastrado vira admin.
- Usuários em `ADMIN_USERS` também viram admin.
- Usuários comuns podem criar e editar seus próprios times.
- Admins podem editar times oficiais.
- Times oficiais de clubes podem aparecer com alias genérico para usuários comuns.
- Seleções e times do próprio usuário mantêm o nome real para quem tem permissão.

A tela de gerenciamento permite criar, editar, excluir e importar times com jogadores.
Cada time deve ter 11 titulares e pode ter banco de reservas.

## Importação por JSON

Na tela de gerenciamento existe o botão **Baixar modelo**, que baixa:

```text
client/public/import_teams_model.json.json
```

Formato resumido:

```json
{
  "teams": [
    {
      "name": "Time Exemplo",
      "season": "2025",
      "league": "Brasil",
      "kind": "club",
      "official": false,
      "alias": "Time Generico",
      "players": [
        { "name": "Goleiro", "pos": "GK", "rating": 82 },
        {
          "name": "Atacante",
          "pos": "ST",
          "altPositions": ["CF"],
          "rating": 85
        }
      ],
      "bench": [{ "name": "Reserva", "pos": "CM", "rating": 77 }]
    }
  ]
}
```

`players` precisa ter exatamente 11 jogadores. `bench` é opcional.

## Conquistas

As conquistas ficam no banco e são desbloqueadas por ações do usuário. Exemplos:

- Primeiro gol.
- Primeira vitória.
- Vitória sem sofrer gol.
- Vitória nos pênaltis.
- Hat-trick.
- Três assistências em uma partida.
- Time com overall alto.
- Vitória contra a máquina.
- Vitória no modo Hardcore.
- Criar time personalizado.
- Importar JSON.
- Passar da fase de grupos da Copa.
- Ser campeão do mundo.

Quando uma conquista é alcançada, a UI mostra um aviso temporário. A tela de conquistas
exibe desbloqueadas, pendentes, categoria e pontuação.

## Progressão, XP e leaderboard

Cada conta acumula XP e sobe de nível. As fontes de XP são:

- **Partidas** (1v1 e solo): XP por jogar, com bônus por vitória e por decisão nos pênaltis.
- **Campanha da Copa**: XP por jogo, por passar da fase de grupos, por avançar no mata-mata
  e um bônus grande ao ser campeão do mundo.
- **Conquistas**: cada conquista desbloqueada concede os pontos dela como XP.

Regras de nível (em `shared/progression.ts`):

- **100 XP por nível** (`XP_PER_LEVEL`).
- Títulos por faixa de nível: Aspirante (1), Promessa (10), Titular (20), Capitão (30),
  Craque (40), Ídolo (50), Maestro (60), Lenda (70), Campeão continental (80),
  Campeão do mundo (90) e Imortal (100).
- O **Modo Hardcore** desbloqueia no **nível 5** (`HARDCORE_UNLOCK_LEVEL`).

O XP é registrado no servidor por evento idempotente (cada concessão tem uma chave única,
então a mesma ação não pontua duas vezes). A home mostra um **leaderboard por nível** com os
melhores jogadores, pódio destacado e o jogador atual em evidência. Concessões de XP exibem
um popup temporário no canto, no mesmo estilo das conquistas.

## Banco de dados

O servidor usa libSQL/Turso. Sem variáveis de ambiente, ele cria um SQLite local em:

```text
data/pebol.db
```

Em produção, configure:

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=um-segredo-forte
ADMIN_USERS=admin,caio
```

`ADMIN_USERS` é opcional. O seed roda na inicialização quando a tabela de times está vazia,
criando times oficiais, seleções históricas e conquistas.

### Schema e migrações (deploy)

Não é preciso atualizar o banco manualmente ao subir uma nova versão. O `initDb()` roda toda
vez que o servidor inicia e é idempotente:

- Cria tabelas que faltam com `CREATE TABLE IF NOT EXISTS` (inclui `user_xp_events`,
  `user_achievements`, etc.) — uma versão nova com tabelas novas as cria sozinha no Turso já
  existente, sem apagar dados.
- Roda `migrateDb()` para colunas adicionadas em tabelas existentes (ex.: `alt_pos`), ignorando
  o erro de coluna duplicada.
- Re-semeia conquistas com `INSERT OR IGNORE` (novas conquistas entram; as existentes ficam).

Pontos de atenção:

- **Times**: o seed só roda quando a tabela `teams` está vazia. Times novos adicionados em
  `data/teams.ts`/`worldcup.ts` **não** aparecem num banco já populado — adicione-os pela tela
  de gerenciamento (CRUD) ou limpe a tabela.
- **Alterar coluna de tabela existente** no futuro exige adicionar uma migração em `migrateDb()`,
  no mesmo padrão do `alt_pos`. As features atuais (XP/leaderboard) usam tabela nova, então não
  precisam disso.
- O Turso persiste entre deploys; usuários existentes simplesmente começam com 0 XP quando a
  feature é publicada.

## API

Rotas principais:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/achievements`
- `POST /api/achievements/:id/unlock`
- `GET /api/leaderboard`
- `GET /api/progress`
- `POST /api/xp`
- `GET /api/teams`
- `POST /api/teams`
- `PUT /api/teams/:id`
- `DELETE /api/teams/:id`

O client consome essas rotas em `client/src/api.ts`.

## Deploy

Em produção o projeto roda em porta única: o Express serve o `dist/` do Vite, a API e o
Socket.io na mesma origem.

```bash
pnpm build
pnpm start
```

### Render

Não precisa Docker para este projeto. Use um Web Service Node:

- **Root Directory**: vazio, se o repositório inteiro for o app.
- **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
- **Start Command**: `pnpm start`
- **Environment**: configure Turso e JWT.

O disco do Render é efêmero. Para persistir usuários, times e conquistas, use Turso em vez
do SQLite local.

### Vercel

Vercel não é a melhor opção para este app completo porque o jogo usa Socket.io e servidor
long-lived. Dá para hospedar apenas o front estático na Vercel se o backend ficar em outro
lugar, mas para a aplicação inteira Render, Railway ou Fly.io combinam melhor.

## Scripts úteis

```bash
pnpm dev
pnpm dev:server
pnpm dev:client
pnpm build
pnpm start
pnpm bot ABCD
pnpm exec tsc --noEmit
pnpm exec tsx server/src/solo-test.ts
pnpm exec tsx server/src/smoke-test.ts
```

Para os testes `solo-test` e `smoke-test`, deixe o servidor rodando antes.

## Estrutura

```text
shared/
  types.ts             # tipos compartilhados
  formations.ts        # formações e posições no campo
  mentalities.ts       # mentalidades e modificadores
  progression.ts       # XP por nível, títulos e desbloqueio do Hardcore
  engine.ts            # força do time, eventos, partida e pênaltis
  data/
    teams.ts           # clubes oficiais usados no seed
    worldcup.ts        # seleções históricas e adversários da Copa
    managers.ts        # técnicos usados pela IA
    aliases.ts         # nomes genéricos para clubes oficiais

server/src/
  index.ts             # Express + Socket.io
  rooms.ts             # salas, draft, intervalo e IA
  db.ts                # libSQL/Turso, schema, seed e CRUD
  auth.ts              # cadastro, login, JWT e roles
  api.ts               # rotas HTTP
  bot.ts               # bot para testar PvP
  solo-test.ts         # teste headless solo
  smoke-test.ts        # teste headless PvP

client/
  public/
    pebol_logo.png
    world_cup_trophy.png
    import_teams_model.json.json
  src/
    main.ts            # UI principal
    net.ts             # socket client
    api.ts             # client HTTP
    styles.css         # design system
```

## Observações para desenvolvimento

- Use **pnpm**.
- Tipos compartilhados ficam em `shared/types.ts`.
- Strings de UI e narração ficam em português.
- Comentários de código devem ser em inglês e só quando ajudarem.
- Mudanças no servidor ou engine pedem reiniciar o backend.
- Mudanças de simulação devem ser validadas com typecheck e testes headless.
