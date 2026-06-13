import { io, Socket } from "socket.io-client";
import type { RoomState, AckResult, GameMode, Mentality, HalftimeLineup } from "../../shared/types.js";

// In dev, connect straight to the server (port 3001) on the same host, so it works
// on localhost and on a LAN. In production the client is served by the server (same origin).
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? `${location.protocol}//${location.hostname}:3001`
    : undefined); // in production without env, use the same origin
export const socket: Socket = io(SERVER_URL, { autoConnect: true });

export function onRoomUpdate(fn: (s: RoomState) => void) {
  socket.on("roomUpdate", fn);
}
export function onError(fn: (msg: string) => void) {
  socket.on("errorMsg", fn);
}

export function createRoom(name: string, mode: GameMode, solo = false): Promise<AckResult> {
  return new Promise((resolve) => socket.emit("createRoom", { name, mode, solo }, resolve));
}
export function joinRoom(code: string, name: string): Promise<AckResult> {
  return new Promise((resolve) => socket.emit("joinRoom", { code, name }, resolve));
}
export function sendSetup(formationId: string, mentality: Mentality) {
  socket.emit("setup", { formationId, mentality });
}
export function sendReady() {
  socket.emit("ready");
}
export function sendPick(slotId: string, playerName: string) {
  socket.emit("pick", { slotId, playerName });
}
export function sendRerollTeam() {
  socket.emit("rerollTeam");
}
export function sendHalftimeReady(lineup: HalftimeLineup) {
  socket.emit("halftimeReady", lineup);
}
export function sendRematch() {
  socket.emit("rematch");
}
export function leaveCurrentRoom() {
  socket.disconnect();
  socket.connect();
}
