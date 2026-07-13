import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChevronRight,
  faMagnifyingGlass,
  faRankingStar,
} from "@fortawesome/free-solid-svg-icons";
import {
  api,
  type AccountUser,
  type LeaderboardEntry,
  type PublicProfile,
} from "../api.js";
import { LeaderboardProfileModal } from "./LeaderboardProfileModal.js";

interface LeaderboardPageProps {
  account: AccountUser | null;
  onBack: () => void;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function LeaderboardPage({ account, onBack }: LeaderboardPageProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let active = true;
    api.fullLeaderboard()
      .then(({ leaderboard }) => {
        if (active) setEntries(leaderboard);
      })
      .catch((loadError: Error) => {
        if (active) setError(loadError.message);
      });
    return () => { active = false; };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return entries ?? [];
    return (entries ?? []).filter((entry) => entry.username.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [entries, query]);

  const openProfile = async (entry: LeaderboardEntry) => {
    setSelected(entry);
    setProfile(null);
    setProfileError("");
    setProfileLoading(true);
    try {
      const response = await api.publicProfile(entry.userId);
      setProfile(response.profile);
    } catch (loadError) {
      setProfileError((loadError as Error).message);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-5 font-body text-pebol-text sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-pebol-muted hover:bg-white/10 hover:text-white" onClick={onBack} aria-label="Voltar" title="Voltar">
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <img className="h-11 w-11 object-contain" src="/brand-concepts/pebol-duel-mark.svg" alt="" />
            <span className="min-w-0">
              <small className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-accent">Comunidade Pebol</small>
              <h1 className="truncate font-title text-3xl uppercase text-white sm:text-4xl">Ranking de jogadores</h1>
            </span>
          </div>
          <label className="leaderboard-search flex h-11 w-full items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-pebol-muted sm:w-72 focus-within:border-pebol-accent/50">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="shrink-0" />
            <input className="min-w-0 flex-1 text-sm text-white outline-none placeholder:text-pebol-muted" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jogador" aria-label="Buscar jogador" />
          </label>
        </header>

        <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-pebol-panel shadow-premium">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <span className="flex items-center gap-2 font-display text-sm font-bold uppercase text-white"><FontAwesomeIcon icon={faRankingStar} className="text-pebol-gold" /> Classificação geral</span>
            <small className="font-semibold text-pebol-muted">{entries ? `${entries.length} jogadores` : "Carregando..."}</small>
          </div>

          {error ? <p className="p-8 text-center text-sm font-semibold text-red-300">{error}</p> : null}
          {!error && entries === null ? (
            <div className="grid gap-px bg-white/5" aria-label="Carregando ranking">
              {[0, 1, 2, 3, 4, 5].map((item) => <span key={item} className="h-16 animate-pulse bg-white/[0.025]" />)}
            </div>
          ) : null}
          {!error && entries !== null ? (
            <ol className="divide-y divide-white/[0.07]">
              {filteredEntries.map((entry) => {
                const isYou = entry.userId === account?.id;
                return (
                  <li key={entry.userId}>
                    <button type="button" className={`grid min-h-16 w-full grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.055] sm:px-5 ${isYou ? "bg-pebol-accent/[0.07]" : ""}`} onClick={() => void openProfile(entry)}>
                      <strong className={`grid h-9 w-9 place-items-center rounded-lg border font-display text-sm ${entry.rank <= 3 ? "border-pebol-gold/40 bg-pebol-gold/10 text-pebol-gold" : "border-white/10 bg-white/[0.04] text-pebol-muted"}`}>#{entry.rank}</strong>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-display text-xs font-bold text-pebol-muted">
                          {entry.avatarUrl ? <img className="h-full w-full object-cover" src={entry.avatarUrl} alt="" /> : initials(entry.username)}
                        </span>
                        <span className="min-w-0"><strong className="block truncate font-display text-sm text-white">{entry.username}</strong><small className="block truncate font-semibold text-pebol-muted">{entry.title}{isYou ? " · Você" : ""}</small></span>
                      </span>
                      <span className="hidden text-right sm:block"><strong className="block font-display text-sm text-pebol-accent">Nv. {entry.level}</strong><small className="font-semibold text-pebol-gold">{entry.xp} XP</small></span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-pebol-muted" />
                    </button>
                  </li>
                );
              })}
              {!filteredEntries.length ? <li className="p-10 text-center text-sm font-semibold text-pebol-muted">Nenhum jogador encontrado.</li> : null}
            </ol>
          ) : null}
        </section>
      </div>

      {selected ? <LeaderboardProfileModal entry={selected} profile={profile} loading={profileLoading} error={profileError} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
