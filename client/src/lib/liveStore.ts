import { useEffect, useState } from "react";

export interface FeedItem {
  /** Stable id so React keys are stable across prepends. */
  id: number;
  type: string;
  minute: number;
  text: string;
  /** Pre-formatted display coord ("bx-by") or null. */
  pos: string | null;
  /** Yellow/red card class addition when type === "card". */
  cardKind?: "yellow" | "red";
}

/** A single goal with its scorer and (optional) assister, in match order. */
export interface GoalEntry {
  id: number;
  minute: number;
  scorer: string;
  assister: string | null;
  side: "you" | "opp";
}

export interface BallState {
  /** % from left (0-100). */
  left: number;
  /** % from top (0-100). */
  top: number;
  /** transition-duration in ms */
  transitionMs: number;
  /** Add the "goal" class when the latest event was a goal. */
  goal: boolean;
}

export interface GoalOverlayState {
  show: boolean;
  scorer: string;
}

export interface CardOverlayState {
  show: boolean;
  kind: "yellow" | "red" | null;
  name: string;
}

export interface MomentOverlayState {
  show: boolean;
  kind: "penalty" | "chance" | "var" | "save" | "corner" | "info";
  title: string;
  detail: string;
}

export interface ShootoutKickRow {
  id: number;
  taker: string;
  scored: boolean;
  /** While the kicker steps up — result not revealed yet. */
  pending: boolean;
  side: "you" | "opp";
}

export interface ShootoutState {
  show: boolean;
  scoreYou: number;
  scoreOpp: number;
  you: ShootoutKickRow[];
  opp: ShootoutKickRow[];
  /** True once the shootout enters sudden death (after 5 kicks each). */
  suddenDeath: boolean;
}

export interface PenaltyLabelState {
  /** Label shown in the live-sub bar of the classic LiveMatchShell. */
  text: string;
}

export interface LiveState {
  scoreL: number;
  scoreR: number;
  minute: number;
  halfLabel: string;
  paused: boolean;
  ball: BallState;
  goal: GoalOverlayState;
  card: CardOverlayState;
  moment: MomentOverlayState;
  feed: FeedItem[];
  goals: GoalEntry[];
  shootout: ShootoutState;
  /** Penalty label (right of the half label) for classic mode. */
  penaltyLabel: PenaltyLabelState;
}

const INITIAL: LiveState = {
  scoreL: 0,
  scoreR: 0,
  minute: 0,
  halfLabel: "1º Tempo",
  paused: false,
  ball: { left: 50, top: 50, transitionMs: 700, goal: false },
  goal: { show: false, scorer: "" },
  card: { show: false, kind: null, name: "" },
  moment: { show: false, kind: "info", title: "", detail: "" },
  feed: [],
  goals: [],
  shootout: { show: false, scoreYou: 0, scoreOpp: 0, you: [], opp: [], suddenDeath: false },
  penaltyLabel: { text: "" },
};

let state: LiveState = INITIAL;
type Listener = (s: LiveState) => void;
const listeners = new Set<Listener>();
function emit() {
  for (const l of listeners) l(state);
}

let nextFeedId = 1;
let nextKickId = 1;
let nextGoalId = 1;

