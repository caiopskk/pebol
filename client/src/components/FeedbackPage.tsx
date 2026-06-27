import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { AccountUser, FeedbackCategory } from "../api.js";

interface FeedbackPageProps {
  account: AccountUser | null;
  onBack: () => void;
  onLogin: () => void;
  onSubmit: (payload: {
    category: FeedbackCategory;
    message: string;
    contact?: string;
  }) => Promise<void>;
}

const categories: Array<{
  id: FeedbackCategory;
  label: string;
  description: string;
}> = [
  {
    id: "suggestion",
    label: "Sugestão",
    description: "Ideias de tela, modo, fluxo ou melhoria geral.",
  },
  {
    id: "bug",
    label: "Problema",
    description: "Algo que quebrou, ficou ilegível ou não funcionou.",
  },
  {
    id: "balance",
    label: "Balanceamento",
    description: "Partidas, pênaltis, atributos, IA ou dificuldade.",
  },
  {
    id: "other",
    label: "Outro",
    description: "Qualquer comentário que não encaixe nos outros tipos.",
  },
];

export function FeedbackPage({
  account,
  onBack,
  onLogin,
  onSubmit,
}: FeedbackPageProps) {
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        category,
        message,
        contact: contact.trim() || undefined,
      });
      setSent(true);
      setMessage("");
      setContact("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-stadium-depth px-4 py-6 font-body text-pebol-text"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
            Feedback
          </span>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[0.02em] text-pebol-text">
            Ajude a melhorar o Pebol
          </h1>
          <p className="mt-4 text-base leading-7 text-pebol-muted">
            Use este espaço para mandar sugestões, reportar problemas de interface
            ou comentar sobre balanceamento. O feedback fica salvo junto da sua conta
            para eu conseguir acompanhar o contexto.
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-pebol-muted">
            Cada conta pode enviar até 3 feedbacks.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <strong className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-pebol-gold">
              Conta
            </strong>
            <p className="mt-2 text-sm font-semibold text-pebol-text">
              {account
                ? `${account.username} · ${account.role === "admin" ? "Administrador" : "Usuário"}`
                : "Entre para enviar feedback."}
            </p>
          </div>
          <button
            type="button"
            className="mt-6 min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-5 py-2 font-display text-sm font-extrabold text-pebol-text transition-all duration-300 hover:-translate-y-0.5 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
            onClick={onBack}
          >
            Voltar
          </button>
        </div>

        <form
          className="feedback-form overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl"
          onSubmit={submit}
        >
          {!account ? (
            <div className="grid min-h-[24rem] place-items-center text-center">
              <div>
                <h2 className="font-display text-2xl font-black text-pebol-text">
                  Login necessário
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-pebol-muted">
                  Assim o feedback fica vinculado ao seu usuário e dá para separar
                  melhor sugestões reais de spam.
                </p>
                <button
                  type="button"
                  className="mt-5 min-h-11 rounded-xl border border-pebol-accent/40 bg-pebol-accent px-5 py-2 font-display text-sm font-extrabold uppercase tracking-[0.06em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                  onClick={onLogin}
                >
                  Entrar / Criar conta
                </button>
              </div>
            </div>
          ) : (
            <>
              <label>Tipo</label>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
                      category === item.id
                        ? "border-pebol-accent bg-pebol-accent/12 shadow-glow"
                        : "border-white/10 bg-white/[0.045] hover:border-pebol-blue/45 hover:bg-pebol-blue/10"
                    }`}
                    onClick={() => setCategory(item.id)}
                  >
                    <strong className="block font-display text-base font-extrabold text-pebol-text">
                      {item.label}
                    </strong>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-pebol-muted">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>

              <label htmlFor="feedback-message">Mensagem</label>
              <textarea
                id="feedback-message"
                className="feedback-textarea min-h-48 resize-y rounded-xl"
                maxLength={2400}
                placeholder="Conte o que você percebeu, onde aconteceu e o que esperava que fosse diferente."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="mt-1 text-right text-xs font-semibold text-pebol-muted">
                {message.length}/2400
              </div>

              <label htmlFor="feedback-contact">Contato opcional</label>
              <input
                id="feedback-contact"
                className="feedback-input rounded-xl"
                maxLength={180}
                placeholder="Discord, e-mail ou outro contato se quiser retorno"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />

              {sent ? (
                <div className="mb-4 rounded-2xl border border-pebol-accent/35 bg-pebol-accent/10 p-4 text-sm font-semibold text-pebol-text">
                  Feedback enviado. Obrigado por ajudar a lapidar o jogo.
                </div>
              ) : null}
              {error ? (
                <div className="mb-4 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || message.trim().length < 10}
                className="min-h-12 w-full rounded-xl border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-extrabold uppercase tracking-[0.07em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Enviando" : "Enviar feedback"}
              </button>
            </>
          )}
        </form>
      </section>
    </motion.div>
  );
}

