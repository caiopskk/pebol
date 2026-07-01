import { useRef, useState, type FormEvent, type RefObject } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faGear,
  faMedal,
  faPenToSquare,
  faRankingStar,
  faRightFromBracket,
  faRightToBracket,
  faTrophy,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { GameMode } from "../../../shared/types.js";
import type {
  AccountUser,
  LeaderboardEntry,
  UserProgress,
} from "../api.js";
import { DEV_PREVIEWS } from "../devPreviews.js";

interface HomeProps {
  account: AccountUser | null;
  progress: UserProgress | null;
  leaderboard: LeaderboardEntry[] | null;
  savedName: string;
  hardcoreUnlocked: boolean;
  hardcoreLockText: string;
  onCreateRoom: (name: string, mode: GameMode, solo: boolean) => void;
  onJoinRoom: (name: string, code: string) => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenAchievements: () => void;
  onLogout: () => void;
  onWorldCup: () => void;
  onOpenUpdates: () => void;
  onOpenFeedback: () => void;
  onOpenLegal: (kind: "terms" | "privacy") => void;
  onSoon: (mode: "carreira" | "liga") => void;
}

const cardMotion = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const glass =
  "border border-white/10 bg-pebol-panel shadow-premium backdrop-blur-xl";
const panel =
  `${glass} relative overflow-hidden rounded-lg transition-all duration-300 ease-out`;
const heading = "font-title text-lg uppercase tracking-[0.015em] text-pebol-text";
const primaryAction =
  "pebol-glow-button pebol-glow-fill relative isolate min-h-10 w-full rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-4 py-2.5 font-display text-sm font-extrabold uppercase tracking-[0.07em] text-black shadow-glow transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(0,255,135,.38)] active:translate-y-0";
const secondaryAction =
  "pebol-glow-button min-h-10 rounded-lg border-0 bg-white/[0.055] px-3 py-2 font-display text-sm font-bold text-slate-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-pebol-blue/15";

type RoomPool = "clubs" | "worldcup";
type RoomRule = "classico" | "hardcore";

const poolCopy: Record<RoomPool, { badge: string; eyebrow: string; title: string; desc: string }> = {
  clubs: {
    badge: "CL",
    eyebrow: "Elencos oficiais",
    title: "Clubes",
    desc: "Draft com clubes do Brasileirão e Champions.",
  },
  worldcup: {
    badge: "CP",
    eyebrow: "Seleções históricas",
    title: "Seleções",
    desc: "Draft com seleções históricas da Copa.",
  },
};

const ruleCopy: Record<RoomRule, { badge: string; eyebrow: string; title: string; desc: string }> = {
  classico: {
    badge: "CL",
    eyebrow: "Draft aberto",
    title: "Clássico",
    desc: "Ratings visíveis e 5 atualizações.",
  },
  hardcore: {
    badge: "HC",
    eyebrow: "Risco alto",
    title: "Hardcore",
    desc: "Ratings ocultos, 3 atualizações.",
  },
};

function composeGameMode(pool: RoomPool, rule: RoomRule): GameMode {
  if (pool === "worldcup") return rule === "hardcore" ? "worldcup-hardcore" : "worldcup";
  return rule;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || "P").slice(0, 2).toUpperCase();
}

function xpPercent(progress: UserProgress | null) {
  if (!progress) return 0;
  return Math.max(
    0,
    Math.min(100, (progress.currentLevelXp / progress.nextLevelXp) * 100),
  );
}

function medalLabel(rank: number) {
  return rank <= 3 ? String(rank) : `#${rank}`;
}

function medalClass(rank: number) {
  if (rank === 1) return "border-pebol-gold/70 bg-pebol-gold/20 text-pebol-gold";
  if (rank === 2) return "border-slate-200/60 bg-slate-200/15 text-slate-100";
  if (rank === 3) return "border-orange-300/60 bg-orange-400/15 text-orange-200";
  return "border-white/10 bg-white/[0.055] text-pebol-muted";
}

/** Short "why sign up" bullet shown next to the login button when logged out. */
function ValueProp({
  icon,
  iconClass,
  text,
}: {
  icon: IconDefinition;
  iconClass: string;
  text: string;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm font-semibold text-pebol-muted">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.045] ${iconClass}`}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
      {text}
    </li>
  );
}

