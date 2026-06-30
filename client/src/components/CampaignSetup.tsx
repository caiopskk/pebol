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
      className="min-h-screen px-4 py-4 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto grid w-full max-w-[82.5rem] gap-4">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl sm:px-5 lg:px-6 lg:py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,209,102,.14),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(0,255,135,.12),transparent_34%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img className="h-12 w-10 object-contain drop-shadow-[0_0_22px_rgba(255,209,102,.24)] sm:h-14 sm:w-11" src="/world_cup_trophy.png" alt="" />
              <div className="min-w-0">
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                  Modo Copa do Mundo
                </span>
                <h1 className="font-title text-xl uppercase tracking-[0.03em] text-white sm:text-2xl">
                  Copa do Mundo 48 Seleções
                </h1>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-5 text-pebol-muted">
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
          formation={formation}
          formationId={formationId}
          mentality={mentality}
          attackFocus={attackFocus}
          pitchSlots={pitchSlots}
          mentalityHeader="Peso dobrado"
          actionLabel="Começar a campanha"
          mobileActionFirst
          density="comfortable"
          note={
            <div className="mt-2.5 rounded-lg border border-pebol-gold/20 bg-pebol-gold/10 px-3 py-2">
              <strong className="block font-display text-sm font-black uppercase tracking-[0.08em] text-pebol-gold">
                Campanha 48 seleções
              </strong>
              <span className="mt-0.5 block text-xs font-semibold leading-4 text-pebol-muted">
                Monte o XI no draft, jogue a fase de grupos e avance para o
                mata-mata.
              </span>
            </div>
          }
          extraFocusContent={
            <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.045] p-2.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-title text-base uppercase tracking-[0.03em] text-white">
                  Modo da campanha
                </h2>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 font-display text-xs font-black uppercase tracking-[0.08em] text-pebol-muted">
                  {mode === "hardcore" ? "Hardcore" : "Normal"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {modeOptions.map((option) => {
                  const locked = option.id === "hardcore" && !hardcoreUnlocked;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`min-h-16 rounded-lg border px-3 py-2 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55 ${
                        option.id === mode
                          ? "campaign-mode-active border-pebol-accent bg-pebol-accent/15 shadow-glow"
                          : "border-white/10 bg-white/[0.045] hover:border-pebol-blue/50 hover:bg-pebol-blue/10"
                      }`}
                      disabled={locked}
                      onClick={() => onModeChange(option.id)}
                    >
                      <strong className="block font-display text-sm font-black text-white">
                        {option.name}
                      </strong>
                      <span className="mt-0.5 block text-[0.72rem] font-semibold leading-4 text-pebol-muted">
                        {option.desc}
                      </span>
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
