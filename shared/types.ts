// Shared types between client and server.

/** Position group, used to compute the out-of-position penalty. */
export type PosGroup = "GK" | "DEF" | "MID" | "ATT";

/** Specific position (for display and fine-grained penalty). */
export type Position =
  | "GK"
  | "RB"
  | "LB"
  | "CB"
  | "RWB"
  | "LWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "RM"
  | "LM"
  | "RW"
  | "LW"
  | "CF"
  | "ST";

export interface Player {
  name: string;
  pos: Position; // main/natural position
  altPositions?: Position[]; // optional secondary positions with full familiarity
  rating: number; // 60-99
  pac?: number; // pace
  sho?: number; // shooting
  pas?: number; // passing
  dri?: number; // dribbling
  def?: number; // defending
  phy?: number; // physical
}

export interface Team {
  id: string;
  name: string;
  season: string; // e.g. "2025" or "2024/25"
  league: string;
  players: Player[]; // starters / main draft options
  bench?: Player[]; // reserves, also available in the draft
}

export type Mentality =
  | "aura"
  | "equilibrada"
  | "retranca"
  | "pressao"
  | "posse"
  | "contra_ataque";
export type GameMode = "classico" | "hardcore" | "worldcup" | "worldcup-hardcore";

/** Attacking focus: where the team channels its attack. Rewards the matching
 * part of the squad (wide players for "lados", the spine for "meio"). */
export type AttackFocus = "equilibrado" | "lados" | "meio";

/** A slot in the formation on the pitch. */
export interface FormationSlot {
  id: string; // e.g. "ST", "CB1"
  pos: Position; // position this slot asks for
  // pitch coordinates (0-100), from the formation owner's point of view
  x: number;
  y: number;
}

export interface Formation {
  id: string; // e.g. "4-3-3"
  name: string;
  slots: FormationSlot[];
}

/** A player assigned to a slot (the result of a pick). */
export interface SquadPick {
  slotId: string;
  player: Player;
  fromTeamId: string;
  effectiveRating: number; // rating after the position penalty
}

// ---- Room state synced with the client ----

export type Phase = "lobby" | "setup" | "draft" | "preMatch" | "result";

export interface PlayerPublic {
  id: string;
  name: string;
  connected: boolean;
  isAI?: boolean;
  rerollsRemaining?: number;
  ready: boolean;
  preMatchReady?: boolean;
  halftimeReady?: boolean;
  formationId: string | null;
  mentality: Mentality | null;
  attackFocus?: AttackFocus;
  picks: SquadPick[];
}

export interface RoomState {
  code: string;
  phase: Phase;
  mode: GameMode;
  hostId: string;
  totalSlots: number; // 11
  players: PlayerPublic[];
  currentTeam: Team | null; // team drawn for the current turn
  round: number; // current round (0-based)
  activePlayerId: string | null; // whose turn it is to pick
  takenThisRound: string[]; // players already taken from the current team
  usedTeamIds: string[];
  pvpRerollsEnabled: boolean;
  hideRatings: boolean; // Hardcore mode: hide ratings during the draft
  result: MatchResult | null;
}

// ---- Simulation ----

export type MatchEventType =
  | "kickoff"
  | "goal"
  | "chance"
  | "save"
  | "corner"
  | "offside"
  | "foul"
  | "card"
  | "injury"
  | "var"
  | "possession"
  | "halftime"
  | "fulltime"
  | "penalty"
  | "info";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: "home" | "away" | null;
  text: string;
  bx?: number; // ball position on a 105x68 grid: 1..105 long ("home" attacks toward 105)
  by?: number; // ball position: 1..68 wide
  player?: string; // player involved (goal scorer, carded player, etc.)
  assist?: string; // assist provider, for goals
  card?: "yellow" | "red";
}

export interface ShootoutKick {
  side: "home" | "away";
  scored: boolean;
  taker: string;
}

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
}

export interface MatchResult {
  homeId: string; // player 1 ("home" side, only to map events)
  awayId: string; // player 2
  // The first half (0..45 + halftime marker) is generated at draft end; the second
  // half (46..90 + fulltime) is appended once both players confirm at halftime, so
  // it reflects the post-halftime lineups. The client re-reads this and resumes.
  timeline: MatchEvent[];
  secondHalfReady: boolean; // true once the 2nd half has been simulated
  firstHalfGoals: Record<string, number>;
  goals: Record<string, number>; // total goals (= first half until 2nd is ready)
  shootout: ShootoutKick[] | null; // penalty kicks, if it went there
  penaltyScore: Record<string, number> | null;
  strengths: Record<string, TeamStrength>;
  winnerId: string; // "" until the match is decided
  summary: string; // "" until the match is decided
}

/** Result of one World Cup campaign match (single full match, no halftime, no shootout). */
export interface GauntletResult {
  youId: string;
  oppId: string;
  oppName: string;
  timeline: MatchEvent[];
  youGoals: number;
  oppGoals: number;
  outcome: "win" | "draw" | "loss";
  shootout: ShootoutKick[] | null;
  penaltyScore: Record<string, number> | null;
  winnerId: string | null;
  wentToExtraTime: boolean;
}

/** A player's lineup submitted at halftime (used to re-simulate the 2nd half). */
export interface HalftimeLineup {
  formationId: string;
  mentality: Mentality;
  attackFocus?: AttackFocus;
  picks: {
    slotId: string;
    name: string;
    pos: Position;
    rating: number;
    pac?: number;
    sho?: number;
    pas?: number;
    dri?: number;
    def?: number;
    phy?: number;
    fromTeamId: string;
  }[];
}

// ---- Socket event signatures ----
export interface ServerToClient {
  roomUpdate: (state: RoomState) => void;
  errorMsg: (msg: string) => void;
  joined: (data: { code: string; youId: string }) => void;
}

export interface ClientToServer {
  createRoom: (
    data: { name: string; mode: GameMode; solo?: boolean },
    cb: (res: AckResult) => void,
  ) => void;
  joinRoom: (
    data: { code: string; name: string },
    cb: (res: AckResult) => void,
  ) => void;
  setup: (data: {
    formationId: string;
    mentality: Mentality;
    attackFocus?: AttackFocus;
  }) => void;
  ready: () => void;
  pick: (data: { slotId: string; playerName: string }) => void;
  repositionPick: (data: { fromSlotId: string; toSlotId: string }) => void;
  rerollTeam: () => void;
  halftimeReady: (data: HalftimeLineup) => void;
  rematch: () => void;
}

export interface AckResult {
  ok: boolean;
  error?: string;
  code?: string;
  youId?: string;
}
