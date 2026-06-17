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
  actionDoneLabel = "✓ Pronto! Aguardando…",
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
    <div className="lobby-actions">
      <button
        type="button"
        className={`primary big ${actionDone ? "done" : ""}`}
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionDone ? actionDoneLabel : actionLabel}
      </button>
    </div>
  );

  return (
    <div
      className={`setup-board ${hideMentalityFocus ? "formation-only" : ""} ${className}`.trim()}
    >
      <section className="setup-panel setup-formation">
        <div className="setup-panel-head">
          <h2>Formação</h2>
          <span>{formation.name}</span>
        </div>
        <div className="formation-grid">
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`form-btn ${f.id === formationId ? "active" : ""}`}
              data-form={f.id}
              onClick={() => onFormationChange(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="mini-pitch-wrap setup-pitch">
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
          <section className="setup-panel setup-mentality mentality-col">
            <div className="setup-panel-head">
              <h2>Mentalidade</h2>
              <span>{mentalityHeader}</span>
            </div>
            {MENTALITIES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`ment-btn ${m.id === mentality ? "active" : ""}`}
                data-ment={m.id}
                onClick={() => onMentalityChange(m.id)}
              >
                <strong>{m.name}</strong>
                <span>{m.desc}</span>
              </button>
            ))}
          </section>

          <section className="setup-panel setup-focus">
            <div className="setup-panel-head">
              <h2>Foco de ataque</h2>
              <span>{focusHeader}</span>
            </div>
            <div className="focus-grid">
              {ATTACK_FOCUS_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`focus-btn ${f.id === attackFocus ? "active" : ""}`}
                  data-focus={f.id}
                  onClick={() => onAttackFocusChange(f.id)}
                >
                  <strong>{f.name}</strong>
                  <span>{f.desc}</span>
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
