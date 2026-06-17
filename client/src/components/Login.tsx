import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

type AuthMode = "login" | "signup";

interface LoginProps {
  onSubmit: (mode: AuthMode, username: string, password: string) => void;
  onBack: () => void;
}

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
      className="screen home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <header className="brand">
        <img className="logo" src="/pebol_logo.png" alt="Pebol" />
      </header>
      <motion.form
        className="panel auth-panel"
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            Criar conta
          </button>
        </div>
        <label htmlFor="au-user">Usuário</label>
        <input id="au-user" name="username" maxLength={20} placeholder="pebol_pro" />
        <label htmlFor="au-pass">Senha</label>
        <input
          id="au-pass"
          name="password"
          type="password"
          maxLength={40}
          placeholder="***********"
        />
        <motion.button whileTap={{ scale: 0.985 }} id="au-submit" className="primary">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </motion.button>
        <button type="button" id="au-back" className="ghost auth-back" onClick={onBack}>
          Voltar ao jogo
        </button>
      </motion.form>
    </motion.div>
  );
}
