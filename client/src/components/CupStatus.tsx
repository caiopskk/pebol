import type { PosGroup } from "../../../shared/types.js";
import { Flag, hasFlag } from "./Flag.js";

export interface GroupRow {
  id: string;
  name: string;
  played: number;
  points: number;
  goalDiff: number;
  gf: number;
}

export interface CupProgressProps {
  won: number;
}

const PROGRESS_LABELS = ["G1", "G2", "G3", "32", "16", "QF", "SF", "F"];

export function CupProgress({ won }: CupProgressProps) {
  return (
    <div className="my-2 flex flex-wrap justify-center gap-2">
      {PROGRESS_LABELS.map((label, i) => (
        <span
          key={label}
          className={`grid h-9 w-9 place-items-center rounded-lg border font-display text-sm font-black ${
            i < won
              ? "border-transparent bg-gradient-to-br from-pebol-accent to-pebol-accent2 text-black"
              : i === won
                ? "border-pebol-gold text-pebol-gold shadow-[0_0_0_1px_var(--gold)]"
                : "border-white/10 bg-white/[0.05] text-pebol-faint"
          }`}
        >
          {i < won ? (
            <span
              className="h-3.5 w-3.5 rounded-full bg-black/85 shadow-[inset_0_0_0_.28rem_var(--accent),0_0_0_1px_rgba(4,19,12,.22)]"
              aria-hidden="true"
            />
          ) : (
            label
          )}
        </span>
      ))}
    </div>
  );
}

export interface GroupTableProps {
  rows: GroupRow[];
  status: string;
}

