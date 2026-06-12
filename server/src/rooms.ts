import { randomUUID } from "node:crypto";
import type {
  RoomState,
  PlayerPublic,
  GameMode,
  Mentality,
  Team,
  SquadPick,
  HalftimeLineup,
  Position,
} from "../../shared/types.js";
import { TEAMS, getTeam } from "../../shared/data/teams.js";
import { getFormation } from "../../shared/formations.js";
import { randomManager } from "../../shared/data/managers.js";
import { effectiveRating, openSlots, positionPenalty, simulateFirstHalf, simulateSecondHalf } from "../../shared/engine.js";

const TOTAL_SLOTS = 11;

interface InternalPlayer extends PlayerPublic {
  socketId: string | null;
  isAI: boolean;
}

interface Room {
  code: string;
  phase: RoomState["phase"];
  mode: GameMode;
  hostId: string;
  players: InternalPlayer[];
  currentTeam: Team | null;
  round: number;
  turn: number; // 0..21 — each turn is one player's, with its own drawn team
  activePlayerId: string | null;
  takenThisRound: string[];
  usedTeamIds: string[];
  result: RoomState["result"];
}

const rooms = new Map<string, Room>();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function newPlayer(name: string, socketId: string | null, isAI = false): InternalPlayer {
  return {
    id: randomUUID(),
    name: name.trim().slice(0, 20) || "Jogador",
    connected: true,
    ready: false,
    formationId: null,
    mentality: null,
    picks: [],
    rerollsRemaining: 3,
    halftimeReady: isAI,
    socketId,
    isAI,
  };
}

function isPvP(room: Room): boolean {
  return room.players.length === 2 && room.players.every((p) => !p.isAI);
}

export function createRoom(name: string, mode: GameMode, socketId: string, solo = false) {
  const code = genCode();
  const host = newPlayer(name, socketId);
  const room: Room = {
    code,
    phase: "lobby",
    mode,
    hostId: host.id,
    players: [host],
    currentTeam: null,
    round: 0,
    turn: 0,
    activePlayerId: null,
    takenThisRound: [],
    usedTeamIds: [],
    result: null,
  };

  if (solo) {
    const manager = randomManager();
    const ai = newPlayer(manager.name, null, true);
    ai.formationId = manager.formationId;
    ai.mentality = manager.mentality;
    ai.ready = true;
    room.players.push(ai);
  }

  rooms.set(code, room);
  return { room, playerId: host.id };
}

export function joinRoom(code: string, name: string, socketId: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Sala não encontrada." };
  if (room.players.length >= 2) {
    // allow reconnecting to a disconnected slot
    const slot = room.players.find((p) => !p.connected);
    if (!slot) return { error: "Sala cheia." };
    slot.connected = true;
    slot.socketId = socketId;
    return { room, playerId: slot.id };
  }
  if (room.phase !== "lobby") return { error: "Partida já começou." };
  const guest = newPlayer(name, socketId);
  room.players.push(guest);
  return { room, playerId: guest.id };
}

export function findRoomByCode(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function findRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) return room;
  }
  return undefined;
}

export function handleDisconnect(socketId: string): Room | undefined {
  const room = findRoomBySocket(socketId);
  if (!room) return undefined;
  const p = room.players.find((pl) => pl.socketId === socketId);
  if (p) {
    p.connected = false;
    p.socketId = null;
  }
  // drop the room if everyone left while still in the lobby
  if (room.players.every((pl) => !pl.connected) && room.phase === "lobby") {
    rooms.delete(room.code);
    return undefined;
  }
  return room;
}

export function setup(room: Room, playerId: string, formationId: string, mentality: Mentality) {
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p || room.phase !== "lobby") return;
  if (!getFormation(formationId)) return;
  p.formationId = formationId;
  p.mentality = mentality;
}

export function ready(room: Room, playerId: string) {
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p || room.phase !== "lobby") return;
  if (!p.formationId || !p.mentality) return;
  p.ready = true;
  if (room.players.length === 2 && room.players.every((pl) => pl.ready && pl.formationId)) {
    startDraft(room);
  }
}

function drawTeam(room: Room): Team {
  const pool = TEAMS.filter((t) => !room.usedTeamIds.includes(t.id));
  // recycle if the pool runs out (22 picks can exceed the team count)
  const src = pool.length ? pool : TEAMS;
  if (!pool.length) room.usedTeamIds = [];
  const team = src[Math.floor(Math.random() * src.length)];
  return team;
}

