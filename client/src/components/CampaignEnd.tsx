import { useRef, type RefObject } from "react";
import { motion } from "framer-motion";
import { pressFx, screenIn } from "../lib/motion.js";
import { captureNodeToBlob } from "../lib/shareImage.js";
import type { AccountUser } from "../api.js";
import {
  CampaignStatus,
  CampaignSquadRows,
  CupProgress,
  KnockoutBracket,
  YouAvatarBadge,
  type BracketRoundData,
  type CampaignStatusData,
  type CampaignSquadRow,
} from "./CupStatus.js";
import { ShareResultButton } from "./ShareResultButton.js";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || "P").slice(0, 2).toUpperCase();
}

/** Small watermark-style credit — used only on the "copiar imagem" share card, not the on-screen result. */
function ShareCardIdentity({ account }: { account: AccountUser | null }) {
  if (!account) return null;
  return (
    <div className="mb-1 flex items-center justify-center gap-1.5">
      <YouAvatarBadge
        account={account}
        fallback={
          <span className="grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-white/[0.06] font-display text-[0.5rem] font-bold text-pebol-muted">
            {initials(account.username)}
          </span>
        }
        className="grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-white/[0.06]"
      />
      <span className="font-display text-[0.65rem] font-bold text-pebol-muted">
        {account.username}
      </span>
    </div>
  );
}

export interface CampaignJourneyLeader {
  label: string;
  name: string | null;
  val: string;
}

const campaignEndShellClass =
  "flex min-h-screen items-start justify-center bg-transparent px-4 py-3 font-body text-pebol-text sm:px-6";
const campaignEndPrimaryButtonClass =
  "pebol-glow-button pebol-glow-fill min-h-12 min-w-[14rem] rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5";
const campaignEndSecondaryButtonClass =
  "pebol-glow-button min-h-12 min-w-[14rem] rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white";

