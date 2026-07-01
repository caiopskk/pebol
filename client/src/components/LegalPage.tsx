import { motion } from "framer-motion";

type LegalKind = "terms" | "privacy";

interface LegalPageProps {
  kind: LegalKind;
  onBack: () => void;
}

const COPY: Record<
  LegalKind,
  {
    title: string;
    updated: string;
    intro: string;
    sections: Array<{ title: string; body: string[] }>;
  }
> = {
  terms: {
    title: "Termos de Uso",
    updated: "Atualizado em 24 de junho de 2026",
    intro:
      "Estes termos explicam as regras básicas para usar o Pebol, criar uma conta e jogar partidas online ou solo.",
    sections: [
      {
        title: "Uso do jogo",
        body: [
          "Você pode jogar partidas, criar salas, disputar campanhas e montar times personalizados dentro das ferramentas disponíveis.",
          "Não use o serviço para atacar, sobrecarregar, explorar falhas ou prejudicar outros jogadores.",
        ],
      },
      {
        title: "Conta e segurança",
        body: [
          "Você é responsável por manter sua senha em segurança e por qualquer atividade feita na sua conta.",
          "Podemos limitar ou remover contas usadas para abuso, spam, fraude ou tentativa de burlar o funcionamento do jogo.",
        ],
      },
      {
        title: "Times e conteúdo",
        body: [
          "Times personalizados cadastrados no painel devem evitar conteúdo ofensivo, enganoso ou ilegal.",
          "Nomes de clubes, seleções, jogadores e competições podem aparecer como referência cultural do futebol dentro do jogo.",
        ],
      },
      {
        title: "Disponibilidade",
        body: [
          "O Pebol pode mudar, sair do ar temporariamente ou receber ajustes de balanceamento sem aviso prévio.",
          "O jogo é fornecido como está, sem garantia de que estará sempre disponível ou livre de erros.",
        ],
      },
      {
        title: "Contato",
        body: [
          "Para dúvidas, pedidos de remoção de dados ou problemas com a conta, entre em contato pelo canal informado pelo responsável pelo projeto.",
        ],
      },
    ],
  },
  privacy: {
    title: "Política de Privacidade",
    updated: "Atualizada em 24 de junho de 2026",
    intro:
      "Esta política resume quais dados o Pebol usa para operar contas, partidas e recursos de progresso.",
    sections: [
      {
        title: "Dados que usamos",
        body: [
          "Quando você cria uma conta, guardamos seu nome de usuário, senha protegida por hash, papel da conta, imagem de perfil, progresso, conquistas e times personalizados.",
          "Durante o uso, também podemos manter dados necessários para salas, partidas, ranking e funcionamento técnico do servidor.",
        ],
      },
      {
        title: "Como usamos os dados",
        body: [
          "Usamos esses dados para autenticar sua conta, salvar progresso, administrar times, montar rankings e manter o jogo funcionando.",
          "Não vendemos seus dados pessoais.",
        ],
      },
      {
        title: "Senhas",
        body: [
          "Senhas não são armazenadas em texto puro. O servidor salva apenas uma versão protegida por hash.",
          "Mesmo assim, use uma senha única e evite reutilizar senhas importantes de outros serviços.",
        ],
      },
      {
        title: "Compartilhamento",
        body: [
          "Seu nome de usuário, imagem de perfil, nível, título e alguns dados de jogo podem aparecer para outros jogadores em rankings, salas ou telas de partida.",
          "Dados podem ser processados por serviços de hospedagem, banco de dados e armazenamento de imagens necessários para rodar o Pebol.",
        ],
      },
      {
        title: "Exclusão",
        body: [
          "Você pode pedir a exclusão da sua conta e dados associados pelo canal de contato do projeto.",
          "Alguns registros técnicos mínimos podem permanecer por tempo limitado quando necessários para segurança ou operação.",
        ],
      },
    ],
  },
};

export function LegalPage({ kind, onBack }: LegalPageProps) {
  const copy = COPY[kind];

  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
        <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
          Pebol
        </span>
        <h1 className="mt-2 font-title text-4xl uppercase tracking-[0.02em] text-white">
          {copy.title}
        </h1>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-pebol-gold">
          {copy.updated}
        </p>
        <p className="mt-4 text-base leading-7 text-pebol-muted">{copy.intro}</p>

        <div className="mt-6 grid gap-4">
          {copy.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h2 className="font-title text-lg text-white">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-6 text-pebol-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <button type="button" className="mt-6 min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-5 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-pebol-blue/50 hover:bg-pebol-blue/15" onClick={onBack}>
          Voltar
        </button>
      </section>
    </motion.div>
  );
}