function startDraft(room: Room) {
  room.phase = "draft";
  room.turn = 0;
  room.round = 0;
  // host starts; each turn switches the active player AND draws a new team
  room.activePlayerId = room.players[0].id;
  beginTurn(room);
}

function beginTurn(room: Room) {
  room.currentTeam = drawTeam(room);
  room.takenThisRound = [];
}

export function pick(room: Room, playerId: string, slotId: string, playerName: string): string | null {
  if (room.phase !== "draft") return "Não é fase de draft.";
  if (room.activePlayerId !== playerId) return "Não é a sua vez.";
  const player = room.players.find((p) => p.id === playerId)!;
  const team = room.currentTeam;
  if (!team) return "Nenhum time sorteado.";

  const realPlayer = team.players.find((pl) => pl.name === playerName);
  if (!realPlayer) return "Jogador não está neste time.";

  const open = openSlots(player);
  if (!open.includes(slotId)) return "Vaga inválida ou já preenchida.";

  const formation = getFormation(player.formationId!)!;
  const slot = formation.slots.find((s) => s.id === slotId)!;

  const newPick: SquadPick = {
    slotId,
    player: realPlayer,
    fromTeamId: team.id,
    effectiveRating: effectiveRating(realPlayer, slot.pos),
  };
  player.picks.push(newPick);

  advanceTurn(room);
  return null;
}

export function rerollTeam(room: Room, playerId: string): string | null {
  if (room.phase !== "draft") return "Não é fase de draft.";
  if (!isPvP(room)) return "Atualizar time só está disponível no PvP.";
  if (room.activePlayerId !== playerId) return "Não é a sua vez.";
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return "Jogador não encontrado.";
  if ((player.rerollsRemaining ?? 0) <= 0) return "Você já usou suas 3 atualizações.";
  if (room.currentTeam) room.usedTeamIds.push(room.currentTeam.id);
  player.rerollsRemaining = (player.rerollsRemaining ?? 0) - 1;
  beginTurn(room);
  return null;
}

function advanceTurn(room: Room) {
  // discard the team drawn this turn
  if (room.currentTeam) room.usedTeamIds.push(room.currentTeam.id);

  const totalPicks = room.players.reduce((a, p) => a + p.picks.length, 0);
  if (totalPicks >= TOTAL_SLOTS * 2) {
    finishDraft(room);
    return;
  }

  // pass the turn to the other player and draw a new team
  room.turn++;
  room.round = Math.floor(room.turn / 2);
  const other = room.players.find((p) => p.id !== room.activePlayerId)!;
  room.activePlayerId = other.id;
  beginTurn(room);
}

function simInput(p: InternalPlayer) {
  return { id: p.id, name: p.name, picks: p.picks, formationId: p.formationId!, mentality: p.mentality! };
}

function finishDraft(room: Room) {
  const [p1, p2] = room.players;
  room.players.forEach((p) => {
    p.halftimeReady = p.isAI;
  });
  // only the first half is simulated now; the second half waits for halftime lineups
  const fh = simulateFirstHalf(simInput(p1), simInput(p2));
  room.result = {
    homeId: p1.id,
    awayId: p2.id,
    timeline: fh.timeline,
    secondHalfReady: false,
    firstHalfGoals: fh.goals,
    goals: fh.goals,
    shootout: null,
    penaltyScore: null,
    strengths: fh.strengths,
    winnerId: "",
    summary: "",
  };
  room.phase = "result";
  room.currentTeam = null;
  room.activePlayerId = null;
}

/** Rebuild a player's lineup from a halftime submission (formation, mentality, slots). */
function applyHalftimeLineup(p: InternalPlayer, lineup: HalftimeLineup) {
  const formation = getFormation(lineup.formationId);
  if (!formation) return;
  if (lineup.picks.length !== TOTAL_SLOTS) return;
  const slotIds = new Set(formation.slots.map((s) => s.id));
  if (new Set(lineup.picks.map((pk) => pk.slotId)).size !== TOTAL_SLOTS) return;
  if (!lineup.picks.every((pk) => slotIds.has(pk.slotId))) return;

  const newPicks: SquadPick[] = lineup.picks.map((pk) => {
    const slot = formation.slots.find((s) => s.id === pk.slotId)!;
    const player = {
      name: String(pk.name).slice(0, 40),
      pos: pk.pos as Position,
      rating: Math.max(50, Math.min(99, Math.round(pk.rating))),
    };
    return { slotId: pk.slotId, player, fromTeamId: pk.fromTeamId, effectiveRating: effectiveRating(player, slot.pos) };
  });
  p.formationId = lineup.formationId;
  p.mentality = lineup.mentality;
  p.picks = newPicks;
}

