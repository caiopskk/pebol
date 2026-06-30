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
    date: "24 de junho de 2026",
    title: "Interface renovada e temas",
    summary:
      "A experiência visual foi revisada para ficar mais clara, premium e confortável em diferentes ambientes.",
    items: [
      "A home, a Copa e as telas finais ganharam um visual mais moderno, com melhor hierarquia e microinterações.",
      "O tema escuro segue como padrão, e agora existe tema claro com switch no topo da interface.",
      "Cards, botões, listas do draft e modais foram revisados para manter boa leitura nos dois temas.",
      "As telas de vitória e derrota ficaram mais equilibradas para print e compartilhamento.",
    ],
  },
  {
    date: "24 de junho de 2026",
    title: "Elencos mais ricos e partidas mais inteligentes",
    summary:
      "Os jogadores agora têm atributos no estilo EA FC, e esses números entram no cálculo da partida.",
    items: [
      "Cada jogador pode ter PAC, SHO, PAS, DRI, DEF e PHY além do overall principal.",
      "A força de ataque, meio, defesa e goleiro considera o perfil certo para cada função.",
      "Pênaltis passaram a comparar cobrador e goleiro, em vez de usar uma chance fixa.",
      "O foco de ataque agora lê melhor se o seu elenco rende mais pelos lados ou pelo meio.",
    ],
  },
  {
    date: "24 de junho de 2026",
    title: "Telas finais prontas para compartilhar",
    summary:
      "As telas de vitória e derrota da Copa ficaram mais compactas e mostram o elenco montado na campanha.",
    items: [
      "A tela final exibe seu XI da campanha para facilitar print e compartilhamento.",
      "O chaveamento e os destaques da jornada foram reorganizados para ocupar menos altura.",
      "A borda ganhou movimento sutil, sem cantos arredondados, para dar mais presença ao card final.",
    ],
  },
  {
    date: "24 de junho de 2026",
    title: "Conta, progresso e administração mais claros",
    summary:
      "A home ficou mais focada no jogador comum e separa melhor recursos administrativos.",
    items: [
      "A opção de gerenciar times agora aparece apenas para administradores.",
      "O progresso por XP, conquistas e leaderboard seguem visíveis para jogadores logados.",
      "Termos de Uso e Política de Privacidade foram adicionados ao rodapé.",
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
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[0.02em] text-white">
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
                <h2 className="mt-2 font-display text-xl font-black text-white">
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
