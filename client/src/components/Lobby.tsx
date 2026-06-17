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
  const formation = player.formationId ?? "—";
  return (
    <div
      className={`chip ${player.ready ? "ready" : ""} ${
        player.connected ? "" : "offline"
      }`}
    >
      <span className="chip-label">{label}</span>
      <strong>{player.name}</strong>
      <span className="chip-sub">
        {formation} {player.ready ? "• ✓ pronto" : "• escolhendo…"}
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
      className="screen lobby"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="topbar">
        {vsAI ? (
          <div className="room-code">
            Modo solo <strong>vs Máquina</strong>
          </div>
        ) : (
          <div className="room-code">
            Sala <strong>{code}</strong>
            <button type="button" className="ghost" onClick={onCopyCode}>
              copiar
            </button>
          </div>
        )}
        <div className={`mode-tag ${mode}`}>
          {mode === "hardcore" ? "Modo Hardcore" : "Modo Clássico"}
        </div>
        <button type="button" className="ghost" onClick={onLeave}>
          Sair
        </button>
      </div>

      <div className="players-status">
        <PlayerChip player={you} label="Você" />
        {opponent ? (
          <PlayerChip player={opponent} label="Adversário" />
        ) : (
          <div className="chip waiting">Aguardando adversário…</div>
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
    </motion.div>
  );
}
