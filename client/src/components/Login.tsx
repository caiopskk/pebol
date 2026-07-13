import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faEye,
  faEyeSlash,
  faLock,
  faRightToBracket,
  faUser,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";

type AuthMode = "login" | "signup";

interface LoginProps {
  onSubmit: (mode: AuthMode, username: string, password: string) => void;
  onBack: () => void;
}

const tabClass =
  "relative min-h-10 px-4 py-2 font-display text-xs font-black uppercase tracking-[0.08em] transition-colors duration-200";
const inputClass =
  "block min-h-12 w-full rounded-lg border border-white/10 bg-black/30 pl-11 pr-4 text-pebol-text outline-none placeholder:text-pebol-faint focus:border-pebol-accent/65 focus:bg-black/45 focus:ring-2 focus:ring-pebol-accent/10";

export function Login({ onSubmit, onBack }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit(
      mode,
      String(data.get("username") ?? ""),
      String(data.get("password") ?? ""),
    );
  };

  const isLogin = mode === "login";

  return (
    <motion.main
      className="grid min-h-screen place-items-center px-4 py-6 font-body text-pebol-text sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="w-full max-w-5xl">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-display text-sm font-bold text-pebol-muted transition-colors hover:bg-white/5 hover:text-white"
          onClick={onBack}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Voltar ao jogo
        </motion.button>

        <motion.section
          className="relative grid overflow-hidden rounded-xl border border-white/10 bg-pebol-panel/95 shadow-premium backdrop-blur-xl md:h-[36rem] md:grid-cols-[minmax(0,.92fr)_minmax(24rem,1.08fr)]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <aside className="relative hidden h-full overflow-hidden border-r border-white/10 p-8 md:flex md:flex-col md:justify-between">
            <div className="absolute inset-0 bg-pitch-lines bg-[length:38px_38px] opacity-25" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,rgba(0,255,135,.2),transparent_38%),radial-gradient(circle_at_90%_86%,rgba(58,134,212,.16),transparent_38%)]" />

            <div className="relative z-10 grid flex-1 place-items-center py-8">
              <img
                className="w-52 opacity-95 drop-shadow-[0_28px_38px_rgba(0,0,0,.48)]"
                src="/brand-concepts/pebol-duel-mark.svg"
                alt="Pebol"
              />
            </div>

            <div className="relative z-10 border-l-2 border-pebol-accent pl-4">
              <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-accent">
                Sua jornada continua
              </span>
              <p className="mt-1 max-w-sm text-sm font-medium leading-6 text-pebol-muted">
                Entre com sua conta para voltar ao campo.
              </p>
            </div>
          </aside>

          <motion.form
            className="relative flex min-h-[36rem] flex-col justify-center p-5 sm:p-8 md:h-full md:min-h-0 lg:p-10"
            onSubmit={submit}
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(0,255,135,.09),transparent_34%)]" />
            <div className="relative mx-auto w-full max-w-md">
              <img
                className="auth-brand-logo mx-auto mb-7 w-full max-w-[15rem] object-contain md:hidden"
                src="/brand-concepts/pebol-duel.svg"
                alt="Pebol"
              />

              <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-accent">
                Conta Pebol
              </span>
              <h1 className="mt-1 font-title text-3xl uppercase text-white">
                {isLogin ? "Bem-vindo de volta" : "Crie seu perfil"}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-pebol-muted">
                {isLogin
                  ? "Acesse sua conta para continuar de onde parou."
                  : "Escolha suas credenciais para começar sua trajetória."}
              </p>

              <div className="relative mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-black/25 p-1">
                <span
                  className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-md bg-pebol-accent shadow-glow transition-transform duration-300 ${
                    isLogin ? "translate-x-0" : "translate-x-full"
                  }`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className={`${tabClass} ${isLogin ? "text-black" : "text-pebol-muted hover:text-white"}`}
                  onClick={() => setMode("login")}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className={`${tabClass} ${!isLogin ? "text-black" : "text-pebol-muted hover:text-white"}`}
                  onClick={() => setMode("signup")}
                >
                  Criar conta
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.08em] text-slate-300" htmlFor="au-user">
                    Usuário
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pebol-faint" icon={faUser} />
                    <input
                      id="au-user"
                      className={inputClass}
                      name="username"
                      minLength={3}
                      maxLength={20}
                      autoComplete="username"
                      placeholder="Seu nome de usuário"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.08em] text-slate-300" htmlFor="au-pass">
                    Senha
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pebol-faint" icon={faLock} />
                    <input
                      id="au-pass"
                      className={`${inputClass} pr-12`}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      minLength={4}
                      maxLength={40}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      placeholder="Digite sua senha"
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle grid h-10 w-10 place-items-center rounded-md text-pebol-muted transition-colors hover:bg-white/5 hover:text-white"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 min-h-5">
                <p className={`text-xs font-medium leading-5 text-pebol-faint transition-opacity ${isLogin ? "invisible opacity-0" : "visible opacity-100"}`}>
                  Use de 3 a 20 caracteres no usuário e pelo menos 4 na senha.
                </p>
              </div>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                id="au-submit"
                className="mt-4 min-h-12 w-full rounded-lg bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={isLogin ? faRightToBracket : faUserPlus} />
                  {isLogin ? "Entrar na conta" : "Criar minha conta"}
                  <FontAwesomeIcon className="ml-1 text-xs" icon={faArrowRight} />
                </span>
              </motion.button>
            </div>
          </motion.form>
        </motion.section>
      </div>
    </motion.main>
  );
}
