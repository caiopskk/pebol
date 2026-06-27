import type { GameMode, PlayerPublic, RoomState, SquadPick } from "../../../shared/types.js";
import { computeStrength } from "../../../shared/engine.js";
import { isHardcoreMode, isWorldCupMode } from "../../../shared/gameMode.js";

export interface MatchAchievementAwards {
  ids: string[];
  key: string;
  xp: number;
  xpReason: string;
}

export function draftAchievementIds(
  picks: SquadPick[],
  formationId: string,
  mode?: GameMode,
): string[] {
  if (picks.length < 11) return [];
  const strength = computeStrength(picks, formationId);
  const ids: string[] = [];
  if (strength.overall >= 85) ids.push("strong_draft");
  if (strength.overall >= 90) ids.push("elite_draft");
  if (strength.attack >= 90) ids.push("attack_90");
  if (strength.midfield >= 90) ids.push("midfield_90");
  if (strength.defense >= 90) ids.push("defense_90");
  if (strength.attack >= 85 && strength.midfield >= 85 && strength.defense >= 85) {
    ids.push("balanced_squad");
  }
  if (mode && isWorldCupMode(mode) && strength.overall >= 85) {
    ids.push("worldcup_pvp_strong_draft");
  }
  if (mode && isWorldCupMode(mode) && strength.overall >= 90) {
    ids.push("worldcup_pvp_elite_draft");
  }
  if (mode && isWorldCupMode(mode) && isHardcoreMode(mode) && strength.overall >= 85) {
    ids.push("worldcup_pvp_hardcore_draft");
  }
  return ids;
}

export function regularMatchAchievementAwards(
  state: RoomState,
  you: PlayerPublic,
  opp: PlayerPublic,
): MatchAchievementAwards | null {
  const r = state.result;
  if (!r?.winnerId) return null;
  const key = `match:${state.code}:${r.timeline.length}:${r.goals[you.id]}-${r.goals[opp.id]}:${r.winnerId}:${r.penaltyScore?.[you.id] ?? ""}-${r.penaltyScore?.[opp.id] ?? ""}`;
  const ids: string[] = [];
  const youWon = r.winnerId === you.id;
  const isPvp = !opp.isAI;
  const isWorldCupPvp = isWorldCupMode(state.mode);
  const playerGoals = new Map<string, number>();
  const playerAssists = new Map<string, number>();
  let youHalfGoals = 0;
  let oppHalfGoals = 0;
  let youRedCard = false;

  for (const ev of r.timeline) {
    const pid = ev.side === "home" ? r.homeId : ev.side === "away" ? r.awayId : "";
    if (ev.type === "card" && ev.card === "red" && pid === you.id) youRedCard = true;
    if (ev.type !== "goal") continue;
    if (ev.minute <= 45) {
      if (pid === you.id) youHalfGoals++;
      else if (pid === opp.id) oppHalfGoals++;
    }
    if (pid !== you.id) continue;
    if (ev.player) playerGoals.set(ev.player, (playerGoals.get(ev.player) ?? 0) + 1);
    if (ev.assist) playerAssists.set(ev.assist, (playerAssists.get(ev.assist) ?? 0) + 1);
  }

  const yourGoals = r.goals[you.id] ?? 0;
  const oppGoals = r.goals[opp.id] ?? 0;
  if (yourGoals > 0) ids.push("first_goal");
  if (youWon) ids.push("first_win");
  if (youWon && oppGoals === 0) ids.push("clean_sheet");
  if (youWon && r.penaltyScore) ids.push("penalty_win");
  const totalAssists = [...playerAssists.values()].reduce((sum, n) => sum + n, 0);
  if ([...playerGoals.values()].some((n) => n >= 3)) ids.push("hat_trick");
  if (totalAssists >= 3) ids.push("assist_master");
  const avg = you.picks.length
    ? you.picks.reduce((sum, p) => sum + p.effectiveRating, 0) / you.picks.length
    : 0;
  if (avg >= 85) ids.push("strong_draft");
  if (youWon && opp.isAI) ids.push("beat_machine");
  if (youWon && isHardcoreMode(state.mode)) ids.push("hardcore_win");
  if (youWon && isPvp) ids.push("pvp_win");
  if (youWon && isPvp && !isWorldCupPvp) ids.push("pvp_club_win");
  if (youWon && isPvp && isHardcoreMode(state.mode)) ids.push("pvp_hardcore_win");
  if (youWon && isPvp && isWorldCupPvp) ids.push("pvp_worldcup_win");
  if (youWon && isPvp && isWorldCupPvp && isHardcoreMode(state.mode)) {
    ids.push("pvp_worldcup_hardcore_win");
  }
  if (youWon && isPvp && r.penaltyScore) ids.push("pvp_penalty_win");
  if (youWon && isPvp && oppGoals === 0) ids.push("pvp_clean_sheet");
  if (youWon && yourGoals - oppGoals >= 3) ids.push("big_win");
  if (youWon && youHalfGoals < oppHalfGoals) ids.push("comeback_win");
  if (youWon && youRedCard) ids.push("red_card_win");

  return {
    ids,
    key,
    xp: 25 + (youWon ? 25 : 0) + (r.penaltyScore ? 10 : 0),
    xpReason: youWon ? "Partida vencida" : "Partida concluída",
  };
}
