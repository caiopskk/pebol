import { createElement, Fragment, type ReactElement } from "react";
import type { PlayerPublic } from "../../shared/types.js";
import { FORMATIONS, getFormation } from "../../shared/formations.js";
import { MENTALITIES } from "../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./components/SetupBoard.js";
import { CampaignMatchShell } from "./components/CampaignMatchShell.js";
import { LiveMatchShell } from "./components/LiveMatchShell.js";
import type {
  HalftimeCallbacks,
  HalftimeOptions,
} from "./components/LiveStage.js";
import type { PitchSlot } from "./components/Pitch.js";
import { PreviewAlertControls } from "./devPreviewChrome.js";
import { previewCampaignPicks } from "./devPreviewFixtures.js";
import { halftimeStore, liveStore } from "./lib/liveStore.js";

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

export function renderPenaltyModalPreview({
  renderReact,
  setMatchSpeed,
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
