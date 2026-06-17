import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveState, useHalftimeState, type HalftimeReserveItem } from "../lib/liveStore.js";
import { TacticBanner } from "./TacticBanner.js";
import { Pitch } from "./Pitch.js";

/** Pause/resume toggle for solo matches (vs machine / campaign). */
export function PauseButton({ onToggle }: { onToggle: (paused: boolean) => void }) {
  const paused = useLiveState().paused;
  return (
    <button
      type="button"
      className={`ghost pause-btn ${paused ? "paused" : ""}`.trim()}
      onClick={() => onToggle(!paused)}
    >
      {paused ? "▶ Continuar" : "⏸ Pausar"}
    </button>
  );
}

/** Score number that updates from the live store. */
export function ScoreNumber({ side }: { side: "left" | "right" }) {
  const s = useLiveState();
  return <span>{side === "left" ? s.scoreL : s.scoreR}</span>;
}

export function ClockMinute() {
  const s = useLiveState();
  return <span>{Math.min(s.minute, 90)}</span>;
}

export function HalfLabel() {
  const s = useLiveState();
  return <>{s.halfLabel}</>;
}

export function PenaltyLabel() {
  const s = useLiveState();
  return <>{s.penaltyLabel.text}</>;
}

export function BallSprite({ children }: { children: ReactNode }) {
  const s = useLiveState();
  return (
    <div
      className={`bf-ball ${s.ball.goal ? "goal" : ""}`.trim()}
      style={{
        left: `${s.ball.left}%`,
        top: `${s.ball.top}%`,
        transitionDuration: `${s.ball.transitionMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function GoalOverlay() {
  const s = useLiveState();
  return (
    <div className={`goal-overlay ${s.goal.show ? "show" : ""}`.trim()}>
      <div className="goal-word">GOL!</div>
      <div className="goal-scorer">{s.goal.scorer}</div>
    </div>
  );
}

export function CardOverlay() {
  const s = useLiveState();
  return (
    <div className={`card-overlay ${s.card.show ? "show" : ""}`.trim()}>
      <div className={`card-flash ${s.card.kind ?? ""}`.trim()} />
      <div className="card-name">{s.card.name}</div>
    </div>
  );
}

export function EventFeed() {
  const s = useLiveState();
  return (
    <ul className="event-feed">
      {s.feed.map((ev) => (
        <li
          key={ev.id}
          className={`ev ${ev.type}${ev.cardKind ? ` ${ev.cardKind}` : ""}`}
        >
          <span className="ev-min">{Math.min(ev.minute, 90)}'</span>
          <span className="ev-tx">{ev.text}</span>
          {ev.pos ? <span className="ev-pos">{ev.pos}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Scorers/assists for one team, shown under its name inside the scoreboard. */
export function ScoreboardGoals({ side }: { side: "you" | "opp" }) {
  const s = useLiveState();
  const goals = s.goals.filter((g) => g.side === side);
  if (goals.length === 0) return null;
  return (
    <ul className={`sb-goals ${side}`}>
      {goals.map((g) => (
        <li key={g.id}>
          <span className="sbg-min">{g.minute}'</span>
          <span className="sbg-scorer">{g.scorer}</span>
          {g.assister ? <span className="sbg-assist">({g.assister})</span> : null}
        </li>
      ))}
    </ul>
  );
}

function KickRow({ kick }: { kick: { id: number; taker: string; scored: boolean; pending: boolean } }) {
  const cls = kick.pending ? "pending" : kick.scored ? "made" : "missed";
  return (
    <li className={`pen-kick ${cls}`}>
      <span className="pen-mark" aria-hidden="true">
        {kick.pending ? "" : kick.scored ? "✓" : "✗"}
      </span>
      <strong>{kick.taker}</strong>
      <span className="pen-result">
        {kick.pending ? "cobrando…" : kick.scored ? "converteu" : "perdeu"}
      </span>
    </li>
  );
}

function ShootoutSpotlight({
  kick,
}: {
  kick: { id: number; taker: string; scored: boolean; pending: boolean; side: "you" | "opp" } | undefined;
}) {
  if (!kick) {
    return (
      <div className="shootout-spotlight">
        <span className="ss-idle">Preparando a disputa…</span>
      </div>
    );
  }
  const phase = kick.pending ? "stepup" : kick.scored ? "goal" : "miss";
  return (
    <div className="shootout-spotlight">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${kick.id}-${phase}`}
          className={`ss-focus ${phase} ${kick.side}`}
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 340, damping: 22 }}
        >
          {kick.pending ? (
            <>
              <span className="ss-icon" aria-hidden="true">🎯</span>
              <span className="ss-name">{kick.taker}</span>
              <span className="ss-tag">se prepara para cobrar…</span>
            </>
          ) : kick.scored ? (
            <>
              <span className="ss-icon" aria-hidden="true">⚽</span>
              <span className="ss-name">GOL!</span>
              <span className="ss-tag">{kick.taker} converteu</span>
            </>
          ) : (
            <>
              <span className="ss-icon" aria-hidden="true">🧤</span>
              <span className="ss-name">DEFENDIDO!</span>
              <span className="ss-tag">{kick.taker} perdeu</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ShootoutPanel({ oppName }: { oppName: string }) {
  const s = useLiveState();
  const so = s.shootout;
  const current = [...so.you, ...so.opp].sort((a, b) => b.id - a.id)[0];
  return (
    <AnimatePresence>
      {so.show ? (
        <motion.div
          className="shootout-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={`shootout-card ${so.suddenDeath ? "sudden-death" : ""}`.trim()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="shootout-head">
              <span>Disputa de pênaltis</span>
              <AnimatePresence>
                {so.suddenDeath ? (
                  <motion.span
                    className="shootout-sudden"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    ⚡ Morte súbita
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="shootout-scoreline">
              <span className="ssl-team you">Seu time</span>
              <div className="ssl-score">
                <motion.span
                  key={`y${so.scoreYou}`}
                  className="ssl-num you"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 16 }}
                >
                  {so.scoreYou}
                </motion.span>
                <span className="ssl-x">×</span>
                <motion.span
                  key={`o${so.scoreOpp}`}
                  className="ssl-num opp"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 16 }}
                >
                  {so.scoreOpp}
                </motion.span>
              </div>
              <span className="ssl-team opp">{oppName}</span>
            </div>

            <ShootoutSpotlight kick={current} />

            <div className="shootout-lanes">
              <div>
                <h4>Seu time</h4>
                <ul>
                  {so.you.map((k) => (
                    <KickRow key={k.id} kick={k} />
                  ))}
                </ul>
              </div>
              <div>
                <h4>{oppName}</h4>
                <ul>
                  {so.opp.map((k) => (
                    <KickRow key={k.id} kick={k} />
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export interface HalftimeCallbacks {
  onFormationChange: (id: string) => void;
  onMentalityChange: (id: string) => void;
  onFocusChange: (id: string) => void;
  onSlotClick: (slotId: string) => void;
  onReserveClick: (name: string) => void;
  onContinue: () => void;
  onBackgroundClick: () => void;
}

export interface HalftimeOptions {
  formations: { id: string; name: string }[];
  mentalities: { id: string; name: string }[];
  focuses: { id: string; name: string }[];
}

function ReserveItem({
  item,
  onClick,
}: {
  item: HalftimeReserveItem;
  onClick: (name: string) => void;
}) {
  return (
    <li>
      <button
        className={`reserve-option ${item.selected ? "selected" : ""}`.trim()}
        disabled={item.disabled}
        onClick={() => onClick(item.name)}
      >
        <span className={`pl-pos pos-${item.posGroup}`} title={item.posText}>
          {item.posText}
        </span>
        <span className="pl-name">{item.name}</span>
        <span className="pl-team">{item.teamLabel}</span>
        {item.disabled && !item.selected ? null : null}
        {item.rating ? (
          <span className={`pl-rt ${item.disabled ? "hidden" : ""}`.trim()}>
            {item.disabled && item.rating === 0 ? "??" : item.rating}
          </span>
        ) : (
          <span className="pl-rt hidden">??</span>
        )}
      </button>
    </li>
  );
}

export function HalftimePanel({
  options,
  callbacks,
}: {
  options: HalftimeOptions;
  callbacks: HalftimeCallbacks;
}) {
  const h = useHalftimeState();
  if (!h.open) return <div className="halftime-modal" hidden />;
  return (
    <div
      className="halftime-modal"
      onClick={(e) => {
        // cancel a pending selection when clicking anywhere that isn't a
        // pitch player or a reserve option (matches the cancel-on-outside UX)
        const t = e.target as HTMLElement;
        if (t.closest(".slot.filled") || t.closest(".reserve-option")) return;
        callbacks.onBackgroundClick();
      }}
    >
      <div className="halftime-card">
        <div className="section-head">
          <div>
            <span className="half-kicker">Intervalo</span>
            <h3>Ajustes do time</h3>
          </div>
          <span>{h.subCountLabel}</span>
        </div>
        <div className="half-controls">
          <label>
            Formação
            <select
              value={h.formationId}
              disabled={h.controlsDisabled}
              onChange={(e) => callbacks.onFormationChange(e.target.value)}
            >
              {options.formations.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <label>
            Estilo
            <select
              value={h.mentality}
              disabled={h.controlsDisabled}
              onChange={(e) => callbacks.onMentalityChange(e.target.value)}
            >
              {options.mentalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label>
            Foco
            <select
              value={h.attackFocus}
              disabled={h.controlsDisabled}
              onChange={(e) => callbacks.onFocusChange(e.target.value)}
            >
              {options.focuses.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`primary ${h.continueDone ? "done" : ""}`.trim()}
            disabled={h.continueDisabled}
            onClick={callbacks.onContinue}
          >
            {h.continueLabel}
          </button>
        </div>
        {h.focusBanner ? (
          <TacticBanner kind={h.focusBanner.kind}>{h.focusBanner.text}</TacticBanner>
        ) : null}
        <div className="halftime-squad">
          <div className="half-field-box">
            <div className={`half-pitch ${h.locked ? "locked" : ""}`.trim()}>
              <Pitch
                slots={h.pitchSlots}
                small
                interactive
                onSlotClick={(id, filled) => {
                  if (filled) callbacks.onSlotClick(id);
                }}
              />
            </div>
            <p className="sub-status">{h.subStatus}</p>
          </div>
          <div className="half-reserve-box">
            <span className="half-box-title">Reservas disponíveis</span>
            <ul className="reserve-list">
              {h.reserves.map((r) => (
                <ReserveItem key={r.name} item={r} onClick={callbacks.onReserveClick} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
