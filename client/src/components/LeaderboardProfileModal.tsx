import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faMedal, faRankingStar, faTrophy, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { LeaderboardEntry, PublicProfile } from "../api.js";

interface LeaderboardProfileModalProps {
  entry: LeaderboardEntry;
  profile: PublicProfile | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function LeaderboardProfileModal({
  entry,
  profile,
  loading,
  error,
  onClose,
}: LeaderboardProfileModalProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const progress = profile?.progress ?? entry;
  const achievements = profile?.achievements ?? [];
  const levelPercent = progress.nextLevelXp > 0
    ? Math.min(100, (progress.currentLevelXp / progress.nextLevelXp) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relative grid max-h-[min(48rem,calc(100vh-2rem))] w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/10 bg-pebol-panel shadow-premium"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leader-profile-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative border-b border-white/10 bg-[linear-gradient(120deg,rgba(0,255,135,.13),rgba(58,134,212,.08),transparent_70%)] p-5 pr-14 sm:p-6 sm:pr-16">
          <button
            type="button"
            className="leader-profile-close grid h-10 w-10 place-items-center rounded-lg border-0 bg-white/[0.055] text-pebol-muted shadow-none transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fechar perfil"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>

          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-pebol-accent/35 bg-pebol-accent/10 font-display text-xl font-black text-white shadow-glow">
              {entry.avatarUrl ? <img className="h-full w-full object-cover" src={entry.avatarUrl} alt="" /> : initials(entry.username)}
            </span>
            <span className="min-w-0">
              <small className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-accent">
                #{entry.rank} no ranking
              </small>
              <h2 id="leader-profile-title" className="truncate font-title text-3xl uppercase text-white">
                {entry.username}
              </h2>
              <span className="font-semibold text-pebol-muted">{progress.title} · Nível {progress.level}</span>
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-pebol-muted">
              <span>Progresso do nível</span>
              <strong className="font-display text-pebol-gold">{progress.currentLevelXp}/{progress.nextLevelXp} XP</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/35">
              <span className="block h-full rounded-full bg-gradient-to-r from-pebol-accent to-pebol-gold" style={{ width: `${levelPercent}%` }} />
            </div>
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <dl className="grid grid-cols-3 gap-2">
            {[
              { icon: faRankingStar, label: "Ranking", value: `#${entry.rank}`, tone: "text-pebol-blue" },
              { icon: faMedal, label: "Conquistas", value: `${progress.achievementXp} XP`, tone: "text-pebol-gold" },
              { icon: faBolt, label: "Atividade", value: `${progress.activityXp} XP`, tone: "text-pebol-accent" },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
                <FontAwesomeIcon icon={stat.icon} className={stat.tone} />
                <dt className="mt-1 text-[0.65rem] font-bold uppercase text-pebol-muted">{stat.label}</dt>
                <dd className="truncate font-display text-sm font-black text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
            <span>
              <small className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-accent">Galeria</small>
              <h3 className="font-title text-xl uppercase text-white">Conquistas desbloqueadas</h3>
            </span>
            {!loading && !error ? <strong className="font-display text-sm text-pebol-gold">{achievements.length}</strong> : null}
          </div>

          {loading ? (
            <div className="grid gap-2 pt-4" aria-label="Carregando perfil">
              {[0, 1, 2].map((item) => <span key={item} className="h-16 animate-pulse rounded-lg bg-white/[0.05]" />)}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm font-semibold text-red-300">{error}</p>
          ) : achievements.length ? (
            <ul className="grid gap-2 pt-4 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <li key={achievement.id} className="flex min-w-0 gap-3 rounded-lg border border-pebol-gold/20 bg-pebol-gold/[0.055] p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pebol-gold/10 text-pebol-gold">
                    <FontAwesomeIcon icon={faTrophy} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block font-display text-sm text-white">{achievement.title}</strong>
                    <span className="line-clamp-2 text-xs leading-4 text-pebol-muted">{achievement.description}</span>
                    <em className="mt-1 block font-display text-[0.65rem] font-bold not-italic text-pebol-gold">+{achievement.points} XP</em>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm font-semibold text-pebol-muted">
              Este jogador ainda não desbloqueou conquistas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
