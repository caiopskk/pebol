import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Player, Position } from "../../../shared/types.js";
import { screenIn } from "../lib/motion.js";

export interface TeamFormPayload {
  name: string;
  alias?: string;
  league: string;
  season: string;
  players: Player[];
  bench: Player[];
  kind?: "club" | "national";
  official?: boolean;
}

interface TeamFormProps {
  isNew: boolean;
  isAdmin: boolean;
  initialName: string;
  initialAlias: string;
  initialLeague: string;
  initialSeason: string;
  initialKind: "club" | "national";
  initialOfficial: boolean;
  initialPlayers: Player[];
  initialBench: Player[];
  initialPlayerSearch: string;
  positions: Position[];
  onCancel: () => void;
  onSave: (payload: TeamFormPayload) => Promise<void> | void;
  onSearchChange?: (value: string) => void;
}

interface RowState extends Player {
  /** Stable id used as the React key (mutations don't reorder rows). */
  key: string;
}

const PLAYER_ATTRS = [
  ["pac", "PAC"],
  ["sho", "SHO"],
  ["pas", "PAS"],
  ["dri", "DRI"],
  ["def", "DEF"],
  ["phy", "PHY"],
] as const;

const fieldClass =
  "min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold text-white outline-none transition-all duration-300 focus:border-pebol-accent/55 focus:ring-2 focus:ring-pebol-accent/15";
const compactFieldClass = `${fieldClass} mb-0`;
const secondaryButtonClass =
  "min-h-10 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-display text-sm font-extrabold text-slate-200 shadow-none transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/10";
const primaryButtonClass =
  "min-h-12 rounded-lg border border-pebol-accent/40 bg-accent-gold px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65";

function newKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toRow(p: Player): RowState {
  return { ...p, key: newKey() };
}

