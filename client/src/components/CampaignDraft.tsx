import { useEffect, useRef, type ReactNode } from "react";
import type { Player } from "../../../shared/types.js";
import { groupOf } from "../../../shared/formations.js";
import { Pitch, type PitchSlot } from "./Pitch.js";
import {
  CampaignSquadRows,
  CampaignStrengthSummary,
  CupProgress,
  type CampaignSquadRow,
  type CampaignStrengthData,
} from "./CupStatus.js";

export interface CampaignDraftPlayer {
  name: string;
  pos: Player["pos"];
  posText: string;
  rating: number;
  clickable: boolean;
  selected: boolean;
}

interface CampaignDraftProps {
  pickNumber: number;
  hideRatings: boolean;
  sourceName: string;
  sourceSeason: string;
  sourceLeague: string;
  rerollsRemaining: number;
  players: CampaignDraftPlayer[];
  hint: ReactNode;
  pitchSlots: PitchSlot[];
  strength: CampaignStrengthData;
  squadRows: CampaignSquadRow[];
  progressRound: number;
  noteText: string;
  complete: boolean;
  onSlotClick: (slotId: string, filled: boolean) => void;
  initialScrollTop: number;
  onScrollPersist: (top: number) => void;
  onExit: () => void;
  onReroll: () => void;
  onSelectPlayer: (name: string) => void;
  onContinue: () => void;
}

export function CampaignDraft({
  pickNumber,
  hideRatings,
  sourceName,
  sourceSeason,
  sourceLeague,
  rerollsRemaining,
  players,
  hint,
  pitchSlots,
  strength,
  squadRows,
  progressRound,
  noteText,
  complete,
  onSlotClick,
  initialScrollTop,
  onScrollPersist,
  onExit,
  onReroll,
  onSelectPlayer,
  onContinue,
}: CampaignDraftProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // restore scroll position across re-renders (set selected player keeps it)
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop]);

  return (
    <div className="screen cup-screen cup-draft-screen">
      <div className="topbar">
        <div className="room-code">
          Copa do Mundo — Draft {hideRatings ? "Hardcore" : ""}
        </div>
        <div className="round-info">
          Jogador <strong>{pickNumber}</strong> / 11
        </div>
        <button
          type="button"
          className="ghost"
          style={{ marginLeft: "auto" }}
          onClick={onExit}
        >
          Sair
        </button>
      </div>
      <div className="cup-draft-layout">
        <section className="draw-panel cup-draft-source">
          <div className="draw-head">
            <span className="draw-label">Saiu no sorteio</span>
            <h2>
              {sourceName} {sourceSeason}
            </h2>
            <span className="draw-league">{sourceLeague}</span>
            <button
              type="button"
              className="ghost reroll"
              disabled={rerollsRemaining <= 0}
              onClick={onReroll}
            >
              Atualizar seleção ({rerollsRemaining})
            </button>
          </div>
          <ul
            className="player-list"
            ref={listRef}
            onScroll={(event) => onScrollPersist(event.currentTarget.scrollTop)}
          >
            {players.map((p) => (
              <li
                key={p.name}
                className={`pl-item ${p.clickable ? "clickable" : "taken"} ${
                  p.selected ? "selected" : ""
                }`}
                data-player={p.name}
                onClick={() => {
                  if (p.clickable) onSelectPlayer(p.name);
                }}
              >
                <span
                  className={`pl-pos pos-${groupOf(p.pos).toLowerCase()}`}
                  title={p.posText}
                >
                  {p.posText}
                </span>
                <span className="pl-name">{p.name}</span>
                <span className={`pl-rt ${hideRatings ? "hidden" : ""}`}>
                  {hideRatings ? "??" : p.rating}
                </span>
              </li>
            ))}
          </ul>
          <p className="draft-hint">{hint}</p>
        </section>

        <section className="board you-board cup-draft-pitch">
          <h3>Seu time</h3>
          <Pitch slots={pitchSlots} interactive onSlotClick={onSlotClick} />
        </section>

        <section className="board cup-draft-summary">
          <div className="cup-summary-head">
            <span>Overall time</span>
            <CampaignStrengthSummary data={strength} />
          </div>
          <CampaignSquadRows rows={squadRows} />
          <CupProgress won={progressRound} />
          {complete ? (
            <div className="cup-draft-done">
              <button
                type="button"
                className="primary big"
                onClick={onContinue}
              >
                Continuar
              </button>
            </div>
          ) : (
            <p className="cup-note">{noteText}</p>
          )}
        </section>
      </div>
    </div>
  );
}
