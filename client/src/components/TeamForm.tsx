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
    <div className="pf-row" hidden={hidden}>
      <input
        className="pf-name"
        value={row.name}
        placeholder="Nome"
        maxLength={40}
        onChange={(e) => onChange(row.key, { name: e.target.value })}
      />
      <select
        className="pf-pos"
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
        className="pf-alt"
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
        className="pf-rt"
        type="number"
        min={40}
        max={99}
        value={row.rating}
        onChange={(e) =>
          onChange(row.key, { rating: Number(e.target.value) || 0 })
        }
      />
      <div className="pf-attrs" aria-label="Atributos estilo EA FC">
        {PLAYER_ATTRS.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
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
          className="ghost pf-del"
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
    <motion.div className="screen admin-screen" {...screenIn}>
      <div className="admin-toolbar">
        <div className="admin-title">
          <span className="cup-tag">{isNew ? "Novo registro" : "Edição"}</span>
          <h1>{isNew ? "Novo time" : "Editar time"}</h1>
          <p>Configure titulares, reservas e informações do elenco.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="primary alt admin-action"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
      <div className="panel team-form">
        <div className="tf-grid">
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {isAdmin ? (
            <label>
              Apelido genérico (visto por não-admins)
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="ex: Rubro-Negro Carioca"
              />
            </label>
          ) : null}
          <label>
            Liga / País
            <input value={league} onChange={(e) => setLeague(e.target.value)} />
          </label>
          <label>
            Temporada
            <input value={season} onChange={(e) => setSeason(e.target.value)} />
          </label>
          {isAdmin ? (
            <label>
              Tipo
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "club" | "national")}
              >
                <option value="club">Clube</option>
                <option value="national">Seleção</option>
              </select>
            </label>
          ) : null}
          {isAdmin ? (
            <label className="tf-check">
              <input
                type="checkbox"
                checked={official}
                disabled={!isNew}
                onChange={(e) => setOfficial(e.target.checked)}
              />{" "}
              Time oficial (entra no jogo)
            </label>
          ) : null}
        </div>
        <div className="admin-search player-search">
          <label>
            Pesquisar jogadores
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder="Digite nome, posição, overall ou atributo"
              autoComplete="off"
            />
          </label>
          <span>Filtra titulares e reservas sem salvar alterações.</span>
        </div>
        <h3>Titulares (11)</h3>
        <div className="pf-list">
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
          <p className="pf-empty">Nenhum titular encontrado.</p>
        ) : null}
        <h3>Reservas</h3>
        <div className="pf-list">
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
        {benchHidden ? <p className="pf-empty">Nenhum reserva encontrado.</p> : null}
        <button
          type="button"
          className="primary alt form-inline-action"
          onClick={addBench}
        >
          Adicionar reserva
        </button>
        <div className="form-footer">
          <button
            type="button"
            className="primary big"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Salvando…" : isNew ? "Criar time" : "Salvar"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
