import { useMemo, useState } from "react";
import type {
  AttackFocus,
  ManagerDashboard,
  ManagerPlayer,
  Mentality,
} from "../../../shared/types.js";
import { FORMATIONS, getFormation, posLabel } from "../../../shared/formations.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { Pitch } from "./Pitch.js";
import { managerPitchSlots } from "../lib/managerData.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { effectiveRating } from "../../../shared/engine.js";
import {
  managerConditionedPlayer,
  managerFitnessLabel,
  managerFitnessTone,
  managerMatchRating,
} from "../lib/managerFatigue.js";

interface ManagerSquadProps {
  data: ManagerDashboard;
  onSave: (payload: {
    formationId: string;
    mentality: Mentality;
    attackFocus: AttackFocus;
    starters: Array<{ playerId: string; slotId: string }>;
  }) => void;
  onSell: (playerId: string) => void;
  onBack: () => void;
}

const panel = "rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl";
const secondary = "min-h-10 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 font-display text-xs font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15";
const primary = "min-h-10 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-4 py-2 font-display text-xs font-black uppercase tracking-[0.06em] text-black shadow-glow";

export function ManagerSquad({ data, onSave, onSell, onBack }: ManagerSquadProps) {
  const [formationId, setFormationId] = useState(data.save.formationId);
  const [mentality, setMentality] = useState<Mentality>(data.save.mentality);
  const [attackFocus, setAttackFocus] = useState<AttackFocus>(data.save.attackFocus);
  const [squad, setSquad] = useState<ManagerPlayer[]>(data.squad);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formation = getFormation(formationId) ?? FORMATIONS[0];

  const slots = useMemo(
    () => managerPitchSlots(formation, squad, selectedId),
    [formation, squad, selectedId],
  );
  const starters = squad.filter((p) => p.isStarter);
  const available = (player: ManagerPlayer) => player.injuryRounds <= 0 && player.suspensionMatches <= 0;

  const selectPlayer = (playerId: string) => {
    if (!available(squad.find((player) => player.id === playerId)!)) return;
    setSelectedId((current) => (current === playerId ? null : playerId));
  };

  const placePlayer = (slotId: string) => {
    if (!selectedId) return;
    setSquad((current) =>
      current.map((player) => {
        if (player.id === selectedId) {
          return { ...player, isStarter: true, lineupSlotId: slotId };
        }
        if (player.lineupSlotId === slotId) {
          return { ...player, isStarter: false, lineupSlotId: null };
        }
        return player;
      }),
    );
    setSelectedId(null);
  };

  const autoPick = () => {
    const used = new Set<string>();
    const slotByPlayer = new Map<string, string>();
    for (const slot of formation.slots) {
      const best = [...squad]
        .filter((player) => available(player) && !used.has(player.id))
        .sort((a, b) =>
          effectiveRating(managerConditionedPlayer(b), slot.pos) -
          effectiveRating(managerConditionedPlayer(a), slot.pos)
        )[0];
      if (!best) continue;
      used.add(best.id);
      slotByPlayer.set(best.id, slot.id);
    }
    setSquad((current) => current.map((player) => ({
      ...player,
      isStarter: slotByPlayer.has(player.id),
      lineupSlotId: slotByPlayer.get(player.id) ?? null,
    })));
  };

  const save = () => {
    onSave({
      formationId,
      mentality,
      attackFocus,
      starters: squad
        .filter((p) => p.isStarter && p.lineupSlotId)
        .map((p) => ({ playerId: p.id, slotId: p.lineupSlotId! })),
    });
  };

  return (
    <div className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(20rem,.9fr)_minmax(22rem,1.1fr)]">
        <section className={`${panel} lg:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Elenco</span>
              <h1 className="font-title text-3xl uppercase text-white">{data.save.teamName}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={secondary} onClick={autoPick}>Auto</button>
              <button className={primary} onClick={save}>Salvar escalação</button>
              <button className={secondary} onClick={onBack}>Voltar</button>
            </div>
          </div>
        </section>

        <section className={`${panel} grid gap-3`}>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={formationId} onChange={(e) => setFormationId(e.currentTarget.value)}>
              {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={mentality} onChange={(e) => setMentality(e.currentTarget.value as Mentality)}>
              {MENTALITIES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={attackFocus} onChange={(e) => setAttackFocus(e.currentTarget.value as AttackFocus)}>
              {ATTACK_FOCUS_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <Pitch slots={slots} interactive onSlotClick={(slotId) => placePlayer(slotId)} variant="cupDraft" />
          <p className="text-sm font-semibold text-pebol-muted">{starters.length}/11 titulares. Selecione um jogador na lista e clique numa posição.</p>
        </section>

        <section className={`${panel} grid max-h-[42rem] content-start gap-2 overflow-y-auto`}>
          {squad.map((player) => (
            <div
              key={player.id}
              className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 ${
                !available(player)
                  ? "border-red-300/25 bg-red-400/[0.06] opacity-75"
                  : selectedId === player.id
                  ? "border-pebol-accent bg-pebol-accent/10"
                  : player.isStarter
                    ? "border-pebol-blue/35 bg-pebol-blue/10"
                    : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <button disabled={!available(player)} className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-black/30 font-display font-black text-pebol-gold" onClick={() => selectPlayer(player.id)} title={`Overall ${player.rating} · desempenho atual ${managerMatchRating(player)}`}>
                <span className="text-base leading-none">{managerMatchRating(player)}</span>
                <small className="text-[9px] leading-none text-pebol-muted">OVR {player.rating}</small>
              </button>
              <button disabled={!available(player)} className="min-w-0 text-left" onClick={() => selectPlayer(player.id)}>
                <strong className="block truncate font-display text-sm font-extrabold text-white">{player.name}</strong>
                <span className="text-xs font-bold text-pebol-muted">
                  {posLabel(player.pos)} · {player.age} anos · POT {player.potentialRating} · <span className={managerFitnessTone(player.fitness)}>CON {player.fitness} {managerFitnessLabel(player.fitness)}</span> · RIT {player.sharpness}
                  {player.injuryRounds ? ` · LES ${player.injuryRounds}` : player.suspensionMatches ? ` · SUS ${player.suspensionMatches}` : player.lineupSlotId ? ` · ${player.lineupSlotId}` : ""}
                </span>
              </button>
              <button className={secondary} onClick={() => onSell(player.id)}>Vender</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
