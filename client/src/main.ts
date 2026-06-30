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
import { MENTALITIES } from "../../shared/mentalities.js";
import {
  computeStrength,
  playerPositions,
  simInputFromTeam,
  simulateGauntletMatch,
  wcOpponentTactics,
} from "../../shared/engine.js";
import { getTeam } from "../../shared/data/teams.js";
import {
  wcOpponentTeam,
  WC_LADDER,
} from "../../shared/data/worldcup.js";
import { isHardcoreMode, isWorldCupMode } from "../../shared/gameMode.js";
import {
  api,
  setToken,
  getToken,
  type AccountUser,
  type AdminTeam,
  type AchievementProgress,
  type FeedbackEntry,
  type LeaderboardEntry,
  type UserProgress,
} from "./api.js";
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
  sendRepositionPick,
  sendRerollTeam,
  sendHalftimeReady,
  sendRematch,
  leaveCurrentRoom,
} from "./net.js";
import { Home } from "./components/Home.js";
import { Login } from "./components/Login.js";
import { Achievements } from "./components/Achievements.js";
import { AdminTeams } from "./components/AdminTeams.js";
import { AdminFeedbacks } from "./components/AdminFeedbacks.js";
import { Lobby } from "./components/Lobby.js";
import { CampaignSetup } from "./components/CampaignSetup.js";
import { Draft } from "./components/Draft.js";
import { PreMatchClassic } from "./components/PreMatchClassic.js";
import { TacticBannerList, type BannerSpec } from "./components/TacticBanner.js";
import type { PitchSlot } from "./components/Pitch.js";
import { Overlays } from "./components/Overlays.js";
import { liveStore, halftimeStore } from "./lib/liveStore.js";
import type {
  HalftimeOptions,
  HalftimeCallbacks,
} from "./components/LiveStage.js";
import type {
  CampaignStatusData,
  TeamStrengthData,
} from "./components/CupStatus.js";
import { LiveMatchShell } from "./components/LiveMatchShell.js";
import {
  ResultSummary,
} from "./components/ResultSummary.js";
import { ATTACK_FOCUS_OPTIONS } from "./components/SetupBoard.js";
import { CampaignDraft, type CampaignDraftPlayer } from "./components/CampaignDraft.js";
import { CampaignPreMatch } from "./components/CampaignPreMatch.js";
import { CampaignMatchShell } from "./components/CampaignMatchShell.js";
import {
  CampaignGameOver,
  CampaignVictory,
} from "./components/CampaignEnd.js";
import { TeamForm } from "./components/TeamForm.js";
import { LegalPage } from "./components/LegalPage.js";
import { UpdatesPage } from "./components/UpdatesPage.js";
import { FeedbackPage } from "./components/FeedbackPage.js";
import { initializeTheme, ThemeSwitch } from "./components/ThemeSwitch.js";
import {
  devPreviewFromHash,
  type DevPreviewKind,
} from "./devPreviews.js";
import {
  CARD_ALERT_HIDE_MS,
  DevPreviewChrome,
  GOAL_ALERT_HIDE_MS,
} from "./devPreviewChrome.js";
import {
  previewCampaignEndState,
  previewCampaignPicks,
  previewCampaignState,
  previewPvpDraftState,
} from "./devPreviewFixtures.js";
import {
  renderCampaignMatchPreview,
  renderPenaltyModalPreview,
  renderPvpResultPreview,
  renderSubstitutionModalPreview,
} from "./devPreviewScreens.js";
import type {
  CampaignMode,
  CampaignState,
} from "./campaignTypes.js";
import {
  ALL_POS,
  playerPosText,
  teamFullName,
} from "./lib/teamImport.js";
import { importTeamsFromFileInput } from "./lib/adminTeamImport.js";
import {
  applyIntervalSubstitution as applyIntervalSubstitutionBase,
  buildIntervalBench,
  buildPitchSlots as buildPitchSlotsBase,
  type BuildPitchOpts,
  reassignPicksToFormation,
  swapLineupSlots,
} from "./lib/lineup.js";
import { readSavedMatchSpeed, saveMatchSpeed } from "./lib/matchSpeed.js";
import {
  configureWriteLock,
  queueAchievementNotice,
  queueXpNotice,
  showToast,
  type XpNotice,
} from "./lib/overlayController.js";
import {
  computeLeaders,
  eventLogParts,
  initials,
  leaderCardData,
  strengthRow,
} from "./lib/resultSummaryData.js";
import {
  campaignAvgNumber,
  campaignJourneyLeadersData,
  campaignMatchAchievementIds,
  campaignQualificationLabel,
  campaignRank,
  campaignSquadRowsData,
  campaignStageLabel,
  campaignStatusData,
  campaignStrengthData,
  bestThirdQualifies,
  collectCampaignJourneyStats,
  groupTableSorted,
  knockoutBracketData,
  recordGroupMatch,
  setupCampaignGroup,
  setupKnockoutPath,
  simulateOtherGroupFixture,
  teamAvg,
} from "./lib/campaignData.js";
import {
  draftAchievementIds,
  regularMatchAchievementAwards,
} from "./lib/achievementRules.js";
import {
  attackFocusBannerSpec,
  attackFocusLabel,
  campaignTacticBanners,
  mentalityLabel,
  picksOvr,
  teamStrengthData as teamStrengthDataBase,
} from "./lib/tacticsUi.js";
import {
  campaignSelectable,
  drawCampaignTeam,
  placeCampaignPlayer,
  relocateCampaignPick,
} from "./lib/campaignDraftLogic.js";
import { createInitialCampaignState } from "./lib/campaignStateFactory.js";
import {
  blankTeam,
  canEditTeam as canEditTeamBase,
} from "./lib/adminTeamState.js";

