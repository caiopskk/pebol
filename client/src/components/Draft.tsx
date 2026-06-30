import type { Player, PlayerPublic, RoomState, Team } from "../../../shared/types.js";
import { groupOf } from "../../../shared/formations.js";
import { isWorldCupMode } from "../../../shared/gameMode.js";
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
  selectedDraftSlotId: string | null;
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
  onRepositionSlot: (slotId: string) => void;
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
      className={`pl-item grid min-h-10 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_2.5rem_auto] items-center gap-2 rounded-lg border bg-white/[0.045] px-3 py-2 transition-all duration-200 ${taken ? "taken opacity-50" : ""} ${selected ? "selected border-pebol-accent/45 bg-pebol-accent/10 shadow-glow" : ""} ${
        clickable ? "clickable" : ""
      }`}
      data-player={player.name}
      onClick={() => {
        if (clickable) onSelect(player.name);
      }}
    >
      <span
        className={`pl-pos pos-${groupOf(player.pos).toLowerCase()} font-display text-[0.7rem] font-black uppercase tracking-[0.08em] text-pebol-muted`}
        title={playerPosText(player)}
      >
        {playerPosText(player)}
      </span>
      <span className="pl-name min-w-0 truncate text-sm font-black text-white">{player.name}</span>
      {hideRatings ? (
        <span className="pl-rt hidden text-right font-display text-sm font-black text-pebol-gold">??</span>
      ) : (
        <span className="pl-rt text-right font-display text-sm font-black text-pebol-gold">{player.rating}</span>
      )}
      {taken ? <span className="pl-tick text-pebol-accent">✓</span> : null}
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
  selectedDraftSlotId,
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
  onRepositionSlot,
}: DraftProps) {
  const turnText = yourTurn
    ? "Sua vez de escolher"
    : `Vez de ${opponent?.name ?? "adversário"}`;

  const drawnTeamLabel =
    isWorldCupMode(state.mode) ? "Seleção sorteada" : "Time sorteado";
  const rerollLabel =
    isWorldCupMode(state.mode) ? "Atualizar seleção" : "Atualizar time";

  return (
    <div className="min-h-screen bg-transparent px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[82.5rem]">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
          <div className="min-w-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
            {vsAI ? (
              <>
                Modo solo <strong className="ml-1 text-pebol-text">vs Máquina</strong>
              </>
            ) : (
              <>
                Sala <strong className="ml-1 text-pebol-gold">{state.code}</strong>
              </>
            )}
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
            Rodada <strong className="text-pebol-gold">{state.round + 1}</strong> /{" "}
            {state.totalSlots}
          </div>
          <div
            className={`ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center font-display text-xs font-black uppercase tracking-[0.1em] ${
              yourTurn
                ? "border border-pebol-accent/45 bg-pebol-accent/10 text-pebol-accent shadow-[0_0_0.85rem_rgba(0,255,135,0.08)]"
                : "border border-white/10 bg-white/[0.045] text-pebol-muted"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                yourTurn
                  ? "bg-pebol-accent shadow-[0_0_0.55rem_rgba(0,255,135,0.55)]"
                  : "bg-pebol-muted/45"
              }`}
            />
            {turnText}
          </div>
          <button
            type="button"
            className="min-h-9 shrink-0 rounded-lg border border-white/10 bg-white/[0.045] px-4 py-2 font-display text-sm font-black text-pebol-muted transition hover:bg-white/[0.08] hover:text-pebol-text"
            onClick={onLeave}
          >
            Sair
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(20rem,1fr)_minmax(21rem,.92fr)_minmax(20rem,1fr)] xl:items-start">
          <section
            className={`draft-board you-board min-w-0 overflow-hidden rounded-lg border bg-pebol-panel p-4 shadow-premium backdrop-blur-xl ${
              yourTurn
                ? "border-pebol-accent/40 bg-pebol-accent/[0.035] shadow-[0_0_0.95rem_rgba(0,255,135,0.07)]"
                : "border-white/10"
            } ${yourTurn && (selectedPlayer || selectedDraftSlotId) ? "picking" : ""} ${
              yourTurn && selectedDraftSlotId ? "repositioning" : ""
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 font-display text-base font-black text-pebol-text">Seu time</h3>
              <TeamStrengthCard data={youStrength} />
            </div>
            <Pitch
              slots={youPitchSlots}
              small
              interactive
              onSlotClick={(slotId, filled) => {
                if (!yourTurn) return;
                if (selectedPlayer) {
                  if (!filled) onPickSlot(slotId);
                  return;
                }
                if (filled || selectedDraftSlotId) onRepositionSlot(slotId);
              }}
            />
            {attackFocusBanner ? (
              <div className="mt-3">
                <TacticBanner kind={attackFocusBanner.kind}>{attackFocusBanner.text}</TacticBanner>
              </div>
            ) : null}
          </section>

          <section
            className={`min-w-0 rounded-lg border bg-[radial-gradient(18rem_10rem_at_50%_0%,rgba(0,255,135,0.06),transparent_70%),rgba(6,8,15,0.42)] p-4 shadow-premium backdrop-blur-xl ${
              yourTurn
                ? "animate-[drawPulse_1.5s_ease-in-out_infinite] border-pebol-accent/50"
                : "border-white/10"
            }`}
          >
            <div className="mb-3 grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left">
              <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.18em] text-pebol-muted">
                {drawnTeamLabel}
              </span>
              <h2 className="m-0 break-words font-display text-2xl font-black leading-none text-pebol-text">
                {team ? `${team.name} ${team.season}` : "—"}
              </h2>
              <span className="min-h-4 text-xs font-bold text-pebol-muted">
                {team?.league ?? ""}
              </span>
              {state.pvpRerollsEnabled ? (
                <button
                  type="button"
                  className="mt-1 min-h-9 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-display text-xs font-black text-pebol-muted transition enabled:hover:bg-white/[0.08] enabled:hover:text-pebol-text disabled:cursor-default disabled:opacity-45"
                  disabled={!yourTurn || (you.rerollsRemaining ?? 0) <= 0}
                  onClick={onReroll}
                >
                  {rerollLabel} ({you.rerollsRemaining ?? 0})
                </button>
              ) : null}
            </div>
            <ul className="grid max-h-[32rem] gap-2 overflow-auto pr-1">
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
            <p className="mt-3 flex min-h-[3.25rem] flex-wrap items-center justify-center gap-x-1 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-center text-sm font-semibold leading-tight text-pebol-muted [text-wrap:balance]">
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
            className={`draft-board min-w-0 overflow-hidden rounded-lg border bg-pebol-panel p-4 shadow-premium backdrop-blur-xl ${
              !yourTurn
                ? "border-pebol-accent/35 bg-pebol-accent/[0.025]"
                : "border-white/10"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 font-display text-base font-black text-pebol-text">
                {opponent?.name ?? "Adversário"}
              </h3>
              <TeamStrengthCard data={opponentStrength} />
            </div>
            {opponentPitchSlots ? <Pitch slots={opponentPitchSlots} small /> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
