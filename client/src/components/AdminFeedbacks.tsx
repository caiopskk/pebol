import { motion } from "framer-motion";
import type { AccountUser, FeedbackEntry, FeedbackCategory } from "../api.js";

interface AdminFeedbacksProps {
  account: AccountUser | null;
  feedback: FeedbackEntry[] | null;
  onBack: () => void;
  onHome: () => void;
}

const categoryLabels: Record<FeedbackCategory, string> = {
  suggestion: "Sugestão",
  bug: "Problema",
  balance: "Balanceamento",
  other: "Outro",
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function statusLabel(status: FeedbackEntry["status"]) {
  if (status === "reviewed") return "Revisado";
  if (status === "archived") return "Arquivado";
  return "Novo";
}

export function AdminFeedbacks({
  account,
  feedback,
  onBack,
  onHome,
}: AdminFeedbacksProps) {
  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(0,255,135,.14),transparent_34%)]" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                Administração
              </span>
              <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-pebol-text">
                Feedbacks dos jogadores
              </h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                {account?.username ?? ""} · admin
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-pebol-text transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                onClick={onBack}
              >
                Times
              </button>
              <button
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-pebol-text transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                onClick={onHome}
              >
                Voltar
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted">
                Caixa de entrada
              </span>
              <h2 className="mt-1 font-title text-xl text-pebol-text">
                {feedback
                  ? `${feedback.length} feedback${feedback.length === 1 ? "" : "s"}`
                  : "Carregando feedbacks"}
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-6 text-pebol-muted">
              Cada usuário pode enviar até 3 mensagens. Os itens mais recentes aparecem primeiro.
            </p>
          </div>
        </section>

        {feedback === null ? (
          <p className="rounded-lg border border-white/10 bg-pebol-panel p-5 text-pebol-muted">
            Carregando...
          </p>
        ) : feedback.length ? (
          <div className="grid gap-3">
            {feedback.map((item, index) => (
              <motion.article
                key={item.id}
                className="grid gap-4 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl transition-all duration-300 hover:border-pebol-accent/30 hover:bg-pebol-accent/5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, delay: Math.min(index * 0.01, 0.12) }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-lg font-black text-pebol-text">
                        {item.username}
                      </strong>
                      <span className="rounded-full border border-pebol-accent/25 bg-pebol-accent/10 px-3 py-1 text-xs font-black text-pebol-accent">
                        {categoryLabels[item.category] ?? "Outro"}
                      </span>
                      <span className="rounded-full border border-pebol-blue/25 bg-pebol-blue/10 px-3 py-1 text-xs font-black text-pebol-muted">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <span className="mt-1 block text-sm font-semibold text-pebol-muted">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  {item.contact ? (
                    <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-semibold text-pebol-text">
                      {item.contact}
                    </span>
                  ) : null}
                </div>

                <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/15 p-4 text-sm font-medium leading-6 text-pebol-text">
                  {item.message}
                </p>

                <div className="grid gap-2 text-xs font-semibold text-pebol-muted md:grid-cols-2">
                  <span className="truncate">Página: {item.page || "-"}</span>
                  <span className="truncate md:text-right">User agent: {item.userAgent || "-"}</span>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-pebol-panel p-5 text-pebol-muted">
            Nenhum feedback enviado ainda.
          </p>
        )}
      </div>
    </motion.div>
  );
}
