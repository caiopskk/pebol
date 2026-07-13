import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faChevronRight,
  faGear,
  faHouse,
  faPenToSquare,
  faRankingStar,
  faRightFromBracket,
  faRightToBracket,
  faTrophy,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { AccountUser, LeaderboardEntry, UserProgress } from "../api.js";

interface HomeSidebarProps {
  account: AccountUser | null;
  progress: UserProgress | null;
  leaderboard: LeaderboardEntry[] | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenAchievements: () => void;
  onOpenRanking: () => void;
  onCareer: () => void;
  onLogout: () => void;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  return (name || "P").slice(0, 2).toUpperCase();
}

function SidebarItem({
  icon,
  label,
  active = false,
  tone = "default",
  onClick,
}: {
  icon: IconDefinition;
  label: string;
  active?: boolean;
  tone?: "default" | "gold" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`home-sidebar-item ${active ? "is-active" : ""} is-${tone}`}
      onClick={onClick}
      title={label}
    >
      <span className="home-sidebar-item-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      <span className="home-sidebar-label">{label}</span>
    </button>
  );
}

export function HomeSidebar({
  account,
  progress,
  leaderboard,
  expanded,
  onExpandedChange,
  onOpenLogin,
  onOpenProfile,
  onOpenAdmin,
  onOpenAchievements,
  onOpenRanking,
  onCareer,
  onLogout,
}: HomeSidebarProps) {
  const level = progress?.level ?? 1;
  const title = progress?.title ?? "Aspirante";
  const currentXp = progress?.currentLevelXp ?? 0;
  const nextXp = progress?.nextLevelXp ?? 100;
  const xpPercent = Math.max(0, Math.min(100, (currentXp / nextXp) * 100));
  const rank = account
    ? leaderboard?.find((entry) => entry.userId === account.id)?.rank
    : undefined;

  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExpandedChange(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded, onExpandedChange]);

  return (
    <>
      {!expanded ? (
        <button
          type="button"
          className="home-sidebar-mobile-trigger"
          onClick={() => onExpandedChange(true)}
          aria-label="Abrir menu do Pebol"
        >
          <img src="/brand-concepts/pebol-duel-mark.svg" alt="" />
        </button>
      ) : null}

      <button
        type="button"
        className={`home-sidebar-backdrop ${expanded ? "is-visible" : ""}`}
        onClick={() => onExpandedChange(false)}
        aria-label="Fechar menu"
        tabIndex={expanded ? 0 : -1}
      />

      <aside className={`home-sidebar ${expanded ? "is-expanded" : ""}`} aria-label="Navegação principal">
        <button
          type="button"
          className="home-sidebar-brand"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher menu do Pebol" : "Expandir menu do Pebol"}
        >
          <img src="/brand-concepts/pebol-duel-mark.svg" alt="" />
          <span className="home-sidebar-wordmark">PEBOL</span>
          <span className="home-sidebar-toggle-cue" aria-hidden="true">
            <FontAwesomeIcon icon={faChevronRight} />
          </span>
        </button>

        {account ? (
          <button type="button" className="home-sidebar-profile" onClick={onOpenProfile} title="Editar perfil">
            <span className="home-sidebar-avatar">
              {account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : initials(account.username)}
              <em>Nv.{level}</em>
            </span>
            <span className="home-sidebar-profile-copy">
              <small>Conta conectada</small>
              <strong>{account.username}</strong>
              <span>{account.role === "admin" ? "Administrador" : title}</span>
            </span>
          </button>
        ) : (
          <button type="button" className="home-sidebar-login" onClick={onOpenLogin} title="Entrar ou criar conta">
            <span className="home-sidebar-item-icon"><FontAwesomeIcon icon={faRightToBracket} /></span>
            <span className="home-sidebar-label">Entrar / Criar conta</span>
          </button>
        )}

        {account ? (
          <div className="home-sidebar-xp" aria-label={`${currentXp} de ${nextXp} pontos de experiência`}>
            <span><span>XP da temporada</span><strong>{currentXp}/{nextXp}</strong></span>
            <i><span style={{ width: `${xpPercent}%` }} /></i>
          </div>
        ) : null}

        <nav className="home-sidebar-nav" aria-label="Seções do Pebol">
          <SidebarItem icon={faHouse} label="Início" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          {account ? <SidebarItem icon={faBriefcase} label="Modo carreira" onClick={onCareer} /> : null}
          {account ? <SidebarItem icon={faTrophy} label="Progresso" tone="gold" onClick={onOpenAchievements} /> : null}
          <SidebarItem icon={faRankingStar} label={rank ? `Ranking #${rank}` : "Ranking"} onClick={onOpenRanking} />
          {account ? <SidebarItem icon={faPenToSquare} label="Editar perfil" onClick={onOpenProfile} /> : null}
          {account?.role === "admin" ? <SidebarItem icon={faGear} label="Gerenciar" onClick={onOpenAdmin} /> : null}
        </nav>

        <div className="home-sidebar-footer">
          {account ? <SidebarItem icon={faRightFromBracket} label="Sair" tone="danger" onClick={onLogout} /> : null}
        </div>
      </aside>
    </>
  );
}
