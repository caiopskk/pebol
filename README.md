# Pebol — Draft Game

Pebol é um jogo web de draft de futebol em tempo real. Você monta um XI titular a partir
de times sorteados, ajusta formação, mentalidade e foco de ataque, e assiste a uma partida
narrada lance a lance contra outro jogador ou contra a máquina.

O projeto também tem campanha de Copa do Mundo, um Modo Carreira/Manager em beta jogável,
contas de usuário, perfis, ranking global, painel administrativo de times e jogadores,
importação por JSON, conquistas e deploy em porta única para produção.

## Funcionalidades

- **1v1 online em tempo real** com salas por código, turnos sincronizados e Socket.io.
- **Modo solo vs Máquina** com técnico controlado pela IA e draft automático do adversário.
- **Modo Clássico** com ratings visíveis durante o draft.
- **Modo Hardcore** com ratings ocultos durante o draft, desbloqueado ao atingir o nível 5.
  Contra a máquina, a IA também joga mais forte — mais difícil de vencer, mas não impossível.
- **XP, níveis e títulos**: ganhe experiência jogando partidas, avançando fases da Copa e
  desbloqueando conquistas; cada 100 XP é um nível, com títulos de Aspirante a Imortal.
- **Leaderboard por nível** na home e em uma página completa, com busca, perfis de jogador e
  galeria de conquistas desbloqueadas.
- **Atualizações de time/seleção no draft** quando o modo permite reroll: 5 no Clássico/Normal
  e 3 no Hardcore.
- **10 formações** e **6 mentalidades** para montar o time.
- **Foco de ataque**: equilibrado, pelos lados ou pelo meio.
- **Jogadores com atributos estilo EA FC**: overall, PAC, SHO, PAS, DRI, DEF, PHY, posições
  alternativas, penalidade por improviso e cálculo de força por setor.
- **Partida ao vivo** com placar, campo visual, feed de eventos, gols, cartões, VAR,
  faltas, escanteios, impedimentos, defesas, lesões, posse de bola e pênaltis.
- **Participações em gol** durante a partida e líderes no resultado final.
- **Intervalo interativo** em modal: trocar formação, mentalidade, foco, reposicionar
  jogadores e fazer até 5 substituições.
- **Resultado completo** com destaques, eventos importantes, todos os logs e botões para
  jogar novamente ou voltar ao início.
- **Campanha Copa do Mundo 48 seleções** com draft de seleções históricas, fase de grupos,
  mata-mata, chaveamento, adversários históricos, bandeiras, pênaltis, final e telas finais
  com elenco montado para compartilhar.
- **Autenticação** com cadastro/login, JWT e papéis de usuário/admin.
- **Painel de times e jogadores para administradores**.
- **Importação de times por JSON** com arquivo modelo para baixar.
- **Conquistas** com tela de progresso e popups no estilo Steam quando desbloqueadas.
- **Página de novidades** com mudanças visíveis para jogadores, sem itens internos de dev.
- **Tema escuro e tema claro** com alternância rápida no topo da interface.
- **Modo Carreira/Manager (beta jogável)** com temporadas, pré-temporada, ligas nacionais,
  copas, competições continentais, mercado, elenco, táticas, finanças, estádio, patrocínios,
  sócios-torcedores, caixa de entrada e evolução do clube.
- **Fadiga e rotação de elenco no Manager**: a condição física altera o desempenho real em
  campo, jogadores utilizados perdem energia conforme os minutos disputados e reservas não
  utilizados se recuperam entre as rodadas.
- **Carreira vinculada à conta** no banco, com exportação, importação e opção de apagar o save
  para começar novamente. Visitantes podem conhecer o modo pela home, mas precisam entrar ou
  criar uma conta para jogar.

## Novidades recentes

- A marca e a home receberam uma nova identidade visual, com logo própria, tela de login
  redesenhada e navegação lateral expansível.
- O ranking ganhou uma página dedicada com todos os jogadores cadastrados, busca e perfis
  clicáveis mostrando nível, XP e conquistas.
- O Modo Carreira evoluiu para um fluxo completo de clube: calendário, pré-jogo tático,
  escalação, substituições, mercado em janelas, patrocínios por temporada, estádio e inbox.
- Condição, ritmo e moral agora formam o desempenho atual dos atletas no Manager. Um reserva
  descansado pode render mais que um titular tecnicamente superior, mas exausto.
- Saves do Manager agora pertencem à conta autenticada e podem ser exportados, importados ou
  apagados pelo próprio jogador.
- A animação da bola durante as partidas foi refeita para transmitir rolamento, velocidade e
  impacto de maneira mais natural.
