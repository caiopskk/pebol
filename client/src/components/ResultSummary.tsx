import { useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { posLabel } from "../../../shared/formations.js";
import type { PitchSlot } from "./Pitch.js";
import { ShareResultButton } from "./ShareResultButton.js";
import { captureNodeToBlob } from "../lib/shareImage.js";

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
    <div className="leader-card flex min-h-[6.85rem] items-center gap-3 rounded-lg p-4">
      <div className={`leader-ic ${data.side ?? ""}`.trim()}>
        {data.initials ?? "–"}
      </div>
      <div className="min-w-0">
        <div className="leader-label">{data.label}</div>
        <div className="leader-name">{data.name ?? "—"}</div>
        <div className="text-xs text-pebol-muted">{data.val}</div>
      </div>
    </div>
  );
}

function StrengthRowEl({ row }: { row: StrengthRow }) {
  const max = Math.max(row.a, row.b, 1);
  return (
    <div className={`srow grid grid-cols-[1fr_5.25rem_1fr] items-center gap-2.5 ${row.bold ? "bold" : ""}`.trim()}>
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

function ResultLineup({
  title,
  formation,
  slots,
}: {
  title: string;
  formation: string;
  slots: PitchSlot[];
}) {
  return (
    <section className="result-lineup rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-black uppercase tracking-[0.03em] text-white">
          {title}
        </h3>
        <span className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
          {formation}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-1.5">
        {slots.map((slot) => (
          <li
            key={slot.id}
            className="grid min-h-8 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg border border-l-2 border-white/10 border-l-pebol-gold/70 bg-black/20 px-2.5 py-1.5"
          >
            <span className="font-display text-[0.62rem] font-black uppercase text-pebol-muted">
              {posLabel(slot.pos)}
            </span>
            <strong className="min-w-0 truncate text-xs font-black text-white">
              {slot.label}
            </strong>
            <em className="text-right text-xs font-black not-italic text-pebol-gold">
              {slot.rating ?? "--"}
            </em>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Offscreen, fixed-width replica of the PvP result used only for "copiar imagem".
 * Reuses the same sub-components as the live screen (hero, leaders, strengths,
 * lineups) without framer-motion, buttons or the match log, so html-to-image
 * captures it faithfully and without clipping. See {@link captureNodeToBlob}.
 */
function PvpShareCard({
  innerRef,
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
  youPitchSlots,
  opponentPitchSlots,
}: { innerRef: RefObject<HTMLDivElement | null> } & Pick<
  ResultSummaryProps,
  | "outcome"
  | "youName"
  | "opponentName"
  | "youInitials"
  | "opponentInitials"
  | "youFormation"
  | "opponentFormation"
  | "youGoals"
  | "opponentGoals"
  | "youWon"
  | "penaltyLabel"
  | "leaders"
  | "strengths"
  | "youPitchSlots"
  | "opponentPitchSlots"
>) {
  return (
    <div className="cup-share-capture" aria-hidden="true">
      <div ref={innerRef} className="pvp-share-card rounded-lg border border-white/10 bg-pebol-panel">
        <div className="pvp-share-hero relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-7 shadow-premium">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_260px_at_12%_50%,rgba(31,199,125,0.14),transparent_60%),radial-gradient(520px_260px_at_88%_50%,rgba(35,120,95,0.13),transparent_60%)]" />
          <div className="hero-team relative z-[1] flex min-w-0 flex-col items-center gap-3">
            <div className="hero-crest you">{youInitials}</div>
            <div className="hero-name">{youName}</div>
            <div className="hero-tag">{youFormation}</div>
          </div>
          <div className="hero-center relative z-[1] text-center">
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
            {penaltyLabel ? (
              <div className="mt-1 text-xs font-semibold text-pebol-gold">{penaltyLabel}</div>
            ) : null}
          </div>
          <div className="hero-team relative z-[1] flex min-w-0 flex-col items-center gap-3">
            <div className="hero-crest opp">{opponentInitials}</div>
            <div className="hero-name">{opponentName}</div>
            <div className="hero-tag">{opponentFormation}</div>
          </div>
        </div>

        <div className="pvp-share-body">
          <div className="grid gap-4">
            <div className="grid gap-3">
              {leaders.map((l) => (
                <LeaderCard key={l.label} data={l} />
              ))}
            </div>
            <div className="grid gap-2 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium">
              {strengths.map((row) => (
                <StrengthRowEl key={row.label} row={row} />
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <ResultLineup title={youName} formation={youFormation} slots={youPitchSlots} />
            <ResultLineup
              title={opponentName}
              formation={opponentFormation}
              slots={opponentPitchSlots}
            />
          </div>
        </div>

        <div className="cup-share-footer">
          <span className="font-display text-lg font-black tracking-[0.04em] text-pebol-accent">
            PEBOL
          </span>
          <span className="font-display text-sm font-black text-pebol-gold">
            Draft de futebol 1v1
          </span>
        </div>
      </div>
    </div>
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
  const [logExpanded, setLogExpanded] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const log = showFullLog ? fullLog : importantLog;
  const shareTitle = `Pebol: ${youName} ${youGoals} x ${opponentGoals} ${opponentName}`;
  const shareText = `${youWon ? "Vitória" : "Derrota"} no PvP: ${youName} ${youGoals} x ${opponentGoals} ${opponentName}${penaltyLabel ? ` (${penaltyLabel})` : ""}.`;
  const buildShareImage = async () =>
    shareCardRef.current ? captureNodeToBlob(shareCardRef.current) : null;

  return (
    <motion.div
      className="min-h-screen bg-transparent px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <PvpShareCard
        innerRef={shareCardRef}
        outcome={outcome}
        youName={youName}
        opponentName={opponentName}
        youInitials={youInitials}
        opponentInitials={opponentInitials}
        youFormation={youFormation}
        opponentFormation={opponentFormation}
        youGoals={youGoals}
        opponentGoals={opponentGoals}
        youWon={youWon}
        penaltyLabel={penaltyLabel}
        leaders={leaders}
        strengths={strengths}
        youPitchSlots={youPitchSlots}
        opponentPitchSlots={opponentPitchSlots}
      />
      <div className="mx-auto w-full max-w-[75rem]" ref={shareRef}>
        <motion.div
          className="relative grid items-center gap-4 overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl sm:p-7 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
          layout
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_260px_at_12%_50%,rgba(31,199,125,0.14),transparent_60%),radial-gradient(520px_260px_at_88%_50%,rgba(35,120,95,0.13),transparent_60%)]" />
          <div className="hero-team relative z-[1] flex min-w-0 flex-col items-center gap-3">
            <div className="hero-crest you">{youInitials}</div>
            <div className="hero-name">{youName}</div>
            <div className="hero-tag">{youFormation}</div>
          </div>
          <div className="hero-center relative z-[1] text-center">
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
            {penaltyLabel ? (
              <div className="mt-1 text-xs font-semibold text-pebol-gold">{penaltyLabel}</div>
            ) : null}
          </div>
          <div className="hero-team relative z-[1] flex min-w-0 flex-col items-center gap-3">
            <div className="hero-crest opp">{opponentInitials}</div>
            <div className="hero-name">{opponentName}</div>
            <div className="hero-tag">{opponentFormation}</div>
          </div>
        </motion.div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <div className="grid gap-4">
            <motion.div
              className="grid gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {leaders.map((l) => (
                <LeaderCard key={l.label} data={l} />
              ))}
            </motion.div>

            <div className="grid gap-2 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
              {strengths.map((row) => (
                <StrengthRowEl key={row.label} row={row} />
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <ResultLineup title={youName} formation={youFormation} slots={youPitchSlots} />
            <ResultLineup title={opponentName} formation={opponentFormation} slots={opponentPitchSlots} />
          </div>
        </div>
      </div>

      <div
        className="mx-auto mt-4 flex w-full max-w-[75rem] flex-wrap justify-center gap-3"
        data-share-ignore="true"
      >
        <button
          type="button"
          className="pebol-glow-button pebol-glow-fill min-h-12 min-w-[14rem] rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5"
          onClick={onRematch}
        >
          Jogar de novo
        </button>
        <ShareResultButton
          title={shareTitle}
          text={shareText}
          targetRef={shareRef}
          imageFactory={buildShareImage}
          className="pebol-glow-button min-h-12 min-w-[14rem] rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white"
        />
        <button
          type="button"
          className="pebol-glow-button min-h-12 min-w-[14rem] rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white"
          onClick={onHome}
        >
          Tela inicial
        </button>
      </div>

      <details
        className="match-log mx-auto mt-4 w-full max-w-[75rem] rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl"
        open={logExpanded}
        onToggle={(event) => setLogExpanded(event.currentTarget.open)}
      >
        <summary className="match-log-summary cursor-pointer list-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-black text-pebol-text">
                {showFullLog ? "Todos os lances" : "Principais lances"}
              </h3>
              <p className="mt-1 text-sm font-bold text-pebol-muted">
                {logExpanded ? "Clique para recolher" : "Clique para expandir o resumo da partida"}
              </p>
            </div>
            <span className="match-log-cta">
              {log.length} {showFullLog ? "eventos" : "destaques"}
            </span>
          </div>
        </summary>
        <div>
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
            className="mx-auto mt-3 block rounded-lg border border-white/10 bg-white/[0.045] px-4 py-2 font-display text-sm font-black text-pebol-muted transition hover:bg-white/[0.08] hover:text-white"
            onClick={() => setShowFullLog((current) => !current)}
          >
            {showFullLog ? "Ocultar lances completos" : "Ver todos os lances"}
          </button>
        </div>
      </details>
    </motion.div>
  );
}
