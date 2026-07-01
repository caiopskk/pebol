import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { AccountUser } from "../api.js";

interface ProfileProps {
  account: AccountUser;
  onBack: () => void;
  onSaveProfile: (username: string) => Promise<void>;
  onSavePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
}

const fieldClass =
  "min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-body text-sm font-semibold text-pebol-text outline-none transition-all duration-300 placeholder:text-pebol-faint focus:border-pebol-accent/55 focus:ring-2 focus:ring-pebol-accent/15";
const primaryClass =
  "pebol-glow-button pebol-glow-fill min-h-11 rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-2.5 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5";
const secondaryClass =
  "pebol-glow-button min-h-11 rounded-lg border-0 bg-white/[0.055] px-5 py-2.5 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-pebol-blue/15";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || "P").slice(0, 2).toUpperCase();
}

export function Profile({
  account,
  onBack,
  onSaveProfile,
  onSavePassword,
  onUploadAvatar,
}: ProfileProps) {
  const [username, setUsername] = useState(account.username);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const avatarUrl = avatarPreview ?? account.avatarUrl;
  const avatarLabel = useMemo(() => initials(username || account.username), [username, account.username]);

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarBusy(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setAvatarBusy(false);
      event.target.value = "";
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBusy(true);
    try {
      await onSaveProfile(username);
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPasswordBusy(true);
    try {
      await onSavePassword(
        String(data.get("currentPassword") ?? ""),
        String(data.get("newPassword") ?? ""),
      );
      event.currentTarget.reset();
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        <header className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(0,255,135,.14),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(255,206,84,.1),transparent_38%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                Conta
              </span>
              <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-pebol-text">
                Editar perfil
              </h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                Ajuste seu nome, imagem e senha.
              </p>
            </div>
            <button type="button" className={secondaryClass} onClick={onBack}>
              Voltar
            </button>
          </div>
        </header>

        <section className="grid gap-4 rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="grid justify-items-center gap-3">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-lg border border-pebol-accent/35 bg-gradient-to-br from-pebol-accent/20 via-pebol-gold/10 to-black shadow-glow">
              {avatarUrl ? (
                <img
                  className="h-full w-full object-cover"
                  src={avatarUrl}
                  alt={`Imagem de perfil de ${account.username}`}
                />
              ) : (
                <span className="font-display text-3xl font-black text-white">
                  {avatarLabel}
                </span>
              )}
            </div>
            <label className={`${secondaryClass} m-0 cursor-pointer text-center`}>
              {avatarBusy ? "Enviando..." : "Trocar imagem"}
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void changeAvatar(event)}
                disabled={avatarBusy}
              />
            </label>
            <span className="text-center text-xs font-semibold text-pebol-muted">
              PNG, JPG ou WEBP até 2 MB.
            </span>
          </div>

          <form className="grid gap-3" onSubmit={submitProfile}>
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Nome de usuário
              <input
                className={fieldClass}
                value={username}
                maxLength={20}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <button type="submit" className={primaryClass} disabled={profileBusy}>
              {profileBusy ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </section>

        <form className="grid gap-3 rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl" onSubmit={submitPassword}>
          <div>
            <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted">
              Segurança
            </span>
            <h2 className="mt-1 font-title text-xl uppercase tracking-[0.02em] text-pebol-text">
              Trocar senha
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Senha atual
              <input className={fieldClass} name="currentPassword" type="password" autoComplete="current-password" />
            </label>
            <label className="m-0 grid gap-1 text-xs font-bold text-pebol-muted">
              Nova senha
              <input className={fieldClass} name="newPassword" type="password" autoComplete="new-password" />
            </label>
          </div>
          <button type="submit" className={primaryClass} disabled={passwordBusy}>
            {passwordBusy ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
