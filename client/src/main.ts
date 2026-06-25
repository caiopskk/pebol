import "./styles.css";
import { createElement, Fragment, type ReactElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import type {
  RoomState,
  PlayerPublic,
  GameMode,
  Mentality,
  AttackFocus,
  MatchResult,
  MatchEvent,
  Player,
  SquadPick,
  ShootoutKick,
  Team,
  GauntletResult,
} from "../../shared/types.js";
import {
  FORMATIONS,
  getFormation,
  groupOf,
  posLabel,
} from "../../shared/formations.js";
import { MENTALITIES, mentalityEdge } from "../../shared/mentalities.js";
import {
  attackFocusReport,
  computeStrength,
  effectiveRating,
  playerPositions,
  simInputFromTeam,
  simulateGauntletMatch,
  wcOpponentTactics,
} from "../../shared/engine.js";
import { getTeam } from "../../shared/data/teams.js";
import {
  WC_DRAFT_TEAMS,
  wcOpponentTeam,
  WC_LADDER,
} from "../../shared/data/worldcup.js";
import {
  api,
  setToken,
  getToken,
  setWriteRequestLock,
  type AccountUser,
  type AdminTeam,
  type AchievementProgress,
  type LeaderboardEntry,
  type UserProgress,
} from "./api.js";
import { ACHIEVEMENT_COPY } from "../../shared/achievements.js";
import { HARDCORE_UNLOCK_LEVEL } from "../../shared/progression.js";
import {
  onRoomUpdate,
  onError,
  createRoom,
  joinRoom,
  sendSetup,
  sendReady,
  sendPreMatchReady,
  sendPick,
  sendRerollTeam,
  sendHalftimeReady,
  sendRematch,
  leaveCurrentRoom,
} from "./net.js";
import { Home } from "./components/Home.js";
import { Login } from "./components/Login.js";
import { Achievements } from "./components/Achievements.js";
import { AdminTeams } from "./components/AdminTeams.js";
import { Lobby } from "./components/Lobby.js";
import { CampaignSetup } from "./components/CampaignSetup.js";
import { Draft } from "./components/Draft.js";
import { PreMatchClassic } from "./components/PreMatchClassic.js";
import { TacticBannerList, type BannerSpec } from "./components/TacticBanner.js";
import type { PitchSlot } from "./components/Pitch.js";
import { Overlays, overlays } from "./components/Overlays.js";
import { liveStore, halftimeStore } from "./lib/liveStore.js";
import type {
  HalftimeOptions,
  HalftimeCallbacks,
} from "./components/LiveStage.js";
import type {
  CampaignStatusData,
  BracketRoundData,
  TeamStrengthData,
  CampaignStrengthData,
  CampaignSquadRow,
} from "./components/CupStatus.js";
import { LiveMatchShell } from "./components/LiveMatchShell.js";
import {
  ResultSummary,
  type LeaderCardData,
  type LogEventItem,
  type StrengthRow,
} from "./components/ResultSummary.js";
import { ATTACK_FOCUS_OPTIONS } from "./components/SetupBoard.js";
import { CampaignDraft, type CampaignDraftPlayer } from "./components/CampaignDraft.js";
import { CampaignPreMatch } from "./components/CampaignPreMatch.js";
import { CampaignMatchShell } from "./components/CampaignMatchShell.js";
import {
  CampaignGameOver,
  CampaignVictory,
  type CampaignJourneyLeader,
} from "./components/CampaignEnd.js";
import { TeamForm } from "./components/TeamForm.js";
import { LegalPage } from "./components/LegalPage.js";
import { UpdatesPage } from "./components/UpdatesPage.js";
import {
  DEV_PREVIEWS,
  devPreviewFromHash,
  type DevPreviewKind,
} from "./devPreviews.js";

const app = document.getElementById("app")!;
const overlaysRoot = createRoot(document.getElementById("overlays")!);
overlaysRoot.render(createElement(Overlays));
let reactRoot: Root | null = null;
let syncLiveUi: (() => void) | null = null;
let cupDraftScrollTop = 0;
const MATCH_SPEED_KEY = "pebol:match-speed";
const THEME_KEY = "pebol:theme";
type AppTheme = "dark" | "light";
let currentTheme: AppTheme = readSavedTheme();
let writeLockCount = 0;

function readSavedTheme(): AppTheme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: AppTheme) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.resolvedTheme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const next: AppTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(next);
  render();
}

applyTheme(currentTheme);

setWriteRequestLock({
  begin: () => {
    writeLockCount += 1;
    overlays.setWriteLock(true);
  },
  end: () => {
    writeLockCount = Math.max(0, writeLockCount - 1);
    if (!writeLockCount) overlays.setWriteLock(false);
  },
});

function renderReact(node: ReactElement) {
  if (!reactRoot) reactRoot = createRoot(app);
  const preview = devPreviewKind();
  const content = createElement(
    Fragment,
    null,
    createElement(ThemeSwitch),
    preview ? createElement(DevPreviewChrome, { active: preview }) : null,
    node,
  );
  // MotionConfig is a context provider (no DOM wrapper), so the IDs/classes the
  // imperative live-match logic queries are unchanged. reducedMotion="user"
  // makes every screen honor prefers-reduced-motion.
  flushSync(() =>
    reactRoot!.render(
      createElement(MotionConfig, { reducedMotion: "user" }, content),
    ),
  );
}

function ThemeSwitch() {
  const light = currentTheme === "light";
  return createElement(
    "button",
    {
      type: "button",
      className: "theme-switch",
      "aria-label": light ? "Ativar tema escuro" : "Ativar tema claro",
      "aria-pressed": light,
      title: light ? "Tema claro" : "Tema escuro",
      onClick: toggleTheme,
    },
    createElement(
      "span",
      { className: "theme-switch-track", "aria-hidden": true },
      createElement("span", { className: "theme-icon theme-icon-moon" }),
      createElement("span", { className: "theme-icon theme-icon-sun" }),
      createElement("span", { className: "theme-switch-thumb" }),
    ),
  );
}

function clearReactRoot() {
  if (!reactRoot) return;
  reactRoot.unmount();
  reactRoot = null;
}

function readSavedMatchSpeed(): number {
  const saved = Number(localStorage.getItem(MATCH_SPEED_KEY));
  return [1, 1.5, 2].includes(saved) ? saved : 1;
}

function setMatchSpeed(speed: number) {
  L.matchSpeed = [1, 1.5, 2].includes(speed) ? speed : 1;
  localStorage.setItem(MATCH_SPEED_KEY, String(L.matchSpeed));
}

interface Local {
  youId: string | null;
  state: RoomState | null;
  // transient selection during the draft
  selectedPlayer: string | null;
  // setup choices (before sending)
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  // live match playback
  matchPlayed: boolean;
  matchSpeed: number; // 1, 1.5, 2
  playing: boolean;
  halftimeAdjusted: boolean;
  intervalBench: Array<Player & { fromTeamId: string }> | null;
  selectedSubOut: string | null;
  selectedSubIn: string | null;
  intervalSubCount: number;
  // World Cup campaign (single-player, client-side, independent of the socket room)
  campaign: CampaignState | null;
  // account + team admin (REST, separate from the socket game)
  account: AccountUser | null;
  accountProgress: UserProgress | null;
  leaderboard: LeaderboardEntry[] | null;
  accountScreen:
    | "login"
    | "admin"
    | "achievements"
    | "terms"
    | "privacy"
    | "updates"
    | null;
  adminTeams: AdminTeam[] | null;
  adminTeamSearch: string;
  adminPlayerSearch: string;
  editingTeam: AdminTeam | "new" | null;
  achievements: AchievementProgress[] | null;
  achievementAwardKeys: Set<string>;
}

type CampaignPhase =
  | "setup"
  | "draft"
  | "preMatch"
  | "match"
  | "gameover"
  | "victory";
type CampaignMode = "normal" | "hardcore";
interface CupGroupRow {
  id: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
}
interface CampaignState {
  phase: CampaignPhase;
  mode: CampaignMode;
  runId: string;
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  round: number; // 0..7 — 3 group matches + 5 knockout rounds
  picks: SquadPick[]; // your drafted XI
  currentTeam: Team | null; // team drawn this draft round
  usedTeamIds: string[];
  selectedPlayer: string | null;
  selectedPickSlotId: string | null; // when set, the user picked one of their fielded players to relocate
  currentOpp: Team | null; // opponent for the current round
  lastResult: GauntletResult | null;
  rerollsRemaining: number;
  campaignGoals: Record<string, number>;
  campaignAssists: Record<string, number>;
  groupTeams: Team[];
  groupTable: CupGroupRow[];
  groupQualified: boolean | null;
  groupQualifiedLabel: string | null;
  knockoutPath: Team[];
}

const L: Local = {
  youId: null,
  state: null,
  selectedPlayer: null,
  formationId: "4-3-3",
  mentality: "equilibrada",
  attackFocus: "equilibrado",
  matchPlayed: false,
  matchSpeed: readSavedMatchSpeed(),
  playing: false,
  halftimeAdjusted: false,
  intervalBench: null,
  selectedSubOut: null,
  selectedSubIn: null,
  intervalSubCount: 0,
  campaign: null,
  account: null,
  accountProgress: null,
  leaderboard: null,
  accountScreen: null,
  adminTeams: null,
  adminTeamSearch: "",
  adminPlayerSearch: "",
  editingTeam: null,
  achievements: null,
  achievementAwardKeys: new Set(),
};

onRoomUpdate((s) => {
  L.state = s;
  render();
});
onError((msg) => {
  showToast(msg);
});

let toastTimer: number | undefined;
function showToast(msg: string) {
  overlays.setToast(msg);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    overlays.setToast(null);
  }, 2600);
}

function me(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id === L.youId);
}
function opponent(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id !== L.youId);
}

type CampaignEndPreviewKind = "victory" | "gameover";

function devPreviewKind(): DevPreviewKind | null {
  if (!import.meta.env.DEV) return null;
  return devPreviewFromHash(location.hash);
}

function goPreviewHome() {
  L.campaign = null;
  L.state = null;
  L.youId = null;
  L.playing = false;
  L.accountScreen = null;
  halftimeStore.reset();
  liveStore.reset();
  if (location.hash) {
    location.hash = "";
  } else {
    render();
  }
}

function DevPreviewChrome({ active }: { active: DevPreviewKind }) {
  const current = DEV_PREVIEWS.find((preview) => preview.kind === active);
  return createElement(
    "div",
    { className: "dev-preview-chrome" },
    createElement(
      "button",
      {
        type: "button",
        className: "dev-preview-home",
        onClick: goPreviewHome,
      },
      "Tela inicial",
    ),
    createElement(
      "div",
      { className: "dev-preview-current" },
      createElement("span", null, "Preview"),
      createElement("strong", null, current?.label ?? active),
    ),
    createElement(
      "div",
      { className: "dev-preview-links" },
      DEV_PREVIEWS.map((preview) =>
        createElement(
          "button",
          {
            key: preview.kind,
            type: "button",
            className: preview.kind === active ? "active" : "",
            onClick: () => {
              location.hash = preview.hash;
            },
          },
          preview.label,
        ),
      ),
    ),
  );
}

// ---------------- Main render ----------------

function render() {
  const preview = devPreviewKind();
  if (preview) {
    renderDevPreview(preview);
    return;
  }

  // account / team admin owns the screen when open
  if (L.accountScreen) {
    if (L.accountScreen === "login") renderLogin();
    else if (L.accountScreen === "admin") renderAdmin();
    else if (L.accountScreen === "terms" || L.accountScreen === "privacy")
      renderLegal(L.accountScreen);
    else if (L.accountScreen === "updates") renderUpdates();
    else renderAchievements();
    return;
  }
  // World Cup campaign is a self-contained, client-side flow that owns the screen
  if (L.campaign) {
    if (L.playing) return;
    renderCampaign();
    return;
  }

  // outside the result phase, reset the playback state
  if (L.state?.phase !== "result") {
    L.matchPlayed = false;
    L.playing = false;
    syncLiveUi = null;
    L.halftimeAdjusted = false;
    L.intervalBench = null;
    L.selectedSubOut = null;
    L.selectedSubIn = null;
    L.intervalSubCount = 0;
  }
  // during live playback, don't re-render (preserve the animation)
  if (L.playing) {
    syncLiveUi?.();
    return;
  }

  if (!L.state || !L.youId) {
    renderHome();
  } else {
    switch (L.state.phase) {
      case "lobby":
        renderLobby();
        break;
      case "draft":
        renderDraft();
        break;
      case "preMatch":
        renderPreMatchClassic();
        break;
      case "result":
        renderResult();
        break;
      default:
        renderLobby();
    }
  }
}


// ---------------- Home ----------------

function renderHome() {
  const hardcoreLockText = L.account
    ? `Desbloqueia no nível ${HARDCORE_UNLOCK_LEVEL}`
    : "Entre para desbloquear no nível 5";

  const onCreateRoom = async (
    typedName: string,
    mode: GameMode,
    solo: boolean,
  ) => {
    const typedNameTrimmed = typedName.trim();
    const name = solo ? typedNameTrimmed || "Você" : typedNameTrimmed;
    if (!name) return showToast("Digite seu nome.");
    if (mode === "hardcore" && !canUseHardcore())
      return showToast(
        `Modo Hardcore desbloqueia no nível ${HARDCORE_UNLOCK_LEVEL}.`,
      );
    const res = await createRoom(name, mode, solo);
    if (res.ok && res.youId) L.youId = res.youId;
    else showToast(res.error || "Erro ao criar sala.");
  };

  const onJoinRoom = async (typedName: string, typedCode: string) => {
    const name = typedName.trim();
    const code = typedCode.trim().toUpperCase();
    if (!name) return showToast("Digite seu nome.");
    if (code.length !== 4) return showToast("Código inválido.");
    const res = await joinRoom(code, name);
    if (res.ok && res.youId) L.youId = res.youId;
    else showToast(res.error || "Erro ao entrar.");
  };

  renderReact(
    createElement(Home, {
      account: L.account,
      progress: L.accountProgress,
      leaderboard: L.leaderboard,
      savedName: L.account?.username ?? "",
      hardcoreUnlocked: canUseHardcore(),
      hardcoreLockText,
      onCreateRoom,
      onJoinRoom,
      onOpenLogin: openLogin,
      onOpenAdmin: () => void openAdmin(),
      onOpenAchievements: () => void openAchievements(),
      onLogout: logout,
      onWorldCup: startCampaign,
      onOpenUpdates: openUpdates,
      onOpenLegal: openLegal,
      onSoon: (mode) =>
        showToast(
          `Modo ${mode === "carreira" ? "carreira" : "liga"} estará disponível em breve.`,
        ),
    }),
  );
}

