import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "framer-motion";
import type { AccountUser, AdminTeam } from "../api.js";

interface AdminTeamsProps {
  account: AccountUser | null;
  teams: AdminTeam[] | null;
  initialSearch: string;
  canEditTeam: (team: AdminTeam) => boolean;
  onSearchCommit: (value: string) => void;
  onImportFile: (input: HTMLInputElement) => void;
  onNewTeam: () => void;
  onEditTeam: (team: AdminTeam) => void;
  onDeleteTeam: (team: AdminTeam) => void;
  onBack: () => void;
}

function searchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function teamSearchText(team: AdminTeam) {
  return searchKey(
    [
      team.name,
      team.alias,
      team.season,
      team.league,
      team.kind === "national" ? "seleção national" : "clube club",
      team.ownerId ? "seu time" : "oficial",
      ...team.players.map((p) => p.name),
      ...(team.bench ?? []).map((p) => p.name),
    ].join(" "),
  );
}

function teamKindLabel(team: AdminTeam) {
  return team.kind === "national" ? "Seleção" : "Clube";
}

export function AdminTeams({
  account,
  teams,
  initialSearch,
  canEditTeam,
  onSearchCommit,
  onImportFile,
  onNewTeam,
  onEditTeam,
  onDeleteTeam,
  onBack,
}: AdminTeamsProps) {
  const [query, setQuery] = useState(initialSearch);
  const importRef = useRef<HTMLInputElement>(null);
  const isAdmin = account?.role === "admin";

  useEffect(() => {
    const timer = window.setTimeout(() => onSearchCommit(query), 220);
    return () => window.clearTimeout(timer);
  }, [query, onSearchCommit]);

  const filteredTeams = useMemo(() => {
    if (!teams) return null;
    const key = searchKey(query);
    return teams.filter((team) => (key ? teamSearchText(team).includes(key) : true));
  }, [teams, query]);

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    onImportFile(event.currentTarget);
  };

  return (
    <motion.div
      className="screen admin-screen"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="admin-toolbar">
        <div className="admin-title">
          <span className="cup-tag">Administração</span>
          <h1>Gerenciar times</h1>
          <p>
            {account?.username ?? ""} · {isAdmin ? "admin" : "usuário"}
          </p>
        </div>
        <div className="admin-actions">
          <input
            ref={importRef}
            id="adm-import-file"
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importFile}
          />
          <a
            className="primary alt admin-action download-action"
            href="/import_teams_model.json"
            download
          >
            Baixar modelo
          </a>
          <button
            id="adm-import"
            className="primary alt admin-action"
            onClick={() => importRef.current?.click()}
          >
            Importar JSON
          </button>
          <button id="adm-new" className="primary admin-action" onClick={onNewTeam}>
            Novo time
          </button>
          <button id="adm-back" className="primary alt admin-action" onClick={onBack}>
            Voltar
          </button>
        </div>
      </div>

      <div className="admin-search">
        <label htmlFor="adm-team-search">
          Pesquisar times
          <input
            id="adm-team-search"
            value={query}
            placeholder="Digite nome, liga, temporada ou jogador"
            autoComplete="off"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <span>
          {teams
            ? `${filteredTeams?.length ?? 0} de ${teams.length} times`
            : "Carregando times"}
        </span>
      </div>

      {teams === null ? (
        <p className="cup-note">Carregando...</p>
      ) : filteredTeams?.length ? (
        <div className="admin-list">
          {filteredTeams.map((team, index) => (
            <motion.div
              key={team.id}
              className="admin-row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, delay: Math.min(index * 0.01, 0.12) }}
            >
              <div className="admin-row-main">
                <strong>{team.name}</strong>
                <span className="admin-row-sub">
                  {teamKindLabel(team)}
                  {team.league ? ` · ${team.league}` : ""}
                  {team.season ? ` · ${team.season}` : ""}
                </span>
                <div className="admin-row-tags">
                  <span>{team.players.length} titulares</span>
                  <span>{team.bench?.length ?? 0} reservas</span>
                  <span>{team.ownerId ? "seu time" : "oficial"}</span>
                </div>
              </div>
              {canEditTeam(team) ? (
                <div className="admin-row-actions">
                  <button
                    className="primary alt row-action"
                    onClick={() => onEditTeam(team)}
                  >
                    Editar
                  </button>
                  <button
                    className="row-action danger"
                    onClick={() => onDeleteTeam(team)}
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <span className="admin-locked">somente leitura</span>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="cup-note">Nenhum time encontrado para essa busca.</p>
      )}
    </motion.div>
  );
}
