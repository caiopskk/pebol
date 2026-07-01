import { motion } from "framer-motion";

interface HowToPlayPageProps {
  onBack: () => void;
}

interface HowToSection {
  title: string;
  body: string[];
}

const SECTIONS: HowToSection[] = [
  {
    title: "Objetivo",
    body: [
      "Monte o melhor XI possível escolhendo um jogador por rodada no draft.",
      "Depois do draft, seu time enfrenta outro jogador ou a máquina em uma partida narrada ao vivo.",
    ],
  },
  {
    title: "Criar ou entrar em uma sala",
    body: [
      "Na home, escolha o tipo de elenco: Clubes ou Seleções.",
      "Escolha a regra: Clássico mostra ratings e dá 5 atualizações; Hardcore oculta ratings e dá 3 atualizações.",
      "Crie uma sala para jogar online, entre com um código de 4 letras, ou use Jogar sozinho para enfrentar a IA.",
    ],
  },
  {
    title: "Draft",
    body: [
      "Em cada turno, o jogo sorteia um time. Você escolhe um jogador desse time para uma vaga compatível da sua formação.",
      "Você pode atualizar o time sorteado enquanto ainda tiver atualizações disponíveis.",
      "No draft, também é possível reposicionar jogadores já escolhidos dentro do mesmo setor quando isso melhorar seu encaixe.",
    ],
  },
  {
    title: "Formação, mentalidade e foco",
    body: [
      "A formação define as vagas do campo. Jogadores fora da posição natural perdem encaixe.",
      "A mentalidade muda o comportamento do time: agressivo, equilibrado, retranca, marcação pressão, posse de bola ou contra-ataque.",
      "O foco de ataque define se seu time força o jogo pelos lados, pelo meio ou de forma equilibrada. Use o lado mais forte do elenco.",
    ],
  },
  {
    title: "Partida e intervalo",
    body: [
      "A partida é narrada lance a lance com placar, feed, bola animada e eventos como gols, cartões, VAR, defesas e pênaltis.",
      "No intervalo, você pode mudar formação, mentalidade, foco e fazer até 5 substituições.",
      "As mudanças do intervalo afetam de verdade o segundo tempo.",
    ],
  },
  {
    title: "Copa do Mundo",
    body: [
      "No modo Copa do Mundo, você monta uma seleção em 11 rodadas e disputa 3 jogos de grupo.",
      "Classifique-se para o mata-mata e vença 5 fases até a final.",
      "Antes de cada jogo, leia a tática do adversário e escolha uma resposta para aumentar suas chances.",
    ],
  },
  {
    title: "Conta e progresso",
    body: [
      "Criar conta salva seu nível, XP, conquistas, avatar e presença no ranking.",
      "Alguns modos e recursos dependem do progresso da conta.",
      "As telas finais podem copiar uma imagem do resultado para compartilhar sua campanha ou partida PvP.",
    ],
  },
];

export function HowToPlayPage({ onBack }: HowToPlayPageProps) {
  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
        <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
          Guia rápido
        </span>
        <h1 className="mt-2 font-title text-4xl uppercase tracking-[0.02em] text-white">
          Como jogar
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-pebol-muted">
          Pebol é um draft de futebol 1v1: sorte, leitura de elenco e decisões
          táticas importam tanto quanto pegar craques.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
            >
              <h2 className="font-title text-lg text-white">{section.title}</h2>
              <ul className="mt-3 grid gap-2">
                {section.body.map((item) => (
                  <li
                    key={item}
                    className="relative pl-4 text-sm leading-6 text-pebol-muted before:absolute before:left-0 before:top-[0.72em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-pebol-accent"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-5 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
          onClick={onBack}
        >
          Voltar
        </button>
      </section>
    </motion.div>
  );
}
