import { useState } from "react";
import { motion } from "framer-motion";
import { Pitch, type PitchSlot } from "./Pitch.js";

export interface LeaderCardData {
  label: string;
  name: string | null;
  val: string;
  initials: string | null;
  side: "you" | "opp" | null;
}

export interface StrengthRow {
  label: string;
  a: number;
  b: number;
  bold?: boolean;
}

export interface LogEventItem {
  id: number;
  type: string;
  cardKind?: "yellow" | "red";
  minute: number | "PEN";
  text: string;
  teamLabel: string;
}

interface ResultSummaryProps {
  outcome: "win" | "lose";
  youName: string;
  opponentName: string;
  youInitials: string;
  opponentInitials: string;
  youFormation: string;
  opponentFormation: string;
  youGoals: number;
  opponentGoals: number;
  youWon: boolean;
  penaltyLabel: string | null;
  leaders: LeaderCardData[];
  strengths: StrengthRow[];
  importantLog: LogEventItem[];
  fullLog: LogEventItem[];
  youPitchSlots: PitchSlot[];
  opponentPitchSlots: PitchSlot[];
  onRematch: () => void;
  onHome: () => void;
}

function LeaderCard({ data }: { data: LeaderCardData }) {
  return (
    <div className="leader-card">
      <div className={`leader-ic ${data.side ?? ""}`.trim()}>
        {data.initials ?? "–"}
      </div>
      <div className="leader-meta">
        <div className="leader-label">{data.label}</div>
        <div className="leader-name">{data.name ?? "—"}</div>
        <div className="leader-val">{data.val}</div>
      </div>
    </div>
  );
}

function StrengthRowEl({ row }: { row: StrengthRow }) {
  const max = Math.max(row.a, row.b, 1);
  return (
    <div className={`srow ${row.bold ? "bold" : ""}`.trim()}>
      <div className="sbar left">
        <div className="fill" style={{ width: `${(row.a / max) * 100}%` }} />
        <span>{row.a.toFixed(1)}</span>
      </div>
      <div className="slabel">{row.label}</div>
      <div className="sbar right">
        <div className="fill" style={{ width: `${(row.b / max) * 100}%` }} />
        <span>{row.b.toFixed(1)}</span>
      </div>
    </div>
  );
}

function LogRow({ ev }: { ev: LogEventItem }) {
  return (
    <li className={`ev ${ev.type}${ev.cardKind ? ` ${ev.cardKind}` : ""}`}>
      <span className="ev-min">{typeof ev.minute === "number" ? `${ev.minute}'` : ev.minute}</span>
      <span className="ev-tx">{ev.text}</span>
      {ev.teamLabel ? <span className="ev-side">{ev.teamLabel}</span> : null}
    </li>
  );
}

export function ResultSummary({
  outcome,
  youName,
  opponentName,
  youInitials,
  opponentInitials,
  youFormation,
  opponentFormation,
  youGoals,
  opponentGoals,
  youWon,
  penaltyLabel,
  leaders,
  strengths,
  importantLog,
  fullLog,
  youPitchSlots,
  opponentPitchSlots,
  onRematch,
  onHome,
}: ResultSummaryProps) {
  const [showFullLog, setShowFullLog] = useState(false);
  const log = showFullLog ? fullLog : importantLog;

  return (
    <motion.div
      className="screen result"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div className="match-hero" layout>
        <div className="hero-team">
          <div className="hero-crest you">{youInitials}</div>
          <div className="hero-name">{youName}</div>
          <div className="hero-tag">{youFormation}</div>
        </div>
        <div className="hero-center">
          <span className={`hero-pill ${outcome}`}>Final</span>
          <div className="hero-score">
            {youGoals}
            <span className="dash">-</span>
            {opponentGoals}
          </div>
          <div className="hero-sub">
            Arena Pebol · Partida única
            <br />
            {youWon ? "Você venceu" : "Você perdeu"}
          </div>
          {penaltyLabel ? <div className="hero-pens">{penaltyLabel}</div> : null}
        </div>
        <div className="hero-team">
          <div className="hero-crest opp">{opponentInitials}</div>
          <div className="hero-name">{opponentName}</div>
          <div className="hero-tag">{opponentFormation}</div>
        </div>
      </motion.div>

      <motion.div
        className="leaders"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {leaders.map((l) => (
          <LeaderCard key={l.label} data={l} />
        ))}
      </motion.div>

      <div className="strength-cmp">
        {strengths.map((row) => (
          <StrengthRowEl key={row.label} row={row} />
        ))}
      </div>

      <section className="match-log">
        <div className="section-head">
          <h3>{showFullLog ? "Todos os lances" : "Principais lances"}</h3>
          <span>
            {log.length} {showFullLog ? "eventos" : "destaques"}
          </span>
        </div>
        <motion.ul
          key={showFullLog ? "full" : "important"}
          className="event-feed result-feed"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {log.map((ev) => (
            <LogRow key={ev.id} ev={ev} />
          ))}
        </motion.ul>
        <button
          type="button"
          className="ghost log-toggle"
          onClick={() => setShowFullLog((current) => !current)}
        >
          {showFullLog ? "Ocultar lances completos" : "Ver todos os lances"}
        </button>
      </section>

      <div className="result-squads">
        <div className="board">
          <h3>{youName}</h3>
          <Pitch slots={youPitchSlots} />
        </div>
        <div className="board">
          <h3>{opponentName}</h3>
          <Pitch slots={opponentPitchSlots} />
        </div>
      </div>

      <div className="lobby-actions">
        <button type="button" className="primary big" onClick={onRematch}>
          Jogar de novo
        </button>
        <button type="button" className="primary alt big" onClick={onHome}>
          Tela inicial
        </button>
      </div>
    </motion.div>
  );
}