const app = document.getElementById("app")!;
const overlaysRoot = createRoot(document.getElementById("overlays")!);
overlaysRoot.render(createElement(Overlays));
let reactRoot: Root | null = null;
let syncLiveUi: (() => void) | null = null;
let cupDraftScrollTop = 0;

initializeTheme();
configureWriteLock();

function renderReact(node: ReactElement) {
  if (!reactRoot) reactRoot = createRoot(app);
  const preview = devPreviewKind();
  const content = createElement(
    Fragment,
    null,
    createElement(ThemeSwitch),
    preview
      ? createElement(DevPreviewChrome, {
          active: preview,
          onHome: goPreviewHome,
          onAchievement: queueAchievementNotice,
          onXp: queueXpNotice,
        })
      : null,
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

function clearReactRoot() {
  if (!reactRoot) return;
  reactRoot.unmount();
  reactRoot = null;
}

function setMatchSpeed(speed: number) {
  L.matchSpeed = saveMatchSpeed(speed);
}

interface Local {
  youId: string | null;
  state: RoomState | null;
  // transient selection during the draft
  selectedPlayer: string | null;
  selectedDraftSlotId: string | null;
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
    | "admin-feedback"
    | "achievements"
    | "terms"
    | "privacy"
    | "updates"
    | "feedback"
    | null;
  adminTeams: AdminTeam[] | null;
  adminFeedback: FeedbackEntry[] | null;
  adminTeamSearch: string;
  adminPlayerSearch: string;
  editingTeam: AdminTeam | "new" | null;
  achievements: AchievementProgress[] | null;
  achievementAwardKeys: Set<string>;
}

const L: Local = {
  youId: null,
  state: null,
  selectedPlayer: null,
  selectedDraftSlotId: null,
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
  adminFeedback: null,
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

function me(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id === L.youId);
}
function opponent(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id !== L.youId);
}

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
    else if (L.accountScreen === "admin-feedback") renderAdminFeedback();
    else if (L.accountScreen === "terms" || L.accountScreen === "privacy")
      renderLegal(L.accountScreen);
    else if (L.accountScreen === "updates") renderUpdates();
    else if (L.accountScreen === "feedback") renderFeedback();
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
    if (isHardcoreMode(mode) && !canUseHardcore())
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
      onOpenFeedback: openFeedback,
      onOpenLegal: openLegal,
      onSoon: (mode) =>
        showToast(
          `Modo ${mode === "carreira" ? "carreira" : "liga"} estará disponível em breve.`,
        ),
    }),
  );
}

