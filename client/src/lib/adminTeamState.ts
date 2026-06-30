import type { Player } from "../../../shared/types.js";
import type { AccountUser, AdminTeam } from "../api.js";
import { ALL_POS } from "./teamImport.js";

export function canEditTeam(account: AccountUser | null, team: AdminTeam): boolean {
  if (!account) return false;
  return team.ownerId ? team.ownerId === account.id : account.role === "admin";
}

export function blankTeam(): AdminTeam {
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
