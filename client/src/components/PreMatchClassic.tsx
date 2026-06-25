import { motion } from "framer-motion";
import type {
  AttackFocus,
  GameMode,
  Mentality,
  PlayerPublic,
} from "../../../shared/types.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { screenIn } from "../lib/motion.js";
import { TacticBannerList, type BannerSpec } from "./TacticBanner.js";

interface PreMatchClassicProps {
  code: string;
  mode: GameMode;
  vsAI: boolean;
  you: PlayerPublic;
  opponent?: PlayerPublic;
  youOvrText: string;
  oppOvrText: string;
  youMentalityLabel: string;
  youFocusLabel: string;
  oppMentalityLabel: string;
  oppFocusLabel: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  banners: BannerSpec[];
  onLeave: () => void;
  onSelectMentality: (mentality: Mentality) => void;
  onSelectFocus: (focus: AttackFocus) => void;
  onContinue: () => void;
}

export function PreMatchClassic({
  code,
  mode,
  vsAI,
  you,
  opponent,
  youOvrText,
  oppOvrText,
  youMentalityLabel,
  youFocusLabel,
  oppMentalityLabel,
  oppFocusLabel,
  mentality,
  attackFocus,
  banners,
  onLeave,
  onSelectMentality,
  onSelectFocus,
  onContinue,
}: PreMatchClassicProps) {
  const youReady = !!you.preMatchReady;
  const oppReady = !!opponent?.preMatchReady;
  const oppName = opponent?.name ?? "Adversário";
  const youFormation = you.formationId ?? "—";
  const oppFormation = opponent?.formationId ?? "—";
  const shellClass =
    "min-h-screen bg-stadium-depth px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8";
  const cardClass =
    "relative overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl";
  const chipClass = (active: boolean) =>
    `min-h-11 rounded-xl border px-4 py-2 text-left font-display text-sm font-extrabold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55 ${
      active
        ? "border-pebol-accent/45 bg-pebol-accent/15 text-pebol-accent shadow-glow"
        : "border-white/10 bg-white/[0.055] text-slate-200 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
    }`;

  return (
    <motion.div className={shellClass} {...screenIn}>
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
          {vsAI ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-pebol-muted">
              Modo solo <strong className="text-white">vs Máquina</strong>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-pebol-muted">
              Sala <strong className="text-white">{code}</strong>
            </div>
          )}
          <div
            className={`rounded-full border px-3 py-1 font-display text-xs font-black uppercase tracking-[0.14em] ${
              mode === "hardcore"
                ? "border-red-300/35 bg-red-400/10 text-red-100"
                : "border-pebol-blue/30 bg-pebol-blue/10 text-slate-200"
            }`}
          >
            {mode === "hardcore" ? "Modo Hardcore" : "Modo Clássico"}
          </div>
          <button
            type="button"
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
            onClick={onLeave}
          >
            Sair
          </button>
        </div>

        <div className={cardClass}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,135,.12),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(255,209,102,.12),transparent_28%)]" />
          <div className="relative grid gap-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-pebol-accent/40 bg-pebol-accent/15 font-display text-lg font-black text-pebol-accent shadow-glow">
                  VC
                </div>
                <div className="mt-3 font-display text-xl font-black text-white">{you.name}</div>
                <div className="mt-1 text-sm font-semibold text-pebol-muted">
                  {youFormation} · {youOvrText} · {youMentalityLabel} · {youFocusLabel}
                </div>
              </div>
              <span className="justify-self-center font-display text-2xl font-black text-pebol-gold">VS</span>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-pebol-blue/35 bg-pebol-blue/15 font-display text-lg font-black text-slate-100">
                  {(oppName[0] ?? "?").toUpperCase()}
                </div>
                <div className="mt-3 font-display text-xl font-black text-white">{oppName}</div>
                <div className="mt-1 text-sm font-semibold text-pebol-muted">
                  {oppFormation} · {oppOvrText} · {oppMentalityLabel} · {oppFocusLabel}
                </div>
              </div>
            </div>

            {banners.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <TacticBannerList banners={banners} />
              </div>
            ) : null}

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
                      disabled={youReady}
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
                      disabled={youReady}
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
              className="min-h-14 rounded-2xl border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-6 py-3 font-display text-base font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65"
              disabled={youReady}
              onClick={onContinue}
            >
              {youReady
                ? vsAI
                  ? "Carregando..."
                  : oppReady
                    ? "Carregando..."
                    : "Pronto. Aguardando adversário..."
                : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
