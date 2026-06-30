import type {
  AttackFocus,
  Mentality,
  PlayerPublic,
  SquadPick,
} from "../../../shared/types.js";
import { attackFocusReport, computeStrength } from "../../../shared/engine.js";
import { MENTALITIES, mentalityEdge } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "../components/SetupBoard.js";
import type { TeamStrengthData } from "../components/CupStatus.js";
import type { BannerSpec } from "../components/TacticBanner.js";

export function mentalityLabel(m: Mentality): string {
  return MENTALITIES.find((x) => x.id === m)?.name ?? m;
}

export function attackFocusLabel(f: AttackFocus | undefined): string {
  return (
    ATTACK_FOCUS_OPTIONS.find((x) => x.id === (f ?? "equilibrado"))?.name ??
    "Equilibrado"
  );
}

export function attackFocusBannerSpec(
  picks: SquadPick[],
  focus: AttackFocus | undefined,
): BannerSpec | null {
  if (picks.length < 5) return null;
  const report = attackFocusReport(picks);
  const current = focus ?? "equilibrado";
  const wide = report.wide == null ? "--" : Math.round(report.wide);
  const central = report.central == null ? "--" : Math.round(report.central);
  const detail = `Lados ${wide} · Meio ${central} · OVR ${Math.round(report.overall)}`;
  if (report.best === "equilibrado") {
    return {
      kind: "good",
      text: `Elenco equilibrado: qualquer foco funciona. ${detail}.`,
    };
  }
  const bestLabel = attackFocusLabel(report.best).toLowerCase();
  if (current === report.best) {
    return {
      kind: "good",
      text: `Foco encaixado: seu elenco rende melhor ${bestLabel}. ${detail}.`,
    };
  }
  if (current !== "equilibrado") {
    return {
      kind: "bad",
      text: `Foco desalinhado: seu elenco pede ${bestLabel}. ${detail}.`,
    };
  }
  return {
    kind: "tip",
    text: `Dica de foco: seu elenco parece melhor ${bestLabel}. ${detail}.`,
  };
}

export function picksOvr(p: PlayerPublic | undefined): number {
  if (!p || !p.picks.length) return 0;
  return Math.round(
    p.picks.reduce((sum, pk) => sum + pk.effectiveRating, 0) / p.picks.length,
  );
}

export function teamStrengthData(
  p: PlayerPublic | undefined,
  hideRatings: boolean,
): TeamStrengthData {
  if (!p) return { state: "none" };
  if (hideRatings) return { state: "hidden" };
  if (!p.picks.length || !p.formationId) return { state: "none" };
  const s = computeStrength(p.picks, p.formationId);
  return {
    state: "ok",
    overall: s.overall,
    attack: s.attack,
    midfield: s.midfield,
    defense: s.defense,
  };
}

export function campaignTacticBanners({
  picks,
  mentality,
  attackFocus,
  opponentMentality,
  hideRatings,
}: {
  picks: SquadPick[];
  mentality: Mentality;
  attackFocus: AttackFocus;
  opponentMentality: Mentality;
  hideRatings: boolean;
}): BannerSpec[] {
  if (hideRatings) {
    return [
      {
        kind: "hardcore",
        text: "Modo Hardcore: ratings e dicas táticas estão ocultos.",
      },
    ];
  }

  const counterOf = (m: Mentality): Mentality | undefined =>
    MENTALITIES.find((x) => x.counters === m)?.id;
  const edge = mentalityEdge(mentality, opponentMentality);
  const goodCounter = counterOf(opponentMentality);
  const banners: BannerSpec[] = [];

  if (edge === "a") {
    banners.push({
      kind: "good",
      text: `Vantagem tática: seu estilo neutraliza ${mentalityLabel(opponentMentality)}.`,
    });
  } else if (edge === "b") {
    banners.push({
      kind: "bad",
      text: `Cuidado: ${mentalityLabel(opponentMentality)} neutraliza seu estilo.${goodCounter ? ` Considere ${mentalityLabel(goodCounter)}.` : ""}`,
    });
  } else if (goodCounter) {
    banners.push({
      kind: "tip",
      text: `Dica: ${mentalityLabel(goodCounter)} neutraliza ${mentalityLabel(opponentMentality)}.`,
    });
  }

  const focusSpec = attackFocusBannerSpec(picks, attackFocus);
  if (focusSpec) banners.push(focusSpec);
  return banners;
}