// ---------------- Account + team admin (REST) ----------------

const ALL_POS = [
  "GK",
  "RB",
  "LB",
  "CB",
  "RWB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
];

function playerPosText(p: Player): string {
  return playerPositions(p).map(posLabel).join("/");
}

/** Team name with season appended, unless the name already contains it. */
function teamFullName(team: { name: string; season?: string }): string {
  if (!team.season || team.name.includes(team.season)) return team.name;
  return `${team.name} ${team.season}`;
}

function parseAltPositionsInput(
  value: string,
  main: Player["pos"],
): Player["pos"][] | undefined {
  const alt = value
    .split(/[,\s/]+/)
    .map((pos) => pos.trim().toUpperCase())
    .filter(Boolean)
    .filter((pos): pos is Player["pos"] => ALL_POS.includes(pos))
    .filter((pos, idx, arr) => pos !== main && arr.indexOf(pos) === idx);
  return alt.length ? alt : undefined;
}
interface AchievementNotice {
  id: string;
  title: string;
  description: string;
  points: number;
}
interface XpNotice {
  amount: number;
  reason: string;
  level: number;
  title: string;
}
const achievementQueue: AchievementNotice[] = [];
const xpQueue: XpNotice[] = [];
let achievementNoticeTimer: number | undefined;
let achievementNoticeActive = false;

function queueAchievementNotice(id: string) {
  const meta = ACHIEVEMENT_COPY[id] ?? {
    title: "Conquista desbloqueada",
    description: "Uma nova conquista foi adicionada ao seu perfil.",
    points: 0,
  };
  achievementQueue.push({ id, ...meta });
  showNextAchievementNotice();
}

function showNextAchievementNotice() {
  if (achievementNoticeActive) return;
  const notice = achievementQueue.shift();
  if (!notice) return;
  achievementNoticeActive = true;
  overlays.setAchievement(notice);
  clearTimeout(achievementNoticeTimer);
  achievementNoticeTimer = window.setTimeout(() => {
    overlays.setAchievement(null);
    achievementNoticeActive = false;
    showNextAchievementNotice();
  }, 4200);
}

function queueXpNotice(notice: XpNotice) {
  xpQueue.push(notice);
  showNextXpNotice();
}

let xpNoticeActive = false;
let xpNoticeTimer: number | undefined;
function showNextXpNotice() {
  if (xpNoticeActive) return;
  const notice = xpQueue.shift();
  if (!notice) return;
  xpNoticeActive = true;
  overlays.setXp(notice);
  clearTimeout(xpNoticeTimer);
  xpNoticeTimer = window.setTimeout(() => {
    overlays.setXp(null);
    xpNoticeActive = false;
    showNextXpNotice();
  }, 3200);
}

async function restoreSession() {
  if (!getToken()) return;
  try {
    const { user } = await api.me();
    L.account = user;
    if (user) await loadProgress(false);
  } catch {
    setToken(null);
    L.account = null;
    L.accountProgress = null;
  }
  render();
}

async function loadLeaderboard(shouldRender = true) {
  try {
    const { leaderboard } = await api.leaderboard();
    L.leaderboard = leaderboard;
  } catch {
    L.leaderboard = [];
  }
  if (shouldRender) render();
}

async function loadProgress(shouldRender = true) {
  if (!L.account) {
    L.accountProgress = null;
    return;
  }
  try {
    const { progress } = await api.progress();
    L.accountProgress = progress;
  } catch {
    L.accountProgress = null;
  }
  if (shouldRender) render();
}

async function grantXp(amount: number, reason: string, sourceKey: string) {
  if (!L.account) return;
  try {
    const beforeLevel = L.accountProgress?.level ?? 1;
    const r = await api.grantXp(amount, reason, sourceKey);
    L.accountProgress = r.progress;
    if (r.granted) {
      void loadLeaderboard(false);
      queueXpNotice({
        amount,
        reason,
        level: r.progress.level,
        title: r.progress.title,
      });
      if (r.progress.level > beforeLevel) {
        showToast(
          `Você chegou ao nível ${r.progress.level}: ${r.progress.title}.`,
        );
      }
    }
  } catch {
    /* XP should never interrupt the game flow */
  }
}

function canUseHardcore(): boolean {
  return (
    !!L.account && (L.accountProgress?.level ?? 1) >= HARDCORE_UNLOCK_LEVEL
  );
}

function openLogin() {
  L.accountScreen = "login";
  render();
}
function openLegal(kind: "terms" | "privacy") {
  L.accountScreen = kind;
  render();
}
function openUpdates() {
  L.accountScreen = "updates";
  render();
}
function closeAccount() {
  L.accountScreen = null;
  L.editingTeam = null;
  render();
}
function goHome() {
  L.state = null;
  L.youId = null;
  L.selectedPlayer = null;
  L.playing = false;
  L.matchPlayed = false;
  L.campaign = null;
  L.accountScreen = null;
  L.editingTeam = null;
  syncLiveUi = null;
  leaveCurrentRoom();
  render();
}
function logout() {
  setToken(null);
  L.account = null;
  L.accountProgress = null;
  L.accountScreen = null;
  L.adminTeams = null;
  render();
}
async function openAchievements() {
  if (!L.account) return openLogin();
  L.accountScreen = "achievements";
  L.achievements = null;
  render();
  await loadAchievements();
}
async function loadAchievements() {
  try {
    const { achievements } = await api.achievements();
    L.achievements = achievements;
    await loadProgress(false);
  } catch (e) {
    showToast((e as Error).message);
    L.achievements = [];
  }
  if (L.accountScreen === "achievements") render();
}
async function openAdmin() {
  L.accountScreen = "admin";
  L.editingTeam = null;
  L.adminTeams = null;
  render();
  await loadAdminTeams();
}
async function loadAdminTeams() {
  try {
    const { teams } = await api.listTeams();
    L.adminTeams = teams;
  } catch (e) {
    showToast((e as Error).message);
    L.adminTeams = [];
  }
  if (L.accountScreen === "admin" && !L.editingTeam) render();
}

async function awardAchievements(ids: string[], sourceKey: string) {
  if (!L.account || !ids.length) return;
  const unique = [...new Set(ids)];
  const pending = unique.filter((id) => {
    const key = `${sourceKey}:${id}`;
    if (L.achievementAwardKeys.has(key)) return false;
    L.achievementAwardKeys.add(key);
    return true;
  });
  if (!pending.length) return;
  for (const id of pending) {
    try {
      const r = await api.unlockAchievement(id);
      L.accountProgress = r.progress;
      if (r.unlocked) {
        queueAchievementNotice(id);
        if (L.achievements) {
          const current = L.achievements.find((a) => a.id === id);
          if (current && !current.unlockedAt) current.unlockedAt = Date.now();
        }
      }
    } catch {
      /* achievements should never interrupt the game flow */
    }
  }
}

function renderAchievements() {
  renderReact(
    createElement(Achievements, {
      account: L.account,
      achievements: L.achievements,
      progress: L.accountProgress,
      onBack: closeAccount,
    }),
  );
}

function renderLogin() {
  renderReact(
    createElement(Login, {
      onBack: closeAccount,
      onSubmit: async (mode, username, password) => {
        const u = username.trim();
        const p = password;
        if (!u || !p) return showToast("Preencha usuário e senha.");
        try {
          const r =
            mode === "login" ? await api.login(u, p) : await api.signup(u, p);
          setToken(r.token);
          L.account = r.user;
          await loadProgress(false);
          L.accountScreen = null;
          showToast(`Olá, ${r.user.username}!`);
          render();
        } catch (e) {
          showToast((e as Error).message);
        }
      },
    }),
  );
}
function renderLegal(kind: "terms" | "privacy") {
  renderReact(createElement(LegalPage, { kind, onBack: closeAccount }));
}
function renderUpdates() {
  renderReact(createElement(UpdatesPage, { onBack: closeAccount }));
}

function canEditTeam(t: AdminTeam): boolean {
  if (!L.account) return false;
  return t.ownerId ? t.ownerId === L.account.id : L.account.role === "admin";
}


function searchKey(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderAdmin() {
  if (L.editingTeam) return renderTeamForm();
  renderReact(
    createElement(AdminTeams, {
      account: L.account,
      teams: L.adminTeams,
      initialSearch: L.adminTeamSearch,
      canEditTeam,
      onSearchCommit: (value) => {
        L.adminTeamSearch = value;
      },
      onImportFile: (input) => void importTeamsFromFile(input),
      onNewTeam: () => {
        L.adminPlayerSearch = "";
        L.editingTeam = "new";
        render();
      },
      onEditTeam: (team) => {
        L.adminPlayerSearch = "";
        L.editingTeam = team;
        render();
      },
      onDeleteTeam: async (team) => {
        if (!confirm(`Excluir "${team.name}"?`)) return;
        try {
          await api.deleteTeam(team.id);
          showToast("Time excluído.");
          await loadAdminTeams();
        } catch (e) {
          showToast((e as Error).message);
        }
      },
      onBack: closeAccount,
    }),
  );
}

function blankTeam(): AdminTeam {
  return {
    id: "",
    name: "",
    season: "",
    league: "",
    alias: "",
    kind: "club",
    ownerId: null,
    players: Array.from({ length: 11 }, (_, i) => ({
      name: "",
      pos: ALL_POS[Math.min(i, 14)] as Player["pos"],
      rating: 75,
    })),
    bench: [],
  };
}

type TeamImport = Partial<AdminTeam> & { official?: boolean };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeImportedPlayer(v: unknown, teamName: string): Player {
  if (!isRecord(v)) throw new Error(`Jogador inválido em ${teamName}.`);
  const name = String(v.name ?? "").trim();
  const pos = String(v.pos ?? "").toUpperCase();
  const rawAlt = Array.isArray(v.altPositions)
    ? v.altPositions
    : Array.isArray(v.positions)
      ? v.positions.filter((p) => String(p).toUpperCase() !== pos)
      : typeof v.altPositions === "string"
        ? v.altPositions.split(/[,\s/]+/)
        : [];
  const rating = Math.round(Number(v.rating));
  const attr = (key: "pac" | "sho" | "pas" | "dri" | "def" | "phy") => {
    const raw = v[key] ?? v[key.toUpperCase()];
    if (raw == null || raw === "") return undefined;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 1 || value > 99)
      throw new Error(`${key.toUpperCase()} inválido em ${teamName}: ${name || "jogador sem nome"}.`);
    return value;
  };
  if (!name) throw new Error(`Há jogador sem nome em ${teamName}.`);
  if (!ALL_POS.includes(pos))
    throw new Error(`Posição inválida em ${teamName}: ${pos}.`);
  if (!Number.isFinite(rating) || rating < 40 || rating > 99)
    throw new Error(`Rating inválido em ${teamName}: ${name}.`);
  const altPositions = rawAlt
    .map((p) => String(p).trim().toUpperCase())
    .filter((p): p is Player["pos"] => ALL_POS.includes(p))
    .filter((p, idx, arr) => p !== pos && arr.indexOf(p) === idx);
  return {
    name,
    pos: pos as Player["pos"],
    altPositions: altPositions.length ? altPositions : undefined,
    rating,
    pac: attr("pac"),
    sho: attr("sho"),
    pas: attr("pas"),
    dri: attr("dri"),
    def: attr("def"),
    phy: attr("phy"),
  };
}

function normalizeImportedTeam(v: unknown, isAdmin: boolean): TeamImport {
  if (!isRecord(v))
    throw new Error("Cada item importado precisa ser um objeto de time.");
  const name = String(v.name ?? "").trim();
  if (!name) throw new Error("Todo time importado precisa de name.");
  const playersRaw = Array.isArray(v.players) ? v.players : [];
  if (playersRaw.length !== 11)
    throw new Error(`${name} precisa ter exatamente 11 titulares em players.`);
  const benchRaw = Array.isArray(v.bench) ? v.bench : [];
  return {
    name,
    season: String(v.season ?? "").trim(),
    league: String(v.league ?? "").trim(),
    alias: String(v.alias ?? "").trim(),
    kind: v.kind === "national" ? "national" : "club",
    official: isAdmin ? v.official !== false : false,
    players: playersRaw.map((p) => normalizeImportedPlayer(p, name)),
    bench: benchRaw.map((p) => normalizeImportedPlayer(p, name)),
  };
}

function parseImportedTeams(raw: unknown, isAdmin: boolean): TeamImport[] {
  const source = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.teams)
      ? raw.teams
      : [raw];
  return source.map((item) => normalizeImportedTeam(item, isAdmin));
}

async function importTeamsFromFile(input: HTMLInputElement) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text()) as unknown;
    const teams = parseImportedTeams(raw, L.account?.role === "admin");
    if (!teams.length) return showToast("Nenhum time encontrado no JSON.");
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const team of teams) {
      try {
        await api.createTeam(team);
        created++;
      } catch (e) {
        const msg = (e as Error).message || "";
        if (/já existe/i.test(msg)) skipped++;
        else errors.push(`${team.name}: ${msg}`);
      }
    }
    if (created) {
      void awardAchievements(
        ["json_import", "custom_team"],
        `import:${file.name}:${file.size}:${Date.now()}`,
      );
    }
    const parts: string[] = [];
    if (created) parts.push(`${created} importado${created > 1 ? "s" : ""}`);
    if (skipped) parts.push(`${skipped} duplicado${skipped > 1 ? "s" : ""} ignorado${skipped > 1 ? "s" : ""}`);
    if (errors.length) parts.push(`${errors.length} com erro`);
    showToast(parts.join(" · ") || "Nenhum time importado.");
    if (errors.length) console.warn("Falhas na importação:", errors);
    await loadAdminTeams();
  } catch (e) {
    showToast((e as Error).message || "JSON inválido.");
  }
}

function renderTeamForm() {
  const isAdmin = L.account?.role === "admin";
  const isNew = L.editingTeam === "new";
  const t: AdminTeam = isNew
    ? blankTeam()
    : structuredClone(L.editingTeam as AdminTeam);
  renderReact(
    createElement(TeamForm, {
      isNew,
      isAdmin,
      initialName: t.name,
      initialAlias: t.alias || "",
      initialLeague: t.league || "",
      initialSeason: t.season || "",
      initialKind: t.kind === "national" ? "national" : "club",
      initialOfficial: !t.ownerId,
      initialPlayers: t.players,
      initialBench: t.bench ?? [],
      initialPlayerSearch: L.adminPlayerSearch,
      positions: ALL_POS as Player["pos"][],
      onCancel: () => {
        L.editingTeam = null;
        render();
      },
      onSearchChange: (value) => {
        L.adminPlayerSearch = value;
      },
      onSave: async (payload) => {
        if (payload.players.length !== 11 || payload.players.some((p) => !p.name)) {
          showToast("Preencha os 11 titulares.");
          return;
        }
        if (!payload.name) {
          showToast("Dê um nome ao time.");
          return;
        }
        try {
          if (isNew) await api.createTeam(payload);
          else await api.updateTeam(t.id, payload);
          if (isNew) void awardAchievements(["custom_team"], `team:${Date.now()}`);
          showToast("Time salvo.");
          L.editingTeam = null;
          await loadAdminTeams();
        } catch (e) {
          showToast((e as Error).message);
        }
      },
    }),
  );
}