- A interface foi modernizada com visual mais premium, cards com profundidade, estados de
  hover mais suaves e melhor legibilidade em telas de jogo.
- O jogo agora tem tema escuro e tema claro; o modo escuro é o padrão, e o claro fica
  disponível pelo switch no topo.
- Jogadores agora podem ter atributos no estilo EA FC (`PAC`, `SHO`, `PAS`, `DRI`, `DEF`,
  `PHY`) além do overall principal.
- A engine usa esses atributos no cálculo de ataque, meio, defesa, goleiro, foco de ataque,
  escolha de destaques nos eventos e pênaltis.
- Pênaltis não usam mais uma chance fixa: o cobrador é comparado ao goleiro.
- Telas finais da Copa mostram o elenco montado e foram compactadas para facilitar o
  compartilhamento.
- A opção de gerenciar times foi removida da home do usuário comum e ficou restrita ao admin.
- Termos, privacidade e novidades ficam disponíveis no rodapé da home.

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

Clique em **Jogar contra IA**. A máquina sorteia um técnico, escolhe jogadores
automaticamente e espera alguns segundos por rodada para o draft ficar acompanhável.

No solo, a velocidade da partida pode ser alterada entre 1x, 1.5x e 2x.

### Copa do Mundo

Clique em **Jogar campanha** no card da Copa do Mundo. Você monta uma seleção no draft,
disputa 3 jogos de grupo e tenta avançar pelo mata-mata de 32 times até a final.

Durante a campanha, a tela mostra a classificação do grupo ou o chaveamento, o adversário
atual, ano, bandeira, overall e estratégia.

### Modo Carreira/Manager

O Modo Carreira é uma campanha de clube vinculada à conta do jogador. O fluxo começa pela
escolha da liga e do clube e continua por várias temporadas:

1. Na pré-temporada, o técnico testa escalações em amistosos e prepara o elenco.
2. Durante a temporada, liga, copa nacional e competição continental avançam em paralelo.
3. Antes de cada partida, o pré-jogo mostra o adversário, sua formação, força e estilo. O
   jogador pode mudar formação, titulares, mentalidade e foco de ataque.
4. A partida usa a mesma apresentação ao vivo dos outros modos, incluindo intervalo e até
   cinco substituições.
5. Entre jogos, o técnico administra elenco, treinos, fadiga, lesões, mercado, funcionários,
   infraestrutura, estádio, patrocínio, sócios e finanças.
6. Ao fim da temporada, classificação, títulos, acesso e rebaixamento influenciam o próximo
   ano e o prestígio do técnico.

Transferências e propostas só acontecem dentro das janelas configuradas. O caixa não recebe
um prêmio artificial por vitória: receitas vêm da operação do clube, bilheteria, patrocínio,
sócios, marketing e premiações de ligas e copas. A caixa de entrada reúne resultados,
decisões da diretoria e propostas por jogadores ou pelo próprio técnico.

O save é sincronizado com o usuário no Turso/libSQL. Também pode ser exportado para JSON,
importado posteriormente ou apagado para iniciar uma nova carreira.

A condição física tem efeito direto na força usada pela simulação. Atletas que permanecem os
90 minutos recebem a carga completa da partida; quem entra ou sai no intervalo acumula uma
carga proporcional de 45 minutos; jogadores não utilizados recuperam energia. Condição baixa
reduz o desempenho atual e aumenta moderadamente o risco médico, tornando rotação, treino de
recuperação e investimento no departamento médico decisões relevantes ao longo da temporada.

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

Além do `rating`, cada jogador pode ter atributos no estilo EA FC:

- `pac`: velocidade.
- `sho`: finalização/chute.
- `pas`: passe.
- `dri`: drible.
- `def`: defesa.
- `phy`: físico.

Quando um atributo não é informado, o jogo usa o `rating` como fallback. A força do time
considera o perfil certo para cada função: atacantes pesam mais `sho`, `dri` e `pac`; meias
pesam mais `pas` e `dri`; defensores pesam mais `def` e `phy`; goleiros usam principalmente
`def` e `phy`. A penalidade de posição também reduz esses atributos proporcionalmente.

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
súbita quando necessário. A chance de cada cobrança considera o perfil do cobrador contra o
goleiro adversário.

## Copa do Mundo

O modo Copa do Mundo é uma campanha single-player com 48 seleções:

- Draft com seleções históricas. O pool mistura **lendas (OVR ~82-90)** com **seleções
  historicamente fracas (OVR ~53-65)**, dando variedade ao sorteio — você nem sempre tira um
  craque, e pode usar os rerolls para descartar um time fraco.
