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
      className="screen admin-screen achievements-screen"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="admin-toolbar">
        <div className="admin-title">
          <span className="cup-tag">Perfil</span>
          <h1>
            Nível {progress?.level ?? 1} · {progress?.title ?? "Aspirante"}
          </h1>
          <p>
            {account?.username ?? ""} · {unlocked}/{total} conquistas ·{" "}
            {progress?.xp ?? points} XP
          </p>
        </div>
        <div className="admin-actions">
          <button id="ach-back" className="primary alt admin-action" onClick={onBack}>
            Voltar
          </button>
        </div>
      </div>

      {progress ? (
        <section className="level-panel">
          <div className="level-head">
            <strong>
              {progress.currentLevelXp}/{progress.nextLevelXp} XP para o próximo nível
            </strong>
            <span>
              {progress.nextTitle
                ? `Próximo título: ${progress.nextTitle} no nível ${progress.nextTitleLevel}`
                : "Título máximo alcançado"}
            </span>
          </div>
          <div className="level-bar">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${levelWidth}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
          <div className="level-split">
            <span>Conquistas: {progress.achievementXp} XP</span>
            <span>Partidas e fases: {progress.activityXp} XP</span>
          </div>
        </section>
      ) : null}

      {achievements === null ? (
        <p className="cup-note">Carregando...</p>
      ) : (
        <div className="achievement-grid">
          {achievements.map((achievement, index) => (
            <motion.article
              key={achievement.id}
              className={`achievement-card ${achievement.unlockedAt ? "unlocked" : "locked"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: Math.min(index * 0.015, 0.18) }}
            >
              <div className="achievement-top">
                <span>{achievement.category}</span>
                <strong>{achievement.points} XP</strong>
              </div>
              <h2>{achievement.title}</h2>
              <p>{achievement.description}</p>
              <em>
                {achievement.unlockedAt
                  ? `Desbloqueada em ${unlockedDate(achievement.unlockedAt)}`
                  : achievement.description.includes("Hardcore")
                    ? "Bloqueada · requer modo Hardcore"
                    : "Bloqueada"}
              </em>
            </motion.article>
          ))}
        </div>
      )}
    </motion.div>
  );
}
