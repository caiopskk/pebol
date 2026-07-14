import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type {
  AttackFocus,
  ManagerDashboard,
  ManagerPlayer,
  Mentality,
  Formation,
} from "../../../shared/types.js";
import { effectiveRating } from "../../../shared/engine.js";
import { FORMATIONS, getFormation, posLabel } from "../../../shared/formations.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { Pitch } from "./Pitch.js";
import { managerPitchSlots, ratingAvg } from "../lib/managerData.js";
import {
  managerConditionedPlayer,
  managerFitnessLabel,
  managerFitnessTone,
  managerMatchRating,
} from "../lib/managerFatigue.js";

interface ManagerPreMatchProps {
  data: ManagerDashboard;
  phaseLabel: string;
  onSave: (payload: ManagerLineupPayload) => void;
  onConfirm: (payload: ManagerLineupPayload) => void;
  onBack: () => void;
}

interface ManagerLineupPayload {
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  starters: Array<{ playerId: string; slotId: string }>;
}

const panel = "rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl";
const subPanel = "rounded-lg border border-white/10 bg-white/[0.045] p-3";
const secondary = "min-h-10 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 font-display text-xs font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15";
const primary = "min-h-10 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-4 py-2 font-display text-xs font-black uppercase tracking-[0.06em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";

function optionLabel<T extends string>(options: Array<{ id: T; name: string }>, id: T): string {
  return options.find((option) => option.id === id)?.name ?? id;
}

function mentalityHint(mentality: Mentality): string {
  if (mentality === "pressao") return "pressiona alto e tenta acelerar erros na saída.";
  if (mentality === "posse") return "valoriza bola longa no pé e controle de ritmo.";
  if (mentality === "contra_ataque") return "cede campo e ataca em transição.";
  if (mentality === "retranca") return "fecha espaços e aceita volume adversário.";
  if (mentality === "aura") return "força o jogo para frente com risco defensivo.";
  return "mantém balanço sem vantagem ou fraqueza clara de counter.";
}

function autoAssignSquad(squad: ManagerPlayer[], formation: Formation): ManagerPlayer[] {
  const used = new Set<string>();
  const assignment = new Map<string, string>();
  for (const slot of formation.slots) {
    let best: ManagerPlayer | null = null;
    let bestScore = -1;
    for (const player of squad) {
      if (used.has(player.id) || player.injuryRounds > 0 || player.suspensionMatches > 0) continue;
      const score = effectiveRating(managerConditionedPlayer(player), slot.pos);
      if (score > bestScore) {
        best = player;
        bestScore = score;
      }
    }
    if (best) {
      used.add(best.id);
      assignment.set(best.id, slot.id);
    }
  }
  return squad.map((player) => ({
    ...player,
    isStarter: assignment.has(player.id),
    lineupSlotId: assignment.get(player.id) ?? null,
  }));
}

