import { motion } from "framer-motion";
import type { AttackFocus, Mentality } from "../../../shared/types.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { screenIn } from "../lib/motion.js";
import { TacticBannerList, type BannerSpec } from "./TacticBanner.js";
import {
  CupProgress,
  CampaignStatus,
  TeamBadge,
  type CampaignStatusData,
} from "./CupStatus.js";

interface CampaignPreMatchProps {
  ladderLabel: string;
  progressRound: number;
  status: CampaignStatusData;
  banners: BannerSpec[];
  youFormation: string;
  youOvrText: string;
  youMentalityLabel: string;
  youFocusLabel: string;
  oppName: string;
  oppFlagName: string;
  oppInitials: string;
  oppOvrText: string;
  oppFormation: string;
  oppMentalityLabel: string;
  oppFocusLabel: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  onExit: () => void;
  onSelectMentality: (mentality: Mentality) => void;
  onSelectFocus: (focus: AttackFocus) => void;
  onPlay: () => void;
}

export function CampaignPreMatch({
  ladderLabel,
  progressRound,
  status,
  banners,
  youFormation,
  youOvrText,
  youMentalityLabel,
  youFocusLabel,
  oppName,
  oppFlagName,
  oppInitials,
  oppOvrText,
  oppFormation,
  oppMentalityLabel,
  oppFocusLabel,
  mentality,
  attackFocus,
  onExit,
  onSelectMentality,
  onSelectFocus,
  onPlay,
}: CampaignPreMatchProps) {
  return (
    <motion.div className="screen cup-screen cup-prematch-screen" {...screenIn}>
      <div className="cup-head">
        <div>
          <span className="cup-tag">Copa do Mundo</span>
          <h1>{ladderLabel}</h1>
        </div>
        <button type="button" className="ghost" onClick={onExit}>
          Sair
        </button>
      </div>
      <CupProgress won={progressRound} />
      <div className="cup-prematch-grid">
        <div className="cup-prematch-side">
          <CampaignStatus data={status} />
        </div>
        <div className="panel cup-prematch">
          <div className="cup-vs">
            <div className="cup-vs-side">
              <div className="hero-crest you">VC</div>
              <div className="hero-name">Seu time</div>
              <div className="hero-tag">
                {youFormation} · {youOvrText} · {youMentalityLabel} · {youFocusLabel}
              </div>
            </div>
            <span className="cup-vs-x">VS</span>
            <div className="cup-vs-side">
              <TeamBadge
                teamName={oppFlagName}
                initials={oppInitials}
                variant="opp"
                size="hero"
              />
              <div className="hero-name">{oppName}</div>
              <div className="hero-tag">
                {oppOvrText} · {oppFormation} · {oppMentalityLabel} · {oppFocusLabel}
              </div>
            </div>
          </div>
          <div className="prematch-banners">
            <TacticBannerList banners={banners} />
          </div>
          <div className="prematch-control-grid">
            <div className="prematch-ment">
              <span className="prematch-ment-label">Mentalidade (peso dobrado)</span>
              <div className="prematch-ment-row">
                {MENTALITIES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ment-chip ${m.id === mentality ? "active" : ""}`}
                    title={m.desc}
                    onClick={() => onSelectMentality(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="prematch-ment">
              <span className="prematch-ment-label">Foco de ataque</span>
              <div className="prematch-ment-row">
                {ATTACK_FOCUS_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`focus-chip ${f.id === attackFocus ? "active" : ""}`}
                    title={f.desc}
                    onClick={() => onSelectFocus(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lobby-actions">
            <button type="button" className="primary big" onClick={onPlay}>
              Entrar em campo
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
