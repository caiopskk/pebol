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
  className = "",
  note,
  extraFocusContent,
  hideMentalityFocus = false,
  onFormationChange,
  onMentalityChange,
  onAttackFocusChange,
  onAction,
}: SetupBoardProps) {
  const actionButton = (
    <div className="lobby-actions mt-4">
      <button
        type="button"
        className={`min-h-12 w-full rounded-xl border px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] transition-all duration-300 ${
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
      className={`setup-board grid gap-4 ${hideMentalityFocus ? "formation-only" : ""} ${className}`.trim()}
    >
      <section className="setup-panel setup-formation rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
        <div className="setup-panel-head mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-black uppercase tracking-[0.02em] text-white">Formação</h2>
          <span className="rounded-full border border-pebol-accent/25 bg-pebol-accent/10 px-3 py-1 font-display text-xs font-black text-pebol-accent">{formation.name}</span>
        </div>
        <div className="formation-grid grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`form-btn rounded-xl border px-3 py-2 font-display text-sm font-black transition-all duration-300 ${
                f.id === formationId
                  ? "active border-pebol-accent bg-pebol-accent/15 text-pebol-accent shadow-glow"
                  : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
              }`}
              data-form={f.id}
              onClick={() => onFormationChange(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="mini-pitch-wrap setup-pitch mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
          <Pitch slots={pitchSlots} small />
        </div>
        {hideMentalityFocus ? (
          <>
            {note}
            {extraFocusContent}
            {actionButton}
          </>
        ) : null}
      </section>

      {hideMentalityFocus ? null : (
        <>
          <section className="setup-panel setup-mentality mentality-col rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
            <div className="setup-panel-head mb-4">
              <h2 className="font-display text-xl font-black uppercase tracking-[0.02em] text-white">Mentalidade</h2>
              <span className="text-sm font-semibold text-pebol-muted">{mentalityHeader}</span>
            </div>
            {MENTALITIES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`ment-btn mb-2 w-full rounded-2xl border p-3 text-left transition-all duration-300 ${
                  m.id === mentality
                    ? "active border-pebol-accent bg-pebol-accent/15 shadow-glow"
                    : "border-white/10 bg-white/[0.045] hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
                }`}
                data-ment={m.id}
                onClick={() => onMentalityChange(m.id)}
              >
                <strong className="block font-display text-base font-black text-white">{m.name}</strong>
                <span className="mt-1 block text-xs font-semibold leading-5 text-pebol-muted">{m.desc}</span>
              </button>
            ))}
          </section>

          <section className="setup-panel setup-focus rounded-2xl border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
            <div className="setup-panel-head mb-4">
              <h2 className="font-display text-xl font-black uppercase tracking-[0.02em] text-white">Foco de ataque</h2>
              <span className="text-sm font-semibold text-pebol-muted">{focusHeader}</span>
            </div>
            <div className="focus-grid grid gap-2">
              {ATTACK_FOCUS_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`focus-btn rounded-2xl border p-3 text-left transition-all duration-300 ${
                    f.id === attackFocus
                      ? "active border-pebol-accent bg-pebol-accent/15 shadow-glow"
                      : "border-white/10 bg-white/[0.045] hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
                  }`}
                  data-focus={f.id}
                  onClick={() => onAttackFocusChange(f.id)}
                >
                  <strong className="block font-display text-base font-black text-white">{f.name}</strong>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-pebol-muted">{f.desc}</span>
                </button>
              ))}
            </div>
            {note}
            {extraFocusContent}
            {actionButton}
          </section>
        </>
      )}
    </div>
  );
}