export function readyHalftime(room: Room, playerId: string, lineup?: HalftimeLineup) {
  if (room.phase !== "result" || !room.result) return;
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p) return;
  if (lineup) applyHalftimeLineup(p, lineup);
  p.halftimeReady = true;

  // once both confirmed, simulate the second half with the updated lineups
  if (!room.result.secondHalfReady && room.players.every((pl) => pl.halftimeReady)) {
    const [p1, p2] = room.players;
    const sh = simulateSecondHalf(simInput(p1), simInput(p2), room.result.firstHalfGoals);
    room.result.timeline = [...room.result.timeline, ...sh.timeline];
    room.result.secondHalfReady = true;
    room.result.goals = sh.goals;
    room.result.shootout = sh.shootout;
    room.result.penaltyScore = sh.penaltyScore;
    room.result.strengths = sh.strengths;
    room.result.winnerId = sh.winnerId;
    room.result.summary = sh.summary;
  }
}

/** Is it the AI's turn to pick? */
export function isAITurn(room: Room): boolean {
  if (room.phase !== "draft") return false;
  const active = room.players.find((p) => p.id === room.activePlayerId);
  return !!active?.isAI;
}

/** AI picks the best available player for the best-fitting slot. */
export function aiPick(room: Room): void {
  const ai = room.players.find((p) => p.id === room.activePlayerId);
  if (!ai || !ai.isAI || !room.currentTeam) return;
  const open = openSlots(ai);
  const formation = getFormation(ai.formationId!)!;

  let best: { slotId: string; name: string; score: number } | null = null;
  for (const pl of room.currentTeam.players) {
    for (const slotId of open) {
      const slot = formation.slots.find((s) => s.id === slotId)!;
      const score = pl.rating - positionPenalty(pl.pos, slot.pos);
      if (!best || score > best.score) best = { slotId, name: pl.name, score };
    }
  }
  if (best) pick(room, ai.id, best.slotId, best.name);
}

export function rematch(room: Room) {
  if (room.phase !== "result") return;
  room.phase = "lobby";
  room.round = 0;
  room.turn = 0;
  room.currentTeam = null;
  room.activePlayerId = null;
  room.takenThisRound = [];
  room.usedTeamIds = [];
  room.result = null;
  for (const p of room.players) {
    p.picks = [];
    p.rerollsRemaining = 3;
    p.halftimeReady = p.isAI;
    // the AI comes back ready; the human confirms again
    p.ready = p.isAI;
    // keep chosen formation/mentality to save time
  }
}

/** Build the public snapshot sent to clients (hides ratings in Pica mode). */
export function toPublic(room: Room): RoomState {
  const hide = room.mode === "pica" && room.phase === "draft";

  const players: PlayerPublic[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    isAI: p.isAI,
    rerollsRemaining: p.rerollsRemaining,
    ready: p.ready,
    halftimeReady: p.halftimeReady,
    formationId: p.formationId,
    mentality: p.mentality,
    picks: p.picks.map((pk) =>
      hide
        ? { ...pk, effectiveRating: 0, player: { ...pk.player, rating: 0 } }
        : pk
    ),
  }));

  let currentTeam = room.currentTeam;
  if (currentTeam && hide) {
    currentTeam = {
      ...currentTeam,
      players: currentTeam.players.map((pl) => ({ ...pl, rating: 0 })),
      bench: currentTeam.bench?.map((pl) => ({ ...pl, rating: 0 })),
    };
  }

  return {
    code: room.code,
    phase: room.phase,
    mode: room.mode,
    hostId: room.hostId,
    totalSlots: TOTAL_SLOTS,
    players,
    currentTeam,
    round: room.round,
    activePlayerId: room.activePlayerId,
    takenThisRound: room.takenThisRound,
    usedTeamIds: room.usedTeamIds,
    pvpRerollsEnabled: isPvP(room),
    hideRatings: hide,
    result: room.result,
  };
}

export type { Room };