// ---------------- World Cup campaign (single-player gauntlet) ----------------

function startCampaign() {
  L.state = null;
  L.youId = null;
  L.playing = false;
  L.campaign = {
    phase: "setup",
    mode: "normal",
    runId: `cup:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    formationId: "4-3-3",
    mentality: "equilibrada",
    attackFocus: "equilibrado",
    round: 0,
    picks: [],
    currentTeam: null,
    usedTeamIds: [],
    selectedPlayer: null,
    selectedPickSlotId: null,
    currentOpp: null,
    lastResult: null,
    rerollsRemaining: 5,
    campaignGoals: {},
    campaignAssists: {},
    groupTeams: [],
    groupTable: [],
    groupQualified: null,
    groupQualifiedLabel: null,
    knockoutPath: [],
  };
  render();
}

function campaignExit() {
  if (devPreviewKind()) return goPreviewHome();
  L.campaign = null;
  L.playing = false;
  lastCampaignPhase = null;
  render();
}

function mentalityLabel(m: Mentality): string {
  return MENTALITIES.find((x) => x.id === m)?.name ?? m;
}

function attackFocusLabel(f: AttackFocus | undefined): string {
  return (
    ATTACK_FOCUS_OPTIONS.find((x) => x.id === (f ?? "equilibrado"))?.name ??
    "Equilibrado"
  );
}

function attackFocusBannerSpec(
  picks: SquadPick[],
  focus: AttackFocus | undefined,
): BannerSpec | null {
  if (picks.length < 5) return null;
  const report = attackFocusReport(picks);
  const current = focus ?? "equilibrado";
  const wide = report.wide == null ? "--" : Math.round(report.wide);
  const central = report.central == null ? "--" : Math.round(report.central);
  const detail = `Lados ${wide} · Meio ${central} · OVR ${Math.round(report.overall)}`;
  if (report.best === "equilibrado") {
    return { kind: "good", text: `Elenco equilibrado: qualquer foco funciona. ${detail}.` };
  }
  const bestLabel = attackFocusLabel(report.best).toLowerCase();
  if (current === report.best) {
    return { kind: "good", text: `Foco encaixado: seu elenco rende melhor ${bestLabel}. ${detail}.` };
  }
  if (current !== "equilibrado") {
    return { kind: "bad", text: `Foco desalinhado: seu elenco pede ${bestLabel}. ${detail}.` };
  }
  return { kind: "tip", text: `Dica de foco: seu elenco parece melhor ${bestLabel}. ${detail}.` };
}

let lastCampaignPhase: string | null = null;
function renderCampaign() {
  const phase = L.campaign!.phase;
  // only clear React on phase transitions; re-renders within the same phase
  // must reconcile so framer-motion mount animations don't replay (flicker)
  if (lastCampaignPhase !== phase) {
    clearReactRoot();
    lastCampaignPhase = phase;
  }
  switch (phase) {
    case "setup":
      return renderCampaignSetup();
    case "draft":
      return renderCampaignDraft();
    case "preMatch":
      return renderCampaignPreMatch();
    case "match":
      return renderCampaignMatch();
    case "gameover":
      return renderCampaignGameOver();
    case "victory":
      return renderCampaignVictory();
  }
}

function renderCampaignSetup() {
  const c = L.campaign!;
  const hardcoreUnlocked = canUseHardcore();
  const formation = getFormation(c.formationId)!;
  renderReact(
    createElement(CampaignSetup, {
      formation,
      formationId: c.formationId,
      mentality: c.mentality,
      attackFocus: c.attackFocus,
      mode: c.mode,
      hardcoreUnlocked,
      hardcoreUnlockLevel: HARDCORE_UNLOCK_LEVEL,
      pitchSlots: buildPitchSlots(formation, [], { showPos: true }),
      onExit: campaignExit,
      onFormationChange: (formationId: string) => {
        c.formationId = formationId;
        render();
      },
      onMentalityChange: (mentality: Mentality) => {
        c.mentality = mentality;
        render();
      },
      onAttackFocusChange: (focus: AttackFocus) => {
        c.attackFocus = focus;
        render();
      },
      onModeChange: (mode: CampaignMode) => {
        if (mode === "hardcore" && !canUseHardcore()) {
          showToast(
            `Copa Hardcore desbloqueia no nível ${HARDCORE_UNLOCK_LEVEL}.`,
          );
          return;
        }
        c.mode = mode;
        render();
      },
      onStart: () => {
        // Reroll allowance follows the chosen mode: Normal = 5, Hardcore = 3.
        c.rerollsRemaining = c.mode === "hardcore" ? 3 : 5;
        c.phase = "draft";
        campaignDrawTeam();
        render();
      },
    }),
  );
}

function campaignOpenSlots() {
  const c = L.campaign!;
  const f = getFormation(c.formationId)!;
  const filled = new Set(c.picks.map((p) => p.slotId));
  return f.slots.filter((s) => !filled.has(s.id));
}

function campaignSelectable(): Set<string> {
  const c = L.campaign!;
  if (!c.currentTeam) return new Set();
  const openGroups = new Set(campaignOpenSlots().map((s) => groupOf(s.pos)));
  return new Set(
    c.currentTeam.players
      .filter((p) =>
        playerPositions(p).some((pos) => openGroups.has(groupOf(pos))),
      )
      .map((p) => p.name),
  );
}

function campaignDrawTeam() {
  const c = L.campaign!;
  cupDraftScrollTop = 0;
  for (let tries = 0; tries < 10; tries++) {
    const pool = WC_DRAFT_TEAMS.filter((t) => !c.usedTeamIds.includes(t.id));
    const src = pool.length ? pool : WC_DRAFT_TEAMS;
    if (!pool.length) c.usedTeamIds = [];
    c.currentTeam = src[Math.floor(Math.random() * src.length)];
    c.selectedPlayer = null;
    if (campaignSelectable().size) return; // at least one player fits an open slot
    c.usedTeamIds.push(c.currentTeam.id);
  }
}

function campaignRerollTeam() {
  const c = L.campaign!;
  if (c.phase !== "draft") return;
  if (c.rerollsRemaining <= 0)
    return showToast("Você já usou suas atualizações.");
  if (c.currentTeam) c.usedTeamIds.push(c.currentTeam.id);
  c.rerollsRemaining--;
  c.selectedPlayer = null;
  campaignDrawTeam();
  render();
}

function campaignPlace(slotId: string, player: Player) {
  const c = L.campaign!;
  const slot = getFormation(c.formationId)?.slots.find((s) => s.id === slotId);
  c.selectedPickSlotId = null;
  c.picks.push({
    slotId,
    player,
    fromTeamId: c.currentTeam!.id,
    effectiveRating: slot ? effectiveRating(player, slot.pos) : player.rating,
  });
  c.usedTeamIds.push(c.currentTeam!.id);
  c.selectedPlayer = null;
  // when the XI is complete, wait on the draft screen for the user to confirm
  // (the "Continuar" button) instead of jumping straight to the pre-match
  if (c.picks.length < 11) {
    campaignDrawTeam();
  }
  render();
}

function campaignAvg(): string {
  const c = L.campaign!;
  if (!c.picks.length) return "";
  const a = c.picks.reduce((s, p) => s + p.effectiveRating, 0) / c.picks.length;
  return `OVR ${Math.round(a)}`;
}

function campaignAvgNumber(): number {
  const c = L.campaign!;
  if (!c.picks.length) return 0;
  return Math.round(
    c.picks.reduce((s, p) => s + p.effectiveRating, 0) / c.picks.length,
  );
}

function awardDraftAchievements(
  picks: SquadPick[],
  formationId: string,
  sourceKey: string,
) {
  if (picks.length < 11) return;
  const strength = computeStrength(picks, formationId);
  const ids: string[] = [];
  if (strength.overall >= 85) ids.push("strong_draft");
  if (strength.overall >= 90) ids.push("elite_draft");
  if (strength.attack >= 90) ids.push("attack_90");
  if (strength.midfield >= 90) ids.push("midfield_90");
  if (strength.defense >= 90) ids.push("defense_90");
  if (strength.attack >= 85 && strength.midfield >= 85 && strength.defense >= 85)
    ids.push("balanced_squad");
  if (ids.length) void awardAchievements(ids, sourceKey);
}

function campaignStrengthData(): CampaignStrengthData {
  const c = L.campaign!;
  if (c.mode === "hardcore") return { state: "hidden" };
  if (!c.picks.length) return { state: "empty" };
  const s = computeStrength(c.picks, c.formationId);
  return {
    state: "ok",
    overall: s.overall,
    attack: s.attack,
    midfield: s.midfield,
    defense: s.defense,
  };
}

function campaignSquadRowsData(): CampaignSquadRow[] {
  const c = L.campaign!;
  const hideRating = c.mode === "hardcore";
  const f = getFormation(c.formationId)!;
  const bySlot = new Map(c.picks.map((p) => [p.slotId, p]));
  return f.slots.map((slot) => {
    const pick = bySlot.get(slot.id);
    return {
      slotId: slot.id,
      pos: posLabel(slot.pos),
      name: pick?.player.name ?? null,
      rating: pick ? pick.effectiveRating : null,
      hideRating,
    };
  });
}

function addCampaignJourneyStats(r: GauntletResult) {
  const c = L.campaign!;
  for (const ev of r.timeline) {
    if (ev.type !== "goal" || ev.side !== "home") continue;
    if (ev.player) {
      c.campaignGoals[ev.player] = (c.campaignGoals[ev.player] ?? 0) + 1;
    }
    if (ev.assist) {
      c.campaignAssists[ev.assist] = (c.campaignAssists[ev.assist] ?? 0) + 1;
    }
  }
}

function campaignTopStat(source: Record<string, number>) {
  return (
    Object.entries(source).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] ?? null
  );
}

function campaignJourneyLeadersData(): CampaignJourneyLeader[] {
  const c = L.campaign!;
  const scorer = campaignTopStat(c.campaignGoals);
  const assist = campaignTopStat(c.campaignAssists);
  return [
    {
      label: "Artilheiro da campanha",
      name: scorer ? scorer[0] : null,
      val: scorer
        ? `${scorer[1]} gol${scorer[1] > 1 ? "s" : ""}`
        : "Sem destaque",
    },
    {
      label: "Garçom da campanha",
      name: assist ? assist[0] : null,
      val: assist
        ? `${assist[1]} assistência${assist[1] > 1 ? "s" : ""}`
        : "Sem destaque",
    },
  ];
}

function knockoutBracketData(): BracketRoundData[] {
  const c = L.campaign!;
  const rounds = ["16-avos", "Oitavas", "Quartas", "Semi", "Final"];
  const currentIdx =
    c.phase === "victory" ? rounds.length : Math.max(0, c.round - 3);
  return rounds.map((label, idx) => {
    const opp = c.knockoutPath[idx];
    const state: BracketRoundData["state"] =
      idx < currentIdx ? "done" : idx === currentIdx ? "next" : "";
    const oppLabel =
      idx === currentIdx && opp
        ? `${opp.name}${opp.season ? ` ${opp.season}` : ""}`
        : idx < currentIdx
          ? "fase concluída"
          : "adversário oculto";
    return { label, state, oppLabel, showVs: idx === currentIdx };
  });
}

function groupRow(team: Pick<Team, "id" | "name" | "season">): CupGroupRow {
  return {
    id: team.id,
    name: teamFullName(team),
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
  };
}

function groupGoalDiff(row: CupGroupRow): number {
  return row.gf - row.ga;
}

function groupTableSorted(rows = L.campaign!.groupTable): CupGroupRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      groupGoalDiff(b) - groupGoalDiff(a) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}

function updateGroupRow(id: string, gf: number, ga: number) {
  const row = L.campaign!.groupTable.find((r) => r.id === id);
  if (!row) return;
  row.played++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.wins++;
    row.points += 3;
  } else if (gf === ga) {
    row.draws++;
    row.points += 1;
  } else {
    row.losses++;
  }
}

function recordGroupMatch(
  aId: string,
  bId: string,
  aGoals: number,
  bGoals: number,
) {
  updateGroupRow(aId, aGoals, bGoals);
  updateGroupRow(bId, bGoals, aGoals);
}

function teamAvg(team: Team): number {
  return Math.round(
    team.players.reduce((sum, p) => sum + p.rating, 0) /
      Math.max(1, team.players.length),
  );
}

function randomGroupScore(a: Team, b: Team): [number, number] {
  const baseA =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(a) - teamAvg(b)) / 18));
  const baseB =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(b) - teamAvg(a)) / 18));
  const goals = (base: number) => {
    const roll = Math.random() + Math.random() + Math.random();
    return Math.max(0, Math.min(5, Math.floor(roll * base)));
  };
  return [goals(baseA), goals(baseB)];
}

function setupCampaignGroup() {
  const c = L.campaign!;
  if (c.groupTeams.length) return;
  c.groupTeams = [0, 1, 2].map((i) => wcOpponentTeam(i, Math.random));
  c.groupTable = [
    groupRow({ id: "you", name: "Seu time", season: "" }),
    ...c.groupTeams.map(groupRow),
  ];
}

function simulateOtherGroupFixture(matchday: number) {
  const c = L.campaign!;
  const [a, b, d] = c.groupTeams;
  const fixtures: Array<[Team, Team]> = [
    [b, d],
    [a, d],
    [a, b],
  ];
  const fixture = fixtures[matchday];
  if (!fixture) return;
  const [ga, gb] = randomGroupScore(fixture[0], fixture[1]);
  recordGroupMatch(fixture[0].id, fixture[1].id, ga, gb);
}

function campaignRank(): number {
  return groupTableSorted().findIndex((row) => row.id === "you") + 1;
}

function bestThirdQualifies(row: CupGroupRow): boolean {
  return row.points >= 4 || (row.points === 3 && groupGoalDiff(row) >= 0);
}

function campaignQualificationLabel(): string {
  const sorted = groupTableSorted();
  const youRow = sorted.find((row) => row.id === "you")!;
  const rank = sorted.findIndex((row) => row.id === "you") + 1;
  if (rank <= 2) return `${rank}º colocado do grupo`;
  if (rank === 3 && bestThirdQualifies(youRow))
    return "3º colocado entre os 8 melhores terceiros";
  return `${rank}º colocado do grupo`;
}

function setupKnockoutPath() {
  const c = L.campaign!;
  if (c.knockoutPath.length) return;
  c.knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, Math.random),
  );
}

function campaignStageLabel(round = L.campaign!.round): string {
  return WC_LADDER[round]?.label ?? "Copa do Mundo";
}

function campaignStatusData(): CampaignStatusData {
  const c = L.campaign!;
  if (!c.groupTable.length) return { kind: "empty" };
  const inGroup = c.round < 3 || c.groupQualified === false;
  if (inGroup) {
    const rank = campaignRank();
    const status =
      c.groupQualified === null
        ? `${rank}º no grupo neste momento`
        : c.groupQualified
          ? `Classificado: ${c.groupQualifiedLabel}`
          : `Eliminado: ${c.groupQualifiedLabel}`;
    return {
      kind: "group",
      table: {
        status,
        rows: groupTableSorted().map((row) => ({
          id: row.id,
          name: row.name,
          played: row.played,
          points: row.points,
          goalDiff: groupGoalDiff(row),
          gf: row.gf,
        })),
      },
    };
  }
  if (!c.knockoutPath.length) return { kind: "empty" };
  const rounds = ["16-avos", "Oitavas", "Quartas", "Semi", "Final"];
  const currentIdx =
    c.phase === "victory" ? rounds.length : Math.max(0, c.round - 3);
  const bracket: BracketRoundData[] = rounds.map((label, idx) => {
    const opp = c.knockoutPath[idx];
    const state: BracketRoundData["state"] =
      idx < currentIdx ? "done" : idx === currentIdx ? "next" : "";
    const oppLabel =
      idx === currentIdx && opp
        ? `${opp.name}${opp.season ? ` ${opp.season}` : ""}`
        : idx < currentIdx
          ? "fase concluída"
          : "adversário oculto";
    return { label, state, oppLabel, showVs: idx === currentIdx };
  });
  return { kind: "knockout", bracket };
}

function renderCampaignDraft() {
  const c = L.campaign!;
  const team = c.currentTeam!;
  const f = getFormation(c.formationId)!;
  const hideRatings = c.mode === "hardcore";
  const selectable = campaignSelectable();
  const player = c.selectedPlayer
    ? team.players.find((p) => p.name === c.selectedPlayer)
    : null;
  const players: CampaignDraftPlayer[] = team.players.map((pl) => ({
    name: pl.name,
    pos: pl.pos,
    posText: playerPosText(pl),
    rating: pl.rating,
    clickable: selectable.has(pl.name),
    selected: c.selectedPlayer === pl.name,
  }));
  const complete = c.picks.length >= 11;
  const hint: ReactNode = complete
    ? createElement(
        Fragment,
        null,
        "Elenco completo! Clique em ",
        createElement("strong", null, "Continuar"),
        " para entrar em campo.",
      )
    : c.selectedPlayer
    ? createElement(
        Fragment,
        null,
        "Clique numa ",
        createElement("strong", null, "vaga compatível"),
        " (mesmo setor) para escalar ",
        createElement("strong", null, c.selectedPlayer),
        ".",
      )
    : c.selectedPickSlotId
      ? createElement(
          Fragment,
          null,
          "Clique numa ",
          createElement("strong", null, "vaga vazia"),
          " do mesmo setor para mover o jogador, ou clique nele de novo para cancelar.",
        )
      : hideRatings
        ? "Escolha jogadores que encaixem no setor aberto. No Hardcore, os ratings ficam ocultos até o fim da campanha."
        : "Escolha jogadores que encaixem no setor aberto. Posição exata mantém o over cheio; adaptações próximas perdem um pouco.";
  const strength = campaignStrengthData();
  const squadRows = campaignSquadRowsData();

  const selectedPick = c.selectedPickSlotId
    ? c.picks.find((p) => p.slotId === c.selectedPickSlotId)
    : null;
  const moveSource = selectedPick?.player ?? null;
  const activePlayer = player ?? moveSource;
  const openSlotIds = new Set<string>();
  if (activePlayer) {
    const playerGroups = playerPositions(activePlayer).map(groupOf);
    for (const slot of f.slots) {
      if (c.picks.some((p) => p.slotId === slot.id)) continue;
      if (playerGroups.includes(groupOf(slot.pos))) openSlotIds.add(slot.id);
    }
  }
  const pitchSlots = buildPitchSlots(f, c.picks, {
    openSlotIds,
    selectedSubId: c.selectedPickSlotId,
  });

  renderReact(
    createElement(CampaignDraft, {
      pickNumber: Math.min(c.picks.length + 1, 11),
      hideRatings,
      sourceName: team.name,
      sourceSeason: team.season,
      sourceLeague: team.league,
      rerollsRemaining: c.rerollsRemaining,
      players,
      hint,
      pitchSlots,
      strength,
      squadRows,
      progressRound: 0,
      noteText: "Monte os 11 e entre na fase de grupos. Depois dela, o chaveamento começa nos 16-avos.",
      complete,
      initialScrollTop: cupDraftScrollTop,
      onScrollPersist: (top) => {
        cupDraftScrollTop = top;
      },
      onExit: campaignExit,
      onReroll: () => campaignRerollTeam(),
      onSelectPlayer: (name) => {
        c.selectedPlayer = name;
        c.selectedPickSlotId = null;
        render();
      },
      onContinue: () => {
        const strength = computeStrength(c.picks, c.formationId);
        awardDraftAchievements(
          c.picks,
          c.formationId,
          `cup:draft:${c.runId}:${strength.overall}-${strength.attack}-${strength.midfield}-${strength.defense}`,
        );
        c.round = 0;
        campaignBeginRound();
        render();
      },
      onSlotClick: (slotId, filled) => {
        if (filled) {
          if (c.selectedPlayer) c.selectedPlayer = null;
          c.selectedPickSlotId = c.selectedPickSlotId === slotId ? null : slotId;
          render();
          return;
        }
        if (!openSlotIds.has(slotId) || !activePlayer) return;
        if (moveSource) campaignRelocate(c.selectedPickSlotId!, slotId);
        else campaignPlace(slotId, activePlayer);
      },
    }),
  );
}

function campaignRelocate(fromSlotId: string, toSlotId: string) {
  const c = L.campaign!;
  const pick = c.picks.find((p) => p.slotId === fromSlotId);
  if (!pick) return;
  const slot = getFormation(c.formationId)?.slots.find(
    (s) => s.id === toSlotId,
  );
  pick.slotId = toSlotId;
  pick.effectiveRating = slot
    ? effectiveRating(pick.player, slot.pos)
    : pick.player.rating;
  c.selectedPickSlotId = null;
  render();
}

function campaignBeginRound() {
  const c = L.campaign!;
  if (c.round < 3) {
    setupCampaignGroup();
    c.currentOpp = c.groupTeams[c.round];
  } else {
    setupKnockoutPath();
    c.currentOpp = c.knockoutPath[c.round - 3];
  }
  c.phase = "preMatch";
}

function renderCampaignPreMatch() {
  const c = L.campaign!;
  const ladder = WC_LADDER[c.round];
  const opp = c.currentOpp!;
  const hideRatings = c.mode === "hardcore";
  const oppTactics = wcOpponentTactics(opp);
  const counterOf = (m: Mentality): Mentality | undefined =>
    MENTALITIES.find((x) => x.counters === m)?.id;
  const edge = mentalityEdge(c.mentality, oppTactics.mentality);
  const goodCounter = counterOf(oppTactics.mentality);
  const banners: BannerSpec[] = [];
  if (hideRatings) {
    banners.push({ kind: "hardcore", text: "Modo Hardcore: ratings e dicas táticas estão ocultos." });
  } else {
    if (edge === "a") {
      banners.push({ kind: "good", text: `Vantagem tática: seu estilo neutraliza ${mentalityLabel(oppTactics.mentality)}.` });
    } else if (edge === "b") {
      banners.push({
        kind: "bad",
        text: `Cuidado: ${mentalityLabel(oppTactics.mentality)} neutraliza seu estilo.${goodCounter ? ` Considere ${mentalityLabel(goodCounter)}.` : ""}`,
      });
    } else if (goodCounter) {
      banners.push({ kind: "tip", text: `Dica: ${mentalityLabel(goodCounter)} neutraliza ${mentalityLabel(oppTactics.mentality)}.` });
    }
    const focusSpec = attackFocusBannerSpec(c.picks, c.attackFocus);
    if (focusSpec) banners.push(focusSpec);
  }
  renderReact(
    createElement(CampaignPreMatch, {
      ladderLabel: ladder.label,
      progressRound: c.round,
      status: campaignStatusData(),
      banners,
      youFormation: c.formationId,
      youOvrText: hideRatings ? "OVR ??" : `OVR ${campaignAvgNumber()}`,
      youMentalityLabel: mentalityLabel(c.mentality),
      youFocusLabel: attackFocusLabel(c.attackFocus),
      oppName: teamFullName(opp),
      oppFlagName: opp.name,
      oppInitials: initials(opp.name),
      oppOvrText: hideRatings ? "OVR ??" : `OVR ${teamAvg(opp).toFixed(0)}`,
      oppFormation: oppTactics.formationId,
      oppMentalityLabel: mentalityLabel(oppTactics.mentality),
      oppFocusLabel: attackFocusLabel(oppTactics.attackFocus),
      mentality: c.mentality,
      attackFocus: c.attackFocus,
      onExit: campaignExit,
      onSelectMentality: (m) => {
        c.mentality = m;
        render();
      },
      onSelectFocus: (f) => {
        c.attackFocus = f;
        render();
      },
      onPlay: () => {
        c.phase = "match";
        render();
      },
    }),
  );
}

function campaignMatchAchievementIds(r: GauntletResult): string[] {
  const ids: string[] = [];
  const playerGoals = new Map<string, number>();
  const playerAssists = new Map<string, number>();
  let youHalfGoals = 0;
  let oppHalfGoals = 0;
  let youRedCard = false;
  for (const ev of r.timeline) {
    if (ev.type === "card" && ev.card === "red" && ev.side === "home")
      youRedCard = true;
    if (ev.type !== "goal") continue;
    if (ev.minute <= 45) {
      if (ev.side === "home") youHalfGoals++;
      else if (ev.side === "away") oppHalfGoals++;
    }
    if (ev.side !== "home") continue;
    if (ev.player)
      playerGoals.set(ev.player, (playerGoals.get(ev.player) ?? 0) + 1);
    if (ev.assist)
      playerAssists.set(ev.assist, (playerAssists.get(ev.assist) ?? 0) + 1);
  }
  const totalAssists = [...playerAssists.values()].reduce((sum, n) => sum + n, 0);
  if (r.youGoals > 0) ids.push("first_goal");
  if (r.outcome === "win") ids.push("first_win");
  if (r.outcome === "win" && r.oppGoals === 0) ids.push("clean_sheet");
  if ([...playerGoals.values()].some((n) => n >= 3)) ids.push("hat_trick");
  if (totalAssists >= 3) ids.push("assist_master");
  if (r.outcome === "win" && r.youGoals - r.oppGoals >= 3) ids.push("big_win");
  if (r.outcome === "win" && youHalfGoals < oppHalfGoals) ids.push("comeback_win");
  if (r.outcome === "win" && youRedCard) ids.push("red_card_win");
  return ids;
}

function campaignAdvance() {
  const c = L.campaign!;
  L.playing = false;
  const r = c.lastResult!;
  const roundKey = `${c.runId}:round:${c.round}:${r.youGoals}-${r.oppGoals}`;
  void grantXp(
    r.outcome === "win" ? 50 : r.outcome === "draw" ? 35 : 25,
    r.outcome === "win" ? "Jogo da Copa vencido" : "Jogo da Copa concluído",
    `xp:${roundKey}:match`,
  );
  const matchIds = campaignMatchAchievementIds(r);
  if (r.outcome === "win") matchIds.push("cup_first_win");
  if (r.outcome === "win" && c.mode === "hardcore")
    matchIds.push("cup_hardcore_first_win");
  if (matchIds.length)
    void awardAchievements(matchIds, `cup:match:${c.runId}:${c.round}`);
  addCampaignJourneyStats(r);
  if (c.round < 3) {
    recordGroupMatch("you", c.currentOpp!.id, r.youGoals, r.oppGoals);
    simulateOtherGroupFixture(c.round);
    if (c.round < 2) {
      c.round++;
      campaignBeginRound();
    } else {
      const sorted = groupTableSorted();
      const rank = sorted.findIndex((row) => row.id === "you") + 1;
      const youRow = sorted.find((row) => row.id === "you")!;
      c.groupQualified =
        rank <= 2 || (rank === 3 && bestThirdQualifies(youRow));
      c.groupQualifiedLabel = campaignQualificationLabel();
      if (c.groupQualified) {
        const ids = ["group_escape"];
        if (youRow.wins === 3) ids.push("perfect_group");
        if (c.mode === "hardcore") ids.push("group_escape_hardcore");
        void grantXp(
          80,
          "Classificação na fase de grupos",
          `xp:${c.runId}:group-clear`,
        );
        void awardAchievements(
          ids,
          `cup:group:${r.youGoals}-${r.oppGoals}:${Date.now()}`,
        );
        c.round = 3;
        setupKnockoutPath();
        campaignBeginRound();
      } else {
        c.phase = "gameover";
      }
    }
  } else if (r.outcome === "win") {
    const ids = r.penaltyScore ? ["penalty_win"] : [];
    if (ids.length)
      void awardAchievements(
        ids,
        `cup:ko:${c.round}:${r.youGoals}-${r.oppGoals}:${Date.now()}`,
      );
    if (c.round === 7) {
      const ids = ["world_champion"];
      if (c.mode === "hardcore") ids.push("world_champion_hardcore");
      void grantXp(150, "Título da Copa do Mundo", `xp:${c.runId}:champion`);
      void awardAchievements(ids, `cup:champion:${Date.now()}`);
      c.phase = "victory";
    } else {
      const stageAchievements: Record<number, string> = {
        3: "round_32_clear",
        4: "quarterfinalist",
        5: "semifinalist",
        6: "finalist",
      };
      const stageId = stageAchievements[c.round];
      if (stageId)
        void awardAchievements([stageId], `cup:stage:${c.runId}:${c.round}`);
      void grantXp(
        70,
        `Fase concluída: ${campaignStageLabel(c.round)}`,
        `xp:${c.runId}:stage:${c.round}`,
      );
      c.round++;
      campaignBeginRound();
    }
  } else {
    c.phase = "gameover";
  }
  render();
}

function renderCampaignMatch() {
  const c = L.campaign!;
  const oppTeam = c.currentOpp!;
  const youSim = {
    id: "you",
    name: "Seu time",
    picks: c.picks,
    formationId: c.formationId,
    mentality: c.mentality,
    attackFocus: c.attackFocus,
  };
  const oppTactics = wcOpponentTactics(oppTeam);
  const oppSim = {
    ...simInputFromTeam(oppTeam, oppTactics.formationId, oppTactics.mentality),
    attackFocus: oppTactics.attackFocus,
  };
  const r = simulateGauntletMatch(youSim, oppSim, c.round >= 3);
  c.lastResult = r;
  L.playing = true;
  const skipRef: { current: (() => void) | null } = { current: null };
  liveStore.reset();

  renderReact(
    createElement(CampaignMatchShell, {
      ladderLabel: WC_LADDER[c.round].label,
      oppName: teamFullName(oppTeam),
      oppFlagName: oppTeam.name,
      oppInitials: "ADV",
      speedOptions: [1, 1.5, 2],
      activeSpeed: L.matchSpeed,
      showPause: true,
      onSpeedChange: setMatchSpeed,
      onTogglePause: (p) => setPaused(p),
      onSkip: () => skipRef.current?.(),
    }),
  );

  const goals = { you: 0, opp: 0 };
  let minute = 0,
    evIdx = 0,
    timer: number | undefined,
    hideTimer: number | undefined;

  const pidOf = (side: MatchEvent["side"]) =>
    side === "home" ? "you" : side === "away" ? "opp" : null;
  function moveBall(ev: MatchEvent, dur: number) {
    if (ev.bx === undefined) return;
    liveStore.setBall({
      transitionMs: Math.max(180, Math.min(1300, dur * 0.85)),
      left: ((ev.bx - 0.5) / 105) * 100,
      top: ((ev.by! - 0.5) / 68) * 100,
      goal: ev.type === "goal",
    });
  }
  function addFeed(ev: MatchEvent) {
    const cardKind = ev.type === "card" ? (ev.card === "red" ? "red" : "yellow") : undefined;
    const pos = ev.bx !== undefined ? `${ev.bx}-${ev.by}` : null;
    liveStore.prependFeed({
      type: ev.type,
      minute: ev.minute,
      text: ev.text,
      pos,
      cardKind,
    });
  }
  function goalAnim(scorer?: string) {
    liveStore.showGoal(scorer ?? "");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => liveStore.hideGoal(), 950);
  }
  function delayFor(ev: MatchEvent): number {
    switch (ev.type) {
      case "goal":
        return 1950;
      case "chance":
      case "save":
      case "corner":
      case "var":
        return 1100;
      case "card":
        return 880;
      case "possession":
        return 340;
      case "halftime":
      case "fulltime":
        return 650;
      case "info":
        return 780;
      default:
        return 760;
    }
  }
  let paused = false;
  let pendingFn: (() => void) | null = null;
  function schedule(d: number, fn: () => void = tick) {
    clearTimeout(timer);
    pendingFn = fn;
    if (paused) return;
    timer = window.setTimeout(() => {
      pendingFn = null;
      fn();
    }, d);
  }
  function setPaused(p: boolean) {
    paused = p;
    liveStore.setPaused(p);
    if (p) {
      clearTimeout(timer);
    } else if (pendingFn) {
      schedule(120, pendingFn);
    }
  }
  function tick() {
    if (!L.playing) return;
    if (evIdx < r.timeline.length && r.timeline[evIdx].minute <= minute) {
      const ev = r.timeline[evIdx++];
      const d = delayFor(ev);
      moveBall(ev, d);
      addFeed(ev);
      if (ev.type === "goal") {
        const p = pidOf(ev.side);
        if (p) {
          goals[p as "you" | "opp"]++;
          liveStore.addGoal(p, Math.min(ev.minute, 90), ev.player ?? "?", ev.assist ?? null);
        }
        liveStore.setScore(goals.you, goals.opp);
        goalAnim(ev.player);
      }
      schedule(d / L.matchSpeed);
      return;
    }
    if (minute >= 90) {
      if (r.shootout?.length) schedule(1000, playShootout);
      else schedule(1100, finish);
      return;
    }
    minute++;
    liveStore.setMinute(minute);
    liveStore.setHalfLabel(minute <= 45 ? "1º Tempo" : "2º Tempo");
    schedule(130 / L.matchSpeed);
  }
  function playShootout() {
    if (!r.shootout?.length) return finish();
    liveStore.setHalfLabel("Pênaltis");
    liveStore.openShootout();
    let kickIdx = 0;
    // Penalties always play out at a dramatic, fixed pace (ignore match speed).
    const STEP_UP = 1100; // kicker steps up, suspense before the result
    const REVEAL = 1500; // pause on the result before the next kicker
    const nextKick = () => {
      if (!L.playing) return;
      const kick = r.shootout![kickIdx];
      if (!kick) {
        schedule(1600, finish);
        return;
      }
      // after the first 5 pairs, every remaining kick is sudden death
      if (kickIdx === 10) liveStore.setSuddenDeath();
      kickIdx++;
      const side = kick.side === "home" ? "you" : "opp";
      const id = liveStore.appendKick(side, kick.taker);
      schedule(STEP_UP, () => {
        if (!L.playing) return;
        // the shootout panel tracks the running score from resolved kicks
        liveStore.resolveKick(side, id, kick.scored);
        schedule(REVEAL, nextKick);
      });
    };
    nextKick();
  }
  function finish() {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    campaignAdvance();
  }

  skipRef.current = finish;
  schedule(700);
}

function renderCampaignGameOver() {
  const c = L.campaign!;
  const r = c.lastResult!;
  const fellInGroup = c.groupQualified === false;
  const completed = fellInGroup ? 3 : c.round;
  const title = fellInGroup
    ? "Eliminado na fase de grupos"
    : `Eliminado em ${campaignStageLabel(c.round)}`;
  const detail = fellInGroup
    ? `Você terminou como ${c.groupQualifiedLabel}.`
    : r.penaltyScore
      ? `Empate contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals}. Nos pênaltis, ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}.`
      : `Resultado contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals} (${r.outcome === "draw" ? "empate" : "derrota"}).`;
  const penaltyLabel = r.penaltyScore
    ? `Pênaltis ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}`
    : null;
  const status: CampaignStatusData = fellInGroup
    ? campaignStatusData()
    : { kind: "knockout", bracket: knockoutBracketData() };
  renderReact(
    createElement(CampaignGameOver, {
      title,
      detail,
      youGoals: r.youGoals,
      oppGoals: r.oppGoals,
      oppName: r.oppName,
      penaltyLabel,
      journeyLeaders: campaignJourneyLeadersData(),
      squadRows: campaignSquadRowsData(),
      status,
      progressRound: completed,
      onRetry: () => startCampaign(),
      onHome: goHome,
    }),
  );
}

function renderCampaignVictory() {
  const c = L.campaign!;
  renderReact(
    createElement(CampaignVictory, {
      groupLabel: c.groupQualifiedLabel ?? "líder do grupo",
      journeyLeaders: campaignJourneyLeadersData(),
      squadRows: campaignSquadRowsData(),
      bracket: knockoutBracketData(),
      progressRound: 8,
      onRetry: () => startCampaign(),
      onHome: goHome,
    }),
  );
}

function previewSquadRows(): CampaignSquadRow[] {
  return [
    ["GOL", "Buffon", 90],
    ["LD", "Cafu", 89],
    ["ZAG", "Beckenbauer", 91],
    ["ZAG", "Cannavaro", 88],
    ["LE", "Roberto Carlos", 90],
    ["MC", "Xavi", 91],
    ["MC", "Zidane", 92],
    ["MEI", "Maradona", 93],
    ["PD", "Messi", 94],
    ["CA", "Ronaldo", 93],
    ["PE", "Ronaldinho", 91],
  ].map(([pos, name, rating], idx) => ({
    slotId: `preview-${idx}`,
    pos: String(pos),
    name: String(name),
    rating: Number(rating),
    hideRating: false,
  }));
}

function previewJourneyLeaders(): CampaignJourneyLeader[] {
  return [
    { label: "Artilheiro", name: "Ronaldo", val: "7 gols" },
    { label: "Assistência", name: "Messi", val: "5 assistências" },
    { label: "Craque da campanha", name: "Zidane", val: "OVR 92" },
  ];
}

function previewBracket(): BracketRoundData[] {
  return [
    { label: "16-avos", state: "done", oppLabel: "México 1986", showVs: true },
    { label: "Oitavas", state: "done", oppLabel: "Holanda 1974", showVs: true },
    { label: "Quartas", state: "done", oppLabel: "França 1998", showVs: true },
    { label: "Semifinal", state: "done", oppLabel: "Argentina 1986", showVs: true },
    { label: "Final", state: "done", oppLabel: "Brasil 1970", showVs: true },
  ];
}

function previewRng(seed = 0) {
  const values = [0.12, 0.44, 0.73, 0.27, 0.91, 0.58, 0.36, 0.82];
  let i = seed;
  return () => values[i++ % values.length];
}

function previewCampaignPicks(count = 11): SquadPick[] {
  const formation = getFormation("4-3-3")!;
  const used = new Set<string>();
  const pool = WC_DRAFT_TEAMS.flatMap((team) =>
    team.players.map((player) => ({ team, player })),
  ).sort((a, b) => b.player.rating - a.player.rating);

  return formation.slots.slice(0, count).map((slot) => {
    const found =
      pool.find(
        ({ team, player }) =>
          !used.has(`${team.id}:${player.name}`) &&
          playerPositions(player).some((pos) => groupOf(pos) === groupOf(slot.pos)),
      ) ??
      pool.find(({ team, player }) => !used.has(`${team.id}:${player.name}`)) ??
      pool[0];
    used.add(`${found.team.id}:${found.player.name}`);
    return {
      slotId: slot.id,
      player: found.player,
      fromTeamId: found.team.id,
      effectiveRating: effectiveRating(found.player, slot.pos),
    };
  });
}

function previewDraftTeam(picks: SquadPick[]): Team {
  const formation = getFormation("4-3-3")!;
  const filled = new Set(picks.map((pick) => pick.slotId));
  const openGroups = new Set(
    formation.slots
      .filter((slot) => !filled.has(slot.id))
      .map((slot) => groupOf(slot.pos)),
  );
  return (
    WC_DRAFT_TEAMS.find((team) =>
      team.players.some((player) =>
        playerPositions(player).some((pos) => openGroups.has(groupOf(pos))),
      ),
    ) ?? WC_DRAFT_TEAMS[0]
  );
}

function previewGroupRows(groupTeams: Team[]): CupGroupRow[] {
  return [
    {
      id: "you",
      name: "Seu time",
      played: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      gf: 4,
      ga: 2,
      points: 4,
    },
    {
      ...groupRow(groupTeams[0]),
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      gf: 3,
      ga: 3,
      points: 3,
    },
    {
      ...groupRow(groupTeams[1]),
      played: 2,
      wins: 0,
      draws: 2,
      losses: 0,
      gf: 2,
      ga: 2,
      points: 2,
    },
    {
      ...groupRow(groupTeams[2]),
      played: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      gf: 1,
      ga: 3,
      points: 1,
    },
  ];
}

function previewCampaignState(kind: Extract<DevPreviewKind, "cup-setup" | "cup-draft" | "cup-prematch">): CampaignState {
  const picks = kind === "cup-draft" ? previewCampaignPicks(7) : previewCampaignPicks();
  const groupTeams = [0, 1, 2].map((round) => wcOpponentTeam(round, previewRng(round)));
  const knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, previewRng(round)),
  );
  const groupTable = previewGroupRows(groupTeams);

  return {
    phase:
      kind === "cup-setup"
        ? "setup"
        : kind === "cup-draft"
          ? "draft"
          : "preMatch",
    mode: "normal",
    runId: "cup:preview",
    formationId: "4-3-3",
    mentality: "pressao",
    attackFocus: "meio",
    round: kind === "cup-prematch" ? 2 : 0,
    picks: kind === "cup-setup" ? [] : picks,
    currentTeam: kind === "cup-draft" ? previewDraftTeam(picks) : null,
    usedTeamIds: picks.map((pick) => pick.fromTeamId),
    selectedPlayer: null,
    selectedPickSlotId: null,
    currentOpp: kind === "cup-prematch" ? groupTeams[2] : null,
    lastResult: null,
    rerollsRemaining: 4,
    campaignGoals: { Ronaldo: 3, Messi: 2, Zidane: 1 },
    campaignAssists: { Messi: 3, Xavi: 2 },
    groupTeams,
    groupTable,
    groupQualified: null,
    groupQualifiedLabel: null,
    knockoutPath,
  };
}

function previewHalftimeOptions(): HalftimeOptions {
  return {
    formations: FORMATIONS.map((f) => ({ id: f.id, name: f.name })),
    mentalities: MENTALITIES.map((m) => ({ id: m.id, name: m.name })),
    focuses: ATTACK_FOCUS_OPTIONS.map((f) => ({ id: f.id, name: f.name })),
  };
}

function noopHalftimeCallbacks(): HalftimeCallbacks {
  return {
    onFormationChange: () => {},
    onMentalityChange: () => {},
    onFocusChange: () => {},
    onSlotClick: () => {},
    onReserveClick: () => {},
    onContinue: () => {},
    onBackgroundClick: () => {},
  };
}

function renderPenaltyModalPreview() {
  L.campaign = null;
  liveStore.reset();
  halftimeStore.reset();
  liveStore.setScore(2, 2);
  liveStore.setMinute(90);
  liveStore.setHalfLabel("Pênaltis");
  liveStore.setBall({ left: 86, top: 50, transitionMs: 700 });
  liveStore.addGoal("you", 18, "Ronaldo", "Zidane");
  liveStore.addGoal("opp", 42, "Maradona", null);
  liveStore.addGoal("you", 71, "Messi", "Xavi");
  liveStore.addGoal("opp", 88, "Kempes", "Burruchaga");
  liveStore.prependFeed({
    minute: 90,
    type: "penalty",
    text: "Disputa empatada. Messi caminha para a cobrança decisiva.",
    pos: "88-34",
  });
  liveStore.prependFeed({
    minute: 90,
    type: "fulltime",
    text: "Fim do tempo normal: 2 x 2. A semifinal vai para os pênaltis.",
    pos: null,
  });
  liveStore.openShootout();
  const kicks: Array<["you" | "opp", string, boolean]> = [
    ["you", "Ronaldo", true],
    ["opp", "Maradona", true],
    ["you", "Ronaldinho", false],
    ["opp", "Batistuta", false],
    ["you", "Zidane", true],
    ["opp", "Kempes", true],
    ["you", "Xavi", true],
    ["opp", "Burruchaga", true],
    ["you", "Cafu", true],
    ["opp", "Passarella", true],
  ];
  for (const [side, taker, scored] of kicks) {
    const id = liveStore.appendKick(side, taker);
    liveStore.resolveKick(side, id, scored);
  }
  liveStore.setSuddenDeath();
  liveStore.appendKick("you", "Messi");

  renderReact(
    createElement(CampaignMatchShell, {
      ladderLabel: "Semifinal",
      oppName: "Argentina 1986",
      oppFlagName: "Argentina",
      oppInitials: "AR",
      speedOptions: [1, 1.5, 2],
      activeSpeed: 1,
      showPause: true,
      onSpeedChange: setMatchSpeed,
      onTogglePause: (paused) => liveStore.setPaused(paused),
      onSkip: () => {},
    }),
  );
}

function renderSubstitutionModalPreview() {
  L.campaign = null;
  liveStore.reset();
  halftimeStore.reset();
  liveStore.setScore(1, 1);
  liveStore.setMinute(45);
  liveStore.setHalfLabel("Intervalo");
  liveStore.setBall({ left: 50, top: 50, transitionMs: 700 });
  liveStore.addGoal("you", 24, "Ronaldo", "Messi");
  liveStore.addGoal("opp", 39, "Cruyff", "Neeskens");
  liveStore.prependFeed({
    minute: 45,
    type: "halftime",
    text: "Intervalo: hora de ajustar formação, foco e substituições.",
    pos: null,
  });
  liveStore.prependFeed({
    minute: 39,
    type: "goal",
    text: "Gol da Holanda 1974. Cruyff empata antes do intervalo.",
    pos: "92-34",
  });

  const formation = getFormation("4-3-3")!;
  const picks = previewCampaignPicks();
  const selectedSlotId = formation.slots[8]?.id ?? formation.slots[0].id;
  const pitchSlots = buildPitchSlots(formation, picks, {
    showPos: true,
    selectedSubId: selectedSlotId,
  });
  halftimeStore.set({
    open: true,
    formationId: "4-3-3",
    mentality: "pressao",
    attackFocus: "meio",
    subStatus:
      "Messi selecionado. Clique em outro jogador para trocar de posição, ou escolha um reserva.",
    subCountLabel: "Substituições 2/5 · Prontos 0/2",
    continueLabel: "Voltar para o jogo",
    continueDisabled: false,
    continueDone: false,
    controlsDisabled: false,
    locked: false,
    hideRatings: false,
    focusBanner: {
      kind: "good",
      text: "Foco encaixado: seu elenco rende melhor pelo meio. Lados 88 · Meio 92 · OVR 91.",
    },
    pitchSlots,
    reserves: [
      {
        name: "Cristiano Ronaldo",
        posGroup: "att",
        posText: "PE/CA",
        rating: 92,
        teamLabel: "Portugal 2016",
        selected: false,
        disabled: false,
      },
      {
        name: "Iniesta",
        posGroup: "mid",
        posText: "MC/MEI",
        rating: 91,
        teamLabel: "Espanha 2010",
        selected: true,
        disabled: false,
      },
      {
        name: "Maldini",
        posGroup: "def",
        posText: "LE/ZAG",
        rating: 90,
        teamLabel: "Itália 2006",
        selected: false,
        disabled: false,
      },
      {
        name: "Neuer",
        posGroup: "gk",
        posText: "GOL",
        rating: 89,
        teamLabel: "Alemanha 2014",
        selected: false,
        disabled: true,
      },
      {
        name: "Kaká",
        posGroup: "mid",
        posText: "MEI",
        rating: 88,
        teamLabel: "Brasil 2002",
        selected: false,
        disabled: false,
      },
    ],
  });

  renderReact(
    createElement(LiveMatchShell, {
      youInitials: "VC",
      opponentInitials: "HO",
      youName: "Seu time",
      opponentName: "Holanda 1974",
      speedOptions: [1, 1.5, 2],
      activeSpeed: 1,
      vsAI: true,
      showPause: true,
      halftimeOptions: previewHalftimeOptions(),
      halftimeCallbacks: noopHalftimeCallbacks(),
      onSpeedChange: setMatchSpeed,
      onTogglePause: (paused) => liveStore.setPaused(paused),
      onSkip: () => {},
    }),
  );
}

function renderDevPreview(kind: DevPreviewKind) {
  L.state = null;
  L.youId = null;
  L.playing = false;
  L.accountScreen = null;
  lastCampaignPhase = null;

  if (kind === "penalty-modal") {
    renderPenaltyModalPreview();
    return;
  }
  if (kind === "substitution-modal") {
    renderSubstitutionModalPreview();
    return;
  }

  if (kind === "cup-victory") {
    L.campaign = null;
    renderCampaignEndPreview("victory");
    return;
  }
  if (kind === "cup-gameover") {
    L.campaign = null;
    renderCampaignEndPreview("gameover");
    return;
  }

  L.campaign = previewCampaignState(kind);
  if (kind === "cup-draft" && L.campaign.currentTeam) {
    L.campaign.selectedPlayer = [...campaignSelectable()][0] ?? null;
  }
  renderCampaign();
}

function renderCampaignEndPreview(kind: CampaignEndPreviewKind) {
  if (kind === "victory") {
    renderReact(
      createElement(CampaignVictory, {
        groupLabel: "líder do grupo",
        journeyLeaders: previewJourneyLeaders(),
        squadRows: previewSquadRows(),
        bracket: previewBracket(),
        progressRound: 8,
        onRetry: () => {
          location.hash = "";
          startCampaign();
        },
        onHome: () => {
          location.hash = "";
          goHome();
        },
      }),
    );
    return;
  }

  renderReact(
    createElement(CampaignGameOver, {
      title: "Eliminado na semifinal",
      detail: "Resultado contra Argentina 1986: 2 x 3 (derrota).",
      youGoals: 2,
      oppGoals: 3,
      oppName: "Argentina 1986",
      penaltyLabel: null,
      journeyLeaders: previewJourneyLeaders(),
      squadRows: previewSquadRows(),
      status: { kind: "knockout", bracket: previewBracket() },
      progressRound: 6,
      onRetry: () => {
        location.hash = "";
        startCampaign();
      },
      onHome: () => {
        location.hash = "";
        goHome();
      },
    }),
  );
}

// ---------------- Lobby / Setup ----------------

function renderLobby() {
  const s = L.state!;
  const you = me();
  const opp = opponent();
  const vsAI = s.players.some((p) => p.isAI);
  const formation = getFormation(L.formationId)!;

  renderReact(
    createElement(Lobby, {
      code: s.code,
      mode: s.mode,
      vsAI,
      you,
      opponent: opp,
      formation,
      formationId: L.formationId,
      mentality: L.mentality,
      attackFocus: L.attackFocus,
      pitchSlots: buildPitchSlots(formation, [], { showPos: true }),
      onCopyCode: () => {
        navigator.clipboard?.writeText(s.code);
        showToast("Código copiado!");
      },
      onLeave: goHome,
      onFormationChange: (formationId: string) => {
        L.formationId = formationId;
        sendSetup(L.formationId, L.mentality, L.attackFocus);
        render();
      },
      onMentalityChange: (mentality: Mentality) => {
        L.mentality = mentality;
        sendSetup(L.formationId, L.mentality, L.attackFocus);
        render();
      },
      onAttackFocusChange: (focus: AttackFocus) => {
        L.attackFocus = focus;
        sendSetup(L.formationId, L.mentality, L.attackFocus);
        render();
      },
      onReady: () => {
        sendSetup(L.formationId, L.mentality, L.attackFocus);
        sendReady();
      },
    }),
  );
}

// ---------------- Draft ----------------

function renderDraft() {
  const s = L.state!;
  const you = me()!;
  const opp = opponent();
  const yourTurn = s.activePlayerId === L.youId;
  const vsAI = s.players.some((p) => p.isAI);
  const team = s.currentTeam;
  const yourForm = getFormation(you.formationId!)!;
  renderReact(
    createElement(Draft, {
      state: s,
      you,
      opponent: opp,
      team,
      yourTurn,
      vsAI,
      selectedPlayer: L.selectedPlayer,
      youPitchSlots: buildPitchSlots(yourForm, you.picks, { showPos: true }),
      opponentPitchSlots:
        opp && opp.formationId
          ? buildPitchSlots(getFormation(opp.formationId)!, opp.picks, { showPos: true })
          : null,
      youStrength: teamStrengthData(you),
      opponentStrength: teamStrengthData(opp),
      attackFocusBanner: attackFocusBannerSpec(
        you.picks,
        you.attackFocus ?? L.attackFocus,
      ),
      playerPosText,
      onLeave: goHome,
      onReroll: () => {
        L.selectedPlayer = null;
        sendRerollTeam();
      },
      onSelectPlayer: (name: string) => {
        L.selectedPlayer = name;
        render();
      },
      onPickSlot: (slotId: string) => {
        if (!L.selectedPlayer) return;
        sendPick(slotId, L.selectedPlayer);
        L.selectedPlayer = null;
      },
    }),
  );
}

// ---------------- Pre-Match (classic) ----------------

function picksOvr(p: PlayerPublic | undefined): number {
  if (!p || !p.picks.length) return 0;
  return Math.round(
    p.picks.reduce((sum, pk) => sum + pk.effectiveRating, 0) / p.picks.length,
  );
}

function renderPreMatchClassic() {
  const s = L.state!;
  const you = me()!;
  const opp = opponent();
  const youOvr = picksOvr(you);
  if (you.picks.length >= 11) {
    const formationId = you.formationId ?? L.formationId;
    const strength = computeStrength(you.picks, formationId);
    awardDraftAchievements(
      you.picks,
      formationId,
      `draft:${s.code}:${you.id}:${strength.overall}-${strength.attack}-${strength.midfield}-${strength.defense}`,
    );
  }
  const vsAI = s.players.some((p) => p.isAI);
  const hideRatings = s.mode === "hardcore";
  // dicas táticas (encaixe do foco) — ocultas no modo Hardcore
  const banners: BannerSpec[] = [];
  if (hideRatings) {
    banners.push({ kind: "hardcore", text: "Modo Hardcore: ratings ocultos." });
  } else {
    const focusSpec = attackFocusBannerSpec(you.picks, L.attackFocus);
    if (focusSpec) banners.push(focusSpec);
  }
  // sync any pending tactic tweak to the server before user clicks Continuar
  const sync = () => sendSetup(L.formationId, L.mentality, L.attackFocus);
  renderReact(
    createElement(PreMatchClassic, {
      code: s.code,
      mode: s.mode,
      vsAI,
      you,
      opponent: opp,
      youOvrText: hideRatings ? "OVR ??" : `OVR ${youOvr}`,
      oppOvrText: hideRatings ? "OVR ??" : `OVR ${picksOvr(opp)}`,
      youMentalityLabel: mentalityLabel(L.mentality),
      youFocusLabel: attackFocusLabel(L.attackFocus),
      oppMentalityLabel: opp?.mentality
        ? mentalityLabel(opp.mentality)
        : "—",
      oppFocusLabel: attackFocusLabel(opp?.attackFocus),
      mentality: L.mentality,
      attackFocus: L.attackFocus,
      banners,
      onLeave: goHome,
      onSelectMentality: (m) => {
        L.mentality = m;
        sync();
        render();
      },
      onSelectFocus: (f) => {
        L.attackFocus = f;
        sync();
        render();
      },
      onContinue: () => {
        sync();
        sendPreMatchReady();
      },
    }),
  );
}

function teamStrengthData(p: PlayerPublic | undefined): TeamStrengthData {
  if (!p) return { state: "none" };
  if (L.state?.hideRatings) return { state: "hidden" };
  if (!p.picks.length || !p.formationId) return { state: "none" };
  const s = computeStrength(p.picks, p.formationId);
  return {
    state: "ok",
    overall: s.overall,
    attack: s.attack,
    midfield: s.midfield,
    defense: s.defense,
  };
}

// ---------------- Pitch ----------------

interface BuildPitchOpts {
  /** Overrides global hardcore detection (e.g. ignore in result screen). */
  forceHideRatings?: boolean;
  /** Always show ratings even in hardcore mode (e.g. end-of-game reveal). */
  forceShowRatings?: boolean;
  /** Show position tag chip above the dot. */
  showPos?: boolean;
  /** Open-slot ids (highlights empty slots for selection). */
  openSlotIds?: Set<string>;
  /** Currently-selected sub source slot id. */
  selectedSubId?: string | null;
}

function buildPitchSlots(
  formation: ReturnType<typeof getFormation> & {},
  picks: PlayerPublic["picks"],
  opts: BuildPitchOpts = {},
): PitchSlot[] {
  const bySlot = new Map(picks.map((p) => [p.slotId, p]));
  const hideGlobal = !!L.state?.hideRatings || L.campaign?.mode === "hardcore";
  const hideRating =
    opts.forceShowRatings ? false : opts.forceHideRatings ?? hideGlobal;
  return formation.slots.map((slot) => {
    const pick = bySlot.get(slot.id);
    const filled = !!pick;
    return {
      id: slot.id,
      pos: slot.pos,
      x: slot.x,
      y: slot.y,
      label: filled ? lastName(pick!.player.name) : posLabel(slot.pos),
      filled,
      rating: pick?.effectiveRating,
      penalty:
        !!pick && pick.effectiveRating < pick.player.rating,
      hideRating,
      showPos: opts.showPos,
      open: !filled && opts.openSlotIds?.has(slot.id),
      selectedSub: filled && opts.selectedSubId === slot.id,
    };
  });
}

function reassignPicksToFormation(player: PlayerPublic, formationId: string) {
  const formation = getFormation(formationId);
  if (!formation || player.picks.length !== formation.slots.length) return null;

  const before =
    player.picks.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, player.picks.length);
  const remaining = [...player.picks];
  const next = formation.slots.map((slot) => {
    let bestIdx = 0;
    let bestRating = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const rating = effectiveRating(remaining[i].player, slot.pos);
      if (rating > bestRating) {
        bestRating = rating;
        bestIdx = i;
      }
    }
    const [pick] = remaining.splice(bestIdx, 1);
    return {
      ...pick,
      slotId: slot.id,
      effectiveRating: effectiveRating(pick.player, slot.pos),
    };
  });
  player.formationId = formationId;
  player.picks = next;
  const after =
    next.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, next.length);
  return Math.round((after - before) * 10) / 10;
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildIntervalBench(
  player: PlayerPublic,
): Array<Player & { fromTeamId: string }> {
  const pickedNames = new Set(player.picks.map((pick) => pick.player.name));
  const byName = new Map<string, Player & { fromTeamId: string }>();
  for (const pick of player.picks) {
    const team = getTeam(pick.fromTeamId);
    for (const reserve of team?.bench ?? []) {
      if (pickedNames.has(reserve.name)) continue;
      byName.set(`${pick.fromTeamId}:${reserve.name}`, {
        ...reserve,
        fromTeamId: pick.fromTeamId,
      });
    }
  }
  return shuffled([...byName.values()]).slice(0, 12);
}

function applyIntervalSubstitution(
  player: PlayerPublic,
  outSlotId: string,
  reserveName: string,
  bench = L.intervalBench ?? [],
) {
  const reserve = bench.find((p) => p.name === reserveName);
  const pickIdx = player.picks.findIndex((pick) => pick.slotId === outSlotId);
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const slot = formation?.slots.find((s) => s.id === outSlotId);
  if (!reserve || pickIdx < 0 || !slot) return null;

  const outgoing = player.picks[pickIdx];
  const nextRating = effectiveRating(reserve, slot.pos);
  player.picks[pickIdx] = {
    ...outgoing,
    player: reserve,
    fromTeamId: reserve.fromTeamId,
    effectiveRating: nextRating,
  };
  if (bench === L.intervalBench) {
    L.intervalBench =
      L.intervalBench?.filter((p) => p.name !== reserve.name) ?? null;
  }
  return {
    out: outgoing.player.name,
    in: reserve.name,
    delta: nextRating - outgoing.effectiveRating,
  };
}

function swapLineupSlots(player: PlayerPublic, slotA: string, slotB: string) {
  if (slotA === slotB) return null;
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const pickA = player.picks.find((pick) => pick.slotId === slotA);
  const pickB = player.picks.find((pick) => pick.slotId === slotB);
  const formationSlotA = formation?.slots.find((slot) => slot.id === slotA);
  const formationSlotB = formation?.slots.find((slot) => slot.id === slotB);
  if (!pickA || !pickB || !formationSlotA || !formationSlotB) return null;

  const oldTotal = pickA.effectiveRating + pickB.effectiveRating;
  const nextA = {
    ...pickB,
    slotId: slotA,
    effectiveRating: effectiveRating(pickB.player, formationSlotA.pos),
  };
  const nextB = {
    ...pickA,
    slotId: slotB,
    effectiveRating: effectiveRating(pickA.player, formationSlotB.pos),
  };
  player.picks = player.picks.map((pick) =>
    pick.slotId === slotA ? nextA : pick.slotId === slotB ? nextB : pick,
  );
  const delta = nextA.effectiveRating + nextB.effectiveRating - oldTotal;
  return {
    a: pickA.player.name,
    b: pickB.player.name,
    delta,
  };
}

function lastName(full: string): string {
  const parts = full.split(" ");
  return parts.length > 1 && parts[parts.length - 1].length > 2
    ? parts[parts.length - 1]
    : full;
}

// ---------------- Result ----------------

// dispatcher: play the live match, then show the summary
function renderResult() {
  if (!L.matchPlayed) {
    renderLiveMatch();
  } else {
    renderSummary();
  }
}

// ---------------- Live match (animated simulation) ----------------

const TICK_BASE_MS = 130; // ms per match "minute" at 1x

function renderLiveMatch() {
  const s = L.state!;
  let r = s.result!;
  const you = me()!;
  const opp = opponent()!;
  const vsAI = s.players.some((p) => p.isAI);
  const speedFactor = () => (vsAI ? L.matchSpeed : 1);
  L.intervalBench ??= buildIntervalBench(you);
  L.playing = true;

  // map home/away side -> you/opponent
  const sideToPid = (side: "home" | "away" | null) =>
    side === "home" ? r.homeId : side === "away" ? r.awayId : "";

  const liveSkipRef: { current: (() => void) | null } = { current: null };
  // current halftime selection (kept locally; written to halftimeStore each refresh)
  let halfFormValue = you.formationId ?? L.formationId;
  let halfMentValue = (you.mentality ?? L.mentality) as Mentality;
  let halfFocusValue = (you.attackFocus ?? L.attackFocus) as AttackFocus;
  liveStore.reset();
  halftimeStore.reset();

  const halftimeOptions: HalftimeOptions = {
    formations: FORMATIONS.map((f) => ({ id: f.id, name: f.name })),
    mentalities: MENTALITIES.map((m) => ({ id: m.id, name: m.name })),
    focuses: ATTACK_FOCUS_OPTIONS.map((f) => ({ id: f.id, name: f.name })),
  };
  const halftimeCallbacks: HalftimeCallbacks = {
    onFormationChange: (id) => onHalfFormationChange(id),
    onMentalityChange: (id) => {
      halfMentValue = id as Mentality;
      halftimeStore.set({ mentality: id });
      syncHalftimeReadyUi();
    },
    onFocusChange: (id) => onHalfFocusChange(id as AttackFocus),
    onSlotClick: (slotId) => onHalfPitchSlotClick(slotId),
    onReserveClick: (name) => onReserveClick(name),
    onContinue: () => onHalfContinue(),
    onBackgroundClick: () => {
      if (!L.selectedSubOut && !L.selectedSubIn) return;
      L.selectedSubOut = null;
      L.selectedSubIn = null;
      refreshHalftimeSquad(
        "Seleção cancelada. Clique em um jogador para trocar de posição ou escolher um reserva.",
      );
    },
  };

  renderReact(
    createElement(LiveMatchShell, {
      youInitials: initials(you.name),
      opponentInitials: initials(opp.name),
      youName: you.name,
      opponentName: opp.name,
      speedOptions: vsAI ? [1, 1.5, 2] : [1],
      activeSpeed: speedFactor(),
      vsAI,
      // pause makes sense only against the machine — never in real-time PvP
      showPause: vsAI,
      halftimeOptions,
      halftimeCallbacks,
      onSpeedChange: setMatchSpeed,
      onTogglePause: (p) => setPaused(p),
      onSkip: () => liveSkipRef.current?.(),
    }),
  );


  // engine coords have "home" attacking toward bx=105; rotate 180° if you are the
  // away player so YOUR team always attacks to the right on screen.
  const youAreAway = r.awayId === you.id;
  const displayCoord = (ev: MatchEvent) => {
    let bx = ev.bx ?? 53;
    let by = ev.by ?? 34;
    if (youAreAway) {
      bx = 106 - bx;
      by = 69 - by;
    }
    return { bx, by };
  };
  function moveBall(ev: MatchEvent, durationMs: number) {
    if (ev.bx === undefined) return;
    const { bx, by } = displayCoord(ev);
    liveStore.setBall({
      transitionMs: Math.max(180, Math.min(1300, durationMs * 0.85)),
      left: ((bx - 0.5) / 105) * 100,
      top: ((by - 0.5) / 68) * 100,
      goal: ev.type === "goal",
    });
  }

  const goals: Record<string, number> = { [you.id]: 0, [opp.id]: 0 };
  let minute = 0;
  let evIdx = 0;
  let timer: number | undefined;
  let hideTimer: number | undefined;

  function updateScore() {
    liveStore.setScore(goals[you.id], goals[opp.id]);
  }

  function addFeed(ev: MatchEvent) {
    const cardKind = ev.type === "card" ? (ev.card === "red" ? "red" : "yellow") : undefined;
    let pos: string | null = null;
    if (ev.bx !== undefined) {
      const { bx, by } = displayCoord(ev);
      pos = `${bx}-${by}`;
    }
    liveStore.prependFeed({
      type: ev.type,
      minute: ev.minute,
      text: ev.text,
      pos,
      cardKind,
    });
  }

  function buildReserves(): import("./lib/liveStore.js").HalftimeReserveItem[] {
    const ready = !!you.halftimeReady;
    return (L.intervalBench ?? []).map((p) => {
      const team = getTeam(p.fromTeamId);
      return {
        name: p.name,
        posGroup: groupOf(p.pos).toLowerCase(),
        posText: playerPosText(p),
        rating: s.hideRatings ? 0 : p.rating,
        teamLabel: team ? `${team.name} ${team.season}` : "Reserva",
        selected: L.selectedSubIn === p.name,
        disabled: ready || L.intervalSubCount >= 5,
      };
    });
  }

  function onReserveClick(name: string) {
    if (you.halftimeReady) return;
    if (L.intervalSubCount >= 5) return;
    L.selectedSubIn = name;
    if (!L.selectedSubOut || !L.selectedSubIn) {
      refreshHalftimeSquad("Agora clique em um jogador no campo para definir quem sai.");
      return;
    }
    const result = applyIntervalSubstitution(you, L.selectedSubOut, L.selectedSubIn);
    if (!result) return;
    L.intervalSubCount++;
    L.selectedSubOut = null;
    L.selectedSubIn = null;
    refreshHalftimeSquad(
      `Sai ${result.out}, entra ${result.in} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe).`,
    );
  }

  function onHalfPitchSlotClick(slotId: string) {
    if (you.halftimeReady) return;
    if (L.selectedSubOut && slotId && !L.selectedSubIn) {
      const result = swapLineupSlots(you, L.selectedSubOut, slotId);
      L.selectedSubOut = null;
      if (result) {
        refreshHalftimeSquad(
          `Troca de posição: ${result.a} e ${result.b} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe combinado).`,
        );
        return;
      }
    }
    if (L.intervalSubCount >= 5) return;
    L.selectedSubOut = slotId;
    if (L.selectedSubOut && L.selectedSubIn) {
      const result = applyIntervalSubstitution(you, L.selectedSubOut, L.selectedSubIn);
      if (!result) return;
      L.intervalSubCount++;
      L.selectedSubOut = null;
      L.selectedSubIn = null;
      refreshHalftimeSquad(
        `Sai ${result.out}, entra ${result.in} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe).`,
      );
      return;
    }
    const pick = you.picks.find((p) => p.slotId === L.selectedSubOut);
    if (pick) {
      const f = getFormation(you.formationId ?? L.formationId);
      const slotPos = f?.slots.find((sl) => sl.id === L.selectedSubOut)?.pos;
      const posInfo =
        slotPos && !playerPositions(pick.player).includes(slotPos)
          ? `${posLabel(slotPos)}, natural ${playerPosText(pick.player)}`
          : slotPos
            ? posLabel(slotPos)
            : playerPosText(pick.player);
      refreshHalftimeSquad(
        `${pick.player.name} (${posInfo}) selecionado. Clique em outro jogador para trocar de posição, ou escolha um reserva.`,
      );
    } else {
      refreshHalftimeSquad("Escolha um reserva.");
    }
  }

  function refreshHalftimeSquad(status?: string) {
    const formation = getFormation(you.formationId ?? L.formationId)!;
    const banner = attackFocusBannerSpec(you.picks, halfFocusValue);
    const pitchSlots = buildPitchSlots(formation, you.picks, {
      showPos: true,
      selectedSubId: L.selectedSubOut,
    });
    halftimeStore.set({
      pitchSlots,
      focusBanner: banner,
      reserves: buildReserves(),
      subStatus:
        status ??
        (L.intervalSubCount >= 5
          ? "Limite de 5 substituições usado."
          : "Clique em um jogador no campo e depois escolha um reserva."),
      formationId: halfFormValue,
      mentality: halfMentValue,
      attackFocus: halfFocusValue,
    });
  }

  function goalAnim(scorer: string | undefined) {
    liveStore.showGoal(scorer ?? "");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => liveStore.hideGoal(), 950);
  }

  function cardAnim(ev: MatchEvent) {
    const kind = ev.card === "red" ? "red" : "yellow";
    liveStore.showCard(kind, `${kind === "red" ? "Vermelho" : "Amarelo"}${ev.player ? `: ${ev.player}` : ""}`);
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => liveStore.hideCard(), 950);
  }

  function isGoalSetupEvent(ev: MatchEvent, nextEv: MatchEvent | undefined) {
    return (
      (ev.type === "info" || ev.type === "chance") &&
      nextEv?.type === "goal" &&
      nextEv.minute <= ev.minute + 1
    );
  }

  function eventDelay(ev: MatchEvent, isGoalSetup: boolean): number {
    if (isGoalSetup) return 2100;
    switch (ev.type) {
      case "goal":
        return 1950;
      case "chance":
      case "save":
      case "corner":
      case "var":
        return 1100;
      case "card":
        return 880;
      case "foul":
      case "offside":
      case "injury":
        return 820;
      case "info":
        return 780;
      case "possession":
        return 340;
      case "halftime":
      case "fulltime":
        return 650;
      default:
        return 680;
    }
  }

  function processEvent(ev: MatchEvent): number | null {
    const nextEv = r.timeline[evIdx];
    const isGoalSetup = isGoalSetupEvent(ev, nextEv);
    moveBall(ev, eventDelay(ev, isGoalSetup));

    if (ev.type === "goal") {
      const pid = sideToPid(ev.side);
      addFeed(ev);
      if (pid) {
        goals[pid]++;
        const side = pid === you.id ? "you" : "opp";
        liveStore.addGoal(side, Math.min(ev.minute, 90), ev.player ?? "?", ev.assist ?? null);
      }
      updateScore();
      goalAnim(ev.player);
    } else if (ev.type === "card") {
      addFeed(ev);
      cardAnim(ev);
    } else if (ev.type === "halftime" && !L.halftimeAdjusted) {
      addFeed(ev);
      showHalftimePanel();
      return null;
    } else {
      addFeed(ev);
    }

    return eventDelay(ev, isGoalSetup);
  }

  function tick() {
    if (!L.playing) return;

    if (evIdx < r.timeline.length && r.timeline[evIdx].minute <= minute) {
      const ev = r.timeline[evIdx++];
      const delay = processEvent(ev);
      if (delay === null) return;
      schedule(delay / speedFactor());
      return;
    }

    if (minute >= 90) {
      if (r.shootout && r.shootout.length) {
        schedule(1200, playShootout);
      } else {
        schedule(1200, finish);
      }
      return;
    }

    minute++;
    liveStore.setMinute(minute);
    liveStore.setHalfLabel(minute <= 45 ? "1º Tempo" : "2º Tempo");
    schedule(TICK_BASE_MS / speedFactor());
  }

  // penalty shootout revealed kick by kick (dramatic fixed pace, not feed-skippable speed)
  function playShootout() {
    liveStore.setHalfLabel("Pênaltis");
    const kicks = r.shootout!;
    const pen: Record<string, number> = { [you.id]: 0, [opp.id]: 0 };
    let i = 0;
    const next = () => {
      if (!L.playing) return;
      if (i >= kicks.length) {
        schedule(1400, finish);
        return;
      }
      if (i === 10) {
        addFeed({
          minute: 90,
          type: "info",
          side: null,
          text: "Morte súbita: cada cobrança decide.",
        });
      }
      const k = kicks[i++];
      const pid = k.side === "home" ? r.homeId : r.awayId;
      if (k.scored) pen[pid]++;
      const who = pid === you.id ? you.name : opp.name;
      addFeed({
        minute: 90,
        type: "penalty",
        side: k.side,
        text: `Pênalti de ${k.taker} (${who}): ${k.scored ? "no gol!" : "defendido!"}`,
      });
      liveStore.setPenaltyLabel(`Pênaltis ${pen[you.id]} - ${pen[opp.id]}`);
      schedule(1400, next);
    };
    next();
  }

  let paused = false;
  let pendingFn: (() => void) | null = null;
  function schedule(delay: number, fn: () => void = tick) {
    clearTimeout(timer);
    pendingFn = fn;
    if (paused) return;
    timer = window.setTimeout(() => {
      pendingFn = null;
      fn();
    }, delay);
  }
  function setPaused(p: boolean) {
    paused = p;
    liveStore.setPaused(p);
    if (p) {
      clearTimeout(timer);
    } else if (pendingFn) {
      schedule(120, pendingFn);
    }
  }

  let halftimeResumeStarted = false;

  function onHalfFormationChange(id: string) {
    if (you.halftimeReady) return;
    const ratingSwing = reassignPicksToFormation(you, id);
    L.formationId = id;
    you.formationId = id;
    halfFormValue = id;
    L.selectedSubOut = null;
    const impact =
      ratingSwing === null
        ? "Formação atualizada."
        : ratingSwing > 0
          ? `Formação atualizada. Encaixe melhorou +${ratingSwing.toFixed(1)}.`
          : ratingSwing < 0
            ? `Formação atualizada. Encaixe caiu ${ratingSwing.toFixed(1)} por jogadores fora de posição.`
            : "Formação atualizada. Encaixe manteve o mesmo over efetivo.";
    refreshHalftimeSquad(impact);
    syncHalftimeReadyUi();
  }

  function onHalfFocusChange(focus: AttackFocus) {
    if (you.halftimeReady) return;
    halfFocusValue = focus;
    L.attackFocus = focus;
    you.attackFocus = focus;
    refreshHalftimeSquad("Foco de ataque atualizado.");
    syncHalftimeReadyUi();
  }

  function onHalfContinue() {
    if (you.halftimeReady) return;
    L.formationId = halfFormValue;
    L.mentality = halfMentValue;
    L.attackFocus = halfFocusValue;
    you.formationId = L.formationId;
    you.mentality = L.mentality;
    you.attackFocus = L.attackFocus;
    you.halftimeReady = true;
    const current = me();
    if (current) {
      current.halftimeReady = true;
      current.formationId = L.formationId;
      current.mentality = L.mentality;
      current.attackFocus = L.attackFocus;
    }
    sendHalftimeReady({
      formationId: L.formationId,
      mentality: L.mentality,
      attackFocus: L.attackFocus,
      picks: you.picks.map((pk) => ({
        slotId: pk.slotId,
        name: pk.player.name,
        pos: pk.player.pos,
        rating: pk.player.rating,
        pac: pk.player.pac,
        sho: pk.player.sho,
        pas: pk.player.pas,
        dri: pk.player.dri,
        def: pk.player.def,
        phy: pk.player.phy,
        fromTeamId: pk.fromTeamId,
      })),
    });
    syncHalftimeReadyUi();
  }

  function preserveLocalHalftimeChanges() {
    if (!L.state) return;
    L.state.players = L.state.players.map((p) => {
      if (p.id === you.id) return { ...you, halftimeReady: p.halftimeReady };
      if (opp.isAI && p.id === opp.id) {
        return { ...opp, halftimeReady: p.halftimeReady };
      }
      return p;
    });
  }

  const halftimeReadyCount = () =>
    L.state?.players.filter((p) => p.halftimeReady || p.isAI).length ?? 0;

  const allHalftimeReady = () =>
    !!L.state?.players.length &&
    L.state.players.every((p) => p.halftimeReady || p.isAI);

  function continueFromHalftime() {
    if (halftimeResumeStarted) return;
    halftimeResumeStarted = true;
    syncLiveUi = null;
    halftimeStore.close();
    if (L.state?.result) r = L.state.result;
    const formationName =
      FORMATIONS.find((f) => f.id === halfFormValue)?.name ?? halfFormValue;
    const mentalityName =
      MENTALITIES.find((m) => m.id === halfMentValue)?.name ?? halfMentValue;
    addFeed({
      minute: 46,
      type: "info",
      side: null,
      text: `Início do segundo tempo: ${formationName}, estilo ${mentalityName} e ${L.intervalSubCount}/5 substituições.`,
    });
    schedule(800);
  }

  function syncHalftimeReadyUi() {
    preserveLocalHalftimeChanges();
    const current = me();
    const ready = !!current?.halftimeReady;
    const readyCount = halftimeReadyCount();
    const total = L.state?.players.length ?? 2;
    const subCountLabel = ready
      ? `Prontos ${readyCount}/${total}`
      : `Substituições ${L.intervalSubCount}/5 · Prontos ${readyCount}/${total}`;
    const secondHalfReady = !!L.state?.result?.secondHalfReady;
    const continueLabel = allHalftimeReady()
      ? secondHalfReady
        ? "Voltando..."
        : "Preparando 2º tempo..."
      : ready
        ? "Aguardando adversário..."
        : "Voltar para o jogo";
    halftimeStore.set({
      subCountLabel,
      continueLabel,
      continueDisabled: ready,
      continueDone: ready,
      controlsDisabled: ready,
      locked: ready,
      reserves: buildReserves(),
    });
    if (allHalftimeReady() && secondHalfReady) continueFromHalftime();
  }

  function showHalftimePanel() {
    L.halftimeAdjusted = true;
    halftimeStore.set({ open: true, hideRatings: s.hideRatings });
    refreshHalftimeSquad();
    syncLiveUi = syncHalftimeReadyUi;
    syncHalftimeReadyUi();
  }

  function finish() {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    syncLiveUi = null;
    halftimeStore.close();
    L.playing = false;
    L.matchPlayed = true;
    render();
  }

  liveSkipRef.current = finish;
  schedule(700);
}

interface Leader {
  name: string;
  val: string;
  side: "you" | "opp";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

// Derive match leaders (top scorer, top assist, man of the match) from the timeline.
function computeLeaders(r: MatchResult, youId: string) {
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  const sideOf = new Map<string, "you" | "opp">();
  const tag = (sd: "home" | "away" | null) =>
    (sd === "home" ? r.homeId : r.awayId) === youId ? "you" : "opp";

  for (const e of r.timeline) {
    if (e.type !== "goal") continue;
    if (e.player) {
      goals.set(e.player, (goals.get(e.player) ?? 0) + 1);
      sideOf.set(e.player, tag(e.side));
    }
    if (e.assist) {
      assists.set(e.assist, (assists.get(e.assist) ?? 0) + 1);
      sideOf.set(e.assist, tag(e.side));
    }
  }

  const top = (m: Map<string, number>, unit: string): Leader | null => {
    let best: [string, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best
      ? {
          name: best[0],
          val: `${best[1]} ${unit}${best[1] > 1 ? "s" : ""}`,
          side: sideOf.get(best[0])!,
        }
      : null;
  };

  const scorer = top(goals, "gol");
  const assist = top(assists, "assistência");

  // man of the match: top scorer on the winning side, else its best-rated player
  const winnerSide: "you" | "opp" = r.winnerId === youId ? "you" : "opp";
  let motm: Leader | null = null;
  let motmGoals = 0;
  for (const [name, n] of goals) {
    if (sideOf.get(name) !== winnerSide) continue;
    if (n > motmGoals) {
      motmGoals = n;
      motm = { name, val: `${n} gol${n > 1 ? "s" : ""}`, side: winnerSide };
    }
  }
  if (!motm) {
    const winner = L.state!.players.find((p) =>
      winnerSide === "you" ? p.id === youId : p.id !== youId,
    );
    const best = [...(winner?.picks ?? [])].sort(
      (a, b) => b.effectiveRating - a.effectiveRating,
    )[0];
    if (best)
      motm = {
        name: best.player.name,
        val: `${best.effectiveRating} de over`,
        side: winnerSide,
      };
  }

  return { scorer, assist, motm };
}

function awardRegularMatchAchievements() {
  const s = L.state;
  if (!s?.result || !L.youId) return;
  const r = s.result;
  if (!r.winnerId) return;
  const you = me();
  const opp = opponent();
  if (!you || !opp) return;
  const key = `match:${s.code}:${r.timeline.length}:${r.goals[you.id]}-${r.goals[opp.id]}:${r.winnerId}:${r.penaltyScore?.[you.id] ?? ""}-${r.penaltyScore?.[opp.id] ?? ""}`;
  const ids: string[] = [];
  const youWon = r.winnerId === you.id;
  const playerGoals = new Map<string, number>();
  const playerAssists = new Map<string, number>();
  let youHalfGoals = 0;
  let oppHalfGoals = 0;
  let youRedCard = false;
  for (const ev of r.timeline) {
    const pid =
      ev.side === "home" ? r.homeId : ev.side === "away" ? r.awayId : "";
    if (ev.type === "card" && ev.card === "red" && pid === you.id)
      youRedCard = true;
    if (ev.type !== "goal") continue;
    if (ev.minute <= 45) {
      if (pid === you.id) youHalfGoals++;
      else if (pid === opp.id) oppHalfGoals++;
    }
    if (pid !== you.id) continue;
    if (ev.player)
      playerGoals.set(ev.player, (playerGoals.get(ev.player) ?? 0) + 1);
    if (ev.assist)
      playerAssists.set(ev.assist, (playerAssists.get(ev.assist) ?? 0) + 1);
  }
  const yourGoals = r.goals[you.id] ?? 0;
  const oppGoals = r.goals[opp.id] ?? 0;
  if (yourGoals > 0) ids.push("first_goal");
  if (youWon) ids.push("first_win");
  if (youWon && oppGoals === 0) ids.push("clean_sheet");
  if (youWon && r.penaltyScore) ids.push("penalty_win");
  const totalAssists = [...playerAssists.values()].reduce((sum, n) => sum + n, 0);
  if ([...playerGoals.values()].some((n) => n >= 3)) ids.push("hat_trick");
  if (totalAssists >= 3) ids.push("assist_master");
  const avg = you.picks.length
    ? you.picks.reduce((sum, p) => sum + p.effectiveRating, 0) /
      you.picks.length
    : 0;
  if (avg >= 85) ids.push("strong_draft");
  if (youWon && opp.isAI) ids.push("beat_machine");
  if (youWon && s.mode === "hardcore") ids.push("hardcore_win");
  if (youWon && yourGoals - oppGoals >= 3) ids.push("big_win");
  if (youWon && youHalfGoals < oppHalfGoals) ids.push("comeback_win");
  if (youWon && youRedCard) ids.push("red_card_win");
  const xp = 25 + (youWon ? 25 : 0) + (r.penaltyScore ? 10 : 0);
  void grantXp(
    xp,
    youWon ? "Partida vencida" : "Partida concluída",
    `xp:${key}`,
  );
  void awardAchievements(ids, key);
}

function leaderCardData(label: string, data: Leader | null): LeaderCardData {
  return {
    label,
    name: data?.name ?? null,
    val: data ? data.val : "Sem destaque",
    initials: data ? initials(data.name) : null,
    side: data?.side ?? null,
  };
}

function eventLogParts(
  r: MatchResult,
  you: PlayerPublic,
  opp: PlayerPublic,
): { important: LogEventItem[]; full: LogEventItem[] } {
  const sideName = (side: "home" | "away" | null) => {
    if (side === "home") return r.homeId === you.id ? you.name : opp.name;
    if (side === "away") return r.awayId === you.id ? you.name : opp.name;
    return "";
  };
  const importantTypes = new Set<MatchEvent["type"]>([
    "goal",
    "card",
    "injury",
    "halftime",
    "fulltime",
  ]);
  let nextId = 1;
  const toItem = (ev: MatchEvent): LogEventItem => ({
    id: nextId++,
    type: ev.type,
    cardKind: ev.type === "card" ? (ev.card === "red" ? "red" : "yellow") : undefined,
    minute: Math.min(ev.minute, 90),
    text: ev.text,
    teamLabel: sideName(ev.side),
  });
  const penaltyItems: LogEventItem[] = (r.shootout ?? []).map((kick) => {
    const pid = kick.side === "home" ? r.homeId : r.awayId;
    const team = pid === you.id ? you.name : opp.name;
    return {
      id: nextId++,
      type: "penalty",
      minute: "PEN" as const,
      text: `Pênalti de ${kick.taker} (${team}): ${kick.scored ? "no gol!" : "defendido!"}`,
      teamLabel: "",
    };
  });
  const important = r.timeline.filter((ev) => importantTypes.has(ev.type)).map(toItem);
  const full = r.timeline.map(toItem);
  return {
    important: [...important, ...penaltyItems],
    full: [...full, ...penaltyItems],
  };
}

function renderSummary() {
  const s = L.state!;
  const r = s.result!;
  const you = me()!;
  const opp = opponent()!;
  awardRegularMatchAchievements();
  const youWon = r.winnerId === you.id;
  const outcome = youWon ? "win" : "lose";
  const ys = r.strengths[you.id];
  const os = r.strengths[opp.id];
  const { scorer, assist, motm } = computeLeaders(r, you.id);
  const logParts = eventLogParts(r, you, opp);

  renderReact(
    createElement(ResultSummary, {
      outcome,
      youName: you.name,
      opponentName: opp.name,
      youInitials: initials(you.name),
      opponentInitials: initials(opp.name),
      youFormation: you.formationId ?? "",
      opponentFormation: opp.formationId ?? "",
      youGoals: r.goals[you.id],
      opponentGoals: r.goals[opp.id],
      youWon,
      penaltyLabel: r.penaltyScore
        ? `Pênaltis ${r.penaltyScore[you.id]} - ${r.penaltyScore[opp.id]}`
        : null,
      leaders: [
        leaderCardData("Artilheiro", scorer),
        leaderCardData("Assistência", assist),
        leaderCardData("Craque do Jogo", motm),
      ],
      strengths: [
        strengthRow("Ataque", ys.attack, os.attack),
        strengthRow("Meio", ys.midfield, os.midfield),
        strengthRow("Defesa", ys.defense, os.defense),
        strengthRow("Geral", ys.overall, os.overall, true),
      ],
      importantLog: logParts.important,
      fullLog: logParts.full,
      youPitchSlots: buildPitchSlots(getFormation(you.formationId!)!, you.picks, { forceShowRatings: true }),
      opponentPitchSlots: buildPitchSlots(
        getFormation(opp.formationId!)!,
        opp.picks,
        { forceShowRatings: true },
      ),
      onRematch: () => sendRematch(),
      onHome: goHome,
    }),
  );
}

function strengthRow(label: string, a: number, b: number, bold = false): StrengthRow {
  return { label, a, b, bold };
}

// ---------------- util ----------------

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

render();
window.addEventListener("hashchange", render);
void loadLeaderboard();
void restoreSession();
