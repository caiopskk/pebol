import { randomUUID } from "node:crypto";
import type {
  RoomState,
  PlayerPublic,
  GameMode,
  Mentality,
  AttackFocus,
  Team,
  Player,
  SquadPick,
  HalftimeLineup,
  Position,
} from "../../shared/types.js";
import { isHardcoreMode, isWorldCupMode } from "../../shared/gameMode.js";
import { TEAMS, getTeam } from "../../shared/data/teams.js";
import { WC_DRAFT_TEAMS } from "../../shared/data/worldcup.js";
import { getFormation, groupOf } from "../../shared/formations.js";
import { randomManager } from "../../shared/data/managers.js";
import {
  effectiveRating,
  openSlots,
  playerPositions,
  simulateFirstHalf,
  simulateSecondHalf,
} from "../../shared/engine.js";

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
  expelled?: Record<string, string[]>; // 1st-half sent-off players, by playerId
}

const rooms = new Map<string, Room>();

// Draft pool for the online 1v1 game. Defaults to the bundled clubs; the server
// swaps it for the official clubs from the database once they're loaded.
let teamPool: Team[] = TEAMS;
export function setTeamPool(teams: Team[]): void {
  teamPool = teams.length ? teams : TEAMS;
}

function draftPoolForMode(mode: GameMode): Team[] {
  return isWorldCupMode(mode) ? WC_DRAFT_TEAMS : teamPool;
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (rooms.has(code));
  return code;
}

// Reroll allowance per mode: Clássico (PvP/PvE) gets 5, Hardcore stays at 3.
function rerollsForMode(mode: GameMode): number {
  return isHardcoreMode(mode) ? 3 : 5;
}

function newPlayer(
  name: string,
  socketId: string | null,
  isAI = false,
  rerolls = 5,
): InternalPlayer {
  return {
    id: randomUUID(),
    name: name.trim().slice(0, 20) || "Jogador",
    connected: true,
    ready: false,
    formationId: null,
    mentality: null,
    attackFocus: "equilibrado",
    picks: [],
    rerollsRemaining: rerolls,
    preMatchReady: isAI,
    halftimeReady: isAI,
    socketId,
    isAI,
  };
}

function isPvP(room: Room): boolean {
  return room.players.length === 2 && room.players.every((p) => !p.isAI);
}

export function createRoom(
  name: string,
  mode: GameMode,
  socketId: string,
  solo = false,
) {
  const code = genCode();
  const host = newPlayer(name, socketId, false, rerollsForMode(mode));
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
  const guest = newPlayer(name, socketId, false, rerollsForMode(room.mode));
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

export function setup(
  room: Room,
  playerId: string,
  formationId: string,
  mentality: Mentality,
  attackFocus?: AttackFocus,
) {
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p) return;
  // tactics can be tweaked during lobby (formation) and during preMatch (ment/focus)
  if (room.phase !== "lobby" && room.phase !== "preMatch") return;
  if (!getFormation(formationId)) return;
  p.formationId = formationId;
  p.mentality = mentality;
  if (attackFocus) p.attackFocus = attackFocus;
}

export function ready(room: Room, playerId: string) {
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p || room.phase !== "lobby") return;
  if (!p.formationId || !p.mentality) return;
  p.ready = true;
  if (
    room.players.length === 2 &&
    room.players.every((pl) => pl.ready && pl.formationId)
  ) {
    startDraft(room);
  }
}

