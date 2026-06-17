import { motion } from "framer-motion";
import type {
  AttackFocus,
  Formation,
  Mentality,
} from "../../../shared/types.js";
import { SetupBoard } from "./SetupBoard.js";

type CampaignMode = "normal" | "hardcore";

interface CampaignSetupProps {
  formation: Formation;
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  mode: CampaignMode;
  hardcoreUnlocked: boolean;
  hardcoreUnlockLevel: number;
  pitchSlots: import("./Pitch.js").PitchSlot[];
  onExit: () => void;
  onFormationChange: (formationId: string) => void;
  onMentalityChange: (mentality: Mentality) => void;
  onAttackFocusChange: (focus: AttackFocus) => void;
  onModeChange: (mode: CampaignMode) => void;
  onStart: () => void;
}

export function CampaignSetup({
  formation,
  formationId,
  mentality,
  attackFocus,
  mode,
  hardcoreUnlocked,
  hardcoreUnlockLevel,
  pitchSlots,
  onExit,
  onFormationChange,
  onMentalityChange,
  onAttackFocusChange,
  onModeChange,
  onStart,
}: CampaignSetupProps) {
  const modeOptions: { id: CampaignMode; name: string; desc: string }[] = [
    {
      id: "normal",
      name: "Normal",
      desc: "Ratings visíveis e dicas de encaixe tático.",
    },
    {
      id: "hardcore",
      name: "Hardcore",
      desc: hardcoreUnlocked
        ? "Sem ratings e sem dicas durante a campanha."
        : `Desbloqueia no nível ${hardcoreUnlockLevel}.`,
    },
  ];

  return (
    <motion.div
      className="screen cup-screen cup-setup-screen"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="cup-head">
        <img className="cup-head-trophy" src="/world_cup_trophy.png" alt="" />
        <div>
          <span className="cup-tag">Modo Copa do Mundo</span>
          <h1>Copa do Mundo 48 Seleções</h1>
          <p>
            Monte sua seleção, dispute 3 jogos de grupo e tente passar para o
            mata-mata de 32 times até a final.
          </p>
        </div>
        <button type="button" className="ghost" onClick={onExit}>
          Sair
        </button>
      </div>

      <SetupBoard
          className="cup-setup-board"
          formation={formation}
          formationId={formationId}
          mentality={mentality}
          attackFocus={attackFocus}
          pitchSlots={pitchSlots}
          mentalityHeader="Peso dobrado"
          actionLabel="Começar a campanha"
          note={
            <div className="cup-setup-note">
              <strong>Campanha 48 seleções</strong>
              <span>
                Monte o XI no draft, jogue a fase de grupos e avance para o
                mata-mata.
              </span>
            </div>
          }
          extraFocusContent={
            <div className="cup-mode-box">
              <div className="setup-panel-head compact">
                <h2>Modo da campanha</h2>
                <span>{mode === "hardcore" ? "Hardcore" : "Normal"}</span>
              </div>
              <div className="cup-mode-grid">
                {modeOptions.map((option) => {
                  const locked = option.id === "hardcore" && !hardcoreUnlocked;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`cup-mode-btn ${
                        option.id === mode ? "active" : ""
                      } ${locked ? "locked" : ""}`}
                      disabled={locked}
                      onClick={() => onModeChange(option.id)}
                    >
                      <strong>{option.name}</strong>
                      <span>{option.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          }
          onFormationChange={onFormationChange}
          onMentalityChange={onMentalityChange}
          onAttackFocusChange={onAttackFocusChange}
          onAction={onStart}
      />
    </motion.div>
  );
}
