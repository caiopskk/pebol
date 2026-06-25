import { useState } from "react";
import { motion } from "framer-motion";
import {
  BallSprite,
  CardOverlay,
  ClockMinute,
  EventFeed,
  GoalOverlay,
  HalfLabel,
  PauseButton,
  ScoreNumber,
  ScoreboardGoals,
  ShootoutPanel,
} from "./LiveStage.js";
import { TeamBadge } from "./CupStatus.js";
import { BallFieldSvg, SoccerBallSvg } from "./MatchSvg.js";

interface CampaignMatchShellProps {
  ladderLabel: string;
  oppName: string;
  oppFlagName: string;
  oppInitials: string;
  speedOptions: number[];
  activeSpeed: number;
  showPause: boolean;
  onSpeedChange: (speed: number) => void;
  onTogglePause: (paused: boolean) => void;
  onSkip: () => void;
}

export function CampaignMatchShell({
  ladderLabel,
  oppName,
  oppFlagName,
  oppInitials,
  speedOptions,
  activeSpeed,
  showPause,
  onSpeedChange,
  onTogglePause,
  onSkip,
}: CampaignMatchShellProps) {
  const [speed, setSpeed] = useState(activeSpeed);
  return (
    <motion.div
      className="screen live cup-match"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="live-stage stacked">
        <div className="live-topbar">
          <div className="live-sub">
            <span className="sb-leg"><HalfLabel /></span>
            <span className="agg-mini">{ladderLabel}</span>
          </div>
          <div className="speed-row">
            <span className="spd-label">Velocidade</span>
            <div className="speed-control" role="group" aria-label="Velocidade da partida">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`spd ${s === speed ? "active" : ""}`}
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
            {showPause ? <PauseButton onToggle={onTogglePause} /> : null}
            <button type="button" className="ghost skip" onClick={onSkip}>
              Pular
            </button>
          </div>
        </div>

        <motion.div
          className="live-headline"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="scoreboard">
            <div className="sb-team">
              <div className="sb-team-top">
                <span className="sb-badge you">VC</span>
                <span className="sb-name">Seu time</span>
              </div>
              <ScoreboardGoals side="you" />
            </div>
            <div className="sb-center">
              <div className="sb-score">
                <ScoreNumber side="left" />
                <span className="sb-sep">:</span>
                <ScoreNumber side="right" />
              </div>
              <div className="sb-clock">
                <ClockMinute />'
              </div>
            </div>
            <div className="sb-team right">
              <div className="sb-team-top">
                <span className="sb-name">{oppName}</span>
                <TeamBadge teamName={oppFlagName} initials={oppInitials} variant="opp" />
              </div>
              <ScoreboardGoals side="opp" />
            </div>
          </div>
          <GoalOverlay />
          <CardOverlay />
        </motion.div>

        <ShootoutPanel oppName={oppName} />

        <div className="live-main">
          <motion.div
            className="live-field-col"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="ballfield">
              <BallFieldSvg />
              <BallSprite>
                <SoccerBallSvg />
              </BallSprite>
            </div>
          </motion.div>
          <motion.div
            className="live-feed-col"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <EventFeed />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
