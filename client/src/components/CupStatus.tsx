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
    <div className="cup-progress">
      {PROGRESS_LABELS.map((label, i) => (
        <span
          key={label}
          className={`cup-cell ${i < won ? "done" : ""} ${i === won ? "next" : ""}`}
        >
          {i < won ? <span className="cup-cell-mark" aria-hidden="true" /> : label}
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
    <section className="cup-status cup-group-status">
      <div className="section-head compact">
        <h3>Grupo A</h3>
        <span>{status}</span>
      </div>
      <table className="cup-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>J</th>
            <th>Pts</th>
            <th>SG</th>
            <th>GP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className={`${row.id === "you" ? "you" : ""} ${idx < 2 ? "qualify" : ""}`.trim()}
            >
              <td>
                <span className="cup-pos-dot">{idx + 1}</span>
              </td>
              <td>{row.name}</td>
              <td>{row.played}</td>
              <td>
                <strong>{row.points}</strong>
              </td>
              <td>
                {row.goalDiff >= 0 ? "+" : ""}
                {row.goalDiff}
              </td>
              <td>{row.gf}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cup-group-legend">
        <span className="cup-zone-chip qualify" />
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
    <section className="cup-status cup-bracket-status">
      <div className="section-head compact">
        <h3>Chaveamento</h3>
        <span>Mata-mata</span>
      </div>
      <ol className="cup-ladder">
        {rounds.map((r) => (
          <li key={r.label} className={`ladder-node ${r.state}`.trim()}>
            <span className="ladder-mark" aria-hidden="true" />
            <div className="ladder-card">
              <span className="ladder-round">{r.label}</span>
              <div className="ladder-match">
                <strong className="ladder-you">Seu time</strong>
                <span className="ladder-vs">{r.showVs ? "vs" : ""}</span>
                <em className="ladder-opp">{r.oppLabel}</em>
              </div>
            </div>
          </li>
        ))}
        <li className={`ladder-node trophy ${champion ? "done" : ""}`.trim()}>
          <span className="ladder-mark" aria-hidden="true" />
          <div className="ladder-card ladder-final">
            <span className="ladder-round">Título</span>
            <div className="ladder-match">
              <strong className="ladder-you">Campeão do Mundo</strong>
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
  name: string | null;
  rating: number | null;
  hideRating: boolean;
}

export function CampaignSquadRows({ rows }: { rows: CampaignSquadRow[] }) {
  return (
    <ol className="cup-squad-list">
      {rows.map((r) => (
        <li key={r.slotId} className={r.name ? "filled" : "empty"}>
          <span>{r.pos}</span>
          <strong>{r.name ?? "--"}</strong>
          <em>{r.name ? (r.hideRating ? "??" : r.rating) : "--"}</em>
        </li>
      ))}
    </ol>
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