function searchKey(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function rowMatches(row: RowState, key: string): boolean {
  if (!key) return true;
  const joined = [
    row.name,
    row.pos,
    (row.altPositions ?? []).join(" "),
    String(row.rating),
    ...PLAYER_ATTRS.map(([key]) => String(row[key] ?? "")),
  ]
    .join(" ");
  return searchKey(joined).includes(key);
}

function PlayerRow({
  row,
  positions,
  bench,
  hidden,
  onChange,
  onRemove,
}: {
  row: RowState;
  positions: Position[];
  bench: boolean;
  hidden: boolean;
  onChange: (key: string, patch: Partial<RowState>) => void;
  onRemove?: (key: string) => void;
}) {
  return (
    <div
      className="grid items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition-all duration-300 lg:grid-cols-[minmax(9rem,1fr)_5rem_minmax(8rem,.7fr)_4.25rem_minmax(18rem,1.3fr)_auto]"
      hidden={hidden}
    >
      <input
        className={`${compactFieldClass} font-semibold text-white`}
        value={row.name}
        placeholder="Nome"
        maxLength={40}
        onChange={(e) => onChange(row.key, { name: e.target.value })}
      />
      <select
        className={`${compactFieldClass} font-semibold text-white`}
        value={row.pos}
        onChange={(e) => onChange(row.key, { pos: e.target.value as Position })}
      >
        {positions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input
        className={`${compactFieldClass} font-semibold text-white`}
        value={(row.altPositions ?? []).join(", ")}
        placeholder="Alt. ex: LW, ST"
        maxLength={40}
        onChange={(e) =>
          onChange(row.key, {
            altPositions: e.target.value
              .split(/[,\s/]+/)
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean) as Position[],
          })
        }
      />
      <input
        className={`${compactFieldClass} font-semibold text-white`}
        type="number"
        min={40}
        max={99}
        value={row.rating}
        onChange={(e) =>
          onChange(row.key, { rating: Number(e.target.value) || 0 })
        }
      />
      <div
        className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Atributos estilo EA FC"
      >
        {PLAYER_ATTRS.map(([key, label]) => (
          <label key={key} className="m-0 grid gap-1">
            <span className="text-center font-display text-[0.62rem] font-black uppercase tracking-[0.04rem] text-pebol-muted">
              {label}
            </span>
            <input
              className={`${compactFieldClass} !min-h-9 !px-1.5 text-center`}
              type="number"
              min={1}
              max={99}
              value={row[key] ?? ""}
              placeholder="--"
              onChange={(e) =>
                onChange(row.key, {
                  [key]: e.target.value === "" ? undefined : Number(e.target.value) || 0,
                } as Partial<RowState>)
              }
            />
          </label>
        ))}
      </div>
      {bench && onRemove ? (
        <button
          className={`${secondaryButtonClass} min-w-10 p-0`}
          title="Remover"
          onClick={() => onRemove(row.key)}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function TeamForm({
  isNew,
  isAdmin,
  initialName,
  initialAlias,
  initialLeague,
  initialSeason,
  initialKind,
  initialOfficial,
  initialPlayers,
  initialBench,
  initialPlayerSearch,
  positions,
  onCancel,
  onSave,
  onSearchChange,
}: TeamFormProps) {
  const [name, setName] = useState(initialName);
  const [alias, setAlias] = useState(initialAlias);
  const [league, setLeague] = useState(initialLeague);
  const [season, setSeason] = useState(initialSeason);
  const [kind, setKind] = useState<"club" | "national">(initialKind);
  const [official, setOfficial] = useState(initialOfficial);
  const [search, setSearch] = useState(initialPlayerSearch);
  const [starters, setStarters] = useState<RowState[]>(() =>
    initialPlayers.map(toRow),
  );
  const [bench, setBench] = useState<RowState[]>(() => initialBench.map(toRow));
  const [saving, setSaving] = useState(false);

  const key = useMemo(() => searchKey(search), [search]);
  const startersVisible = useMemo(
    () => starters.map((r) => rowMatches(r, key)),
    [starters, key],
  );
  const benchVisible = useMemo(
    () => bench.map((r) => rowMatches(r, key)),
    [bench, key],
  );
  const startersHidden = key && !startersVisible.some(Boolean);
  const benchHidden = key && !benchVisible.some(Boolean);

  function updateStarter(rowKey: string, patch: Partial<RowState>) {
    setStarters((rows) =>
      rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)),
    );
  }
  function updateBench(rowKey: string, patch: Partial<RowState>) {
    setBench((rows) =>
      rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)),
    );
  }
  function removeBench(rowKey: string) {
    setBench((rows) => rows.filter((r) => r.key !== rowKey));
  }
  function addBench() {
    setBench((rows) => [
      ...rows,
      { key: newKey(), name: "", pos: "ST" as Position, rating: 75 },
    ]);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const sanitize = (rows: RowState[]): Player[] =>
        rows.map(({ key: _k, ...p }) => ({
          ...p,
          name: p.name.trim(),
          rating: Math.max(40, Math.min(99, Math.round(p.rating || 75))),
          ...Object.fromEntries(
            PLAYER_ATTRS.map(([key]) => {
              const value = p[key];
              return [
                key,
                value == null || value === 0
                  ? undefined
                  : Math.max(1, Math.min(99, Math.round(value))),
              ];
            }),
          ),
          altPositions:
            p.altPositions && p.altPositions.length
              ? p.altPositions.filter((x, i, a) => x !== p.pos && a.indexOf(x) === i)
              : undefined,
        }));
      const payload: TeamFormPayload = {
        name: name.trim(),
        league: league.trim(),
        season: season.trim(),
        players: sanitize(starters),
        bench: sanitize(bench).filter((p) => p.name),
      };
      if (isAdmin) {
        payload.alias = alias.trim();
        payload.kind = kind;
        payload.official = official;
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="min-h-screen px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-8"
      {...screenIn}
    >
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-pebol-panel px-4 py-3 shadow-premium backdrop-blur-xl">
        <div className="grid gap-1">
          <span className="cup-tag">{isNew ? "Novo registro" : "Edição"}</span>
          <h1 className="font-title text-2xl uppercase tracking-[0.03em] text-white">
            {isNew ? "Novo time" : "Editar time"}
          </h1>
          <p className="text-sm font-semibold text-pebol-muted">
            Configure titulares, reservas e informações do elenco.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`${secondaryButtonClass} w-full sm:w-auto`}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
      <div className="panel grid gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-pebol-muted">
            Nome
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {isAdmin ? (
            <label className="grid gap-1 text-xs font-bold text-pebol-muted">
              Apelido genérico (visto por não-admins)
              <input
                className={fieldClass}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="ex: Rubro-Negro Carioca"
              />
            </label>
          ) : null}
          <label className="grid gap-1 text-xs font-bold text-pebol-muted">
            Liga / País
            <input
              className={fieldClass}
              value={league}
              onChange={(e) => setLeague(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-pebol-muted">
            Temporada
            <input
              className={fieldClass}
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            />
          </label>
          {isAdmin ? (
            <label className="grid gap-1 text-xs font-bold text-pebol-muted">
              Tipo
              <select
                className={fieldClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as "club" | "national")}
              >
                <option value="club">Clube</option>
                <option value="national">Seleção</option>
              </select>
            </label>
          ) : null}
          {isAdmin ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-pebol-text">
              <input
                className="m-0 w-auto"
                type="checkbox"
                checked={official}
                disabled={!isNew}
                onChange={(e) => setOfficial(e.target.checked)}
              />{" "}
              Time oficial (entra no jogo)
            </label>
          ) : null}
        </div>
        <div className="my-4 grid gap-3 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label>
            Pesquisar jogadores
            <input
              className="mt-2 block min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-body text-sm font-semibold normal-case tracking-normal text-white outline-none transition-all duration-300 placeholder:text-pebol-faint focus:border-pebol-accent/55 focus:ring-2 focus:ring-pebol-accent/15"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder="Digite nome, posição, overall ou atributo"
              autoComplete="off"
            />
          </label>
          <span className="text-sm font-bold text-pebol-muted">
            Filtra titulares e reservas sem salvar alterações.
          </span>
        </div>
        <h3 className="font-display text-lg font-black text-white">Titulares (11)</h3>
        <div className="grid gap-2">
          {starters.map((r, i) => (
            <PlayerRow
              key={r.key}
              row={r}
              positions={positions}
              bench={false}
              hidden={!startersVisible[i]}
              onChange={updateStarter}
            />
          ))}
        </div>
        {startersHidden ? (
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-semibold italic text-pebol-muted">
            Nenhum titular encontrado.
          </p>
        ) : null}
        <h3 className="font-display text-lg font-black text-white">Reservas</h3>
        <div className="grid gap-2">
          {bench.map((r, i) => (
            <PlayerRow
              key={r.key}
              row={r}
              positions={positions}
              bench
              hidden={!benchVisible[i]}
              onChange={updateBench}
              onRemove={removeBench}
            />
          ))}
        </div>
        {benchHidden ? (
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-semibold italic text-pebol-muted">
            Nenhum reserva encontrado.
          </p>
        ) : null}
        <button
          type="button"
          className={`${secondaryButtonClass} mt-3`}
          onClick={addBench}
        >
          Adicionar reserva
        </button>
        <div className="mt-5 grid justify-end gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`${primaryButtonClass} w-full`}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Salvando…" : isNew ? "Criar time" : "Salvar"}
          </button>
        </div>
      </div>
      </div>
    </motion.div>
  );
}
