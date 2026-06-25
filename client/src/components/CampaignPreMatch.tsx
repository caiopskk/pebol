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
  const chipClass = (active: boolean) =>
    `prematch-chip min-h-11 rounded-xl border px-4 py-2 text-left font-display text-sm font-extrabold transition-all duration-300 ${
      active
        ? "border-pebol-accent/45 bg-pebol-accent/15 text-pebol-accent shadow-glow"
        : "border-white/10 bg-white/[0.055] text-slate-200 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
    }`;

  return (
    <motion.div
      className="min-h-screen bg-stadium-depth px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8"
      {...screenIn}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
          <div>
            <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
              Copa do Mundo
            </span>
            <h1 className="font-display text-2xl font-black uppercase tracking-[0.03em] text-white sm:text-3xl">
              {ladderLabel}
            </h1>
          </div>
          <button
            type="button"
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
            onClick={onExit}
          >
            Sair
          </button>
        </div>

        <CupProgress won={progressRound} />

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="min-w-0">
            <CampaignStatus data={status} />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,135,.12),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(255,209,102,.12),transparent_28%)]" />
            <div className="relative grid gap-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-pebol-accent/40 bg-pebol-accent/15 font-display text-lg font-black text-pebol-accent shadow-glow">
                    VC
                  </div>
                  <div className="mt-3 font-display text-xl font-black text-white">Seu time</div>
                  <div className="mt-1 text-sm font-semibold text-pebol-muted">
                    {youFormation} · {youOvrText} · {youMentalityLabel} · {youFocusLabel}
                  </div>
                </div>
                <span className="justify-self-center font-display text-2xl font-black text-pebol-gold">VS</span>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                  <div className="mx-auto flex justify-center">
                    <TeamBadge
                      teamName={oppFlagName}
                      initials={oppInitials}
                      variant="opp"
                      size="hero"
                    />
                  </div>
                  <div className="mt-3 font-display text-xl font-black text-white">{oppName}</div>
                  <div className="mt-1 text-sm font-semibold text-pebol-muted">
                    {oppOvrText} · {oppFormation} · {oppMentalityLabel} · {oppFocusLabel}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <TacticBannerList banners={banners} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-muted">
                    Mentalidade
                  </span>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {MENTALITIES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={chipClass(m.id === mentality)}
                        title={m.desc}
                        onClick={() => onSelectMentality(m.id)}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-muted">
                    Foco de ataque
                  </span>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {ATTACK_FOCUS_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={chipClass(f.id === attackFocus)}
                        title={f.desc}
                        onClick={() => onSelectFocus(f.id)}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="min-h-14 rounded-2xl border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-6 py-3 font-display text-base font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                onClick={onPlay}
              >
                Entrar em campo
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