/** Compact icon + value + label stat, shown between the profile and its actions. */
function StatChip({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: IconDefinition;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:gap-2.5 sm:text-left">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.045] ${iconClass}`}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
      <div className="min-w-0">
        <strong className="block truncate font-display text-sm font-extrabold text-white">
          {value}
        </strong>
        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-pebol-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

function AccountProfile({
  account,
  progress,
  leaderboard,
  onOpenLogin,
  onOpenProfile,
  onOpenAdmin,
  onOpenAchievements,
  onLogout,
}: Pick<
  HomeProps,
  | "account"
  | "progress"
  | "leaderboard"
  | "onOpenLogin"
  | "onOpenProfile"
  | "onOpenAdmin"
  | "onOpenAchievements"
  | "onLogout"
>) {
  const level = progress?.level ?? 1;
  const title = progress?.title ?? "Aspirante";
  const xp = progress?.currentLevelXp ?? 0;
  const nextXp = progress?.nextLevelXp ?? 100;
  const xpWidth = `${xpPercent(progress)}%`;
  const myRank = account
    ? (leaderboard?.find((p) => p.userId === account.id)?.rank ?? null)
    : null;
  const rankLabel = myRank ? `#${myRank}` : "—";

  return (
    <motion.section variants={cardMotion} className={`${panel} p-3 sm:p-4`}>
      {account ? (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="home-avatar-frame relative grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-pebol-accent/40 bg-gradient-to-br from-pebol-accent/25 via-pebol-blue/15 to-black shadow-glow">
              {account.avatarUrl ? (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <img
                    className="block h-full w-full object-cover"
                    src={account.avatarUrl}
                    alt={`Imagem de perfil de ${account.username}`}
                  />
                </div>
              ) : (
                <span className="home-avatar-initials font-display text-xl font-extrabold text-white">
                  {initials(account.username)}
                </span>
              )}
              <em className="home-level-badge absolute -bottom-2 rounded-full border border-pebol-gold/50 bg-black px-2 py-0.5 font-display text-[0.65rem] font-bold not-italic text-pebol-gold">
                Nv. {level}
              </em>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pebol-accent">
                Conta conectada
              </span>
              <strong className="mt-0.5 block truncate font-display text-xl font-extrabold text-white">
                {account.username}
              </strong>
              <span className="block text-sm font-semibold text-pebol-muted">
                {account.role === "admin" ? "Administrador" : "Usuário"} · {title}
              </span>
              <div className="mt-2 sm:min-w-[16rem]">
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium text-slate-300">
                  <span>XP da temporada</span>
                  <strong className="font-display font-semibold text-pebol-gold">
                    {xp}/{nextXp}
                  </strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-black/40">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-pebol-accent to-pebol-gold shadow-glow"
                    style={{ width: xpWidth }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4 xl:border-l xl:border-white/10 xl:px-5">
            <StatChip icon={faRankingStar} iconClass="text-pebol-blue" value={rankLabel} label="Ranking" />
            <StatChip
              icon={faMedal}
              iconClass="text-pebol-gold"
              value={`${progress?.achievementXp ?? 0}`}
              label="XP conquistas"
            />
            <StatChip
              icon={faBolt}
              iconClass="text-pebol-accent"
              value={`${progress?.activityXp ?? 0}`}
              label="XP atividade"
            />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[24rem] xl:border-l xl:border-white/10 xl:pl-4">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenProfile} className={secondaryAction}>
              <span className="inline-flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faPenToSquare} className="text-pebol-muted" />
                Editar perfil
              </span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenAchievements} className={secondaryAction}>
              <span className="inline-flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-pebol-gold" />
                Progresso
              </span>
            </motion.button>
            {account.role === "admin" ? (
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenAdmin} className={primaryAction}>
                <span className="inline-flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faGear} />
                  Gerenciar
                </span>
              </motion.button>
            ) : null}
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={onLogout} className={secondaryAction}>
              <span className="inline-flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faRightFromBracket} className="text-pebol-muted" />
                Sair
              </span>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-4 xl:gap-6">
            <ValueProp icon={faBolt} iconClass="text-pebol-accent" text="Salve seu progresso e XP" />
            <ValueProp icon={faMedal} iconClass="text-pebol-gold" text="Desbloqueie conquistas" />
            <ValueProp icon={faRankingStar} iconClass="text-pebol-blue" text="Suba no ranking" />
          </ul>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenLogin} className={`${primaryAction} xl:max-w-xs xl:shrink-0`}>
            <span className="inline-flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faRightToBracket} />
              Entrar / Criar conta
            </span>
          </motion.button>
        </div>
      )}
    </motion.section>
  );
}

