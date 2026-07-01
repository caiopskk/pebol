import { motion } from "framer-motion";
import type { AttackFocus, Mentality } from "../../../shared/types.js";
import type { AccountUser } from "../api.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { screenIn } from "../lib/motion.js";
import { TacticBannerList, type BannerSpec } from "./TacticBanner.js";
import {
  CupProgress,
  CampaignStatus,
  TeamBadge,
  YouAvatarBadge,
  type CampaignStatusData,
} from "./CupStatus.js";

interface CampaignPreMatchProps {
  account: AccountUser | null;
  ladderLabel: string;
  progressRound: number;
  status: CampaignStatusData;
  qualificationLabel?: string | null;
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
  account,
  ladderLabel,
  progressRound,
  status,
  qualificationLabel,
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
    `prematch-chip min-h-9 rounded-lg border px-3 py-1.5 text-left font-display text-sm font-extrabold transition-all duration-300 ${
      active
        ? "active border-pebol-accent/45 bg-pebol-accent/15 text-pebol-accent shadow-glow"
        : "border-white/10 bg-white/[0.055] text-slate-200 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
    }`;

  return (
    <motion.div
      className="min-h-screen px-4 py-4 font-body text-pebol-text sm:px-6"
      {...screenIn}
    >
      <div className="mx-auto grid max-w-[82rem] gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
          <div>
            <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
              Copa do Mundo
            </span>
            <h1 className="font-title text-xl uppercase tracking-[0.03em] text-white sm:text-2xl">
              {ladderLabel}
            </h1>
          </div>
          <button
            type="button"
            className="min-h-10 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
            onClick={onExit}
          >
            Sair
          </button>
        </div>

        <CupProgress won={progressRound} />

        {qualificationLabel ? (
          <div className="rounded-lg border border-pebol-accent/30 bg-pebol-accent/10 px-4 py-2 text-center font-display text-xs font-black uppercase tracking-[0.1em] text-pebol-accent shadow-glow">
            Classificado para o mata-mata como {qualificationLabel}
          </div>
        ) : null}

        <button
          type="button"
          className="min-h-11 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-5 py-2.5 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 lg:hidden"
          onClick={onPlay}
        >
          Entrar em campo
        </button>

        <div className="grid justify-center gap-3 lg:grid-cols-[28rem_minmax(0,51rem)] lg:items-stretch">
          <div className="cup-prematch-status order-2 min-w-0 lg:order-1 lg:h-full [&>*]:overflow-hidden [&>*]:rounded-lg lg:[&>*]:h-full">
            <CampaignStatus data={status} />
          </div>
          <div className="cup-prematch-card order-1 relative h-full overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl lg:order-2 lg:min-h-[33rem]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,135,.12),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(255,209,102,.12),transparent_28%)]" />
            <div className="relative grid gap-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                <div className="cup-vs-card min-h-[6.25rem] rounded-lg border border-transparent bg-transparent p-1 text-center">
                  <div className="mx-auto flex justify-center">
                    <YouAvatarBadge
                      account={account}
                      fallback={
                        <div className="grid h-12 w-12 place-items-center rounded-lg border border-pebol-accent/40 bg-pebol-accent/15 font-display text-base font-black text-pebol-accent shadow-glow">
                          VC
                        </div>
                      }
                      className="grid h-12 w-12 place-items-center rounded-lg border border-pebol-accent/40 bg-pebol-accent/15 shadow-glow"
                    />
                  </div>
                  <div className="mt-2 font-display text-base font-black text-white sm:text-lg">Seu time</div>
                  <div className="mt-0.5 text-xs font-semibold leading-5 text-pebol-muted">
                    {youFormation} · {youOvrText} · {youMentalityLabel} · {youFocusLabel}
                  </div>
                </div>
                <span className="justify-self-center font-display text-xl font-black text-pebol-gold">VS</span>
                <div className="cup-vs-card min-h-[6.25rem] rounded-lg border border-transparent bg-transparent p-1 text-center">
                  <div className="mx-auto flex justify-center">
                    <TeamBadge
                      teamName={oppFlagName}
                      initials={oppInitials}
                      variant="opp"
                      size="hero"
                    />
                  </div>
                  <div className="mt-2 font-display text-base font-black text-white sm:text-lg">{oppName}</div>
                  <div className="mt-0.5 text-xs font-semibold leading-5 text-pebol-muted">
                    {oppOvrText} · {oppFormation} · {oppMentalityLabel} · {oppFocusLabel}
                  </div>
                </div>
              </div>

              <div className="prematch-banner-shell grid min-h-[7.75rem] content-start rounded-lg border border-transparent bg-transparent p-0">
                <TacticBannerList banners={banners} />
              </div>

              <div className="prematch-control-shell order-4 grid gap-3 lg:order-3 lg:grid-cols-2">
                <div className="prematch-control-card rounded-lg border border-transparent bg-transparent p-3">
                  <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-muted">
                    Mentalidade
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-3">
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
                <div className="prematch-control-card rounded-lg border border-transparent bg-transparent p-3">
                  <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-muted">
                    Foco de ataque
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                className="order-3 hidden min-h-11 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-5 py-2.5 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 lg:order-4 lg:block"
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
