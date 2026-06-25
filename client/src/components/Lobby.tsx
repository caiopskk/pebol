import { motion } from "framer-motion";
import type {
  AttackFocus,
  GameMode,
  Mentality,
  PlayerPublic,
} from "../../../shared/types.js";
import type { Formation } from "../../../shared/types.js";
import { SetupBoard } from "./SetupBoard.js";

interface LobbyProps {
  code: string;
  mode: GameMode;
  vsAI: boolean;
  you?: PlayerPublic;
  opponent?: PlayerPublic;
  formation: Formation;
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  pitchSlots: import("./Pitch.js").PitchSlot[];
  onCopyCode: () => void;
  onLeave: () => void;
  onFormationChange: (formationId: string) => void;
  onMentalityChange: (mentality: Mentality) => void;
  onAttackFocusChange: (focus: AttackFocus) => void;
  onReady: () => void;
}

function PlayerChip({
  player,
  label,
}: {
  player?: PlayerPublic;
  label: string;
}) {
  if (!player) return null;
  const formation = player.formationId ?? "--";
  return (
    <div
      className={`rounded-2xl border p-4 shadow-premium backdrop-blur-xl ${
        player.ready
          ? "border-pebol-accent/45 bg-pebol-accent/10"
          : "border-white/10 bg-pebol-panel"
      } ${player.connected ? "" : "opacity-55"}`}
    >
      <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-muted">
        {label}
      </span>
      <strong className="mt-1 block truncate font-display text-xl font-black text-white">
        {player.name}
      </strong>
      <span className="mt-1 block text-sm font-semibold text-pebol-muted">
        {formation} · {player.ready ? "pronto" : "escolhendo"}
      </span>
    </div>
  );
}

export function Lobby({
  code,
  mode,
  vsAI,
  you,
  opponent,
  formation,
  formationId,
  mentality,
  attackFocus,
  pitchSlots,
  onCopyCode,
  onLeave,
  onFormationChange,
  onMentalityChange,
  onAttackFocusChange,
  onReady,
}: LobbyProps) {
  const youReady = !!you?.ready;

  return (
    <motion.div
      className="min-h-screen bg-stadium-depth px-4 py-5 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(0,255,135,.14),transparent_34%)]" />
          <div className="relative flex flex-wrap items-center gap-3">
            {vsAI ? (
              <div className="font-display text-sm font-black uppercase tracking-[0.08em] text-pebol-muted">
                Modo solo <strong className="text-white">vs Máquina</strong>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 font-display text-sm font-black uppercase tracking-[0.08em] text-pebol-muted">
                Sala <strong className="text-xl tracking-[0.18em] text-white">{code}</strong>
                <button type="button" className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-1 text-xs text-pebol-accent transition-all duration-300 hover:bg-pebol-accent/10" onClick={onCopyCode}>
                  copiar
                </button>
              </div>
            )}
            <div className={`ml-auto rounded-full border px-3 py-1 font-display text-xs font-black uppercase tracking-[0.08em] ${
              mode === "hardcore"
                ? "border-pebol-gold/40 bg-pebol-gold/10 text-pebol-gold"
                : "border-pebol-accent/35 bg-pebol-accent/10 text-pebol-accent"
            }`}>
              {mode === "hardcore" ? "Modo Hardcore" : "Modo Clássico"}
            </div>
            <button type="button" className="rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15" onClick={onLeave}>
              Sair
            </button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          <PlayerChip player={you} label="Você" />
          {opponent ? (
            <PlayerChip player={opponent} label="Adversário" />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-pebol-muted shadow-premium backdrop-blur-xl">
              Aguardando adversário...
            </div>
          )}
        </div>

        <SetupBoard
          formation={formation}
          formationId={formationId}
          mentality={mentality}
          attackFocus={attackFocus}
          pitchSlots={pitchSlots}
          actionLabel="Confirmar e ficar pronto"
          actionDone={youReady}
          actionDisabled={youReady}
          hideMentalityFocus
          onFormationChange={onFormationChange}
          onMentalityChange={onMentalityChange}
          onAttackFocusChange={onAttackFocusChange}
          onAction={onReady}
        />
      </div>
    </motion.div>
  );
}