export function ManagerPreMatch({
  data,
  phaseLabel,
  onSave,
  onConfirm,
  onBack,
}: ManagerPreMatchProps) {
  const [formationId, setFormationId] = useState(data.save.formationId);
  const [mentality, setMentality] = useState<Mentality>(data.save.mentality);
  const [attackFocus, setAttackFocus] = useState<AttackFocus>(data.save.attackFocus);
  const [squad, setSquad] = useState<ManagerPlayer[]>(data.squad);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formation = getFormation(formationId) ?? FORMATIONS[0];
  const scout = data.nextOpponentScout;
  const nextFixture = data.nextFixture;
  const opponentName = scout?.teamName ?? "Adversário indefinido";
  const homeAway =
    nextFixture?.homeTeamId === data.save.teamId
      ? "Casa"
      : nextFixture?.awayTeamId === data.save.teamId
        ? "Fora"
        : "Rodada";

  const slots = useMemo(
    () => managerPitchSlots(formation, squad, selectedId),
    [formation, squad, selectedId],
  );
  const starters = squad.filter((player) => player.isStarter && player.lineupSlotId);
  const canConfirm = starters.length === 11;
  const payload = (): ManagerLineupPayload => ({
    formationId,
    mentality,
    attackFocus,
    starters: starters.map((player) => ({ playerId: player.id, slotId: player.lineupSlotId! })),
  });

  const placePlayer = (slotId: string) => {
    if (!selectedId) return;
    setSquad((current) =>
      current.map((player) => {
        if (player.id === selectedId) return { ...player, isStarter: true, lineupSlotId: slotId };
        if (player.lineupSlotId === slotId) return { ...player, isStarter: false, lineupSlotId: null };
        return player;
      }),
    );
    setSelectedId(null);
  };

  const changeFormation = (id: string) => {
    const nextFormation = getFormation(id) ?? FORMATIONS[0];
    setFormationId(id);
    setSquad((current) => autoAssignSquad(current, nextFormation));
    setSelectedId(null);
  };

  const save = () => {
    if (!canConfirm) return;
    onSave(payload());
  };

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(payload());
  };

  return (
    <motion.div
      className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-7xl gap-4">
        <section className={`${panel} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(0,255,135,.16),transparent_34%),linear-gradient(135deg,rgba(58,134,212,.12),transparent_55%)]" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                Pré-jogo · {phaseLabel}
              </span>
              <h1 className="mt-1 font-title text-3xl uppercase text-white">
                {data.save.teamName} x {opponentName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                {homeAway} · ajuste titulares, formação, mentalidade e foco antes da bola rolar.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button className={secondary} onClick={save} disabled={!canConfirm}>Salvar</button>
              <button className={primary} onClick={confirm} disabled={!canConfirm}>Confirmar e jogar</button>
              <button className={secondary} onClick={onBack}>Voltar</button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.72fr)]">
          <div className={`${panel} grid gap-3`}>
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={formationId} onChange={(e) => changeFormation(e.currentTarget.value)}>
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-pebol-muted">
              <span>{starters.length}/11 titulares. Selecione um jogador e clique numa posição.</span>
              <button className={secondary} type="button" onClick={() => setSquad((current) => autoAssignSquad(current, formation))}>Auto escalação</button>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <section className={`${panel} grid gap-3`}>
              <div>
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Plano adversário</span>
                <h2 className="mt-1 font-title text-2xl uppercase text-white">{opponentName}</h2>
              </div>
              {scout ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <span className={`${subPanel} text-sm font-bold text-pebol-muted`}>Formação <strong className="block text-lg text-white">{scout.formationId}</strong></span>
                    <span className={`${subPanel} text-sm font-bold text-pebol-muted`}>Força <strong className="block text-lg text-white">{scout.strength.overall}</strong></span>
                    <span className={`${subPanel} text-sm font-bold text-pebol-muted`}>Mentalidade <strong className="block text-lg text-white">{optionLabel(MENTALITIES, scout.mentality)}</strong></span>
                    <span className={`${subPanel} text-sm font-bold text-pebol-muted`}>Foco <strong className="block text-lg text-white">{optionLabel(ATTACK_FOCUS_OPTIONS, scout.attackFocus)}</strong></span>
                  </div>
                  <p className="rounded-lg border border-pebol-blue/20 bg-pebol-blue/10 p-3 text-sm font-semibold leading-5 text-slate-200">
                    {opponentName} tende a jogar em {scout.formationId}, {mentalityHint(scout.mentality)} O ataque costuma sair por{" "}
                    {optionLabel(ATTACK_FOCUS_OPTIONS, scout.attackFocus).toLowerCase()}.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-pebol-muted">A temporada ainda não tem próximo jogo definido.</p>
              )}
            </section>

            <section className={`${panel} grid max-h-[33rem] content-start gap-2 overflow-y-auto`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="font-title text-xl uppercase text-white">Elenco</h2>
                <span className="text-sm font-bold text-pebol-muted">Desempenho {ratingAvg(starters.map(managerConditionedPlayer))}</span>
              </div>
              {squad.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={`grid min-h-14 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2 text-left ${
                    player.injuryRounds > 0 || player.suspensionMatches > 0
                      ? "border-red-300/25 bg-red-400/[0.06] opacity-70"
                      :
                    selectedId === player.id
                      ? "border-pebol-accent bg-pebol-accent/10"
                      : player.isStarter
                        ? "border-pebol-blue/35 bg-pebol-blue/10"
                        : "border-white/10 bg-white/[0.04]"
                  }`}
                  disabled={player.injuryRounds > 0 || player.suspensionMatches > 0}
                  onClick={() => setSelectedId((current) => (current === player.id ? null : player.id))}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/30 font-display font-black text-pebol-gold" title={`Overall ${player.rating} · desempenho atual ${managerMatchRating(player)}`}>
                    <span className="text-sm leading-none">{managerMatchRating(player)}</span>
                    <small className="text-[8px] leading-none text-pebol-muted">OVR {player.rating}</small>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate font-display text-sm font-extrabold text-white">{player.name}</strong>
                    <span className="text-xs font-bold text-pebol-muted">{posLabel(player.pos)} · <span className={managerFitnessTone(player.fitness)}>CON {player.fitness} {managerFitnessLabel(player.fitness)}</span> {player.lineupSlotId ? `· ${player.lineupSlotId}` : ""}</span>
                  </span>
                  <span className="font-display text-xs font-black uppercase text-pebol-muted">{player.isStarter ? "Titular" : "Banco"}</span>
                </button>
              ))}
            </section>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
