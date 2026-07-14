import type {
  MatchEvent,
  MatchResult,
  PlayerPublic,
  RoomState,
} from "../../../shared/types.js";
import type {
  LeaderCardData,
  LogEventItem,
  StrengthRow,
} from "../components/ResultSummary.js";

interface Leader {
  name: string;
  val: string;
  side: "you" | "opp";
}

export type MatchOutcome = "win" | "draw" | "lose";

export function matchOutcome(
  result: MatchResult,
  youId: string,
  opponentId: string,
): MatchOutcome {
  if (result.penaltyScore) return result.winnerId === youId ? "win" : "lose";
  const youGoals = result.goals[youId] ?? 0;
  const opponentGoals = result.goals[opponentId] ?? 0;
  if (youGoals === opponentGoals) return "draw";
  return youGoals > opponentGoals ? "win" : "lose";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

export function computeLeaders(
  r: MatchResult,
  youId: string,
  players: RoomState["players"],
) {
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  const sideOf = new Map<string, "you" | "opp">();
  const tag = (sd: "home" | "away" | null) =>
    (sd === "home" ? r.homeId : r.awayId) === youId ? "you" : "opp";

  for (const e of r.timeline) {
    if (e.type !== "goal") continue;
    if (e.player) {
      goals.set(e.player, (goals.get(e.player) ?? 0) + 1);
      sideOf.set(e.player, tag(e.side));
    }
    if (e.assist) {
      assists.set(e.assist, (assists.get(e.assist) ?? 0) + 1);
      sideOf.set(e.assist, tag(e.side));
    }
  }

  const top = (m: Map<string, number>, unit: string): Leader | null => {
    let best: [string, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best
      ? {
          name: best[0],
          val: `${best[1]} ${unit}${best[1] > 1 ? "s" : ""}`,
          side: sideOf.get(best[0])!,
        }
      : null;
  };

  const scorer = top(goals, "gol");
  const assist = top(assists, "assistência");
  const opponentId = players.find((player) => player.id !== youId)?.id ?? "";
  const outcome = matchOutcome(r, youId, opponentId);
  const winnerSide: "you" | "opp" = outcome === "win" ? "you" : "opp";
  let motm: Leader | null = null;
  let motmGoals = 0;
  for (const [name, n] of goals) {
    if (sideOf.get(name) !== winnerSide) continue;
    if (n > motmGoals) {
      motmGoals = n;
      motm = { name, val: `${n} gol${n > 1 ? "s" : ""}`, side: winnerSide };
    }
  }
  if (!motm) {
    const winner = players.find((p) =>
      winnerSide === "you" ? p.id === youId : p.id !== youId,
    );
    const best = [...(winner?.picks ?? [])].sort(
      (a, b) => b.effectiveRating - a.effectiveRating,
    )[0];
    if (best)
      motm = {
        name: best.player.name,
        val: `${best.effectiveRating} de over`,
        side: winnerSide,
      };
  }

  return { scorer, assist, motm };
}

export function leaderCardData(
  label: string,
  data: Leader | null,
): LeaderCardData {
  return {
    label,
    name: data?.name ?? null,
    val: data ? data.val : "Sem destaque",
    initials: data ? initials(data.name) : null,
    side: data?.side ?? null,
  };
}

export function eventLogParts(
  r: MatchResult,
  you: PlayerPublic,
  opp: PlayerPublic,
): { important: LogEventItem[]; full: LogEventItem[] } {
  const sideName = (side: "home" | "away" | null) => {
    if (side === "home") return r.homeId === you.id ? you.name : opp.name;
    if (side === "away") return r.awayId === you.id ? you.name : opp.name;
    return "";
  };
  const importantTypes = new Set<MatchEvent["type"]>([
    "goal",
    "card",
    "injury",
    "halftime",
    "fulltime",
  ]);
  let nextId = 1;
  const toItem = (ev: MatchEvent): LogEventItem => ({
    id: nextId++,
    type: ev.type,
    cardKind:
      ev.type === "card" ? (ev.card === "red" ? "red" : "yellow") : undefined,
    minute: Math.min(ev.minute, 90),
    text: ev.text,
    teamLabel: sideName(ev.side),
  });
  const penaltyItems: LogEventItem[] = (r.shootout ?? []).map((kick) => {
    const pid = kick.side === "home" ? r.homeId : r.awayId;
    const team = pid === you.id ? you.name : opp.name;
    return {
      id: nextId++,
      type: "penalty",
      minute: "PEN" as const,
      text: `Pênalti de ${kick.taker} (${team}): ${kick.scored ? "no gol!" : "defendido!"}`,
      teamLabel: "",
    };
  });
  const important = r.timeline
    .filter((ev) => importantTypes.has(ev.type))
    .map(toItem);
  const full = r.timeline.map(toItem);
  return {
    important: [...important, ...penaltyItems],
    full: [...full, ...penaltyItems],
  };
}

export function strengthRow(
  label: string,
  a: number,
  b: number,
  bold = false,
): StrengthRow {
  return { label, a, b, bold };
}
