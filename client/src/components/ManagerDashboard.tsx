import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  ManagerDashboard as ManagerDashboardData,
  ManagerInboxItem,
  ManagerSeasonPhase,
} from "../../../shared/types.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { managerRecordLabel, moneyLabel, ratingAvg } from "../lib/managerData.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";

interface ManagerStartTeam {
  id: string;
  name: string;
  season: string;
  league: string;
  leagueKey: string;
  leagueName: string;
  divisionName: string;
}

interface ManagerDashboardProps {
  data: ManagerDashboardData | null;
  teams: ManagerStartTeam[];
  loading: boolean;
  seasonPhase: ManagerSeasonPhase | null;
  phaseLabel: string;
  actionLabel: string;
  onStart: (teamId: string) => void;
  onPlayRound: () => void;
  onSkipPreseason: () => void;
  onExport: () => void;
  onImportFile: (input: HTMLInputElement) => void;
  onDeleteCareer: () => void;
  onReadInbox: (id: string) => void;
  onAcceptInbox: (id: string) => void;
  onRejectInbox: (id: string) => void;
  onOpenSquad: () => void;
  onOpenMarket: () => void;
  onUpgradeStadium: () => void;
  onBack: () => void;
}

const panel = "rounded-lg border border-white/10 bg-pebol-panel p-4 shadow-premium backdrop-blur-xl";
const action = "min-h-11 rounded-lg border border-pebol-accent/40 bg-gradient-to-r from-pebol-accent to-pebol-gold px-4 py-2 font-display text-sm font-black uppercase tracking-[0.06em] text-black shadow-glow transition-all duration-300 hover:-translate-y-0.5";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 font-display text-sm font-extrabold text-slate-200 transition-all duration-300 hover:border-pebol-blue/50 hover:bg-pebol-blue/15";
const compactPanel = "rounded-lg border border-white/10 bg-white/[0.045] p-3";

function emailTypeLabel(type: ManagerInboxItem["type"]): string {
  if (type === "player_offer") return "Proposta";
  if (type === "manager_offer") return "Clube";
  if (type === "match") return "Jogo";
  if (type === "finance") return "Finanças";
  if (type === "sponsor") return "Patrocínio";
  return "Diretoria";
}

