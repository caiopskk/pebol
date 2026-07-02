import { useState } from "react";
import type { ManagerDashboard, ManagerPlayer, Position } from "../../../shared/types.js";
import { posLabel } from "../../../shared/formations.js";
import { ALL_POS } from "../lib/teamImport.js";
import { moneyLabel } from "../lib/managerData.js";

interface ManagerMarketProps {
  data: ManagerDashboard;
  players: ManagerPlayer[];
  loading: boolean;
  transferWindowOpen: boolean;
  onSearch: (filters: { pos?: string; minRating?: number; maxRating?: number }) => void;
  onBuy: (playerId: string) => void;
  onBack: () => void;
}

const panel = "rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl";
const secondary = "min-h-10 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 font-display text-xs font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15";
const primary = "min-h-10 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-4 py-2 font-display text-xs font-black uppercase tracking-[0.06em] text-black shadow-glow";

export function ManagerMarket({
  data,
  players,
  loading,
  transferWindowOpen,
  onSearch,
  onBuy,
  onBack,
}: ManagerMarketProps) {
  const [pos, setPos] = useState("");
  const [minRating, setMinRating] = useState(70);

  const search = () => onSearch({ pos: pos || undefined, minRating });

  return (
    <div className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4">
        <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Mercado</span>
            <h1 className="font-title text-3xl uppercase text-white">Transferências</h1>
            <p className="mt-1 text-sm font-semibold text-pebol-muted">
              Caixa: {moneyLabel(data.save.money)} · {transferWindowOpen ? "Janela aberta" : "Janela fechada"}
            </p>
          </div>
          <button className={secondary} onClick={onBack}>Voltar</button>
        </section>

        <section className={`${panel} grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end`}>
          <label className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
            Posição
            <select className="mt-2 block min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white" value={pos} onChange={(e) => setPos(e.currentTarget.value)}>
              <option value="">Todas</option>
              {ALL_POS.map((p) => <option key={p} value={p}>{posLabel(p as Position)}</option>)}
            </select>
          </label>
          <label className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">
            Rating mínimo
            <input className="mt-2 block min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white" type="number" min={40} max={99} value={minRating} onChange={(e) => setMinRating(Number(e.currentTarget.value))} />
          </label>
          <button className={transferWindowOpen ? primary : secondary} disabled={!transferWindowOpen} onClick={search}>Buscar</button>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className={`${panel} text-pebol-muted`}>Buscando jogadores...</p>
          ) : !transferWindowOpen ? (
            <p className={`${panel} text-pebol-muted`}>
              Compras e propostas só acontecem na pré-temporada. Durante a liga, copa e continental, o mercado fica bloqueado.
            </p>
          ) : players.length ? (
            players.map((player) => {
              const price = Math.round(player.value * 1.08);
              const affordable = data.save.money >= price;
              return (
                <article key={player.id} className={`${panel} grid gap-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate font-display text-lg font-black text-white">{player.name}</strong>
                      <span className="text-sm font-bold text-pebol-muted">{player.teamName} · {posLabel(player.pos)}</span>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-lg border border-pebol-gold/35 bg-pebol-gold/10 font-display text-lg font-black text-pebol-gold">{player.rating}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-sm font-black text-white">{moneyLabel(price)}</span>
                    <button className={affordable ? primary : secondary} disabled={!affordable} onClick={() => onBuy(player.id)}>
                      Comprar
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className={`${panel} text-pebol-muted`}>Nenhum jogador encontrado com esses filtros.</p>
          )}
        </section>
      </div>
    </div>
  );
}
