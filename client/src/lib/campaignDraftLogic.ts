import type { Player } from "../../../shared/types.js";
import { effectiveRating, playerPositions } from "../../../shared/engine.js";
import { getFormation, groupOf } from "../../../shared/formations.js";
import { WC_DRAFT_TEAMS } from "../../../shared/data/worldcup.js";
import type { CampaignState } from "../campaignTypes.js";

export function campaignOpenSlots(c: CampaignState) {
  const f = getFormation(c.formationId)!;
  const filled = new Set(c.picks.map((p) => p.slotId));
  return f.slots.filter((s) => !filled.has(s.id));
}

function fitsSlotSector(player: Player, slotPos: Player["pos"]) {
  return playerPositions(player).some((pos) => groupOf(pos) === groupOf(slotPos));
}

export function campaignSelectable(c: CampaignState): Set<string> {
  if (!c.currentTeam) return new Set();
  const openGroups = new Set(campaignOpenSlots(c).map((s) => groupOf(s.pos)));
  return new Set(
    c.currentTeam.players
      .filter((p) =>
        playerPositions(p).some((pos) => openGroups.has(groupOf(pos))),
      )
      .map((p) => p.name),
  );
}

export function drawCampaignTeam(c: CampaignState): boolean {
  for (let tries = 0; tries < 10; tries++) {
    const pool = WC_DRAFT_TEAMS.filter((t) => !c.usedTeamIds.includes(t.id));
    const src = pool.length ? pool : WC_DRAFT_TEAMS;
    if (!pool.length) c.usedTeamIds = [];
    c.currentTeam = src[Math.floor(Math.random() * src.length)];
    c.selectedPlayer = null;
    if (campaignSelectable(c).size) return true;
    c.usedTeamIds.push(c.currentTeam.id);
  }
  return false;
}

export function placeCampaignPlayer(
  c: CampaignState,
  slotId: string,
  player: Player,
): boolean {
  if (!c.currentTeam) return false;
  const slot = getFormation(c.formationId)?.slots.find((s) => s.id === slotId);
  if (!slot || c.picks.some((p) => p.slotId === slotId)) return false;
  if (!fitsSlotSector(player, slot.pos)) return false;
  c.selectedPickSlotId = null;
  c.picks.push({
    slotId,
    player,
    fromTeamId: c.currentTeam.id,
    effectiveRating: slot ? effectiveRating(player, slot.pos) : player.rating,
  });
  c.usedTeamIds.push(c.currentTeam.id);
  c.selectedPlayer = null;
  return true;
}

export function relocateCampaignPick(
  c: CampaignState,
  fromSlotId: string,
  toSlotId: string,
): boolean {
  const pick = c.picks.find((p) => p.slotId === fromSlotId);
  if (!pick) return false;
  const formation = getFormation(c.formationId);
  const fromSlot = formation?.slots.find((s) => s.id === fromSlotId);
  const slot = formation?.slots.find((s) => s.id === toSlotId);
  if (!fromSlot || !slot || !fitsSlotSector(pick.player, slot.pos)) return false;
  const targetPick = c.picks.find((p) => p.slotId === toSlotId);
  if (targetPick && !fitsSlotSector(targetPick.player, fromSlot.pos))
    return false;
  pick.slotId = toSlotId;
  pick.effectiveRating = effectiveRating(pick.player, slot.pos);
  if (targetPick) {
    targetPick.slotId = fromSlotId;
    targetPick.effectiveRating = effectiveRating(targetPick.player, fromSlot.pos);
  }
  c.selectedPickSlotId = null;
  return true;
}