function emailDateLabel(createdAt: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function emailPreview(body: string): string {
  return body.length > 92 ? `${body.slice(0, 92).trim()}...` : body;
}

function tacticName<T extends string>(options: Array<{ id: T; name: string }>, id: T): string {
  return options.find((option) => option.id === id)?.name ?? id;
}

function StartCareer({
  teams,
  loading,
  onStart,
  onImportFile,
  onBack,
}: Pick<ManagerDashboardProps, "teams" | "loading" | "onStart" | "onImportFile" | "onBack">) {
  const leagues = useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; count: number }>();
    for (const team of teams) {
      const current = byKey.get(team.leagueKey);
      if (current) {
        current.count++;
      } else {
        byKey.set(team.leagueKey, {
          key: team.leagueKey,
          label: `${team.leagueName} - ${team.divisionName}`,
          count: 1,
        });
      }
    }
    return [...byKey.values()];
  }, [teams]);
  const [leagueKey, setLeagueKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const filteredTeams = useMemo(
    () => teams.filter((team) => !leagueKey || team.leagueKey === leagueKey),
    [leagueKey, teams],
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 font-body text-pebol-text sm:px-6">
      <section className={`${panel} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgba(0,255,135,.14),transparent_34%)]" />
        <div className="relative">
          <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Modo técnico</span>
          <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-white">Escolha seu clube</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-pebol-muted">
            Assuma um clube em uma carreira local, administre caixa, estádio, mercado e calendário de temporada.
          </p>
        </div>
      </section>
      <section className={`${panel} grid gap-3`}>
        <select
          className="min-h-12 rounded-lg border border-white/10 bg-black/30 px-3 font-display text-sm font-bold text-white outline-none"
          value={leagueKey}
          onChange={(event) => {
            setLeagueKey(event.currentTarget.value);
            setTeamId("");
          }}
        >
          <option value="">{loading ? "Carregando ligas..." : "Selecione uma liga"}</option>
          {leagues.map((league) => (
            <option key={league.key} value={league.key}>
              {league.label} ({league.count})
            </option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-lg border border-white/10 bg-black/30 px-3 font-display text-sm font-bold text-white outline-none"
          value={teamId}
          onChange={(event) => setTeamId(event.currentTarget.value)}
          disabled={!leagueKey}
        >
          <option value="">{leagueKey ? "Selecione um clube" : "Escolha uma liga primeiro"}</option>
          {filteredTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} {team.season ? `(${team.season})` : ""}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button className={action} disabled={!teamId} onClick={() => onStart(teamId)}>
            Iniciar carreira
          </button>
          <button className={secondary} type="button" onClick={() => importInputRef.current?.click()}>
            Importar save
          </button>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => onImportFile(event.currentTarget)}
          />
          <button className={secondary} onClick={onBack}>Voltar</button>
        </div>
      </section>
    </div>
  );
}

export function ManagerDashboard({
  data,
  teams,
  loading,
  seasonPhase,
  phaseLabel,
  actionLabel,
  onStart,
  onPlayRound,
  onSkipPreseason,
  onExport,
  onImportFile,
  onDeleteCareer,
  onReadInbox,
  onAcceptInbox,
  onRejectInbox,
  onOpenSquad,
  onOpenMarket,
  onUpgradeStadium,
  onBack,
}: ManagerDashboardProps) {
  const squadAvg = useMemo(() => ratingAvg(data?.squad ?? []), [data]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  if (!data) {
    return <StartCareer teams={teams} loading={loading} onStart={onStart} onImportFile={onImportFile} onBack={onBack} />;
  }

  const selectedEmail = data.inbox.find((item) => item.id === selectedEmailId) ?? null;
  const userStanding = data.standings.find((s) => s.teamId === data.save.teamId);
  const opponentName = data.nextFixture
    ? data.nextFixture.homeTeamId === data.save.teamId
      ? data.nextFixture.awayName
      : data.nextFixture.homeName
    : "Temporada concluída";
  const matchVenue = data.nextFixture?.homeTeamId === data.save.teamId ? "Casa" : data.nextFixture ? "Fora" : "Sem jogo";
  const scout = data.nextOpponentScout;

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
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Temporada {data.save.season} · {phaseLabel}</span>
              <h1 className="mt-1 font-title text-3xl uppercase tracking-[0.02em] text-white">{data.save.teamName}</h1>
              <p className="mt-1 text-sm font-semibold text-pebol-muted">Próximo adversário: {opponentName}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button className={secondary} onClick={onOpenSquad}>Elenco</button>
              <button className={secondary} onClick={onOpenMarket}>Mercado</button>
              <button className={secondary} onClick={onExport}>Exportar</button>
              <button className={secondary} type="button" onClick={() => importInputRef.current?.click()}>
                Importar
              </button>
              <input
                ref={importInputRef}
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => onImportFile(event.currentTarget)}
              />
              {seasonPhase === "preseason" ? (
                <button className={secondary} onClick={onSkipPreseason}>Pular pré-temporada</button>
              ) : null}
              <button className={`${secondary} border-red-300/20 text-red-100 hover:border-red-300/45 hover:bg-red-400/10`} onClick={() => setConfirmDeleteOpen(true)}>
                Apagar carreira
              </button>
              <button className={action} disabled={seasonPhase === "season-end"} onClick={onPlayRound}>{actionLabel}</button>
              <button className={secondary} onClick={onBack}>Voltar</button>
            </div>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          {[
            ["Caixa", moneyLabel(data.save.money)],
            ["Sócios", data.save.supporterMembers.toLocaleString("pt-BR")],
            ["Patrocínio", moneyLabel(data.commercial.sponsorIncome)],
            ["Força média", `${squadAvg}`],
          ].map(([label, value]) => (
            <div key={label} className={`${compactPanel} bg-pebol-panel/80`}>
              <span className="font-display text-xs font-black uppercase tracking-[0.12em] text-pebol-muted">{label}</span>
              <strong className="mt-1 block font-display text-xl font-black text-white">{value}</strong>
            </div>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,.88fr)]">
          <section className={panel}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-title text-xl uppercase text-white">Tabela</h2>
              <span className="text-sm font-bold text-pebol-muted">{userStanding ? managerRecordLabel(userStanding) : ""}</span>
            </div>
            <div className="grid max-h-[28rem] gap-1.5 overflow-y-auto pr-1">
              {data.standings.map((row, index) => (
                <div
                  key={row.teamId}
                  className={`grid min-h-9 grid-cols-[2rem_minmax(0,1fr)_2.5rem_2.5rem_3rem] items-center gap-2 rounded-lg border px-3 text-sm font-bold ${
                    row.teamId === data.save.teamId
                      ? "border-pebol-accent/45 bg-pebol-accent/10 text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-200"
                  }`}
                >
                  <span className="font-display text-pebol-gold">{index + 1}</span>
                  <span className="truncate">{row.teamName}</span>
                  <span>{row.points}</span>
                  <span className="text-pebol-muted">{row.played}J</span>
                  <span className={row.goalDifference >= 0 ? "text-pebol-accent" : "text-red-200"}>{row.goalDifference}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid content-start gap-4">
            <section className={`${panel} grid content-start gap-3`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-title text-xl uppercase text-white">Diretoria</h2>
                <button className={`${secondary} min-h-9 px-3 text-xs`} onClick={onUpgradeStadium}>Estádio</button>
              </div>
              <p className="text-sm font-semibold leading-5 text-pebol-muted">
                {data.transferWindowOpen
                  ? "Janela aberta: ajuste elenco e propostas antes da liga."
                  : "Janela fechada: caixa vem de operação e premiações."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Prestígio <strong className="block text-lg text-white">{data.save.prestige}</strong></span>
                <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Confiança <strong className="block text-lg text-white">{data.save.boardConfidence}</strong></span>
                <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Bilheteria <strong className="block text-lg text-white">{moneyLabel(data.commercial.projectedHomeIncome)}</strong></span>
                <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>{data.save.sponsorName} <strong className="block text-lg text-white">Nível {data.save.sponsorTier}</strong></span>
              </div>
            </section>

            <section className={`${panel} grid content-start gap-3`}>
              <div>
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">Próximo jogo</span>
                <h2 className="mt-1 font-title text-xl uppercase text-white">{data.save.teamName} x {opponentName}</h2>
                <p className="mt-1 text-sm font-semibold text-pebol-muted">{matchVenue} · {phaseLabel}</p>
              </div>
              {scout ? (
                <div className="grid grid-cols-2 gap-2">
                  <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Formação <strong className="block text-lg text-white">{scout.formationId}</strong></span>
                  <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Força <strong className="block text-lg text-white">{scout.strength.overall}</strong></span>
                  <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Mentalidade <strong className="block text-lg text-white">{tacticName(MENTALITIES, scout.mentality)}</strong></span>
                  <span className={`${compactPanel} text-sm font-bold text-pebol-muted`}>Foco <strong className="block text-lg text-white">{tacticName(ATTACK_FOCUS_OPTIONS, scout.attackFocus)}</strong></span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-pebol-muted">Sem confronto pendente nesta fase.</p>
              )}
            </section>

            <section className={`${panel} content-start`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-title text-xl uppercase text-white">E-mail</h2>
                <span className="text-sm font-bold text-pebol-muted">{data.inbox.filter((item) => item.unread).length} novas</span>
              </div>
              <div className="grid max-h-[17.5rem] gap-2 overflow-y-auto pr-1">
                {data.inbox.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`grid min-h-[4.25rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left transition hover:border-pebol-accent/45 ${
                      item.unread ? "border-pebol-accent/35 bg-pebol-accent/10" : "border-white/10 bg-white/[0.04]"
                    }`}
                    onClick={() => {
                      onReadInbox(item.id);
                      setSelectedEmailId(item.id);
                    }}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${item.unread ? "bg-pebol-accent shadow-glow" : "bg-white/25"}`} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <strong className="truncate font-display text-sm font-black text-white">{item.title}</strong>
                        <span className="rounded border border-white/10 px-1.5 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.08em] text-pebol-muted">
                          {emailTypeLabel(item.type)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-pebol-muted">{emailPreview(item.body)}</span>
                    </span>
                    <span className="text-right text-xs font-bold text-pebol-muted">{emailDateLabel(item.createdAt)}</span>
                  </button>
                ))}
                {!data.inbox.length ? (
                  <p className="text-sm font-semibold text-pebol-muted">Nenhuma mensagem ainda.</p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedEmail ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedEmailId(null)}
        >
          <motion.div
            className="w-full max-w-2xl rounded-lg border border-white/10 bg-pebol-panel p-5 shadow-premium"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-pebol-accent">
                  {emailTypeLabel(selectedEmail.type)} · {emailDateLabel(selectedEmail.createdAt)}
                </span>
                <h3 className="mt-1 font-title text-2xl uppercase text-white">{selectedEmail.title}</h3>
              </div>
              <button className={`${secondary} min-h-9 px-3 text-xs`} onClick={() => setSelectedEmailId(null)}>Fechar</button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-6 text-slate-200">{selectedEmail.body}</p>
            {(selectedEmail.type === "player_offer" || selectedEmail.type === "manager_offer") && !selectedEmail.handled ? (
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  className={secondary}
                  onClick={() => {
                    onRejectInbox(selectedEmail.id);
                    setSelectedEmailId(null);
                  }}
                >
                  Recusar
                </button>
                <button
                  className={action}
                  onClick={() => {
                    onAcceptInbox(selectedEmail.id);
                    setSelectedEmailId(null);
                  }}
                >
                  Aceitar
                </button>
              </div>
            ) : selectedEmail.handled ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-xs font-black uppercase tracking-[0.1em] text-pebol-muted">
                Respondido
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}

      {confirmDeleteOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-red-300/20 bg-pebol-panel p-5 shadow-premium"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(248,113,113,.16),transparent_34%),linear-gradient(135deg,rgba(0,255,135,.08),transparent_58%)]" />
            <div className="relative">
              <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-red-200">
                Apagar carreira
              </span>
              <h3 className="mt-1 font-title text-2xl uppercase text-white">
                Recomeçar do zero?
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-pebol-muted">
                Isso remove o save atual de {data.save.teamName}, incluindo elenco, calendário, finanças e e-mails.
                Depois você poderá escolher outro clube e iniciar uma nova carreira.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button className={secondary} type="button" onClick={() => setConfirmDeleteOpen(false)}>
                  Cancelar
                </button>
                <button
                  className="min-h-10 rounded-lg border border-red-300/30 bg-red-400/15 px-4 py-2 font-display text-xs font-black uppercase tracking-[0.06em] text-red-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200/60 hover:bg-red-400/25"
                  type="button"
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    onDeleteCareer();
                  }}
                >
                  Apagar carreira
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}
