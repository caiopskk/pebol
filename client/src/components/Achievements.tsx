import { motion } from "framer-motion";
import type {
  AccountUser,
  AchievementProgress,
  UserProgress,
} from "../api.js";

interface AchievementsProps {
  account: AccountUser | null;
  achievements: AchievementProgress[] | null;
  progress: UserProgress | null;
  onBack: () => void;
}

function unlockedDate(value: number) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function Achievements({
  account,
  achievements,
  progress,
  onBack,
}: AchievementsProps) {
  const unlocked = achievements?.filter((a) => a.unlockedAt).length ?? 0;
  const total = achievements?.length ?? 0;
  const points =
    achievements
      ?.filter((a) => a.unlockedAt)
      .reduce((sum, a) => sum + a.points, 0) ?? 0;
  const nextLevelXp = progress?.nextLevelXp ?? 1;
  const levelWidth = progress
    ? Math.min(100, (progress.currentLevelXp / nextLevelXp) * 100)
    : 0;

  return (
    <motion.div
      className="min-h-screen bg-stadium-depth px-4 py-6 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(0,255,135,.15),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(255,206,84,.12),transparent_36%)]" />
          <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                Perfil
              </span>
              <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-[0.02em] text-white">
                Nível {progress?.level ?? 1} · {progress?.title ?? "Aspirante"}
              </h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                {account?.username ?? ""} · {unlocked}/{total} conquistas ·{" "}
                {progress?.xp ?? points} XP
              </p>
            </div>
            <button
              id="ach-back"
              className="min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-5 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
              onClick={onBack}
            >
              Voltar
            </button>
          </div>
        </header>

        {progress ? (
          <section className="rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <strong className="font-display text-lg font-black text-white">
                {progress.currentLevelXp}/{progress.nextLevelXp} XP para o próximo nível
              </strong>
              <span className="text-sm font-semibold text-pebol-muted">
                {progress.nextTitle
                  ? `Próximo título: ${progress.nextTitle} no nível ${progress.nextTitleLevel}`
                  : "Título máximo alcançado"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-pebol-accent to-pebol-gold shadow-glow"
                initial={{ width: 0 }}
                animate={{ width: `${levelWidth}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm font-semibold text-pebol-muted">
              <span>Conquistas: {progress.achievementXp} XP</span>
              <span>Partidas e fases: {progress.activityXp} XP</span>
            </div>
          </section>
        ) : null}

        {achievements === null ? (
          <p className="rounded-2xl border border-white/10 bg-pebol-panel p-5 text-pebol-muted">
            Carregando...
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement, index) => {
              const unlockedState = !!achievement.unlockedAt;
              return (
                <motion.article
                  key={achievement.id}
                  className={`relative min-h-44 overflow-hidden rounded-2xl border p-5 shadow-premium backdrop-blur-xl transition-all duration-300 ${
                    unlockedState
                      ? "border-pebol-accent/35 bg-pebol-accent/10"
                      : "border-white/10 bg-pebol-panel opacity-75"
                  }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: Math.min(index * 0.015, 0.18) }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pebol-accent via-pebol-gold to-pebol-blue opacity-80" />
                  <div className="flex justify-between gap-3 font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
                    <span>{achievement.category}</span>
                    <strong className="text-pebol-gold">{achievement.points} XP</strong>
                  </div>
                  <h2 className="mt-4 font-display text-xl font-black text-white">
                    {achievement.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-pebol-muted">
                    {achievement.description}
                  </p>
                  <em className={`mt-4 block text-xs font-black not-italic ${unlockedState ? "text-pebol-accent" : "text-pebol-faint"}`}>
                    {unlockedState
                      ? `Desbloqueada em ${unlockedDate(achievement.unlockedAt!)}`
                      : achievement.description.includes("Hardcore")
                        ? "Bloqueada · requer modo Hardcore"
                        : "Bloqueada"}
                  </em>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
