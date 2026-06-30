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
    <div className="min-h-screen bg-transparent px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[82.5rem]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
        <div className="min-w-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted">
          Copa do Mundo — Draft {hideRatings ? "Hardcore" : ""}
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted">
          Jogador <strong>{pickNumber}</strong> / 11
        </div>
        <button
          type="button"
          className="min-h-10 shrink-0 rounded-lg border-0 bg-white/5 px-4 py-2 font-display text-sm font-extrabold text-slate-200 shadow-none transition-all duration-300 hover:bg-pebol-blue/10 sm:ml-auto"
          onClick={onExit}
        >
          Sair
        </button>
      </div>
      <div className="cup-draft-layout grid gap-3 xl:grid-cols-[minmax(22rem,0.95fr)_minmax(23rem,1fr)_minmax(19rem,.85fr)] xl:items-start">
        <section className="cup-draft-source min-w-0 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
          <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <span className="font-display text-[0.65rem] font-black uppercase tracking-[0.16em] text-pebol-faint">Saiu no sorteio</span>
            <h2 className="m-0 min-h-7 [overflow-wrap:anywhere] font-title text-2xl uppercase leading-none tracking-[0.02em] text-white">
              {sourceName} {sourceSeason}
            </h2>
            <span className="min-h-4 text-left text-xs font-semibold text-pebol-muted">{sourceLeague}</span>
            <button
              type="button"
              className="mt-1 min-h-9 w-full rounded-lg border-0 bg-white/5 px-4 py-2 font-display text-sm font-extrabold text-slate-200 shadow-none transition-all duration-300 hover:bg-pebol-blue/10 disabled:cursor-default disabled:opacity-45"
              disabled={rerollsRemaining <= 0}
              onClick={onReroll}
            >
              Atualizar seleção ({rerollsRemaining})
            </button>
          </div>
          <ul
            className="player-list grid max-h-[34rem] gap-2 overflow-auto pr-1"
            ref={listRef}
            onScroll={(event) => onScrollPersist(event.currentTarget.scrollTop)}
          >
            {players.map((p) => (
              <li
                key={p.name}
                className={`pl-item grid min-h-10 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_2.5rem] items-center gap-2 rounded-lg border bg-white/[0.045] px-3 py-2 transition-all duration-200 ${p.clickable ? "clickable" : "taken opacity-50"} ${
                  p.selected ? "selected" : ""
                }`}
                data-player={p.name}
                onClick={() => {
                  if (p.clickable) onSelectPlayer(p.name);
                }}
              >
                <span
                  className={`pl-pos pos-${groupOf(p.pos).toLowerCase()} font-display text-[0.7rem] font-black uppercase tracking-[0.08em] text-pebol-muted`}
                  title={p.posText}
                >
                  {p.posText}
                </span>
                <span className="pl-name min-w-0 truncate text-sm font-black text-white">{p.name}</span>
                <span
                  className={`pl-rt text-right font-display text-sm font-bold leading-none tracking-wide tabular-nums text-pebol-gold ${hideRatings ? "hidden" : ""}`}
                >
                  {hideRatings ? "??" : p.rating}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex min-h-[4.25rem] flex-wrap items-center justify-center gap-x-1 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-center text-sm font-semibold leading-tight text-pebol-muted text-balance">{hint}</p>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
          <h3 className="mb-3 flex items-center justify-center gap-2 font-display text-base font-black text-white">Seu time</h3>
          <Pitch slots={pitchSlots} interactive variant="cupDraft" onSlotClick={onSlotClick} />
        </section>

        <section className="cup-draft-summary min-w-0 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl">
          <div className="mb-3 grid gap-3 border-b border-white/10 pb-3">
            <span className="font-display text-[0.65rem] font-black uppercase tracking-[0.16rem] text-pebol-faint">Overall time</span>
            <CampaignStrengthSummary data={strength} />
          </div>
          <CampaignSquadRows rows={squadRows} />
          <CupProgress won={progressRound} />
          {complete ? (
            <div className="grid gap-2">
              <button
                type="button"
                className="pebol-glow-button pebol-glow-fill min-h-12 w-full rounded-lg border-0 bg-gradient-to-r from-pebol-accent via-emerald-300 to-pebol-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                onClick={onContinue}
              >
                Continuar
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-5 text-pebol-muted">{noteText}</p>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
