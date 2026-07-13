import { createElement, Fragment, type ReactElement } from "react";
import type { AccountUser } from "./api.js";
import type { MatchResult, PlayerPublic } from "../../shared/types.js";
import { FORMATIONS, getFormation } from "../../shared/formations.js";
import { MENTALITIES } from "../../shared/mentalities.js";
import { computeStrength, effectiveRating } from "../../shared/engine.js";
import { getTeam } from "../../shared/data/teams.js";
import { ATTACK_FOCUS_OPTIONS } from "./components/SetupBoard.js";
import { CampaignMatchShell } from "./components/CampaignMatchShell.js";
import { LiveMatchShell } from "./components/LiveMatchShell.js";
import { ResultSummary } from "./components/ResultSummary.js";
import type {
  HalftimeCallbacks,
  HalftimeOptions,
} from "./components/LiveStage.js";
import type { PitchSlot } from "./components/Pitch.js";
import { PreviewAlertControls } from "./devPreviewChrome.js";
import { previewCampaignPicks } from "./devPreviewFixtures.js";
import { halftimeStore, liveStore } from "./lib/liveStore.js";
import {
  eventLogParts,
  initials,
  leaderCardData,
  strengthRow,
} from "./lib/resultSummaryData.js";

const PREVIEW_AVATAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#00ff87"/><text x="32" y="42" font-size="28" text-anchor="middle" font-family="sans-serif" fill="#04130c">PP</text></svg>';
export const PREVIEW_ACCOUNT: AccountUser = {
  id: "preview-user",
  username: "PreviewPlayer",
  role: "user",
  avatarUrl: `data:image/svg+xml,${encodeURIComponent(PREVIEW_AVATAR_SVG)}`,
};

interface BuildPitchOpts {
  forceHideRatings?: boolean;
  forceShowRatings?: boolean;
  showPos?: boolean;
  openSlotIds?: Set<string>;
  selectedSubId?: string | null;
}

type BuildPitchSlots = (
  formation: ReturnType<typeof getFormation> & {},
  picks: PlayerPublic["picks"],
  opts?: BuildPitchOpts,
) => PitchSlot[];

