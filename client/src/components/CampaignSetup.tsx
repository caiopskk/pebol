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
      className="min-h-screen bg-stadium-depth px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,209,102,.14),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(0,255,135,.12),transparent_34%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <img className="h-20 w-16 object-contain drop-shadow-[0_0_28px_rgba(255,209,102,.28)]" src="/world_cup_trophy.png" alt="" />
              <div className="min-w-0">
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                  Modo Copa do Mundo
                </span>
                <h1 className="font-display text-2xl font-black uppercase tracking-[0.03em] text-white sm:text-3xl">
                  Copa do Mundo 48 Seleções
                </h1>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-pebol-muted">
                  Monte sua seleção, dispute 3 jogos de grupo e tente passar para o
                  mata-mata de 32 times até a final.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="min-h-10 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
              onClick={onExit}
            >
              Sair
            </button>
          </div>
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
      </div>
    </motion.div>
  );
}