function drawTeam(room: Room): Team {
  const draftPool = draftPoolForMode(room.mode);
  const pool = draftPool.filter((t) => !room.usedTeamIds.includes(t.id));
  // recycle if the pool runs out (22 picks can exceed the team count)
  const src = pool.length ? pool : draftPool;
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

export function pick(
  room: Room,
  playerId: string,
  slotId: string,
  playerName: string,
): string | null {
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

function fitsSlotSector(player: Player, slotPos: Position) {
  return playerPositions(player).some((pos) => groupOf(pos) === groupOf(slotPos));
}

export function repositionPick(
  room: Room,
  playerId: string,
  fromSlotId: string,
  toSlotId: string,
): string | null {
  if (room.phase !== "draft") return "Não é fase de draft.";
  if (room.activePlayerId !== playerId) return "Não é a sua vez.";
  if (fromSlotId === toSlotId) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player?.formationId) return "Formação inválida.";
  const formation = getFormation(player.formationId);
  if (!formation) return "Formação inválida.";

  const fromSlot = formation.slots.find((s) => s.id === fromSlotId);
  const toSlot = formation.slots.find((s) => s.id === toSlotId);
  if (!fromSlot || !toSlot) return "Vaga inválida.";

  const pick = player.picks.find((p) => p.slotId === fromSlotId);
  if (!pick) return "Selecione um jogador escalado.";
  if (!fitsSlotSector(pick.player, toSlot.pos)) return "Troca fora do setor.";

  const targetPick = player.picks.find((p) => p.slotId === toSlotId);
  if (targetPick && !fitsSlotSector(targetPick.player, fromSlot.pos))
    return "Troca fora do setor.";

  pick.slotId = toSlotId;
  pick.effectiveRating = effectiveRating(pick.player, toSlot.pos);
  if (targetPick) {
    targetPick.slotId = fromSlotId;
    targetPick.effectiveRating = effectiveRating(targetPick.player, fromSlot.pos);
  }
  return null;
}

export function rerollTeam(room: Room, playerId: string): string | null {
  if (room.phase !== "draft") return "Não é fase de draft.";
  if (room.activePlayerId !== playerId) return "Não é a sua vez.";
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return "Jogador não encontrado.";
  if (player.isAI) return "A máquina não pode atualizar o time.";
  if ((player.rerollsRemaining ?? 0) <= 0)
    return "Você já usou suas 3 atualizações.";
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

// Hardcore vs the machine: buff the AI's strength so it's harder (not impossible)
// to win — on top of the hidden ratings. ~+2.5% ≈ the player winning ~40% of even
// matchups instead of ~50%.
const HARDCORE_AI_SCALE = 1.025;

function simInput(p: InternalPlayer, room: Room) {
  const hardcoreAI = p.isAI && isHardcoreMode(room.mode);
  return {
    id: p.id,
    name: p.name,
    picks: p.picks,
    formationId: p.formationId!,
    mentality: p.mentality!,
    attackFocus: p.attackFocus,
    strengthScale: hardcoreAI ? HARDCORE_AI_SCALE : 1,
  };
}

function finishDraft(room: Room) {
  room.players.forEach((p) => {
    p.preMatchReady = p.isAI;
    p.halftimeReady = p.isAI;
  });
  room.phase = "preMatch";
  room.currentTeam = null;
  room.activePlayerId = null;
}

function startMatch(room: Room) {
  const [p1, p2] = room.players;
  // only the first half is simulated now; the second half waits for halftime lineups
  const fh = simulateFirstHalf(simInput(p1, room), simInput(p2, room));
  room.expelled = fh.expelled;
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
}

export function readyPreMatch(room: Room, playerId: string) {
  if (room.phase !== "preMatch") return;
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p) return;
  if (!p.formationId || !p.mentality) return;
  p.preMatchReady = true;
  if (room.players.every((pl) => pl.preMatchReady)) {
    startMatch(room);
  }
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
      pac: pk.pac,
      sho: pk.sho,
      pas: pk.pas,
      dri: pk.dri,
      def: pk.def,
      phy: pk.phy,
    };
    return {
      slotId: pk.slotId,
      player,
      fromTeamId: pk.fromTeamId,
      effectiveRating: effectiveRating(player, slot.pos),
    };
  });
  p.formationId = lineup.formationId;
  p.mentality = lineup.mentality;
  if (lineup.attackFocus) p.attackFocus = lineup.attackFocus;
  p.picks = newPicks;
}

export function readyHalftime(
  room: Room,
  playerId: string,
  lineup?: HalftimeLineup,
) {
  if (room.phase !== "result" || !room.result) return;
  const p = room.players.find((pl) => pl.id === playerId);
  if (!p) return;
  if (lineup) applyHalftimeLineup(p, lineup);
  p.halftimeReady = true;

  // once both confirmed, simulate the second half with the updated lineups
  if (
    !room.result.secondHalfReady &&
    room.players.every((pl) => pl.halftimeReady)
  ) {
    const [p1, p2] = room.players;
    const sh = simulateSecondHalf(
      simInput(p1, room),
      simInput(p2, room),
      room.result.firstHalfGoals,
      room.expelled,
    );
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
      const score = effectiveRating(pl, slot.pos);
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
  room.expelled = undefined;
  for (const p of room.players) {
    p.picks = [];
    p.rerollsRemaining = rerollsForMode(room.mode);
    p.preMatchReady = p.isAI;
    p.halftimeReady = p.isAI;
    // the AI comes back ready; the human confirms again
    p.ready = p.isAI;
    // keep chosen formation/mentality to save time
  }
}

/** Build the public snapshot sent to clients (hides ratings in Hardcore mode). */
export function toPublic(room: Room): RoomState {
  const hide = isHardcoreMode(room.mode) && room.phase === "draft";
  const hasAI = room.players.some((p) => p.isAI);
  const rerollsEnabled =
    isPvP(room) || (hasAI && (room.mode === "classico" || room.mode === "worldcup"));
  const hiddenPlayer = (player: Player): Player => ({
    ...player,
    rating: 0,
    pac: undefined,
    sho: undefined,
    pas: undefined,
    dri: undefined,
    def: undefined,
    phy: undefined,
  });

  const players: PlayerPublic[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    isAI: p.isAI,
    rerollsRemaining: p.rerollsRemaining,
    ready: p.ready,
    preMatchReady: p.preMatchReady,
    halftimeReady: p.halftimeReady,
    formationId: p.formationId,
    mentality: p.mentality,
    attackFocus: p.attackFocus,
    picks: p.picks.map((pk) =>
      hide
        ? { ...pk, effectiveRating: 0, player: hiddenPlayer(pk.player) }
        : pk,
    ),
  }));

  let currentTeam = room.currentTeam;
  if (currentTeam && hide) {
    currentTeam = {
      ...currentTeam,
      players: currentTeam.players.map((pl) => hiddenPlayer(pl)),
      bench: currentTeam.bench?.map((pl) => hiddenPlayer(pl)),
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
    pvpRerollsEnabled: rerollsEnabled,
    hideRatings: hide,
    result: room.result,
  };
}

export type { Room };
