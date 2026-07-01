import { useState } from "react";
import { motion } from "framer-motion";
import {
  BallSprite,
  CardOverlay,
  ClockMinute,
  EventFeed,
  GoalOverlay,
  HalftimePanel,
  type HalftimeCallbacks,
  type HalftimeOptions,
  HalfLabel,
  PauseButton,
  PenaltyLabel,
  ScoreNumber,
  ScoreboardGoals,
} from "./LiveStage.js";
import type { AccountUser } from "../api.js";
import { TeamBadge, YouAvatarBadge } from "./CupStatus.js";
import { BallFieldSvg, SoccerBallSvg } from "./MatchSvg.js";

interface LiveMatchShellProps {
  account: AccountUser | null;
  youInitials: string;
  opponentInitials: string;
  youName: string;
  opponentName: string;
  speedOptions: number[];
  activeSpeed: number;
  vsAI: boolean;
  showPause: boolean;
  halftimeOptions: HalftimeOptions;
  halftimeCallbacks: HalftimeCallbacks;
  onSpeedChange: (speed: number) => void;
  onTogglePause: (paused: boolean) => void;
  onSkip: () => void;
}

export function LiveMatchShell({
  account,
  youInitials,
  opponentInitials,
  youName,
  opponentName,
  speedOptions,
  activeSpeed,
  vsAI,
  showPause,
  halftimeOptions,
  halftimeCallbacks,
  onSpeedChange,
  onTogglePause,
  onSkip,
}: LiveMatchShellProps) {
  const [speed, setSpeed] = useState(activeSpeed);
  return (
    <motion.div
      className="live live-shell min-h-screen bg-transparent font-body text-pebol-text"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="live-stage stacked grid gap-3 rounded-lg">
        <div className="live-topbar flex flex-wrap items-center justify-between gap-3">
          <div className="live-sub flex min-w-0 items-center gap-2">
            <span className="sb-leg"><HalfLabel /></span>
            <span className="agg-mini"><PenaltyLabel /></span>
          </div>
          <div className="speed-row flex flex-wrap items-center justify-end gap-2">
            <span className="mr-1 font-display text-xs font-black uppercase tracking-[0.5px] text-pebol-muted">
              Velocidade
            </span>
            <div className="speed-control flex items-center gap-1.5" role="group" aria-label="Velocidade da partida">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`spd grid h-9 min-w-10 place-items-center rounded-lg border px-2 font-display text-xs font-black transition-all duration-200 ${s === speed ? "active" : ""}`}
                  data-spd={s}
                  onClick={() => {
                    setSpeed(s);
                    onSpeedChange(s);
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
            {vsAI ? null : (
              <span className="speed-note">
                Velocidade extra só contra a máquina
              </span>
            )}
            {showPause ? <PauseButton onToggle={onTogglePause} /> : null}
            <button type="button" className="ghost skip min-h-9 rounded-lg" onClick={onSkip}>
              Pular
            </button>
          </div>
        </div>

        <motion.div
          className="live-headline"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="scoreboard grid min-w-0 gap-3 rounded-lg md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
            <div className="sb-team min-w-0">
              <div className="sb-team-top flex min-w-0 items-center gap-2">
                <YouAvatarBadge
                  account={account}
                  fallback={<TeamBadge teamName={youName} initials={youInitials} variant="you" />}
                  className="sb-badge you"
                />
                <span className="sb-name min-w-0 truncate">{youName}</span>
              </div>
              <ScoreboardGoals side="you" />
            </div>
            <div className="sb-center text-center">
              <div className="sb-score">
                <ScoreNumber side="left" />
                <span className="sb-sep">:</span>
                <ScoreNumber side="right" />
              </div>
              <div className="sb-clock">
                <ClockMinute />'
              </div>
            </div>
            <div className="sb-team right min-w-0">
              <div className="sb-team-top flex min-w-0 items-center justify-end gap-2">
                <span className="sb-name min-w-0 truncate">{opponentName}</span>
                <TeamBadge teamName={opponentName} initials={opponentInitials} variant="opp" />
              </div>
              <ScoreboardGoals side="opp" />
            </div>
          </div>
          <GoalOverlay />
          <CardOverlay />
        </motion.div>

        <div className="live-main grid gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(18rem,.88fr)] xl:items-stretch">
          <motion.div
            className="live-field-col min-w-0"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="ballfield overflow-hidden rounded-lg">
              <BallFieldSvg />
              <BallSprite>
                <SoccerBallSvg />
              </BallSprite>
            </div>
          </motion.div>
          <motion.div
            className="live-feed-col min-w-0"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <EventFeed />
          </motion.div>
        </div>

        <HalftimePanel options={halftimeOptions} callbacks={halftimeCallbacks} />
      </div>
    </motion.div>
  );
}
