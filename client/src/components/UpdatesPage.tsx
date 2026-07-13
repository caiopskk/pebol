import { motion } from "framer-motion";

interface UpdatesPageProps {
  onBack: () => void;
}

interface UpdateEntry {
  date: string;
  title: string;
  summary: string;
  items: string[];
}

const UPDATES: UpdateEntry[] = [
  {
    date: "13 de julho de 2026",
    title: "Nova identidade, home e comunidade",
    summary:
      "O Pebol ganhou uma apresentação mais própria e novas formas de conhecer quem está jogando.",
    items: [
      "A nova identidade visual chegou à home e à tela de login, com logo própria e navegação lateral expansível.",
      "O ranking agora tem uma página completa com todos os jogadores cadastrados e busca por nome.",
      "É possível abrir o perfil de qualquer jogador para ver colocação, nível, XP e conquistas desbloqueadas.",
      "A animação da bola durante as partidas ficou mais fluida e transmite melhor o movimento de rotação e rolamento.",
    ],
  },
  {
    date: "13 de julho de 2026",
    title: "Modo Carreira em beta jogável",
    summary:
      "O modo Manager cresceu para uma experiência de clube com temporadas, decisões e progressão persistente.",
    items: [
      "A carreira agora é vinculada à conta e pode ser exportada, importada ou apagada para começar novamente.",
      "Pré-temporada, ligas, copas nacionais e torneios continentais fazem parte do calendário do clube.",
      "Pré-jogo, escalação, formação, mentalidade, foco de ataque e substituições usam a mesma base tática das outras partidas.",
      "Mercado em janelas, patrocínios, sócios, estádio, infraestrutura, finanças e caixa de entrada ampliam a gestão fora de campo.",
    ],
  },
  {
    date: "1 de julho de 2026",
    title: "Perfil, avatar e compartilhamento",
    summary:
      "As contas ganharam mais presença dentro do jogo e nas telas finais.",
    items: [
      "Agora é possível editar perfil, trocar senha e enviar imagem de perfil.",
      "Avatares aparecem na home, no ranking, nas telas de partida e na imagem copiada do resultado PvP.",
      "A tela final do PvP passou a mostrar os nomes dos usuários em vez de rótulos genéricos.",
      "Uploads de avatar têm limite por usuário para reduzir spam e uso abusivo.",
    ],
  },
  {
    date: "1 de julho de 2026",
    title: "Resultados e imagens mais fiéis",
    summary:
      "As telas finais foram ajustadas para ficarem melhores na tela e no compartilhamento.",
    items: [
      "O botão Copiar imagem usa um card dedicado para evitar cortes e textos desalinhados.",
      "As telas finais da Copa e do PvP ficaram mais compactas e prontas para compartilhar.",
      "Os botões de ação do resultado PvP agora aparecem logo abaixo do placar, como nas telas da Copa.",
      "Escalações, destaques e comparação de forças foram reorganizados para reduzir scroll.",
    ],
  },
  {
    date: "30 de junho de 2026",
    title: "Copa do Mundo 48 seleções",
    summary:
      "A campanha solo recebeu um fluxo completo de draft, grupos, mata-mata e final.",
    items: [
      "Você monta uma seleção em 11 rodadas e joga 3 partidas de fase de grupos.",
      "Depois da classificação, a rota segue por 16-avos, oitavas, quartas, semifinal e final.",
      "O pré-jogo mostra tabela, adversário, mentalidade, foco de ataque e dicas de encaixe.",
      "As telas de vitória e derrota exibem elenco montado, destaques da campanha e chaveamento.",
    ],
  },
  {
    date: "30 de junho de 2026",
    title: "Tática, intervalo e partida ao vivo",
    summary:
      "A partida ganhou mais leitura tática e controle durante o intervalo.",
    items: [
      "Mentalidades agora interagem por counters: pressão, posse e contra-ataque têm vantagem entre si.",
      "O foco de ataque permite escolher jogo equilibrado, pelos lados ou pelo meio.",
      "No intervalo, é possível trocar formação, mentalidade, foco e fazer até 5 substituições.",
      "A bola animada e o feed de eventos deixam a partida mais clara minuto a minuto.",
    ],
  },
  {
    date: "30 de junho de 2026",
    title: "Conta, progresso e administração",
    summary:
      "A home ficou mais focada no jogador e separa melhor recursos de conta e administração.",
    items: [
      "Contas salvam XP, nível, título, conquistas e posição no ranking.",
      "Hardcore desbloqueia por nível e oculta ratings durante o draft.",
      "Administradores têm painel para importar, criar, editar e remover elencos oficiais.",
      "Feedbacks enviados pelos jogadores ficam organizados em um painel administrativo.",
    ],
  },
];

export function UpdatesPage({ onBack }: UpdatesPageProps) {
  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
        <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
          Novidades
        </span>
        <h1 className="mt-2 font-title text-4xl uppercase tracking-[0.02em] text-white">
          Atualizações do Pebol
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-pebol-muted">
          Um resumo das mudanças recentes que afetam quem joga. Ajustes internos de
          desenvolvimento não entram nesta página.
        </p>

        <div className="mt-6 grid gap-4">
          {UPDATES.map((entry) => (
            <article key={`${entry.date}-${entry.title}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-300 hover:border-pebol-accent/35 hover:bg-pebol-accent/5">
              <div>
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-gold">
                  {entry.date}
                </span>
                <h2 className="mt-2 font-title text-xl text-white">
                  {entry.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-pebol-muted">{entry.summary}</p>
              </div>
              <ul className="mt-4 grid gap-2">
                {entry.items.map((item) => (
                  <li key={item} className="relative pl-4 text-sm leading-6 text-slate-200 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-pebol-accent">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <button type="button" className="mt-6 min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-5 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-pebol-blue/50 hover:bg-pebol-blue/15" onClick={onBack}>
          Voltar
        </button>
      </section>
    </motion.div>
  );
}