function RoomPanel({
  selectedPool,
  setSelectedPool,
  selectedRule,
  setSelectedRule,
  roomTab,
  setRoomTab,
  savedName,
  hardcoreUnlocked,
  hardcoreLockText,
  createNameRef,
  submitCreate,
  submitJoin,
}: {
  selectedPool: RoomPool;
  setSelectedPool: (pool: RoomPool) => void;
  selectedRule: RoomRule;
  setSelectedRule: (rule: RoomRule) => void;
  roomTab: "create" | "join";
  setRoomTab: (tab: "create" | "join") => void;
  savedName: string;
  hardcoreUnlocked: boolean;
  hardcoreLockText: string;
  createNameRef: RefObject<HTMLInputElement | null>;
  submitCreate: (event: FormEvent<HTMLFormElement>) => void;
  submitJoin: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <motion.section variants={cardMotion} className={`${panel} p-4`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(0,255,135,.14),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(255,206,84,.12),transparent_36%)]" />
      <div className="relative">
        <div className={`home-tab-control ${roomTab === "join" ? "is-join" : "is-create"}`}>
          <span className="home-tab-indicator" aria-hidden="true" />
          {(["create", "join"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`home-tab-label ${roomTab === tab ? "active" : ""}`}
              onClick={() => setRoomTab(tab)}
            >
              {tab === "create" ? "Criar sala" : "Entrar"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid">
          <form className={`col-start-1 row-start-1 ${roomTab === "create" ? "" : "pointer-events-none invisible opacity-0"}`} onSubmit={submitCreate}>
            <label htmlFor="c-name">Seu nome</label>
            <input ref={createNameRef} id="c-name" name="name" maxLength={20} placeholder="Insira seu nome" defaultValue={savedName} className="rounded-xl" />
            <label>Tipo de elenco</label>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {(["clubs", "worldcup"] as RoomPool[]).map((pool) => {
                return (
                  <button
                    key={pool}
                    type="button"
                    title={poolCopy[pool].title}
                    className={`group rounded-lg border p-2.5 text-left transition-all duration-300 ease-out ${
                      selectedPool === pool
                        ? "home-choice-active border-pebol-accent bg-pebol-accent/15 shadow-glow"
                        : "border-white/10 bg-white/[0.045] hover:-translate-y-1 hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
                    }`}
                    onClick={() => setSelectedPool(pool)}
                  >
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 font-display text-xs font-bold text-pebol-gold">
                      {poolCopy[pool].badge}
                    </span>
                    <small className="font-display text-[0.65rem] font-extrabold uppercase tracking-[0.11em] text-pebol-muted">
                      {poolCopy[pool].eyebrow}
                    </small>
                    <strong className="block font-display text-base font-extrabold text-white">
                      {poolCopy[pool].title}
                    </strong>
                    <span className="mt-1 block text-xs font-semibold leading-snug text-pebol-muted">
                      {poolCopy[pool].desc}
                    </span>
                  </button>
                );
              })}
            </div>
            <label>Modo de jogo</label>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {(["classico", "hardcore"] as RoomRule[]).map((rule) => {
                const locked = rule === "hardcore" && !hardcoreUnlocked;
                return (
                  <button
                    key={rule}
                    type="button"
                    disabled={locked}
                    title={locked ? hardcoreLockText : ruleCopy[rule].title}
                    className={`group rounded-lg border p-2.5 text-left transition-all duration-300 ease-out ${
                      selectedRule === rule
                        ? "home-choice-active border-pebol-accent bg-pebol-accent/15 shadow-glow"
                        : "border-white/10 bg-white/[0.045] hover:-translate-y-1 hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
                    } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                    onClick={() => {
                      if (!locked) setSelectedRule(rule);
                    }}
                  >
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 font-display text-xs font-bold text-pebol-gold">
                      {ruleCopy[rule].badge}
                    </span>
                    <small className="font-display text-[0.65rem] font-extrabold uppercase tracking-[0.11em] text-pebol-muted">
                      {ruleCopy[rule].eyebrow}
                    </small>
                    <strong className="block font-display text-base font-extrabold text-white">
                      {ruleCopy[rule].title}
                    </strong>
                    <span className="mt-1 block text-xs font-semibold leading-snug text-pebol-muted">
                      {locked ? hardcoreLockText : ruleCopy[rule].desc}
                    </span>
                  </button>
                );
              })}
            </div>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }} id="c-create" className={primaryAction}>
              Criar sala (online)
            </motion.button>
          </form>

          <form className={`col-start-1 row-start-1 ${roomTab === "join" ? "" : "pointer-events-none invisible opacity-0"}`} onSubmit={submitJoin}>
            <label htmlFor="j-name">Seu nome</label>
            <input id="j-name" name="name" maxLength={20} placeholder="Insira seu nome" defaultValue={savedName} className="rounded-xl" />
            <label htmlFor="j-code">Código da sala</label>
            <input id="j-code" name="code" maxLength={4} placeholder="XXXX" className="rounded-xl uppercase tracking-[0.18em]" />
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }} id="j-join" className={primaryAction}>
              Entrar
            </motion.button>
          </form>
        </div>
      </div>
    </motion.section>
  );
}

function SecondaryModes({ solo, onSoon }: { solo: () => void; onSoon: HomeProps["onSoon"] }) {
  const modes = [
    { id: "c-solo", icon: "AI", title: "Jogar sozinho", sub: "Vs Máquina", onClick: solo },
    { id: undefined, icon: "CR", title: "Modo carreira", sub: "Em breve", onClick: () => onSoon("carreira") },
    { id: undefined, icon: "LG", title: "Modo liga", sub: "Em breve", onClick: () => onSoon("liga") },
  ];
  return (
    <motion.section variants={cardMotion} className={`${panel} p-3`}>
      <div className="grid gap-2">
        {modes.map((mode) => (
          <motion.button
            key={mode.title}
            id={mode.id}
            whileHover={{ y: -3, x: 2 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            className="group flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.045] p-2.5 text-left transition-all duration-300 ease-out hover:border-pebol-accent/45 hover:bg-pebol-accent/10 hover:shadow-glow"
            onClick={mode.onClick}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/35 font-display text-xs font-bold text-pebol-accent transition-all duration-300 group-hover:border-pebol-accent/60 group-hover:bg-pebol-accent/15">
              {mode.icon}
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-display text-base font-extrabold text-white">
                {mode.title}
              </strong>
              <em className="block text-xs font-semibold not-italic text-pebol-muted">
                {mode.sub}
              </em>
            </span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

function WorldCupFeature({ onWorldCup }: { onWorldCup: () => void }) {
  return (
    <motion.aside variants={cardMotion} whileHover={{ y: -3 }} className={`${panel} min-h-[14rem] p-4 pl-28 sm:min-h-[15rem] sm:p-5 sm:pl-32`}>
      <div className="absolute inset-0 bg-pitch-lines bg-[length:44px_44px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_48%,rgba(255,206,84,.28),transparent_32%),linear-gradient(135deg,rgba(58,134,212,.18),rgba(0,255,135,.08)_42%,rgba(0,0,0,.42))]" />
      <div className="absolute left-4 top-1/2 h-36 w-24 -translate-y-1/2 rounded-full bg-pebol-gold/20 blur-3xl" />
      <img
        className="absolute left-1 top-1/2 z-10 h-40 w-28 -translate-y-1/2 object-contain drop-shadow-[0_28px_28px_rgba(255,206,84,.22)] sm:h-44 sm:w-32"
        src="/world_cup_trophy.png"
        alt="Troféu da Copa do Mundo"
      />
      <div className="relative z-20 flex h-full flex-col justify-center">
        <span className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pebol-gold">
          Modo solo
        </span>
        <h2 className={`${heading} mt-1.5 text-2xl`}>Copa do Mundo</h2>
        <p className="mt-1.5 max-w-md text-sm font-medium leading-5 text-slate-300">
          Monte uma seleção no draft, dispute a fase de grupos e avance pelo chaveamento de 32 times até a final.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {["48 seleções", "Grupo + mata-mata", "Campanha offline"].map((item) => (
            <li key={item} className="rounded-full border border-pebol-gold/25 bg-pebol-gold/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.05em] text-pebol-gold">
              {item}
            </li>
          ))}
        </ul>
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }} type="button" id="c-worldcup" className={`${primaryAction} mt-3 max-w-xs from-pebol-gold via-yellow-300 to-pebol-accent shadow-goldGlow`} onClick={onWorldCup}>
          Jogar campanha
        </motion.button>
      </div>
    </motion.aside>
  );
}

function FeedbackCallout({ onOpenFeedback }: { onOpenFeedback: () => void }) {
  return (
    <motion.aside
      variants={cardMotion}
      whileHover={{ y: -2 }}
      className={`${panel} p-3.5`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(0,255,135,.14),transparent_34%),linear-gradient(135deg,rgba(58,134,212,.1),transparent_52%)]" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pebol-accent">
            Sua opinião
          </span>
          <h2 className="mt-1 font-title text-lg uppercase tracking-[0.015em] text-pebol-text">
            Ajude a melhorar o Pebol
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-pebol-muted">
            Sugestões, bugs e balanceamento entram direto no painel de feedback.
          </p>
        </div>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.985 }}
          type="button"
          className={`${primaryAction} sm:max-w-[13rem]`}
          onClick={onOpenFeedback}
        >
          Enviar feedback
        </motion.button>
      </div>
    </motion.aside>
  );
}

function LeaderboardPanel({
  leaderboard,
  account,
}: Pick<HomeProps, "leaderboard" | "account">) {
  return (
    <motion.section variants={cardMotion} className={`${panel} flex min-h-full flex-col p-4`}>
      <div className="mb-3">
        <span className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pebol-accent">
          Ranking
        </span>
        <h2 className={heading}>Leaderboard por nível</h2>
      </div>
      <ol className="grid flex-1 auto-rows-fr gap-1.5">
        {Array.from({ length: 10 }, (_, index) => {
          const rank = index + 1;
          const p = leaderboard?.[index];
          const isYou = !!p && account?.id === p.userId;
          return (
            <motion.li
              layout={!!p}
              key={p?.userId ?? `placeholder-${rank}`}
              whileHover={p ? { x: 3, scale: 1.01 } : undefined}
              className={`home-leader-row ${p && rank <= 3 ? `home-podium home-rank-${rank}` : ""} grid min-h-10 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-all duration-300 ${
                p
                  ? isYou
                    ? "border-pebol-accent/50 bg-pebol-accent/10"
                    : "border-white/10 bg-white/[0.045]"
                  : "border-white/5 bg-white/[0.025]"
              }`}
            >
              <span className={`home-rank-badge grid h-8 w-8 place-items-center rounded-lg border font-display text-xs font-bold ${medalClass(rank)}`}>
                {medalLabel(rank)}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                {p ? (
                  <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                    {p.avatarUrl ? (
                      <img
                        className="h-full w-full object-cover"
                        src={p.avatarUrl}
                        alt=""
                      />
                    ) : (
                      <span className="font-display text-[0.6rem] font-bold text-pebol-muted">
                        {initials(p.username)}
                      </span>
                    )}
                  </span>
                ) : null}
                <span className="min-w-0">
                  <strong className="home-leader-name block truncate font-display text-sm font-semibold text-white">
                    {p ? p.username : leaderboard === null ? "..." : "Vago"}
                  </strong>
                  <em className="block truncate text-xs font-semibold not-italic text-pebol-muted">
                    {p ? p.title : "Aguardando jogador"}
                  </em>
                </span>
              </span>
              <span className="grid justify-items-end gap-1">
                <strong className="home-leader-level rounded-full border border-pebol-accent/20 bg-pebol-accent/10 px-2 py-0.5 font-display text-xs font-bold text-pebol-accent">
                  Nv. {p ? p.level : "--"}
                </strong>
                <em className="home-leader-xp text-xs font-semibold not-italic text-pebol-gold">
                  {p ? p.xp : "--"} XP
                </em>
              </span>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

export function Home({
  account,
  progress,
  leaderboard,
  savedName,
  hardcoreUnlocked,
  hardcoreLockText,
  onCreateRoom,
  onJoinRoom,
  onOpenLogin,
  onOpenProfile,
  onOpenAdmin,
  onOpenAchievements,
  onLogout,
  onWorldCup,
  onOpenUpdates,
  onOpenFeedback,
  onOpenLegal,
  onSoon,
}: HomeProps) {
  const [selectedPool, setSelectedPool] = useState<RoomPool>("clubs");
  const [selectedRule, setSelectedRule] = useState<RoomRule>("classico");
  const [roomTab, setRoomTab] = useState<"create" | "join">("create");
  const createNameRef = useRef<HTMLInputElement>(null);
  const selectedMode = composeGameMode(selectedPool, selectedRule);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreateRoom(String(data.get("name") ?? ""), selectedMode, false);
  };

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onJoinRoom(String(data.get("name") ?? ""), String(data.get("code") ?? ""));
  };

  const solo = () => {
    onCreateRoom(createNameRef.current?.value ?? "", selectedMode, true);
  };

  return (
    <motion.div
      className="min-h-screen px-4 py-4 font-body text-pebol-text sm:px-6 lg:px-8"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.055, delayChildren: 0.03 }}
    >
      <div className="mx-auto grid max-w-[96rem] gap-3">
        <AccountProfile
          account={account}
          progress={progress}
          leaderboard={leaderboard}
          onOpenLogin={onOpenLogin}
          onOpenProfile={onOpenProfile}
          onOpenAdmin={onOpenAdmin}
          onOpenAchievements={onOpenAchievements}
          onLogout={onLogout}
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(19rem,1fr)_minmax(24rem,1.18fr)_minmax(20rem,1fr)] xl:items-stretch">
          <div className="grid gap-3">
            <RoomPanel
              selectedPool={selectedPool}
              setSelectedPool={setSelectedPool}
              selectedRule={selectedRule}
              setSelectedRule={setSelectedRule}
              roomTab={roomTab}
              setRoomTab={setRoomTab}
              savedName={savedName}
              hardcoreUnlocked={hardcoreUnlocked}
              hardcoreLockText={hardcoreLockText}
              createNameRef={createNameRef}
              submitCreate={submitCreate}
              submitJoin={submitJoin}
            />
            <SecondaryModes solo={solo} onSoon={onSoon} />
          </div>

          <div className="grid gap-3">
            <motion.div variants={cardMotion} className={`${panel} grid min-h-[12rem] place-items-center p-4 text-center`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,255,135,.16),transparent_42%)]" />
              <div className="relative">
                <img
                  className="home-brand-logo mx-auto w-[min(19rem,78vw)] drop-shadow-[0_26px_34px_rgba(0,0,0,.58)]"
                  src="/512x512.png"
                  srcSet="/512x512.png 512w, /1024x1024.png 1024w"
                  sizes="min(19rem, 78vw)"
                  alt="Pebol"
                />
                <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-5 text-pebol-muted">
                  Monte seu time no draft e desafie um amigo 1v1 ou jogue contra a máquina.
                </p>
              </div>
            </motion.div>
            <WorldCupFeature onWorldCup={onWorldCup} />
            <FeedbackCallout onOpenFeedback={onOpenFeedback} />
          </div>

          <LeaderboardPanel leaderboard={leaderboard} account={account} />

          {import.meta.env.DEV ? (
            <motion.section variants={cardMotion} className={`${panel} p-4 xl:col-span-2`}>
              <div className="mb-3">
                <span className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pebol-blue">
                  Dev
                </span>
                <h2 className={heading}>Previews rápidos</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DEV_PREVIEWS.map((preview) => (
                  <motion.button
                    key={preview.hash}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    className={secondaryAction}
                    onClick={() => {
                      location.hash = preview.hash;
                    }}
                  >
                    {preview.label}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ) : null}
        </div>

        <motion.footer variants={cardMotion} className="flex flex-wrap items-center justify-center gap-3 pb-4 pt-1 text-xs font-medium text-pebol-faint">
          <span className="font-display font-extrabold uppercase tracking-[0.14em]">Pebol</span>
          <button type="button" className="transition-colors duration-300 hover:text-pebol-accent" onClick={onOpenUpdates}>
            Novidades
          </button>
          <button type="button" className="transition-colors duration-300 hover:text-pebol-accent" onClick={onOpenFeedback}>
            Feedback
          </button>
          <button type="button" className="transition-colors duration-300 hover:text-pebol-accent" onClick={() => onOpenLegal("terms")}>
            Termos de Uso
          </button>
          <button type="button" className="transition-colors duration-300 hover:text-pebol-accent" onClick={() => onOpenLegal("privacy")}>
            Política de Privacidade
          </button>
        </motion.footer>
      </div>
    </motion.div>
  );
}
