import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

type AuthMode = "login" | "signup";

interface LoginProps {
  onSubmit: (mode: AuthMode, username: string, password: string) => void;
  onBack: () => void;
}

const tabClass =
  "rounded-xl px-4 py-2 font-display text-sm font-black uppercase tracking-[0.08em] transition-all duration-300";
const inputClass =
  "rounded-xl border-white/10 bg-black/30 text-pebol-text placeholder:text-pebol-faint focus:border-pebol-accent focus:bg-black/40";
const primaryClass =
  "mt-2 min-h-12 w-full rounded-xl border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5";

export function Login({ onSubmit, onBack }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit(
      mode,
      String(data.get("username") ?? ""),
      String(data.get("password") ?? ""),
    );
  };

  return (
    <motion.div
      className="min-h-screen bg-stadium-depth px-4 py-8 font-body text-pebol-text"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-md gap-5">
        <header className="text-center">
          <img
            className="mx-auto w-[min(18rem,78vw)] drop-shadow-[0_24px_32px_rgba(0,0,0,.58)]"
            src="/512x512.png"
            srcSet="/512x512.png 512w, /1024x1024.png 1024w"
            sizes="min(18rem, 78vw)"
            alt="Pebol"
          />
        </header>

        <motion.form
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl"
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(0,255,135,.14),transparent_34%),radial-gradient(circle_at_10%_100%,rgba(58,134,212,.18),transparent_38%)]" />
          <div className="relative">
            <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
              <button
                type="button"
                className={`${tabClass} ${
                  mode === "login"
                    ? "bg-pebol-accent text-black shadow-glow"
                    : "text-pebol-muted hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`${tabClass} ${
                  mode === "signup"
                    ? "bg-pebol-accent text-black shadow-glow"
                    : "text-pebol-muted hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setMode("signup")}
              >
                Criar conta
              </button>
            </div>
            <label htmlFor="au-user">Usuário</label>
            <input id="au-user" className={inputClass} name="username" maxLength={20} placeholder="pebol_pro" />
            <label htmlFor="au-pass">Senha</label>
            <input
              id="au-pass"
              className={inputClass}
              name="password"
              type="password"
              maxLength={40}
              placeholder="***********"
            />
            <motion.button whileTap={{ scale: 0.985 }} id="au-submit" className={primaryClass}>
              {mode === "login" ? "Entrar" : "Criar conta"}
            </motion.button>
            <button
              type="button"
              id="au-back"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
              onClick={onBack}
            >
              Voltar ao jogo
            </button>
          </div>
        </motion.form>
      </div>
    </motion.div>
  );
}