interface DevPreviewScreenContext {
  renderReact: (node: ReactElement) => void;
  setMatchSpeed: (speed: number) => void;
  buildPitchSlots: BuildPitchSlots;
  account: AccountUser | null;
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

function previewPicks(teamId: string, formationId: string): PlayerPublic["picks"] {
  const team = getTeam(teamId);
  const formation = getFormation(formationId)!;
  if (!team) return [];
  const used = new Set<string>();

  return formation.slots.map((slot) => {
    const player =
      team.players.find((candidate) => candidate.pos === slot.pos && !used.has(candidate.name)) ??
      team.players.find((candidate) => !used.has(candidate.name)) ??
      team.players[0];
    used.add(player.name);
    return {
      slotId: slot.id,
      player,
      fromTeamId: team.id,
      effectiveRating: effectiveRating(player, slot.pos),
    };
  });
}

export function renderPvpResultPreview({
  buildPitchSlots,
  renderReact,
  account,
}: DevPreviewScreenContext) {
  const you: PlayerPublic = {
    id: "you-preview",
    name: "admin",
    connected: true,
    ready: true,
    formationId: "4-3-3",
    mentality: "pressao",
    attackFocus: "meio",
    picks: previewPicks("real-madrid", "4-3-3"),
  };
  const opp: PlayerPublic = {
    id: "opp-preview",
    name: "caio",
    connected: true,
    ready: true,
    formationId: "4-3-3",
    mentality: "posse",
    attackFocus: "lados",
    picks: previewPicks("barcelona", "4-3-3"),
  };
  const youStrength = computeStrength(you.picks, you.formationId!);
  const oppStrength = computeStrength(opp.picks, opp.formationId!);
  const result: MatchResult = {
    homeId: you.id,
    awayId: opp.id,
    secondHalfReady: true,
    firstHalfGoals: { [you.id]: 1, [opp.id]: 1 },
    goals: { [you.id]: 3, [opp.id]: 2 },
    winnerId: you.id,
    summary: "admin venceu por 3 x 2.",
    strengths: { [you.id]: youStrength, [opp.id]: oppStrength },
    penaltyScore: null,
    shootout: null,
    timeline: [
      {
        minute: 7,
        type: "kickoff",
        side: null,
        text: "Bola rolando na Arena Pebol.",
      },
      {
        minute: 18,
        type: "goal",
        side: "home",
        text: "Gol do admin! Cristiano Ronaldo sobe mais alto e abre o placar.",
        player: "Cristiano Ronaldo",
        assist: "Marcelo",
      },
      {
        minute: 39,
        type: "goal",
        side: "away",
        text: "Gol do caio. Messi acha espaço na área e empata.",
        player: "Messi",
        assist: "Xavi",
      },
      {
        minute: 45,
        type: "halftime",
        side: null,
        text: "Intervalo: 1 x 1 em uma partida muito aberta.",
      },
      {
        minute: 57,
        type: "goal",
        side: "home",
        text: "Gol do admin! Kroos recebe de Modrić e finaliza no canto.",
        player: "Kroos",
        assist: "Modrić",
      },
      {
        minute: 72,
        type: "card",
        side: "away",
        text: "Cartão amarelo para Piqué após parar o contra-ataque.",
        player: "Piqué",
        card: "yellow",
      },
      {
        minute: 81,
        type: "goal",
        side: "away",
        text: "Gol do caio. David Villa deixa tudo igual no fim.",
        player: "David Villa",
        assist: "Iniesta",
      },
      {
        minute: 88,
        type: "goal",
        side: "home",
        text: "Gol do admin! Cristiano Ronaldo decide a partida no minuto 88.",
        player: "Cristiano Ronaldo",
        assist: "Isco",
      },
      {
        minute: 90,
        type: "fulltime",
        side: null,
        text: "Fim de jogo: admin vence por 3 x 2.",
      },
    ],
  };
  const logParts = eventLogParts(result, you, opp);

  renderReact(
    createElement(ResultSummary, {
        account: account ?? PREVIEW_ACCOUNT,
        outcome: "win",
        youName: you.name,
        opponentName: opp.name,
        youInitials: initials(you.name),
        opponentInitials: initials(opp.name),
        youFormation: you.formationId!,
        opponentFormation: opp.formationId!,
        youGoals: result.goals[you.id],
        opponentGoals: result.goals[opp.id],
        youWon: true,
        penaltyLabel: null,
        leaders: [
          leaderCardData("Artilheiro", {
            name: "Cristiano Ronaldo",
            val: "2 gols",
            side: "you",
          }),
          leaderCardData("Assistência", {
            name: "Modrić",
            val: "1 assistência",
            side: "you",
          }),
          leaderCardData("Craque do Jogo", {
            name: "Cristiano Ronaldo",
            val: "2 gols",
            side: "you",
          }),
        ],
        strengths: [
          strengthRow("Ataque", youStrength.attack, oppStrength.attack),
          strengthRow("Meio", youStrength.midfield, oppStrength.midfield),
          strengthRow("Defesa", youStrength.defense, oppStrength.defense),
          strengthRow("Geral", youStrength.overall, oppStrength.overall, true),
        ],
        importantLog: logParts.important,
        fullLog: logParts.full,
        youPitchSlots: buildPitchSlots(getFormation(you.formationId!)!, you.picks, {
          forceShowRatings: true,
        }),
        opponentPitchSlots: buildPitchSlots(getFormation(opp.formationId!)!, opp.picks, {
          forceShowRatings: true,
        }),
        onRematch: () => {},
        onHome: () => {},
      }),
  );
}

export function renderPenaltyModalPreview({
  renderReact,
  setMatchSpeed,
  account,
}: DevPreviewScreenContext, opts: { suddenDeath?: boolean } = {}) {
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
  if (opts.suddenDeath) {
    liveStore.setSuddenDeath();
    liveStore.appendKick("you", "Messi");
  }

  renderReact(
    createElement(CampaignMatchShell, {
      account: account ?? PREVIEW_ACCOUNT,
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

export function renderCampaignMatchPreview({
  renderReact,
  setMatchSpeed,
  account,
}: DevPreviewScreenContext) {
  liveStore.reset();
  halftimeStore.reset();
  liveStore.setScore(2, 1);
  liveStore.setMinute(64);
  liveStore.setHalfLabel("2º Tempo");
  liveStore.setBall({ left: 62, top: 44, transitionMs: 700 });
  liveStore.addGoal("you", 18, "Ronaldo", "Zidane");
  liveStore.addGoal("opp", 39, "Trejo", "Hugo Sánchez");
  liveStore.addGoal("you", 58, "Messi", "Xavi");
  liveStore.prependFeed({
    minute: 64,
    type: "possession",
    text: "Seu time troca passes pelo meio e controla o ritmo.",
    pos: "62-44",
  });
  liveStore.prependFeed({
    minute: 61,
    type: "chance",
    text: "Quase! Messi recebe entre linhas e finaliza rente à trave.",
    pos: "88-38",
  });
  liveStore.prependFeed({
    minute: 58,
    type: "goal",
    text: "Gol do Seu time! Messi vira o jogo depois de passe de Xavi.",
    pos: "94-35",
  });
  liveStore.prependFeed({
    minute: 39,
    type: "goal",
    text: "México empata com Trejo após contra-ataque rápido.",
    pos: "91-32",
  });

  renderReact(
    createElement(
      Fragment,
      null,
      createElement(PreviewAlertControls),
      createElement(CampaignMatchShell, {
        account: account ?? PREVIEW_ACCOUNT,
        ladderLabel: "Fase de grupos - Jogo 3",
        oppName: "México 1986",
        oppFlagName: "México",
        oppInitials: "MX",
        speedOptions: [1, 1.5, 2],
        activeSpeed: 2,
        showPause: true,
        onSpeedChange: setMatchSpeed,
        onTogglePause: (paused) => liveStore.setPaused(paused),
        onSkip: () => {},
      }),
    ),
  );
}

export function renderSubstitutionModalPreview({
  buildPitchSlots,
  renderReact,
  setMatchSpeed,
  account,
}: DevPreviewScreenContext) {
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
      account: account ?? PREVIEW_ACCOUNT,
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