export const liveStore = {
  reset() {
    state = {
      ...INITIAL,
      feed: [],
      goals: [],
      shootout: { ...INITIAL.shootout, you: [], opp: [], suddenDeath: false },
    };
    nextFeedId = 1;
    nextKickId = 1;
    nextGoalId = 1;
    emit();
  },
  setPaused(paused: boolean) {
    state = { ...state, paused };
    emit();
  },
  addGoal(side: "you" | "opp", minute: number, scorer: string, assister: string | null) {
    const entry: GoalEntry = { id: nextGoalId++, minute, scorer, assister, side };
    state = { ...state, goals: [...state.goals, entry] };
    emit();
  },
  setScore(l: number, r: number) {
    state = { ...state, scoreL: l, scoreR: r };
    emit();
  },
  setMinute(m: number) {
    state = { ...state, minute: m };
    emit();
  },
  setHalfLabel(label: string) {
    state = { ...state, halfLabel: label };
    emit();
  },
  setBall(ball: Partial<BallState>) {
    state = { ...state, ball: { ...state.ball, ...ball } };
    emit();
  },
  showGoal(scorer: string) {
    state = { ...state, goal: { show: true, scorer } };
    emit();
  },
  hideGoal() {
    state = { ...state, goal: { show: false, scorer: "" } };
    emit();
  },
  showCard(kind: "yellow" | "red", name: string) {
    state = { ...state, card: { show: true, kind, name } };
    emit();
  },
  hideCard() {
    state = { ...state, card: { show: false, kind: null, name: "" } };
    emit();
  },
  showMoment(kind: MomentOverlayState["kind"], title: string, detail: string) {
    state = { ...state, moment: { show: true, kind, title, detail } };
    emit();
  },
  hideMoment() {
    state = { ...state, moment: { show: false, kind: "info", title: "", detail: "" } };
    emit();
  },
  prependFeed(item: Omit<FeedItem, "id">) {
    const id = nextFeedId++;
    state = { ...state, feed: [{ id, ...item }, ...state.feed].slice(0, 200) };
    emit();
  },
  openShootout() {
    state = {
      ...state,
      shootout: { show: true, scoreYou: 0, scoreOpp: 0, you: [], opp: [], suddenDeath: false },
    };
    emit();
  },
  setSuddenDeath() {
    state = { ...state, shootout: { ...state.shootout, suddenDeath: true } };
    emit();
  },
  /** Step the kicker up (pending). Returns the row id to resolve later. */
  appendKick(side: "you" | "opp", taker: string): number {
    const id = nextKickId++;
    const row: ShootoutKickRow = { id, taker, scored: false, pending: true, side };
    const next: ShootoutState = {
      ...state.shootout,
      you: side === "you" ? [...state.shootout.you, row] : state.shootout.you,
      opp: side === "opp" ? [...state.shootout.opp, row] : state.shootout.opp,
    };
    state = { ...state, shootout: next };
    emit();
    return id;
  },
  /** Reveal a pending kick result and update the running score. */
  resolveKick(side: "you" | "opp", id: number, scored: boolean) {
    const apply = (rows: ShootoutKickRow[]) =>
      rows.map((r) => (r.id === id ? { ...r, scored, pending: false } : r));
    const next: ShootoutState = {
      ...state.shootout,
      you: side === "you" ? apply(state.shootout.you) : state.shootout.you,
      opp: side === "opp" ? apply(state.shootout.opp) : state.shootout.opp,
      scoreYou:
        side === "you" && scored ? state.shootout.scoreYou + 1 : state.shootout.scoreYou,
      scoreOpp:
        side === "opp" && scored ? state.shootout.scoreOpp + 1 : state.shootout.scoreOpp,
    };
    state = { ...state, shootout: next };
    emit();
  },
  setPenaltyLabel(text: string) {
    state = { ...state, penaltyLabel: { text } };
    emit();
  },
};

export function useLiveState(): LiveState {
  const [s, setS] = useState(state);
  useEffect(() => {
    const l: Listener = (next) => setS(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}

// --- Halftime modal state (live PvP/AI classic) ---

export interface HalftimeReserveItem {
  name: string;
  /** Position group ("gk"|"def"|"mid"|"att") for the colored chip. */
  posGroup: string;
  posText: string;
  rating: number;
  teamLabel: string;
  selected: boolean;
  disabled: boolean;
}

export interface HalftimeState {
  open: boolean;
  formationId: string;
  mentality: string;
  attackFocus: string;
  subStatus: string;
  subCountLabel: string;
  continueLabel: string;
  continueDisabled: boolean;
  continueDone: boolean;
  controlsDisabled: boolean;
  locked: boolean;
  hideRatings: boolean;
  reserves: HalftimeReserveItem[];
  /** Pitch slots for the halftime sub board (uses PitchSlot shape). */
  pitchSlots: import("../components/Pitch.js").PitchSlot[];
  focusBanner: import("../components/TacticBanner.js").BannerSpec | null;
}

const INITIAL_HALF: HalftimeState = {
  open: false,
  formationId: "",
  mentality: "",
  attackFocus: "",
  subStatus: "",
  subCountLabel: "",
  continueLabel: "Voltar para o jogo",
  continueDisabled: false,
  continueDone: false,
  controlsDisabled: false,
  locked: false,
  hideRatings: false,
  reserves: [],
  pitchSlots: [],
  focusBanner: null,
};

let halfState: HalftimeState = INITIAL_HALF;
const halfListeners = new Set<(s: HalftimeState) => void>();
function emitHalf() {
  for (const l of halfListeners) l(halfState);
}

export const halftimeStore = {
  set(patch: Partial<HalftimeState>) {
    halfState = { ...halfState, ...patch };
    emitHalf();
  },
  close() {
    halfState = { ...halfState, open: false };
    emitHalf();
  },
  reset() {
    halfState = INITIAL_HALF;
    emitHalf();
  },
};

export function useHalftimeState(): HalftimeState {
  const [s, setS] = useState(halfState);
  useEffect(() => {
    const l = (next: HalftimeState) => setS(next);
    halfListeners.add(l);
    return () => {
      halfListeners.delete(l);
    };
  }, []);
  return s;
}
