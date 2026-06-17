import type { Player, PlayerPublic, RoomState, Team } from "../../../shared/types.js";
import { groupOf } from "../../../shared/formations.js";
import { TacticBanner, type BannerSpec } from "./TacticBanner.js";
import { TeamStrengthCard, type TeamStrengthData } from "./CupStatus.js";
import { Pitch, type PitchSlot } from "./Pitch.js";

interface DraftProps {
  state: RoomState;
  you: PlayerPublic;
  opponent?: PlayerPublic;
  team: Team | null;
  yourTurn: boolean;
  vsAI: boolean;
  selectedPlayer: string | null;
  youPitchSlots: PitchSlot[];
  opponentPitchSlots: PitchSlot[] | null;
  youStrength: TeamStrengthData;
  opponentStrength: TeamStrengthData;
  attackFocusBanner: BannerSpec | null;
  playerPosText: (player: Player) => string;
  onLeave: () => void;
  onReroll: () => void;
  onSelectPlayer: (name: string) => void;
  onPickSlot: (slotId: string) => void;
}

function PlayerItem({
  player,
  taken,
  selected,
  clickable,
  hideRatings,
  playerPosText,
  onSelect,
}: {
  player: NonNullable<RoomState["currentTeam"]>["players"][number];
  taken: boolean;
  selected: boolean;
  clickable: boolean;
  hideRatings: boolean;
  playerPosText: (player: Player) => string;
  onSelect: (name: string) => void;
}) {
  return (
    <li
      className={`pl-item ${taken ? "taken" : ""} ${selected ? "selected" : ""} ${
        clickable ? "clickable" : ""
      }`}
      data-player={player.name}
      onClick={() => {
        if (clickable) onSelect(player.name);
      }}
    >
      <span
        className={`pl-pos pos-${groupOf(player.pos).toLowerCase()}`}
        title={playerPosText(player)}
      >
        {playerPosText(player)}
      </span>
      <span className="pl-name">{player.name}</span>
      {hideRatings ? (
        <span className="pl-rt hidden">??</span>
      ) : (
        <span className="pl-rt">{player.rating}</span>
      )}
      {taken ? <span className="pl-tick">✓</span> : null}
    </li>
  );
}

export function Draft({
  state,
  you,
  opponent,
  team,
  yourTurn,
  vsAI,
  selectedPlayer,
  youPitchSlots,
  opponentPitchSlots,
  youStrength,
  opponentStrength,
  attackFocusBanner,
  playerPosText,
  onLeave,
  onReroll,
  onSelectPlayer,
  onPickSlot,
}: DraftProps) {
  const turnText = yourTurn
    ? "Sua vez de escolher"
    : `Vez de ${opponent?.name ?? "adversário"}`;

  return (
    <div className="screen draft">
      <div className="topbar">
        <div className="room-code">
          {vsAI ? (
            <>
              Modo solo <strong>vs Máquina</strong>
            </>
          ) : (
            <>
              Sala <strong>{state.code}</strong>
            </>
          )}
        </div>
        <div className="round-info">
          Rodada <strong>{state.round + 1}</strong> / {state.totalSlots}
        </div>
        <div className={`turn-pill ${yourTurn ? "you" : "opp"}`}>
          {turnText}
        </div>
        <button type="button" className="ghost" onClick={onLeave}>
          Sair
        </button>
      </div>

      <div className="draft-layout classic-draft-layout">
        <section
          className={`board draft-board you-board ${yourTurn ? "active-turn" : ""} ${
            yourTurn && selectedPlayer ? "picking" : ""
          }`}
        >
          <div className="draft-board-head">
            <h3>Seu time</h3>
            <TeamStrengthCard data={youStrength} />
          </div>
          <Pitch
            slots={youPitchSlots}
            small
            interactive
            onSlotClick={(slotId, filled) => {
              if (!filled && yourTurn && selectedPlayer) onPickSlot(slotId);
            }}
          />
          {attackFocusBanner ? (
            <TacticBanner kind={attackFocusBanner.kind}>{attackFocusBanner.text}</TacticBanner>
          ) : null}
        </section>

        <section
          className={`draw-panel classic-draw ${yourTurn ? "your-turn" : ""}`}
        >
          <div className="draw-head">
            <span className="draw-label">Time sorteado</span>
            <h2>{team ? `${team.name} ${team.season}` : "—"}</h2>
            <span className="draw-league">{team?.league ?? ""}</span>
            {state.pvpRerollsEnabled ? (
              <button
                type="button"
                className="ghost reroll"
                disabled={!yourTurn || (you.rerollsRemaining ?? 0) <= 0}
                onClick={onReroll}
              >
                Atualizar time ({you.rerollsRemaining ?? 0})
              </button>
            ) : null}
          </div>
          <ul className="player-list">
            {team?.players.map((player) => (
              <PlayerItem
                key={player.name}
                player={player}
                taken={state.takenThisRound.includes(player.name)}
                selected={selectedPlayer === player.name}
                clickable={yourTurn && !state.takenThisRound.includes(player.name)}
                hideRatings={state.hideRatings}
                playerPosText={playerPosText}
                onSelect={onSelectPlayer}
              />
            ))}
          </ul>
          <p className="draft-hint">
            {yourTurn
              ? selectedPlayer
                ? (
                    <>
                      Agora clique numa <strong>vaga livre</strong> do seu campo
                      para escalar <strong>{selectedPlayer}</strong>.
                    </>
                  )
                : "Selecione um jogador da lista acima."
              : "Aguarde o adversário escolher…"}
          </p>
        </section>

        <section
          className={`board draft-board opp-board ${!yourTurn ? "active-turn" : ""}`}
        >
          <div className="draft-board-head">
            <h3>{opponent?.name ?? "Adversário"}</h3>
            <TeamStrengthCard data={opponentStrength} />
          </div>
          {opponentPitchSlots ? <Pitch slots={opponentPitchSlots} small /> : null}
        </section>
      </div>
    </div>
  );
}
