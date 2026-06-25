import { motion } from "framer-motion";
import { pressFx, screenIn } from "../lib/motion.js";
import {
  CampaignStatus,
  CampaignSquadRows,
  CupProgress,
  KnockoutBracket,
  type BracketRoundData,
  type CampaignStatusData,
  type CampaignSquadRow,
} from "./CupStatus.js";

export interface CampaignJourneyLeader {
  label: string;
  name: string | null;
  val: string;
}

function JourneyLeaders({ leaders }: { leaders: CampaignJourneyLeader[] }) {
  return (
    <div className="leaders cup-journey-leaders">
      {leaders.map((l) => (
        <div key={l.label} className="leader-card">
          <div className={`leader-ic ${l.name ? "you" : ""}`.trim()}>
            {l.name ? l.name[0]?.toUpperCase() : "–"}
          </div>
          <div className="leader-meta">
            <div className="leader-label">{l.label}</div>
            <div className="leader-name">{l.name ?? "—"}</div>
            <div className="leader-val">{l.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SquadShowcase({ rows }: { rows: CampaignSquadRow[] }) {
  return (
    <section className="cup-end-squad" aria-label="Elenco montado">
      <div className="section-head compact">
        <h3>Elenco montado</h3>
        <span>Seu XI da campanha</span>
      </div>
      <CampaignSquadRows rows={rows} />
    </section>
  );
}

interface GameOverProps {
  title: string;
  detail: string;
  youGoals: number;
  oppGoals: number;
  oppName: string;
  penaltyLabel: string | null;
  journeyLeaders: CampaignJourneyLeader[];
  squadRows: CampaignSquadRow[];
  status: CampaignStatusData;
  progressRound: number;
  onRetry: () => void;
  onHome: () => void;
}

export function CampaignGameOver({
  title,
  detail,
  youGoals,
  oppGoals,
  oppName,
  penaltyLabel,
  journeyLeaders,
  squadRows,
  status,
  progressRound,
  onRetry,
  onHome,
}: GameOverProps) {
  return (
    <motion.div className="screen cup-screen cup-end" {...screenIn}>
      <motion.div
        className="cup-end-card lose"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <span className="cup-tag">Game Over</span>
        <h1>{title}</h1>
        <p className="cup-end-msg">{detail}</p>
        <div className="cup-end-score">
          {youGoals} <span className="x">x</span> {oppGoals}
          {penaltyLabel ? <div className="cup-end-pens">{penaltyLabel}</div> : null}
          <div className="cup-end-opp">contra {oppName}</div>
        </div>
        <JourneyLeaders leaders={journeyLeaders} />
        <div className="cup-end-share-grid">
          <SquadShowcase rows={squadRows} />
          <CampaignStatus data={status} />
        </div>
        <CupProgress won={progressRound} />
        <div className="lobby-actions">
          <motion.button type="button" className="primary big" onClick={onRetry} {...pressFx}>
            Tentar de novo
          </motion.button>
          <motion.button type="button" className="primary alt big" onClick={onHome} {...pressFx}>
            Tela inicial
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface VictoryProps {
  groupLabel: string;
  journeyLeaders: CampaignJourneyLeader[];
  squadRows: CampaignSquadRow[];
  bracket: BracketRoundData[];
  progressRound: number;
  onRetry: () => void;
  onHome: () => void;
}

export function CampaignVictory({
  groupLabel,
  journeyLeaders,
  squadRows,
  bracket,
  progressRound,
  onRetry,
  onHome,
}: VictoryProps) {
  return (
    <motion.div className="screen cup-screen cup-end" {...screenIn}>
      <motion.div
        className="cup-end-card win"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
      >
        <motion.img
          className="cup-victory-trophy"
          src="/world_cup_trophy.png"
          alt="Troféu da Copa do Mundo"
          initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
        />
        <h1>CAMPEÃO DO MUNDO!</h1>
        <p className="cup-end-msg">
          Classificado como {groupLabel} e campeão de todo o mata-mata. Campanha
          impecável!
        </p>
        <JourneyLeaders leaders={journeyLeaders} />
        <div className="cup-end-share-grid">
          <SquadShowcase rows={squadRows} />
          <KnockoutBracket rounds={bracket} />
        </div>
        <CupProgress won={progressRound} />
        <div className="lobby-actions">
          <motion.button type="button" className="primary big" onClick={onRetry} {...pressFx}>
            Jogar de novo
          </motion.button>
          <motion.button type="button" className="primary alt big" onClick={onHome} {...pressFx}>
            Tela inicial
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
