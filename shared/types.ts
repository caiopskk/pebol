// Shared types between client and server.

/** Position group, used to compute the out-of-position penalty. */
export type PosGroup = "GK" | "DEF" | "MID" | "ATT";

/** Specific position (for display and fine-grained penalty). */
export type Position =
  | "GK"
  | "RB" | "LB" | "CB" | "RWB" | "LWB"
  | "CDM" | "CM" | "CAM" | "RM" | "LM"
  | "RW" | "LW" | "CF" | "ST";

export interface Player {
  name: string;
  pos: Position;
  rating: number; // 60-99
}

export interface Team {
  id: string;
  name: string;
  season: string; // e.g. "2025" or "2024/25"
  league: string;
  players: Player[]; // starters / main draft options
  bench?: Player[];  // reserves, also available in the draft
}

export type Mentality = "aura" | "equilibrada" | "retranca" | "pressao" | "posse" | "contra_ataque";
export type GameMode = "classico" | "pica";

/** A slot in the formation on the pitch. */
export interface FormationSlot {
  id: string;       // e.g. "ST", "CB1"
  pos: Position;    // position this slot asks for
  // pitch coordinates (0-100), from the formation owner's point of view
  x: number;
  y: number;
}

export interface Formation {
  id: string;     // e.g. "4-3-3"
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

export type Phase = "lobby" | "setup" | "draft" | "result";

export interface PlayerPublic {
  id: string;
  name: string;
  connected: boolean;
  isAI?: boolean;
  rerollsRemaining?: number;
  ready: boolean;
  formationId: string | null;
  mentality: Mentality | null;
  picks: SquadPick[];
}

export interface RoomState {
  code: string;
  phase: Phase;
  mode: GameMode;
  hostId: string;
  totalSlots: number;      // 11
  players: PlayerPublic[];
  currentTeam: Team | null;       // team drawn for the current turn
  round: number;                  // current round (0-based)
  activePlayerId: string | null;  // whose turn it is to pick
  takenThisRound: string[];       // players already taken from the current team
  usedTeamIds: string[];
  pvpRerollsEnabled: boolean;
  hideRatings: boolean;           // Pica mode: hide ratings during the draft
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
  | "sub"
  | "injury"
  | "var"
  | "halftime"
  | "fulltime"
  | "penalty"
  | "info";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: "home" | "away" | null;
  text: string;
  ballZone?: "center" | "midfield" | "final_third" | "box" | "goal" | "defense" | "corner" | "penalty";
  player?: string;       // player involved (goal scorer, carded player, etc.)
  assist?: string;       // assist provider, for goals
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
  timeline: MatchEvent[];            // single match, minute 0..90 (+ stoppage)
  goals: Record<string, number>;     // regular-time goals by playerId
  shootout: ShootoutKick[] | null;   // penalty kicks, if it went there
  penaltyScore: Record<string, number> | null;
  strengths: Record<string, TeamStrength>;
  winnerId: string;                  // always decided (penalties break a tie)
  summary: string;
}

// ---- Socket event signatures ----
export interface ServerToClient {
  roomUpdate: (state: RoomState) => void;
  errorMsg: (msg: string) => void;
  joined: (data: { code: string; youId: string }) => void;
}

export interface ClientToServer {
  createRoom: (data: { name: string; mode: GameMode; solo?: boolean }, cb: (res: AckResult) => void) => void;
  joinRoom: (data: { code: string; name: string }, cb: (res: AckResult) => void) => void;
  setup: (data: { formationId: string; mentality: Mentality }) => void;
  ready: () => void;
  pick: (data: { slotId: string; playerName: string }) => void;
  rerollTeam: () => void;
  rematch: () => void;
}

export interface AckResult {
  ok: boolean;
  error?: string;
  code?: string;
  youId?: string;
}