// ---------------- Account + team admin (REST) ----------------

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
function openFeedback() {
  L.accountScreen = "feedback";
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
  L.selectedDraftSlotId = null;
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
  L.adminFeedback = null;
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
async function openAdminFeedback() {
  L.accountScreen = "admin-feedback";
  L.adminFeedback = null;
  render();
  await loadAdminFeedback();
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
async function loadAdminFeedback() {
  try {
    const { feedback } = await api.listFeedback();
    L.adminFeedback = feedback;
  } catch (e) {
    showToast((e as Error).message);
    L.adminFeedback = [];
  }
  if (L.accountScreen === "admin-feedback") render();
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
function renderFeedback() {
  renderReact(
    createElement(FeedbackPage, {
      account: L.account,
      onBack: closeAccount,
      onLogin: openLogin,
      onSubmit: async ({ category, message, contact }) => {
        await api.sendFeedback({
          category,
          message,
          contact,
          page: location.pathname + location.hash,
        });
        showToast("Feedback enviado. Obrigado!");
      },
    }),
  );
}

function canEditTeam(t: AdminTeam): boolean {
  return canEditTeamBase(L.account, t);
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
      onOpenFeedbacks: () => void openAdminFeedback(),
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

function renderAdminFeedback() {
  renderReact(
    createElement(AdminFeedbacks, {
      account: L.account,
      feedback: L.adminFeedback,
      onBack: () => void openAdmin(),
      onHome: closeAccount,
    }),
  );
}

async function importTeamsFromFile(input: HTMLInputElement) {
  await importTeamsFromFileInput(input, {
    isAdmin: L.account?.role === "admin",
    createTeam: (team) => api.createTeam(team),
    onImported: (sourceKey) => {
      void awardAchievements(["json_import", "custom_team"], sourceKey);
    },
    onFinished: loadAdminTeams,
    showToast,
  });
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
      positions: [...ALL_POS],
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
  L.campaign = createInitialCampaignState();
  render();
}

function campaignExit() {
  if (devPreviewKind()) return goPreviewHome();
  L.campaign = null;
  L.playing = false;
  lastCampaignPhase = null;
  render();
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

function campaignDrawTeam() {
  cupDraftScrollTop = 0;
  drawCampaignTeam(L.campaign!);
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
  if (!placeCampaignPlayer(c, slotId, player)) return;
  // when the XI is complete, wait on the draft screen for the user to confirm
  // (the "Continuar" button) instead of jumping straight to the pre-match
  if (c.picks.length < 11) {
    campaignDrawTeam();
  }
  render();
}

function awardDraftAchievements(
  picks: SquadPick[],
  formationId: string,
  sourceKey: string,
  mode?: GameMode,
) {
  const ids = draftAchievementIds(picks, formationId, mode);
  if (ids.length) void awardAchievements(ids, sourceKey);
}

function renderCampaignDraft() {
  const c = L.campaign!;
  const team = c.currentTeam!;
  const f = getFormation(c.formationId)!;
  const hideRatings = c.mode === "hardcore";
  const selectable = campaignSelectable(c);
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
  const strength = campaignStrengthData(c);
  const squadRows = campaignSquadRowsData(c);

  const selectedPick = c.selectedPickSlotId
    ? c.picks.find((p) => p.slotId === c.selectedPickSlotId)
    : null;
  const moveSource = selectedPick?.player ?? null;
  const activePlayer = player ?? moveSource;
  const openSlotIds = new Set<string>();
  if (activePlayer) {
    const playerGroups = playerPositions(activePlayer).map(groupOf);
    const sourceSlot = c.selectedPickSlotId
      ? f.slots.find((slot) => slot.id === c.selectedPickSlotId)
      : null;
    for (const slot of f.slots) {
      const targetPick = c.picks.find((p) => p.slotId === slot.id);
      if (!playerGroups.includes(groupOf(slot.pos))) continue;
      if (!moveSource && targetPick) continue;
      if (
        moveSource &&
        targetPick &&
        sourceSlot &&
        !playerPositions(targetPick.player)
          .map(groupOf)
          .includes(groupOf(sourceSlot.pos))
      )
        continue;
      openSlotIds.add(slot.id);
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
        if (filled && !openSlotIds.has(slotId)) {
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
  if (!relocateCampaignPick(c, fromSlotId, toSlotId)) return;
  render();
}

function campaignBeginRound() {
  const c = L.campaign!;
  if (c.round < 3) {
    setupCampaignGroup(c);
    c.currentOpp = c.groupTeams[c.round];
  } else {
    setupKnockoutPath(c);
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
  const banners = campaignTacticBanners({
    picks: c.picks,
    mentality: c.mentality,
    attackFocus: c.attackFocus,
    opponentMentality: oppTactics.mentality,
    hideRatings,
  });
  renderReact(
    createElement(CampaignPreMatch, {
      ladderLabel: ladder.label,
      progressRound: c.round,
      status: campaignStatusData(c),
      qualificationLabel: c.round >= 3 ? c.groupQualifiedLabel : null,
      banners,
      youFormation: c.formationId,
      youOvrText: hideRatings ? "OVR ??" : `OVR ${campaignAvgNumber(c.picks)}`,
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
  collectCampaignJourneyStats(r, c.campaignGoals, c.campaignAssists);
  if (c.round < 3) {
    recordGroupMatch(c.groupTable, "you", c.currentOpp!.id, r.youGoals, r.oppGoals);
    simulateOtherGroupFixture(c, c.round);
    if (c.round < 2) {
      c.round++;
      campaignBeginRound();
    } else {
      const sorted = groupTableSorted(c.groupTable);
      const rank = sorted.findIndex((row) => row.id === "you") + 1;
      const youRow = sorted.find((row) => row.id === "you")!;
      c.groupQualified =
        rank <= 2 || (rank === 3 && bestThirdQualifies(youRow));
      c.groupQualifiedLabel = campaignQualificationLabel(c);
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
        setupKnockoutPath(c);
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
  const matchEndMinute = r.wentToExtraTime ? 120 : 90;
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
    hideTimer = window.setTimeout(() => liveStore.hideGoal(), GOAL_ALERT_HIDE_MS);
  }
  function cardAnim(ev: MatchEvent) {
    const kind = ev.card === "red" ? "red" : "yellow";
    liveStore.showCard(kind, `${kind === "red" ? "Vermelho" : "Amarelo"}${ev.player ? `: ${ev.player}` : ""}`);
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => liveStore.hideCard(), CARD_ALERT_HIDE_MS);
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
          liveStore.addGoal(p, Math.min(ev.minute, matchEndMinute), ev.player ?? "?", ev.assist ?? null);
        }
        liveStore.setScore(goals.you, goals.opp);
        goalAnim(ev.player);
      } else if (ev.type === "card") {
        cardAnim(ev);
      }
      schedule(d / L.matchSpeed);
      return;
    }
    if (minute >= matchEndMinute) {
      if (r.shootout?.length) schedule(1000, playShootout);
      else schedule(1100, finish);
      return;
    }
    minute++;
    liveStore.setMinute(minute);
    liveStore.setHalfLabel(
      minute <= 45
        ? "1º Tempo"
        : minute <= 90
          ? "2º Tempo"
          : minute <= 105
            ? "1º Tempo (Prorrogação)"
            : "2º Tempo (Prorrogação)",
    );
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
      ? `Empate contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals}${r.wentToExtraTime ? " (após a prorrogação)" : ""}. Nos pênaltis, ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}.`
      : `Resultado contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals} (${r.outcome === "draw" ? "empate" : "derrota"}${r.wentToExtraTime ? " na prorrogação" : ""}).`;
  const penaltyLabel = r.penaltyScore
    ? `Pênaltis ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}`
    : null;
  const status: CampaignStatusData = fellInGroup
    ? campaignStatusData(c)
    : { kind: "knockout", bracket: knockoutBracketData(c) };
  renderReact(
    createElement(CampaignGameOver, {
      title,
      detail,
      youGoals: r.youGoals,
      oppGoals: r.oppGoals,
      oppName: r.oppName,
      penaltyLabel,
      journeyLeaders: campaignJourneyLeadersData(c),
      squadRows: campaignSquadRowsData(c),
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
      journeyLeaders: campaignJourneyLeadersData(c),
      squadRows: campaignSquadRowsData(c),
      bracket: knockoutBracketData(c),
      progressRound: 8,
      onRetry: () => startCampaign(),
      onHome: goHome,
    }),
  );
}

function renderDevPreview(kind: DevPreviewKind) {
  L.state = null;
  L.youId = null;
  L.playing = false;
  L.accountScreen = null;
  lastCampaignPhase = null;
  const previewContext = { renderReact, setMatchSpeed, buildPitchSlots };

  if (kind === "penalty-modal") {
    L.campaign = null;
    renderPenaltyModalPreview(previewContext);
    return;
  }
  if (kind === "penalty-sudden") {
    L.campaign = null;
    renderPenaltyModalPreview(previewContext, { suddenDeath: true });
    return;
  }
  if (kind === "cup-match") {
    L.campaign = null;
    renderCampaignMatchPreview(previewContext);
    return;
  }
  if (kind === "pvp-result") {
    L.campaign = null;
    renderPvpResultPreview(previewContext);
    return;
  }
  if (kind === "pvp-draft") {
    L.campaign = null;
    const previewDraft = previewPvpDraftState();
    L.state = previewDraft.state;
    L.youId = previewDraft.youId;
    L.selectedPlayer = previewDraft.selectedPlayer;
    renderDraft();
    return;
  }
  if (kind === "substitution-modal") {
    L.campaign = null;
    renderSubstitutionModalPreview(previewContext);
    return;
  }

  if (kind === "cup-victory") {
    L.campaign = previewCampaignEndState("victory");
    renderCampaign();
    return;
  }
  if (kind === "cup-gameover") {
    L.campaign = previewCampaignEndState("gameover");
    renderCampaign();
    return;
  }

  if (
    !["cup-setup", "cup-draft", "cup-prematch", "cup-prematch-ko"].includes(
      kind,
    )
  )
    return;

  L.campaign = previewCampaignState(kind);
  if (kind === "cup-draft" && L.campaign.currentTeam) {
    L.campaign.selectedPlayer = [...campaignSelectable(L.campaign)][0] ?? null;
  }
  renderCampaign();
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
  if (!yourTurn) L.selectedDraftSlotId = null;
  const selectedDraftPick = L.selectedDraftSlotId
    ? you.picks.find((p) => p.slotId === L.selectedDraftSlotId)
    : null;
  const selectedDraftSlot = selectedDraftPick
    ? yourForm.slots.find((slot) => slot.id === selectedDraftPick.slotId)
    : null;
  const draftOpenSlotIds = new Set<string>();
  if (yourTurn && selectedDraftPick && selectedDraftSlot) {
    const selectedGroups = playerPositions(selectedDraftPick.player).map(groupOf);
    for (const slot of yourForm.slots) {
      if (slot.id === selectedDraftPick.slotId) {
        draftOpenSlotIds.add(slot.id);
        continue;
      }
      if (!selectedGroups.includes(groupOf(slot.pos))) continue;
      const targetPick = you.picks.find((p) => p.slotId === slot.id);
      if (
        targetPick &&
        !playerPositions(targetPick.player)
          .map(groupOf)
          .includes(groupOf(selectedDraftSlot.pos))
      )
        continue;
      draftOpenSlotIds.add(slot.id);
    }
  }
  renderReact(
    createElement(Draft, {
      state: s,
      you,
      opponent: opp,
      team,
      yourTurn,
      vsAI,
      selectedPlayer: L.selectedPlayer,
      selectedDraftSlotId: L.selectedDraftSlotId,
      youPitchSlots: buildPitchSlots(yourForm, you.picks, {
        showPos: true,
        openSlotIds: draftOpenSlotIds,
        selectedSubId: L.selectedDraftSlotId,
      }),
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
        L.selectedDraftSlotId = null;
        sendRerollTeam();
      },
      onSelectPlayer: (name: string) => {
        L.selectedPlayer = name;
        L.selectedDraftSlotId = null;
        render();
      },
      onPickSlot: (slotId: string) => {
        if (!L.selectedPlayer) return;
        sendPick(slotId, L.selectedPlayer);
        L.selectedPlayer = null;
      },
      onRepositionSlot: (slotId: string) => {
        if (!yourTurn) return;
        if (!L.selectedDraftSlotId) {
          if (!you.picks.some((p) => p.slotId === slotId)) return;
          L.selectedPlayer = null;
          L.selectedDraftSlotId = slotId;
          render();
          return;
        }
        if (L.selectedDraftSlotId === slotId) {
          L.selectedDraftSlotId = null;
          render();
          return;
        }
        sendRepositionPick(L.selectedDraftSlotId, slotId);
        L.selectedDraftSlotId = null;
      },
    }),
  );
}

// ---------------- Pre-Match (classic) ----------------

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
      s.mode,
    );
  }
  const vsAI = s.players.some((p) => p.isAI);
  const hideRatings = isHardcoreMode(s.mode);
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
  return teamStrengthDataBase(p, !!L.state?.hideRatings);
}

function buildPitchSlots(
  formation: NonNullable<ReturnType<typeof getFormation>>,
  picks: PlayerPublic["picks"],
  opts: BuildPitchOpts = {},
): PitchSlot[] {
  const hideGlobal = !!L.state?.hideRatings || L.campaign?.mode === "hardcore";
  return buildPitchSlotsBase(formation, picks, {
    ...opts,
    hideRatingsGlobal: hideGlobal,
  });
}

function applyIntervalSubstitution(
  player: PlayerPublic,
  outSlotId: string,
  reserveName: string,
  bench = L.intervalBench ?? [],
) {
  const result = applyIntervalSubstitutionBase(
    player,
    outSlotId,
    reserveName,
    bench,
  );
  if (!result) return null;
  const reserve = bench.find((p) => p.name === reserveName);
  if (bench === L.intervalBench) {
    L.intervalBench =
      L.intervalBench?.filter((p) => p.name !== reserve?.name) ?? null;
  }
  return result;
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
    hideTimer = window.setTimeout(() => liveStore.hideGoal(), GOAL_ALERT_HIDE_MS);
  }

  function cardAnim(ev: MatchEvent) {
    const kind = ev.card === "red" ? "red" : "yellow";
    liveStore.showCard(kind, `${kind === "red" ? "Vermelho" : "Amarelo"}${ev.player ? `: ${ev.player}` : ""}`);
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => liveStore.hideCard(), CARD_ALERT_HIDE_MS);
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

function awardRegularMatchAchievements() {
  const s = L.state;
  if (!s?.result || !L.youId) return;
  const you = me();
  const opp = opponent();
  if (!you || !opp) return;
  const awards = regularMatchAchievementAwards(s, you, opp);
  if (!awards) return;
  void grantXp(awards.xp, awards.xpReason, `xp:${awards.key}`);
  void awardAchievements(awards.ids, awards.key);
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
  const { scorer, assist, motm } = computeLeaders(r, you.id, s.players);
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
