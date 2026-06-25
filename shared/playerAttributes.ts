import type { Player, Position } from "./types.js";

export const PLAYER_ATTRIBUTE_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"] as const;

export type PlayerAttributeKey = (typeof PLAYER_ATTRIBUTE_KEYS)[number];

type AttributeProfile = Record<PlayerAttributeKey, number>;

const PROFILE_BY_POSITION: Record<Position, AttributeProfile> = {
  GK: { pac: -38, sho: -48, pas: -23, dri: -34, def: 4, phy: -6 },
  RB: { pac: 4, sho: -23, pas: -6, dri: -4, def: -2, phy: -4 },
  LB: { pac: 4, sho: -23, pas: -6, dri: -4, def: -2, phy: -4 },
  CB: { pac: -13, sho: -32, pas: -13, dri: -18, def: 6, phy: 5 },
  RWB: { pac: 6, sho: -18, pas: -4, dri: -2, def: -5, phy: -5 },
  LWB: { pac: 6, sho: -18, pas: -4, dri: -2, def: -5, phy: -5 },
  CDM: { pac: -8, sho: -16, pas: -2, dri: -7, def: 3, phy: 2 },
  CM: { pac: -6, sho: -9, pas: 3, dri: -2, def: -5, phy: -5 },
  CAM: { pac: -1, sho: 0, pas: 3, dri: 4, def: -24, phy: -14 },
  RM: { pac: 6, sho: -4, pas: 0, dri: 4, def: -18, phy: -12 },
  LM: { pac: 6, sho: -4, pas: 0, dri: 4, def: -18, phy: -12 },
  RW: { pac: 7, sho: 0, pas: -1, dri: 5, def: -28, phy: -14 },
  LW: { pac: 7, sho: 0, pas: -1, dri: 5, def: -28, phy: -14 },
  CF: { pac: 1, sho: 4, pas: 0, dri: 2, def: -31, phy: -8 },
  ST: { pac: -1, sho: 6, pas: -9, dri: -2, def: -33, phy: 0 },
};

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function variation(seed: string, key: PlayerAttributeKey): number {
  const h = hashString(`${seed}:${key}`);
  return (h % 9) - 4;
}

function clampAttribute(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function derivePlayerAttributes(player: Player): Required<
  Pick<Player, PlayerAttributeKey>
> {
  const profile = PROFILE_BY_POSITION[player.pos];
  const seed = `${player.name}:${player.pos}:${player.rating}`;
  const derived = Object.fromEntries(
    PLAYER_ATTRIBUTE_KEYS.map((key) => [
      key,
      clampAttribute(player.rating + profile[key] + variation(seed, key)),
    ]),
  ) as Required<Pick<Player, PlayerAttributeKey>>;

  // Keep elite overall cards feeling elite even when a profile offset is harsh.
  if (player.rating >= 88) {
    for (const key of PLAYER_ATTRIBUTE_KEYS) {
      const floor = key === "def" && ["RW", "LW", "CF", "ST", "CAM"].includes(player.pos)
        ? 28
        : key === "sho" && player.pos === "GK"
          ? 35
          : 55;
      derived[key] = Math.max(derived[key], floor);
    }
  }

  return derived;
}

export function withDerivedAttributes(player: Player): Player {
  const derived = derivePlayerAttributes(player);
  return {
    ...player,
    pac: player.pac ?? derived.pac,
    sho: player.sho ?? derived.sho,
    pas: player.pas ?? derived.pas,
    dri: player.dri ?? derived.dri,
    def: player.def ?? derived.def,
    phy: player.phy ?? derived.phy,
  };
}