- 3 jogos de fase de grupos.
- Classificação dos 2 primeiros de cada grupo e melhores terceiros.
- Mata-mata com 16-avos, oitavas, quartas, semifinal e final.
- Adversários com escalações históricas, ano e bandeira.
- Chaveamento escondendo adversários futuros quando apropriado.
- **Final variável e buffada**: em vez de ser sempre o mesmo time, a final sorteia uma das
  maiores seleções de todos os tempos e dá um leve buff nos ratings — é o jogo mais difícil.
- Pênaltis em empates no mata-mata.
- Estatísticas acumuladas de gols e assistências na campanha.
- Tela final com o elenco montado, destaques da campanha e rota do mata-mata para
  compartilhar.

O troféu usado na interface fica em:

```text
client/public/world_cup_trophy.png
```

## Contas, times e jogadores

A aplicação tem autenticação com usuário e senha:

- O primeiro usuário cadastrado vira admin.
- Usuários em `ADMIN_USERS` também viram admin.
- Usuários comuns jogam, acompanham progresso, conquistas e leaderboard.
- Qualquer visitante pode consultar o ranking e abrir perfis; jogar o Modo Carreira exige uma
  conta para que o save seja associado corretamente ao usuário.
- Admins podem criar, importar, editar e excluir times.
- Times oficiais de clubes podem aparecer com alias genérico para usuários comuns.
- Seleções mantêm o nome real; clubes oficiais podem usar alias para evitar exposição
  desnecessária de marcas para usuários comuns.

A tela administrativa de elencos aparece apenas para administradores e permite criar, editar,
excluir e importar times com jogadores. Cada time deve ter 11 titulares e pode ter banco de
reservas. Essa tela não deve ser confundida com a gestão de clube do Modo Carreira, disponível
para qualquer usuário autenticado.

## Importação por JSON

Na tela de gerenciamento de admin existe o botão **Baixar modelo**, que baixa:

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
        {
          "name": "Goleiro",
          "pos": "GK",
          "rating": 82,
          "pac": 70,
          "sho": 30,
          "pas": 75,
          "dri": 65,
          "def": 88,
          "phy": 84
        },
        {
          "name": "Atacante",
          "pos": "ST",
          "altPositions": ["CF"],
          "rating": 85,
          "pac": 86,
          "sho": 88,
          "pas": 76,
          "dri": 84,
          "def": 38,
          "phy": 80
        }
      ],
      "bench": [{ "name": "Reserva", "pos": "CM", "rating": 77 }]
    }
  ]
}
```

`players` precisa ter exatamente 11 jogadores. `bench` é opcional. Os atributos `pac`,
`sho`, `pas`, `dri`, `def` e `phy` também são opcionais; quando faltam, o servidor gera
valores derivados do rating, posição e nome do jogador.

## Conquistas

As conquistas ficam no banco e são desbloqueadas por ações do usuário. Exemplos:

- Primeiro gol.
- Primeira vitória.
- Vitória sem sofrer gol.
- Vitória nos pênaltis.
- Hat-trick.
- Três assistências em uma partida.
- Time com overall alto.
- Time com overall elite.
- Time com ataque, meio ou defesa muito fortes.
- Time equilibrado em todos os setores.
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
então a mesma ação não pontua duas vezes). A home mostra os líderes e a página de ranking lista
todos os usuários cadastrados. Cada linha abre um perfil com colocação, nível, XP de atividade,
XP de conquistas e uma galeria rolável. Concessões de XP exibem um popup temporário no canto,
no mesmo estilo das conquistas.

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
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=pebol
R2_PUBLIC_BASE_URL=https://cdn.seu-dominio.com
```

`ADMIN_USERS` é opcional. As variáveis `R2_*` são opcionais em desenvolvimento: sem elas,
uploads de imagem de perfil são salvos em `data/uploads`. Em produção, configure um bucket
Cloudflare R2 e exponha um domínio público em `R2_PUBLIC_BASE_URL`.

Na inicialização, o servidor cria registros oficiais ausentes, sincroniza aliases de clubes,
remove clubes históricos aposentados do catálogo oficial e atualiza as conquistas. Times
personalizados e saves dos usuários não são removidos por essa sincronização.

### Schema e migrações (deploy)

Não é preciso atualizar o banco manualmente ao subir uma nova versão. O `initDb()` roda toda
vez que o servidor inicia e é idempotente:

- Cria tabelas que faltam com `CREATE TABLE IF NOT EXISTS` (inclui `user_xp_events`,
  `user_achievements`, etc.) — uma versão nova com tabelas novas as cria sozinha no Turso já
  existente, sem apagar dados.
- Roda `migrateDb()` para colunas adicionadas em tabelas existentes: atributos de jogador na
  tabela `players` (`alt_pos`, `pac`, `sho`, `pas`, `dri`, `def`, `phy`) e o upload de imagem de
  perfil na tabela `users` (`avatar_url`, `avatar_key`), ignorando o erro de coluna duplicada.