function JourneyLeaders({ leaders }: { leaders: CampaignJourneyLeader[] }) {
  return (
    <div className="cup-leaders-grid my-2 grid gap-2 sm:grid-cols-3">
      {leaders.map((l) => (
        <div
          key={l.label}
          className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-2 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
        >
          <div
            className={`grid h-8 w-8 place-items-center rounded-full border font-display text-xs font-black ${
              l.name
                ? "border-pebol-accent/35 bg-pebol-accent/15 text-pebol-accent"
                : "border-white/10 bg-white/[0.05] text-pebol-faint"
            }`}
          >
            {l.name ? l.name[0]?.toUpperCase() : "–"}
          </div>
          <div className="min-w-0">
            <div className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
              {l.label}
            </div>
            <div className="truncate font-display text-xs font-black text-white">
              {l.name ?? "—"}
            </div>
            <div className="text-xs font-black text-pebol-gold">{l.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SquadShowcase({ rows }: { rows: CampaignSquadRow[] }) {
  return (
    <section aria-label="Elenco montado">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-black uppercase tracking-[0.03em] text-white">
          Elenco montado
        </h3>
        <span className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
          Seu XI da campanha
        </span>
      </div>
      <CampaignSquadRows rows={rows} compact />
    </section>
  );
}

/**
 * Offscreen, fixed-width replica of the end card used only for "copiar imagem".
 * Mirrors the on-screen card (same sub-components, same data) but without
 * framer-motion transforms or action buttons, so html-to-image captures it
 * faithfully and without clipping. See {@link captureNodeToBlob}.
 */
function CampaignShareCard({
  innerRef,
  account,
  variant,
  trophy = false,
  title,
  detail,
  score,
  journeyLeaders,
  squadRows,
  status,
  progressRound,
}: {
  innerRef: RefObject<HTMLDivElement | null>;
  account: AccountUser | null;
  variant: "win" | "lose";
  trophy?: boolean;
  title: string;
  detail: string;
  score?: { you: number; opp: number; penaltyLabel: string | null; oppName: string };
  journeyLeaders: CampaignJourneyLeader[];
  squadRows: CampaignSquadRow[];
  status: CampaignStatusData;
  progressRound: number;
}) {
  return (
    <div className="cup-share-capture" aria-hidden="true">
      <div ref={innerRef} className={`cup-end-card ${variant} cup-share-card`}>
        {trophy ? (
          <img className="cup-victory-trophy" src="/world_cup_trophy.png" alt="" />
        ) : (
          <span className="cup-tag">Game Over</span>
        )}
        <h1>{title}</h1>
        <p className="cup-end-msg">{detail}</p>
        {score ? (
          <div className="cup-end-score">
            {score.you} <span className="x">x</span> {score.opp}
            {score.penaltyLabel ? <div className="cup-end-pens">{score.penaltyLabel}</div> : null}
            <div className="cup-end-opp">contra {score.oppName}</div>
          </div>
        ) : null}
        <CupProgress won={progressRound} />
        <JourneyLeaders leaders={journeyLeaders} />
        <div className="cup-end-share-grid">
          <SquadShowcase rows={squadRows} />
          <CampaignStatus data={status} />
        </div>
        <div className="cup-share-footer">
          <ShareCardIdentity account={account} />
          <span className="font-display text-lg font-black tracking-[0.04em] text-pebol-accent">
            PEBOL
          </span>
          <span className="font-display text-sm font-black text-pebol-gold">
            Copa do Mundo 48 seleções
          </span>
        </div>
      </div>
    </div>
  );
}

interface GameOverProps {
  account: AccountUser | null;
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
  account,
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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const shareTitle = `Pebol: campanha encerrada contra ${oppName}`;
  const shareText = `${title}: ${detail} Placar final: ${youGoals} x ${oppGoals} contra ${oppName}${penaltyLabel ? ` (${penaltyLabel})` : ""}.`;
  const buildShareImage = async () =>
    shareCardRef.current ? captureNodeToBlob(shareCardRef.current) : null;

  return (
    <motion.div className={campaignEndShellClass} {...screenIn}>
      <CampaignShareCard
        innerRef={shareCardRef}
        account={account}
        variant="lose"
        title={title}
        detail={detail}
        score={{ you: youGoals, opp: oppGoals, penaltyLabel, oppName }}
        journeyLeaders={journeyLeaders}
        squadRows={squadRows}
        status={status}
        progressRound={progressRound}
      />
      <motion.div
        ref={cardRef}
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
        <div className="mt-3 flex flex-wrap justify-center gap-3" data-share-ignore="true">
          <motion.button
            type="button"
            className={campaignEndPrimaryButtonClass}
            onClick={onRetry}
            {...pressFx}
          >
            Tentar de novo
          </motion.button>
          <ShareResultButton
            title={shareTitle}
            text={shareText}
            targetRef={cardRef}
            imageFactory={buildShareImage}
            className={campaignEndSecondaryButtonClass}
          />
          <motion.button
            type="button"
            className={campaignEndSecondaryButtonClass}
            onClick={onHome}
            {...pressFx}
          >
            Tela inicial
          </motion.button>
        </div>
        <CupProgress won={progressRound} />
        <JourneyLeaders leaders={journeyLeaders} />
        <div className="cup-end-share-grid">
          <SquadShowcase rows={squadRows} />
          <CampaignStatus data={status} />
        </div>
      </motion.div>
    </motion.div>
  );
}

interface VictoryProps {
  account: AccountUser | null;
  groupLabel: string;
  journeyLeaders: CampaignJourneyLeader[];
  squadRows: CampaignSquadRow[];
  bracket: BracketRoundData[];
  progressRound: number;
  onRetry: () => void;
  onHome: () => void;
}

export function CampaignVictory({
  account,
  groupLabel,
  journeyLeaders,
  squadRows,
  bracket,
  progressRound,
  onRetry,
  onHome,
}: VictoryProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const championDetail = `Classificado como ${groupLabel} e campeão de todo o mata-mata. Campanha impecável!`;
  const shareTitle = "Pebol: campeão do mundo!";
  const shareText = `Campeão do Mundo no Pebol! Classificado como ${groupLabel} e campeão de todo o mata-mata.`;
  const buildShareImage = async () =>
    shareCardRef.current ? captureNodeToBlob(shareCardRef.current) : null;

  return (
    <motion.div className={campaignEndShellClass} {...screenIn}>
      <CampaignShareCard
        innerRef={shareCardRef}
        account={account}
        variant="win"
        trophy
        title="CAMPEÃO DO MUNDO!"
        detail={championDetail}
        journeyLeaders={journeyLeaders}
        squadRows={squadRows}
        status={{ kind: "knockout", bracket }}
        progressRound={progressRound}
      />
      <motion.div
        ref={cardRef}
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
        <div className="mt-3 flex flex-wrap justify-center gap-3" data-share-ignore="true">
          <motion.button
            type="button"
            className={campaignEndPrimaryButtonClass}
            onClick={onRetry}
            {...pressFx}
          >
            Jogar de novo
          </motion.button>
          <ShareResultButton
            title={shareTitle}
            text={shareText}
            targetRef={cardRef}
            imageFactory={buildShareImage}
            className={campaignEndSecondaryButtonClass}
          />
          <motion.button
            type="button"
            className={campaignEndSecondaryButtonClass}
            onClick={onHome}
            {...pressFx}
          >
            Tela inicial
          </motion.button>
        </div>
        <CupProgress won={progressRound} />
        <JourneyLeaders leaders={journeyLeaders} />
        <div className="cup-end-share-grid">
          <SquadShowcase rows={squadRows} />
          <KnockoutBracket rounds={bracket} />
        </div>
      </motion.div>
    </motion.div>
  );
}
