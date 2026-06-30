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
  onOpenFeedbacks: () => void;
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
  onOpenFeedbacks,
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
      className="min-h-screen px-4 py-6 font-body text-pebol-text sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(0,255,135,.14),transparent_34%)]" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Administração</span>
              <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-white">Gerenciar times</h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">
                {account?.username ?? ""} · {isAdmin ? "admin" : "usuário"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <input
                ref={importRef}
                id="adm-import-file"
                type="file"
                accept="application/json,.json"
                hidden
                onChange={importFile}
              />
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                href="/import_teams_model.json"
                download
              >
                Baixar modelo
              </a>
              <button
                id="adm-import"
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                onClick={() => importRef.current?.click()}
              >
                Importar JSON
              </button>
              <button
                id="adm-new"
                className="min-h-11 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-4 py-2 font-display text-sm font-black uppercase tracking-[0.06em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                onClick={onNewTeam}
              >
                Novo time
              </button>
              <button
                id="adm-feedback"
                className="min-h-11 rounded-lg border border-pebol-accent/35 bg-pebol-accent/10 px-4 py-2 font-display text-sm font-extrabold text-pebol-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-pebol-accent/15"
                onClick={onOpenFeedbacks}
              >
                Feedbacks
              </button>
              <button
                id="adm-back"
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                onClick={onBack}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="font-display text-xs font-black uppercase tracking-[0.14em] text-pebol-muted" htmlFor="adm-team-search">
            Pesquisar times
            <input
              id="adm-team-search"
              className="mt-2 block min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-body text-sm font-semibold normal-case tracking-normal text-white outline-none transition-all duration-300 placeholder:text-pebol-faint focus:border-pebol-accent/55 focus:ring-2 focus:ring-pebol-accent/15"
              value={query}
              placeholder="Digite nome, liga, temporada ou jogador"
              autoComplete="off"
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <span className="text-sm font-bold text-pebol-muted">
            {teams
              ? `${filteredTeams?.length ?? 0} de ${teams.length} elencos`
              : "Carregando elencos"}
          </span>
        </div>

      {teams === null ? (
        <p className="rounded-lg border border-white/10 bg-pebol-panel p-5 text-pebol-muted">Carregando...</p>
      ) : filteredTeams?.length ? (
        <div className="grid gap-3">
          {filteredTeams.map((team, index) => (
            <motion.div
              key={team.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl transition-all duration-300 hover:border-pebol-accent/30 hover:bg-pebol-accent/5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, delay: Math.min(index * 0.01, 0.12) }}
            >
              <div className="min-w-0">
                <strong className="block truncate font-display text-lg font-black text-white">{team.name}</strong>
                <span className="mt-1 block text-sm font-semibold text-pebol-muted">
                  {teamKindLabel(team)}
                  {team.league ? ` · ${team.league}` : ""}
                  {team.season ? ` · ${team.season}` : ""}
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-pebol-blue/25 bg-pebol-blue/10 px-3 py-1 text-xs font-black text-slate-200">{team.players.length} titulares</span>
                  <span className="rounded-full border border-pebol-blue/25 bg-pebol-blue/10 px-3 py-1 text-xs font-black text-slate-200">{team.bench?.length ?? 0} reservas</span>
                  <span className="rounded-full border border-pebol-accent/25 bg-pebol-accent/10 px-3 py-1 text-xs font-black text-pebol-accent">{team.ownerId ? "seu time" : "oficial"}</span>
                </div>
              </div>
              {canEditTeam(team) ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-xs font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15"
                    onClick={() => onEditTeam(team)}
                  >
                    Editar
                  </button>
                  <button
                    className="min-h-10 rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-2 font-display text-xs font-extrabold text-red-100 transition-all duration-300 hover:bg-red-400/18"
                    onClick={() => onDeleteTeam(team)}
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <span className="text-sm font-semibold text-pebol-faint">somente leitura</span>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-pebol-panel p-5 text-pebol-muted">Nenhum time encontrado para essa busca.</p>
      )}
      </div>
    </motion.div>
  );
}