- Preenche atributos ausentes de jogadores já existentes com valores derivados, sem apagar
  jogadores ou times.
- Atualiza o catálogo oficial e exige que todo clube jogável tenha um alias público.
- Re-semeia conquistas de forma idempotente (novas conquistas entram e textos podem evoluir).

Pontos de atenção:

- **Times oficiais**: novos IDs do bundle são inseridos mesmo em bancos já populados. O teste
  `pnpm test:clubs` garante que referências de temporada existem e que nenhum clube fique sem
  alias.
- **Alterar coluna de tabela existente** no futuro exige adicionar uma migração em `migrateDb()`,
  no mesmo padrão do `alt_pos` e dos atributos de jogador.
- O Turso persiste entre deploys; usuários existentes simplesmente começam com 0 XP quando a
  feature é publicada.

## API

Rotas principais:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`
- `PUT /api/profile`
- `PUT /api/profile/avatar`
- `GET /api/achievements`
- `POST /api/achievements/:id/unlock`
- `GET /api/leaderboard`
- `GET /api/leaderboard?all=1`
- `GET /api/users/:id/profile`
- `GET /api/progress`
- `POST /api/xp`
- `GET /api/teams`
- `POST /api/teams`
- `PUT /api/teams/:id`
- `DELETE /api/teams/:id`
- `GET /api/manager/career-state`
- `PUT /api/manager/career-state`
- `DELETE /api/manager/career-state`

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
pnpm test:engine
pnpm test:engine:balance
pnpm test:engine:all
pnpm test:manager
pnpm test:modes
pnpm test:all
pnpm test:ball-motion
pnpm test:clubs
pnpm test:achievements
pnpm exec tsc --noEmit
pnpm exec tsx server/src/solo-test.ts
pnpm exec tsx server/src/smoke-test.ts
```

Para os testes `solo-test` e `smoke-test`, deixe o servidor rodando antes.

`pnpm test:modes` percorre Clássico e Hardcore, com clubes e seleções, tanto em PvP quanto
contra IA. O teste cobre draft, pool de times, rerolls, ocultação de ratings, pré-jogo,
intervalo, resultado e revanche. A mesma suíte valida a campanha da Copa do Mundo, incluindo
draft por setores, fase de grupos, melhores terceiros, mata-mata e progressão de dificuldade.

`pnpm test:all` executa todas as verificações autocontidas do projeto: modos, campanha, engine,
balanceamento estatístico, carreira, conquistas, catálogo de clubes e animação da bola. Ele
não precisa que o servidor de desenvolvimento esteja rodando.

## Estrutura

```text
shared/
  types.ts             # tipos compartilhados
  formations.ts        # formações e posições no campo
  mentalities.ts       # mentalidades e modificadores
  progression.ts       # XP por nível, títulos e desbloqueio do Hardcore
  leagueStructures.ts  # ligas, divisões, acessos e calendário
  playerAttributes.ts  # geração/fallback de atributos estilo EA FC
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
  engine-property-test.ts # invariantes da engine
  engine-balance-test.ts  # sanidade estatística do balanceamento
  game-modes-test.ts    # Clássico/Hardcore, clubes/seleções e PvP/IA
  managerEngine.ts     # simulação das rodadas do Manager
  club-catalog-test.ts # aliases e integridade dos clubes jogáveis
  bot.ts               # bot para testar PvP
  solo-test.ts         # teste headless solo
  smoke-test.ts        # teste headless PvP

client/
  public/
    brand-concepts/     # identidade visual e logos SVG do Pebol
    world_cup_trophy.png
    import_teams_model.json.json
  src/
    main.ts            # UI principal
    net.ts             # socket client
    api.ts             # client HTTP
    styles.css         # design system
    components/        # telas isoladas, incluindo Manager e ranking
    lib/managerCareer.ts # regras e persistência client-side do Manager
    lib/managerFatigue.ts # condição, desempenho atual e faixas de fadiga
    campaign-mode-test.ts # draft, grupos e mata-mata da campanha da Copa
```

## Observações para desenvolvimento

- Use **pnpm**.
- A UI nova usa **Tailwind CSS** de forma incremental. A home já foi migrada para utilities;
  telas antigas ainda podem usar `client/src/styles.css` enquanto a migração avança.
- Tipos compartilhados ficam em `shared/types.ts`.
- Strings de UI e narração ficam em português.
- Comentários de código devem ser em inglês e só quando ajudarem.
- Mudanças no servidor ou engine pedem reiniciar o backend.
- Mudanças de simulação devem ser validadas com typecheck e testes headless.