export function GroupTable({ rows, status }: GroupTableProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-pebol-panel/90 p-4 shadow-premium backdrop-blur-xl">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="font-display text-base font-black text-white">Grupo A</h3>
        <span className="text-right text-xs font-black text-pebol-muted">{status}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="w-12 px-2 py-2 text-center font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:w-14 sm:px-3">
                #
              </th>
              <th className="px-2 py-2 text-left font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:px-3">
                Time
              </th>
              <th className="px-2 py-2 text-center font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:px-3">
                J
              </th>
              <th className="px-2 py-2 text-center font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:px-3">
                Pts
              </th>
              <th className="px-2 py-2 text-center font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:px-3">
                SG
              </th>
              <th className="px-2 py-2 text-center font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted sm:px-3">
                GP
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isYou = row.id === "you";
              const qualifies = idx < 2;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-white/10 last:border-b-0 ${
                    isYou ? "bg-pebol-accent/14 shadow-[inset_3px_0_0_var(--accent)]" : ""
                  } ${qualifies ? "text-white" : "text-pebol-soft"}`}
                >
                  <td className="px-2 py-4 text-center sm:px-3">
                    <span
                      className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-black ${
                        qualifies
                          ? "bg-pebol-accent/18 text-pebol-accent"
                          : "bg-white/10 text-pebol-soft"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-2 py-4 font-black sm:px-3">{row.name}</td>
                  <td className="px-2 py-4 text-center font-bold sm:px-3">{row.played}</td>
                  <td className="px-2 py-4 text-center sm:px-3">
                    <strong>{row.points}</strong>
                  </td>
                  <td className="px-2 py-4 text-center font-bold sm:px-3">
                    {row.goalDiff >= 0 ? "+" : ""}
                    {row.goalDiff}
                  </td>
                  <td className="px-2 py-4 text-center font-bold sm:px-3">{row.gf}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-pebol-muted">
        <span className="h-3 w-3 shrink-0 rounded-[3px] border border-pebol-accent bg-pebol-accent/15" />
        Os 2 primeiros avançam às oitavas; melhores terceiros também.
      </div>
    </section>
  );
}

export interface BracketRoundData {
  label: string;
  state: "done" | "next" | "";
  oppLabel: string;
  showVs: boolean;
}

export function KnockoutBracket({ rounds }: { rounds: BracketRoundData[] }) {
  const champion = rounds.every((r) => r.state === "done");
  return (
    <section className="rounded-lg border border-white/10 bg-pebol-panel/90 p-4 shadow-premium backdrop-blur-xl">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="font-display text-base font-black text-white">Chaveamento</h3>
        <span className="text-right text-xs font-black text-pebol-muted">Mata-mata</span>
      </div>
      <ol className="grid gap-2">
        {rounds.map((r) => (
          <li key={r.label} className="grid grid-cols-[1.15rem_minmax(0,1fr)] gap-2">
            <span
              className={`mt-5 h-3 w-3 rounded-full border ${
                r.state === "done"
                  ? "border-pebol-accent bg-pebol-accent shadow-[0_0_0_4px_rgba(0,255,136,.10)]"
                  : r.state === "next"
                    ? "border-pebol-gold bg-pebol-gold shadow-[0_0_0_4px_rgba(255,211,67,.10)]"
                    : "border-white/20 bg-white/10"
              }`}
              aria-hidden="true"
            />
            <div
              className={`rounded-lg border border-l-2 bg-black/20 p-3 ${
                r.state === "done"
                  ? "border-white/10 border-l-pebol-accent"
                  : r.state === "next"
                    ? "border-pebol-gold/55 border-l-pebol-gold"
                    : "border-white/10 border-l-white/20"
              }`}
            >
              <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-muted">
                {r.label}
              </span>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <strong className="text-white">Seu time</strong>
                <span className="font-display text-xs font-black uppercase text-pebol-gold">{r.showVs ? "vs" : ""}</span>
                <em className="not-italic text-pebol-soft">{r.oppLabel}</em>
              </div>
            </div>
          </li>
        ))}
        <li className="grid grid-cols-[1.15rem_minmax(0,1fr)] gap-2">
          <span
            className={`mt-5 h-3 w-3 rounded-full border ${
              champion
                ? "border-pebol-accent bg-pebol-accent shadow-[0_0_0_4px_rgba(0,255,136,.10)]"
                : "border-pebol-gold bg-pebol-gold shadow-[0_0_0_4px_rgba(255,211,67,.10)]"
            }`}
            aria-hidden="true"
          />
          <div
            className={`rounded-lg border border-l-2 bg-black/20 p-3 ${
              champion ? "border-white/10 border-l-pebol-accent" : "border-pebol-gold/55 border-l-pebol-gold"
            }`}
          >
            <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.08em] text-pebol-gold">
              Título
            </span>
            <div className="mt-1 text-sm">
              <strong className="text-white">Campeão do Mundo</strong>
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
}

export type CampaignStatusData =
  | { kind: "group"; table: GroupTableProps }
  | { kind: "knockout"; bracket: BracketRoundData[] }
  | { kind: "empty" };

export function CampaignStatus({ data }: { data: CampaignStatusData }) {
  if (data.kind === "empty") return null;
  if (data.kind === "group") return <GroupTable {...data.table} />;
  return <KnockoutBracket rounds={data.bracket} />;
}

export interface CampaignStrengthData {
  state: "hidden" | "empty" | "ok";
  overall?: number;
  attack?: number;
  midfield?: number;
  defense?: number;
}

export function CampaignStrengthSummary({ data }: { data: CampaignStrengthData }) {
  if (data.state === "hidden") {
    return (
      <div className="cup-draft-rating hidden-rating">
        <strong>??</strong>
        <span>
          Ratings ocultos
          <br />
          Modo Hardcore
        </span>
      </div>
    );
  }
  if (data.state === "empty") {
    return (
      <div className="cup-draft-rating">
        <strong>--</strong>
        <span>Ataque -- · Meio -- · Defesa --</span>
      </div>
    );
  }
  return (
    <div className="cup-draft-rating">
      <strong>{Math.round(data.overall!)}</strong>
      <span>
        Ataque {Math.round(data.attack!)} · Meio {Math.round(data.midfield!)} · Defesa {Math.round(data.defense!)}
      </span>
    </div>
  );
}

export interface CampaignSquadRow {
  slotId: string;
  pos: string;
  posGroup: PosGroup;
  name: string | null;
  rating: number | null;
  hideRating: boolean;
}

const SQUAD_GROUP_LABELS: Record<PosGroup, string> = {
  GK: "Goleiro",
  DEF: "Defesa",
  MID: "Meio-campo",
  ATT: "Ataque",
};
const SQUAD_GROUP_ORDER: PosGroup[] = ["GK", "DEF", "MID", "ATT"];

export function CampaignSquadRows({
  rows,
  compact = false,
  grouped = false,
}: {
  rows: CampaignSquadRow[];
  compact?: boolean;
  /** Split rows into Goleiro/Defesa/Meio-campo/Ataque sections instead of one flat list. */
  grouped?: boolean;
}) {
  const rowClass = `grid items-center rounded-lg border border-l-2 bg-black/20 ${
    compact ? "grid-cols-[1.8rem_minmax(0,1fr)_1.8rem] gap-1" : "grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] gap-2"
  } ${compact ? "min-h-7 px-2.5 py-1.5" : "min-h-9 px-3 py-2"}`;

  const row = (r: CampaignSquadRow) => (
    <li
      key={r.slotId}
      className={`${rowClass} ${r.name ? "border-white/10 border-l-pebol-gold/75" : "border-white/10 border-l-white/20"}`}
    >
      <span className={`font-display font-black uppercase text-pebol-muted ${compact ? "text-[0.62rem]" : "text-xs tracking-[0.08em]"}`}>
        {r.pos}
      </span>
      <strong className={`min-w-0 truncate font-black text-white ${compact ? "text-xs" : "text-sm"}`}>
        {r.name ?? "--"}
      </strong>
      <em className={`text-right font-black not-italic text-pebol-gold ${compact ? "text-xs" : "text-sm"}`}>
        {r.name ? (r.hideRating ? "??" : r.rating) : "--"}
      </em>
    </li>
  );

  if (!grouped) {
    return <ol className={`grid ${compact ? "grid-cols-2 gap-1" : "gap-1.5"}`}>{rows.map(row)}</ol>;
  }

  return (
    <div className="grid gap-3">
      {SQUAD_GROUP_ORDER.map((group) => {
        const groupRows = rows.filter((r) => r.posGroup === group);
        if (!groupRows.length) return null;
        return (
          <div key={group} className="grid gap-1.5">
            <span className="font-display text-[0.62rem] font-black uppercase tracking-[0.14em] text-pebol-faint">
              {SQUAD_GROUP_LABELS[group]}
            </span>
            <ol className="grid gap-1.5">{groupRows.map(row)}</ol>
          </div>
        );
      })}
    </div>
  );
}

export interface TeamStrengthData {
  state: "none" | "hidden" | "ok";
  overall?: number;
  attack?: number;
  midfield?: number;
  defense?: number;
}

export function TeamStrengthCard({ data }: { data: TeamStrengthData }) {
  if (data.state === "hidden") {
    return (
      <div className="cup-draft-rating draft-rating">
        <strong>??</strong>
        <span>
          Overall oculto
          <br />
          Modo Hardcore ativo
        </span>
      </div>
    );
  }
  if (data.state === "none") {
    return (
      <div className="cup-draft-rating draft-rating">
        <strong>--</strong>
        <span>
          Overall time
          <br />
          Ataque -- · Meio -- · Defesa --
        </span>
      </div>
    );
  }
  return (
    <div className="cup-draft-rating draft-rating">
      <strong>{Math.round(data.overall!)}</strong>
      <span>
        Overall time
        <br />
        Ataque {Math.round(data.attack!)} · Meio {Math.round(data.midfield!)} · Defesa {Math.round(data.defense!)}
      </span>
    </div>
  );
}

/** Renders a team badge: SVG flag (national) or initials box (club). */
export function TeamBadge({
  teamName,
  initials,
  variant = "you",
  size = "sb",
}: {
  teamName: string | null;
  initials: string;
  variant?: "you" | "opp";
  size?: "sb" | "hero";
}) {
  if (teamName && hasFlag(teamName)) {
    const cls = size === "hero" ? "cup-vs-flag" : "sb-badge flag";
    return (
      <span className={cls}>
        <Flag name={teamName} />
      </span>
    );
  }
  if (size === "hero") {
    return <div className={`hero-crest ${variant}`}>{initials}</div>;
  }
  return <span className={`sb-badge ${variant}`}>{initials}</span>;
}
