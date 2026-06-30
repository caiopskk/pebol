import type { ReactNode } from "react";
import type { AttackFocus, Formation, Mentality } from "../../../shared/types.js";
import { FORMATIONS } from "../../../shared/formations.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { Pitch, type PitchSlot } from "./Pitch.js";

export const ATTACK_FOCUS_OPTIONS: {
  id: AttackFocus;
  name: string;
  desc: string;
}[] = [
  {
    id: "equilibrado",
    name: "Equilibrado",
    desc: "Ataque distribuído, sem ênfase.",
  },
  {
    id: "lados",
    name: "Pelos lados",
    desc: "Joga aberto: usa pontas e laterais. Forte se eles forem bons.",
  },
  {
    id: "meio",
    name: "Pelo meio",
    desc: "Joga por dentro: usa o miolo (meias e atacantes). Forte se o miolo for bom.",
  },
];

interface SetupBoardProps {
  formation: Formation;
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  pitchSlots: PitchSlot[];
  mentalityHeader?: string;
  focusHeader?: string;
  actionLabel: string;
  actionDoneLabel?: string;
  actionDisabled?: boolean;
  actionDone?: boolean;
  mobileActionFirst?: boolean;
  density?: "compact" | "comfortable";
  className?: string;
  note?: ReactNode;
  extraFocusContent?: ReactNode;
  hideMentalityFocus?: boolean;
  onFormationChange: (formationId: string) => void;
  onMentalityChange: (mentality: Mentality) => void;
  onAttackFocusChange: (focus: AttackFocus) => void;
  onAction: () => void;
}

export function SetupBoard({
  formation,
  formationId,
  mentality,
  attackFocus,
  pitchSlots,
  mentalityHeader = "Plano de jogo",
  focusHeader = "Preferência ofensiva",
  actionLabel,
  actionDoneLabel = "Pronto. Aguardando...",
  actionDisabled = false,
  actionDone = false,
  mobileActionFirst = false,
  density = "compact",
  className = "",
  note,
  extraFocusContent,
  hideMentalityFocus = false,
  onFormationChange,
  onMentalityChange,
  onAttackFocusChange,
  onAction,
}: SetupBoardProps) {
  const comfortable = density === "comfortable";
  const cardClass =
    `rounded-lg border border-white/10 bg-pebol-panel shadow-premium backdrop-blur-xl ${
      comfortable ? "p-4 sm:p-5" : "p-3.5 sm:p-4"
    }`;
  const titleClass =
    `font-title uppercase tracking-[0.02em] text-white ${
      comfortable ? "text-xl" : "text-lg"
    }`;
  const optionClass = (active: boolean, extra = "") =>
    `rounded-lg border font-display font-black transition-all duration-300 ${
      active
        ? "setup-option-active border-pebol-accent bg-pebol-accent/8 text-pebol-accent shadow-[0_0_0.9rem_rgba(0,255,135,0.08)]"
        : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
    } ${extra}`.trim();
  const detailOptionClass = (active: boolean) =>
    `rounded-lg border text-left transition-all duration-300 ${
      active
        ? "setup-detail-active border-pebol-accent bg-pebol-accent/8 shadow-[0_0_0.9rem_rgba(0,255,135,0.08)]"
        : "border-white/10 bg-white/[0.045] hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
    } ${comfortable ? "px-4 py-3" : "px-3 py-2"}`;
  const actionButton = (wrapperClass = "") => (
    <div className={`mt-2.5 ${wrapperClass}`.trim()}>
      <button
        type="button"
        className={`min-h-10 w-full rounded-lg border px-4 py-2 font-display text-sm font-black uppercase tracking-[0.08em] transition-all duration-300 ${
          actionDone
            ? "border-pebol-accent/35 bg-pebol-accent/10 text-pebol-accent"
            : "border-pebol-accent/40 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold text-black shadow-glow hover:-translate-y-0.5"
        }`}
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionDone ? actionDoneLabel : actionLabel}
      </button>
    </div>
  );

  return (
    <div
      className={`grid gap-3 ${
        hideMentalityFocus
          ? "grid-cols-1"
          : comfortable
            ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.95fr)_minmax(18rem,.95fr)]"
            : "lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,.85fr)_minmax(16rem,.85fr)]"
      } ${className}`.trim()}
    >
      {mobileActionFirst ? actionButton("order-first mt-0 lg:hidden") : null}

      <section className={cardClass}>
        <div className={`${comfortable ? "mb-4" : "mb-3"} flex flex-wrap items-center justify-between gap-2`}>
          <h2 className={titleClass}>Formação</h2>
          <span className="rounded-full border border-pebol-accent/25 bg-pebol-accent/10 px-3 py-1 font-display text-xs font-black text-pebol-accent">{formation.name}</span>
        </div>
        <div className={`grid grid-cols-5 ${comfortable ? "gap-2.5" : "gap-1.5 sm:gap-2"}`}>
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={optionClass(
                f.id === formationId,
                comfortable
                  ? "min-h-10 px-2 py-2 text-sm"
                  : "min-h-8 px-1.5 py-1 text-xs sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-sm",
              )}
              data-form={f.id}
              onClick={() => onFormationChange(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className={`mini-pitch-wrap rounded-lg border border-white/10 bg-black/20 ${
          comfortable ? "mt-4 p-3" : "mt-3 p-2.5"
        }`}>
          <Pitch slots={pitchSlots} small variant="setup" />
        </div>
        {hideMentalityFocus ? (
          <>
            {note}
            {extraFocusContent}
            {actionButton(mobileActionFirst ? "hidden lg:block" : "")}
          </>
        ) : null}
      </section>

      {hideMentalityFocus ? null : (
        <>
          <section className={cardClass}>
            <div className={`${comfortable ? "mb-4" : "mb-3"} flex flex-wrap items-baseline justify-between gap-2`}>
              <h2 className={titleClass}>Mentalidade</h2>
              <span className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">{mentalityHeader}</span>
            </div>
            <div className={`grid ${comfortable ? "gap-2.5" : "gap-1.5"}`}>
              {MENTALITIES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={detailOptionClass(m.id === mentality)}
                  data-ment={m.id}
                  onClick={() => onMentalityChange(m.id)}
                >
                  <strong className={`block font-display font-black text-white ${comfortable ? "text-base" : "text-sm"}`}>{m.name}</strong>
                  <span className={`mt-0.5 block font-semibold text-pebol-muted ${
                    comfortable ? "text-xs leading-5" : "text-[0.72rem] leading-4"
                  }`}>{m.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <div className={`${comfortable ? "mb-4" : "mb-3"} flex flex-wrap items-baseline justify-between gap-2`}>
              <h2 className={titleClass}>Foco de ataque</h2>
              <span className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">{focusHeader}</span>
            </div>
            <div className={`grid ${comfortable ? "gap-2.5" : "gap-1.5"}`}>
              {ATTACK_FOCUS_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={detailOptionClass(f.id === attackFocus)}
                  data-focus={f.id}
                  onClick={() => onAttackFocusChange(f.id)}
                >
                  <strong className={`block font-display font-black text-white ${comfortable ? "text-base" : "text-sm"}`}>{f.name}</strong>
                  <span className={`mt-0.5 block font-semibold text-pebol-muted ${
                    comfortable ? "text-xs leading-5" : "text-[0.72rem] leading-4"
                  }`}>{f.desc}</span>
                </button>
              ))}
            </div>
            {note}
            {extraFocusContent}
            {actionButton(mobileActionFirst ? "hidden lg:block" : "")}
          </section>
        </>
      )}
    </div>
  );
}
