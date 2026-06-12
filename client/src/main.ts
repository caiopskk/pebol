import "./styles.css";
import type {
  RoomState,
  PlayerPublic,
  GameMode,
  Mentality,
  MatchResult,
  MatchEvent,
  Player,
  SquadPick,
  ShootoutKick,
  Team,
  GauntletResult,
} from "../../shared/types.js";
import {
  FORMATIONS,
  getFormation,
  groupOf,
  posLabel,
} from "../../shared/formations.js";
import { MENTALITIES } from "../../shared/mentalities.js";
import {
  computeStrength,
  effectiveRating,
  simInputFromTeam,
  simulateGauntletMatch,
} from "../../shared/engine.js";
import { getTeam } from "../../shared/data/teams.js";
import {
  WC_DRAFT_TEAMS,
  wcOpponentTeam,
  WC_LADDER,
} from "../../shared/data/worldcup.js";
import {
  onRoomUpdate,
  onError,
  createRoom,
  joinRoom,
  sendSetup,
  sendReady,
  sendPick,
  sendRerollTeam,
  sendHalftimeReady,
  sendRematch,
} from "./net.js";

const app = document.getElementById("app")!;
let syncLiveUi: (() => void) | null = null;
const MATCH_SPEED_KEY = "pebol:match-speed";

function readSavedMatchSpeed(): number {
  const saved = Number(localStorage.getItem(MATCH_SPEED_KEY));
  return [1, 1.5, 2].includes(saved) ? saved : 1;
}

function setMatchSpeed(speed: number) {
  L.matchSpeed = [1, 1.5, 2].includes(speed) ? speed : 1;
  localStorage.setItem(MATCH_SPEED_KEY, String(L.matchSpeed));
}

interface Local {
  youId: string | null;
  state: RoomState | null;
  // transient selection during the draft
  selectedPlayer: string | null;
  // setup choices (before sending)
  formationId: string;
  mentality: Mentality;
  toast: string | null;
  // live match playback
  matchPlayed: boolean;
  matchSpeed: number; // 1, 1.5, 2
  playing: boolean;
  halftimeAdjusted: boolean;
  intervalBench: Array<Player & { fromTeamId: string }> | null;
  selectedSubOut: string | null;
  selectedSubIn: string | null;
  intervalSubCount: number;
  // World Cup campaign (single-player, client-side, independent of the socket room)
  campaign: CampaignState | null;
}

type CampaignPhase =
  | "setup"
  | "draft"
  | "preMatch"
  | "match"
  | "gameover"
  | "victory";
interface CupGroupRow {
  id: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
}
interface LiveStatLine {
  goals: number;
  assists: number;
  side: "you" | "opp";
}
interface CampaignState {
  phase: CampaignPhase;
  formationId: string;
  mentality: Mentality;
  round: number; // 0..7 — 3 group matches + 5 knockout rounds
  picks: SquadPick[]; // your drafted XI
  currentTeam: Team | null; // team drawn this draft round
  usedTeamIds: string[];
  selectedPlayer: string | null;
  currentOpp: Team | null; // opponent for the current round
  lastResult: GauntletResult | null;
  rerollsRemaining: number;
  campaignGoals: Record<string, number>;
  campaignAssists: Record<string, number>;
  groupTeams: Team[];
  groupTable: CupGroupRow[];
  groupQualified: boolean | null;
  groupQualifiedLabel: string | null;
  knockoutPath: Team[];
}

const L: Local = {
  youId: null,
  state: null,
  selectedPlayer: null,
  formationId: "4-3-3",
  mentality: "equilibrada",
  toast: null,
  matchPlayed: false,
  matchSpeed: readSavedMatchSpeed(),
  playing: false,
  halftimeAdjusted: false,
  intervalBench: null,
  selectedSubOut: null,
  selectedSubIn: null,
  intervalSubCount: 0,
  campaign: null,
};

onRoomUpdate((s) => {
  L.state = s;
  render();
});
onError((msg) => {
  showToast(msg);
});

let toastTimer: number | undefined;
function showToast(msg: string) {
  L.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    L.toast = null;
    render();
  }, 2600);
}

function me(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id === L.youId);
}
function opponent(): PlayerPublic | undefined {
  return L.state?.players.find((p) => p.id !== L.youId);
}

// ---------------- Main render ----------------

function render() {
  // World Cup campaign is a self-contained, client-side flow that owns the screen
  if (L.campaign) {
    if (L.playing) {
      renderToast();
      return;
    }
    renderCampaign();
    renderToast();
    return;
  }

  // outside the result phase, reset the playback state
  if (L.state?.phase !== "result") {
    L.matchPlayed = false;
    L.playing = false;
    syncLiveUi = null;
    L.halftimeAdjusted = false;
    L.intervalBench = null;
    L.selectedSubOut = null;
    L.selectedSubIn = null;
    L.intervalSubCount = 0;
  }
  // during live playback, don't re-render (preserve the animation)
  if (L.playing) {
    syncLiveUi?.();
    renderToast();
    return;
  }

  if (!L.state || !L.youId) {
    renderHome();
  } else {
    switch (L.state.phase) {
      case "lobby":
        renderLobby();
        break;
      case "draft":
        renderDraft();
        break;
      case "result":
        renderResult();
        break;
      default:
        renderLobby();
    }
  }
  renderToast();
}

function renderToast() {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  if (!L.toast) return;
  const t = document.createElement("div");
  t.id = "toast";
  t.className = "toast";
  t.textContent = L.toast;
  document.body.appendChild(t);
}

function bumpStat(
  stats: Map<string, LiveStatLine>,
  name: string | undefined,
  side: "you" | "opp",
  field: "goals" | "assists",
) {
  if (!name) return;
  const current = stats.get(name) ?? { goals: 0, assists: 0, side };
  current[field]++;
  current.side = side;
  stats.set(name, current);
}

function renderLiveStats(target: HTMLElement, stats: Map<string, LiveStatLine>) {
  const leaders = [...stats.entries()]
    .filter(([, s]) => s.goals || s.assists)
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists || a[0].localeCompare(b[0]))
    .slice(0, 5);
  target.innerHTML = `
    <div class="live-stat-head">
      <span>Participações em gol</span>
      <small>Gols / Assist.</small>
    </div>
    ${
      leaders.length
        ? `<div class="live-stat-list">${leaders
            .map(([name, s]) => `
              <div class="live-stat-row ${s.side}">
                <strong>${escapeHtml(name)}</strong>
                <span>${s.goals}G ${s.assists}A</span>
              </div>`)
            .join("")}</div>`
        : `<div class="live-stat-empty">Aguardando o primeiro gol.</div>`
    }`;
}

// ---------------- Home ----------------

function renderHome() {
  app.innerHTML = `
    <div class="screen home">
      <div class="cards home-board">
        <div class="panel home-panel create-card">
          <div class="home-card-inner">
            <h2>Criar sala</h2>
            <label>Seu nome</label>
            <input id="c-name" maxlength="20" placeholder="Insira seu nome" />
            <label>Modo de jogo</label>
            <div class="mode-pick">
              <button class="mode-btn active" data-mode="classico">
                <strong>Clássico</strong><span>Ratings visíveis</span>
              </button>
              <button class="mode-btn" data-mode="pica">
                <strong>Pica</strong><span>Ratings ocultos</span>
              </button>
            </div>
            <button id="c-create" class="primary">Criar sala (online)</button>
          </div>
        </div>

        <div class="home-logo-tile">
          <img class="logo" src="/pebol_logo.png" alt="Pebol" />
          <p>Monte seu time no draft e desafie um amigo 1v1 ou jogue contra a máquina.</p>
        </div>

        <div class="panel home-panel join-card">
          <div class="home-card-inner">
            <h2>Entrar numa sala</h2>
            <label>Seu nome</label>
            <input id="j-name" maxlength="20" placeholder="Insira seu nome" />
            <label>Código da sala</label>
            <input id="j-code" maxlength="4" placeholder="XXXX" style="text-transform:uppercase" />
            <button id="j-join" class="primary">Entrar</button>
          </div>
        </div>

        <div class="panel solo-panel">
          <div class="solo-actions">
            <button id="c-solo" class="primary alt solo-action">Jogar sozinho (vs Máquina)</button>
            <button id="career-mode" class="primary alt solo-action">Modo carreira</button>
            <button id="league-mode" class="primary alt solo-action">Modo liga</button>
          </div>
        </div>

        <aside class="panel cup-panel">
          <img class="cup-panel-trophy" src="/world_cup_trophy.png" alt="Troféu da Copa do Mundo" />
          <span class="cup-tag">Modo solo</span>
          <h2>Copa do Mundo</h2>
          <p>Monte uma seleção no draft, dispute a fase de grupos e avance pelo chaveamento de 32 times até a final.</p>
          <ul class="cup-feature-list">
            <li>48 seleções</li>
            <li>Grupo + mata-mata</li>
            <li>Campanha offline</li>
          </ul>
          <button id="c-worldcup" class="primary cup-panel-action">Jogar campanha</button>
        </aside>

      </div>
    </div>
  `;

  let mode: GameMode = "classico";
  app.querySelectorAll<HTMLButtonElement>(".mode-btn").forEach((btn) => {
    btn.onclick = () => {
      app
        .querySelectorAll(".mode-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode as GameMode;
    };
  });

  const doCreate = async (solo: boolean) => {
    const typedName = (
      app.querySelector<HTMLInputElement>("#c-name")!.value || ""
    ).trim();
    const name = solo ? typedName || "Você" : typedName;
    if (!name) return showToast("Digite seu nome.");
    const res = await createRoom(name, mode, solo);
    if (res.ok && res.youId) {
      L.youId = res.youId;
    } else {
      showToast(res.error || "Erro ao criar sala.");
    }
  };
  app.querySelector<HTMLButtonElement>("#c-create")!.onclick = () =>
    doCreate(false);
  app.querySelector<HTMLButtonElement>("#c-solo")!.onclick = () =>
    doCreate(true);
  app.querySelector<HTMLButtonElement>("#career-mode")!.onclick = () =>
    showToast("Modo carreira estará disponível em breve.");
  app.querySelector<HTMLButtonElement>("#league-mode")!.onclick = () =>
    showToast("Modo liga estará disponível em breve.");
  app.querySelector<HTMLButtonElement>("#c-worldcup")!.onclick = () =>
    startCampaign();

  app.querySelector<HTMLButtonElement>("#j-join")!.onclick = async () => {
    const name = (
      app.querySelector<HTMLInputElement>("#j-name")!.value || ""
    ).trim();
    const code = (app.querySelector<HTMLInputElement>("#j-code")!.value || "")
      .trim()
      .toUpperCase();
    if (!name) return showToast("Digite seu nome.");
    if (code.length !== 4) return showToast("Código inválido.");
    const res = await joinRoom(code, name);
    if (res.ok && res.youId) {
      L.youId = res.youId;
    } else {
      showToast(res.error || "Erro ao entrar.");
    }
  };
}

// ---------------- World Cup campaign (single-player gauntlet) ----------------

function startCampaign() {
  L.state = null;
  L.youId = null;
  L.playing = false;
  L.campaign = {
    phase: "setup",
    formationId: "4-3-3",
    mentality: "equilibrada",
    round: 0,
    picks: [],
    currentTeam: null,
    usedTeamIds: [],
    selectedPlayer: null,
    currentOpp: null,
    lastResult: null,
    rerollsRemaining: 3,
    campaignGoals: {},
    campaignAssists: {},
    groupTeams: [],
    groupTable: [],
    groupQualified: null,
    groupQualifiedLabel: null,
    knockoutPath: [],
  };
  render();
}

function campaignExit() {
  L.campaign = null;
  L.playing = false;
  render();
}

function mentalityLabel(m: Mentality): string {
  return MENTALITIES.find((x) => x.id === m)?.name ?? m;
}

function campaignProgress(won: number): string {
  const labels = ["G1", "G2", "G3", "32", "16", "QF", "SF", "F"];
  return `<div class="cup-progress">${labels
    .map(
      (label, i) =>
        `<span class="cup-cell ${i < won ? "done" : ""} ${i === won ? "next" : ""}">${i < won ? "✓" : label}</span>`,
    )
    .join("")}</div>`;
}

function renderCampaign() {
  switch (L.campaign!.phase) {
    case "setup":
      return renderCampaignSetup();
    case "draft":
      return renderCampaignDraft();
    case "preMatch":
      return renderCampaignPreMatch();
    case "match":
      return renderCampaignMatch();
    case "gameover":
      return renderCampaignGameOver();
    case "victory":
      return renderCampaignVictory();
  }
}

function renderCampaignSetup() {
  const c = L.campaign!;
  app.innerHTML = `
    <div class="screen cup-screen">
      <div class="cup-head">
        <img class="cup-head-trophy" src="/world_cup_trophy.png" alt="" />
        <div>
          <span class="cup-tag">Modo Copa do Mundo</span>
          <h1>Copa do Mundo 48 Seleções</h1>
          <p>Monte sua seleção, dispute 3 jogos de grupo e tente passar para o mata-mata de 32 times até a final.</p>
        </div>
        <button id="cup-exit" class="ghost">Sair</button>
      </div>
      <div class="panel">
        <h2>Escolha sua formação</h2>
        <div class="formation-grid">
          ${FORMATIONS.map((f) => `<button class="form-btn ${f.id === c.formationId ? "active" : ""}" data-form="${f.id}">${f.name}</button>`).join("")}
        </div>
        <div class="setup-cols">
          <div class="mini-pitch-wrap">${renderPitch(getFormation(c.formationId)!, [], false)}</div>
          <div class="mentality-col">
            <h2>Mentalidade <span class="cup-warn">peso DOBRADO nesta copa</span></h2>
            ${MENTALITIES.map((m) => `<button class="ment-btn ${m.id === c.mentality ? "active" : ""}" data-ment="${m.id}"><strong>${m.name}</strong><span>${m.desc}</span></button>`).join("")}
          </div>
        </div>
        <div class="lobby-actions"><button id="cup-start" class="primary big">Começar a campanha</button></div>
      </div>
    </div>`;
  document.getElementById("cup-exit")!.onclick = campaignExit;
  app.querySelectorAll<HTMLButtonElement>(".form-btn").forEach(
    (b) =>
      (b.onclick = () => {
        c.formationId = b.dataset.form!;
        render();
      }),
  );
  app.querySelectorAll<HTMLButtonElement>(".ment-btn").forEach(
    (b) =>
      (b.onclick = () => {
        c.mentality = b.dataset.ment as Mentality;
        render();
      }),
  );
  document.getElementById("cup-start")!.onclick = () => {
    c.phase = "draft";
    campaignDrawTeam();
    render();
  };
}

function campaignOpenSlots() {
  const c = L.campaign!;
  const f = getFormation(c.formationId)!;
  const filled = new Set(c.picks.map((p) => p.slotId));
  return f.slots.filter((s) => !filled.has(s.id));
}

function campaignSelectable(): Set<string> {
  const c = L.campaign!;
  if (!c.currentTeam) return new Set();
  const openGroups = new Set(campaignOpenSlots().map((s) => groupOf(s.pos)));
  return new Set(
    c.currentTeam.players
      .filter((p) => openGroups.has(groupOf(p.pos)))
      .map((p) => p.name),
  );
}

function campaignDrawTeam() {
  const c = L.campaign!;
  for (let tries = 0; tries < 10; tries++) {
    const pool = WC_DRAFT_TEAMS.filter((t) => !c.usedTeamIds.includes(t.id));
    const src = pool.length ? pool : WC_DRAFT_TEAMS;
    if (!pool.length) c.usedTeamIds = [];
    c.currentTeam = src[Math.floor(Math.random() * src.length)];
    c.selectedPlayer = null;
    if (campaignSelectable().size) return; // at least one player fits an open slot
    c.usedTeamIds.push(c.currentTeam.id);
  }
}

function campaignRerollTeam() {
  const c = L.campaign!;
  if (c.phase !== "draft") return;
  if (c.rerollsRemaining <= 0)
    return showToast("Você já usou suas 3 atualizações.");
  if (c.currentTeam) c.usedTeamIds.push(c.currentTeam.id);
  c.rerollsRemaining--;
  c.selectedPlayer = null;
  campaignDrawTeam();
  render();
}

function campaignPlace(slotId: string, player: Player) {
  const c = L.campaign!;
  const slot = getFormation(c.formationId)?.slots.find((s) => s.id === slotId);
  c.picks.push({
    slotId,
    player,
    fromTeamId: c.currentTeam!.id,
    effectiveRating: slot ? effectiveRating(player, slot.pos) : player.rating,
  });
  c.usedTeamIds.push(c.currentTeam!.id);
  c.selectedPlayer = null;
  if (c.picks.length >= 11) {
    c.round = 0;
    campaignBeginRound();
  } else {
    campaignDrawTeam();
  }
  render();
}

function campaignAvg(): string {
  const c = L.campaign!;
  if (!c.picks.length) return "";
  const a = c.picks.reduce((s, p) => s + p.effectiveRating, 0) / c.picks.length;
  return `OVR ${Math.round(a)}`;
}

function campaignAvgNumber(): number {
  const c = L.campaign!;
  if (!c.picks.length) return 0;
  return Math.round(
    c.picks.reduce((s, p) => s + p.effectiveRating, 0) / c.picks.length,
  );
}

function campaignStrengthSummary(): string {
  const c = L.campaign!;
  if (!c.picks.length) {
    return `<div class="cup-draft-rating"><strong>--</strong><span>Ataque -- · Meio -- · Defesa --</span></div>`;
  }
  const s = computeStrength(c.picks, c.formationId);
  return `
    <div class="cup-draft-rating">
      <strong>${Math.round(s.overall)}</strong>
      <span>Ataque ${Math.round(s.attack)} · Meio ${Math.round(s.midfield)} · Defesa ${Math.round(s.defense)}</span>
    </div>`;
}

function renderCampaignSquadRows(): string {
  const c = L.campaign!;
  const f = getFormation(c.formationId)!;
  const bySlot = new Map(c.picks.map((p) => [p.slotId, p]));
  return `
    <ol class="cup-squad-list">
      ${f.slots
        .map((slot) => {
          const pick = bySlot.get(slot.id);
          return `
          <li class="${pick ? "filled" : "empty"}">
            <span>${posLabel(slot.pos)}</span>
            <strong>${pick ? escapeHtml(pick.player.name) : "--"}</strong>
            <em>${pick ? pick.effectiveRating : "--"}</em>
          </li>`;
        })
        .join("")}
    </ol>`;
}

function addCampaignJourneyStats(r: GauntletResult) {
  const c = L.campaign!;
  for (const ev of r.timeline) {
    if (ev.type !== "goal" || ev.side !== "home") continue;
    if (ev.player) {
      c.campaignGoals[ev.player] = (c.campaignGoals[ev.player] ?? 0) + 1;
    }
    if (ev.assist) {
      c.campaignAssists[ev.assist] = (c.campaignAssists[ev.assist] ?? 0) + 1;
    }
  }
}

function campaignTopStat(source: Record<string, number>) {
  return (
    Object.entries(source).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] ?? null
  );
}

function renderCampaignJourneyLeaders(): string {
  const scorer = campaignTopStat(L.campaign!.campaignGoals);
  const assist = campaignTopStat(L.campaign!.campaignAssists);
  return `
    <div class="leaders cup-journey-leaders">
      ${leaderCard("Artilheiro da campanha", scorer ? { name: scorer[0], val: `${scorer[1]} gol${scorer[1] > 1 ? "s" : ""}`, side: "you" } : null)}
      ${leaderCard("Garçom da campanha", assist ? { name: assist[0], val: `${assist[1]} assistência${assist[1] > 1 ? "s" : ""}`, side: "you" } : null)}
    </div>`;
}

function groupRow(team: Pick<Team, "id" | "name" | "season">): CupGroupRow {
  return {
    id: team.id,
    name: team.season ? `${team.name} ${team.season}` : team.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
  };
}

function groupGoalDiff(row: CupGroupRow): number {
  return row.gf - row.ga;
}

function groupTableSorted(rows = L.campaign!.groupTable): CupGroupRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      groupGoalDiff(b) - groupGoalDiff(a) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}

function updateGroupRow(id: string, gf: number, ga: number) {
  const row = L.campaign!.groupTable.find((r) => r.id === id);
  if (!row) return;
  row.played++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.wins++;
    row.points += 3;
  } else if (gf === ga) {
    row.draws++;
    row.points += 1;
  } else {
    row.losses++;
  }
}

function recordGroupMatch(
  aId: string,
  bId: string,
  aGoals: number,
  bGoals: number,
) {
  updateGroupRow(aId, aGoals, bGoals);
  updateGroupRow(bId, bGoals, aGoals);
}

function teamAvg(team: Team): number {
  return Math.round(
    team.players.reduce((sum, p) => sum + p.rating, 0) /
      Math.max(1, team.players.length),
  );
}

function randomGroupScore(a: Team, b: Team): [number, number] {
  const baseA =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(a) - teamAvg(b)) / 18));
  const baseB =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(b) - teamAvg(a)) / 18));
  const goals = (base: number) => {
    const roll = Math.random() + Math.random() + Math.random();
    return Math.max(0, Math.min(5, Math.floor(roll * base)));
  };
  return [goals(baseA), goals(baseB)];
}

function setupCampaignGroup() {
  const c = L.campaign!;
  if (c.groupTeams.length) return;
  c.groupTeams = [0, 1, 2].map((i) => wcOpponentTeam(i, Math.random));
  c.groupTable = [
    groupRow({ id: "you", name: "Seu time", season: "" }),
    ...c.groupTeams.map(groupRow),
  ];
}

function simulateOtherGroupFixture(matchday: number) {
  const c = L.campaign!;
  const [a, b, d] = c.groupTeams;
  const fixtures: Array<[Team, Team]> = [
    [b, d],
    [a, d],
    [a, b],
  ];
  const fixture = fixtures[matchday];
  if (!fixture) return;
  const [ga, gb] = randomGroupScore(fixture[0], fixture[1]);
  recordGroupMatch(fixture[0].id, fixture[1].id, ga, gb);
}

function campaignRank(): number {
  return groupTableSorted().findIndex((row) => row.id === "you") + 1;
}

function bestThirdQualifies(row: CupGroupRow): boolean {
  return row.points >= 4 || (row.points === 3 && groupGoalDiff(row) >= 0);
}

function campaignQualificationLabel(): string {
  const sorted = groupTableSorted();
  const youRow = sorted.find((row) => row.id === "you")!;
  const rank = sorted.findIndex((row) => row.id === "you") + 1;
  if (rank <= 2) return `${rank}º colocado do grupo`;
  if (rank === 3 && bestThirdQualifies(youRow))
    return "3º colocado entre os 8 melhores terceiros";
  return `${rank}º colocado do grupo`;
}

function setupKnockoutPath() {
  const c = L.campaign!;
  if (c.knockoutPath.length) return;
  c.knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, Math.random),
  );
}

function campaignStageLabel(round = L.campaign!.round): string {
  return WC_LADDER[round]?.label ?? "Copa do Mundo";
}

function renderGroupTable(): string {
  const c = L.campaign!;
  if (!c.groupTable.length) return "";
  const rank = campaignRank();
  const status =
    c.groupQualified === null
      ? `${rank}º no grupo neste momento`
      : c.groupQualified
        ? `Classificado: ${c.groupQualifiedLabel}`
        : `Eliminado: ${c.groupQualifiedLabel}`;
  return `
    <section class="cup-status">
      <div class="section-head compact">
        <h3>Grupo A</h3>
        <span>${escapeHtml(status)}</span>
      </div>
      <table class="cup-table">
        <thead><tr><th>#</th><th>Time</th><th>J</th><th>Pts</th><th>SG</th><th>GP</th></tr></thead>
        <tbody>
          ${groupTableSorted()
            .map(
              (row, idx) => `
            <tr class="${row.id === "you" ? "you" : ""}">
              <td>${idx + 1}</td>
              <td>${escapeHtml(row.name)}</td>
              <td>${row.played}</td>
              <td>${row.points}</td>
              <td>${groupGoalDiff(row) >= 0 ? "+" : ""}${groupGoalDiff(row)}</td>
              <td>${row.gf}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </section>`;
}

function renderKnockoutBracket(): string {
  const c = L.campaign!;
  if (!c.knockoutPath.length) return "";
  const rounds = ["16-avos", "Oitavas", "Quartas", "Semi", "Final"];
  const currentIdx =
    c.phase === "victory" ? rounds.length : Math.max(0, c.round - 3);
  return `
    <section class="cup-status">
      <div class="section-head compact">
        <h3>Chaveamento</h3>
        <span>${escapeHtml(c.groupQualifiedLabel ?? "Mata-mata")}</span>
      </div>
      <div class="cup-bracket">
        ${rounds
          .map((label, idx) => {
            const opp = c.knockoutPath[idx];
            const state =
              idx < currentIdx ? "done" : idx === currentIdx ? "next" : "";
            const oppLabel =
              idx === currentIdx && opp
                ? `${opp.name}${opp.season ? ` ${opp.season}` : ""}`
                : idx < currentIdx
                  ? "fase concluída"
                  : "adversário oculto";
            return `
            <div class="bracket-round ${state}">
              <span>${label}</span>
              <strong>${idx < currentIdx ? "Seu time" : "Seu time"}</strong>
              <em>${idx === currentIdx ? "vs " : ""}${escapeHtml(oppLabel)}</em>
            </div>`;
          })
          .join("")}
      </div>
    </section>`;
}

function renderCampaignStatus(): string {
  const c = L.campaign!;
  if (!c.groupTable.length) return "";
  return c.round < 3 || c.groupQualified === false
    ? renderGroupTable()
    : renderKnockoutBracket();
}

function renderCampaignDraft() {
  const c = L.campaign!;
  const team = c.currentTeam!;
  const f = getFormation(c.formationId)!;
  const selectable = campaignSelectable();
  const player = c.selectedPlayer
    ? team.players.find((p) => p.name === c.selectedPlayer)
    : null;
  app.innerHTML = `
    <div class="screen cup-screen cup-draft-screen">
      <div class="topbar">
        <div class="room-code">Copa do Mundo — Draft</div>
        <div class="round-info">Jogador <strong>${c.picks.length + 1}</strong> / 11</div>
        <button id="cup-exit" class="ghost" style="margin-left:auto">Sair</button>
      </div>
      <div class="cup-draft-layout">
        <section class="draw-panel cup-draft-source">
          <div class="draw-head">
            <span class="draw-label">Saiu no sorteio</span>
            <h2>${escapeHtml(team.name)} ${team.season}</h2>
            <span class="draw-league">${escapeHtml(team.league)}</span>
            <button id="cup-reroll-team" class="ghost reroll" ${c.rerollsRemaining <= 0 ? "disabled" : ""}>
              Atualizar seleção (${c.rerollsRemaining})
            </button>
          </div>
          <ul class="player-list">
            ${team.players
              .map((pl) => {
                const can = selectable.has(pl.name);
                const sel = c.selectedPlayer === pl.name;
                return `<li class="pl-item ${can ? "clickable" : "taken"} ${sel ? "selected" : ""}" data-player="${escapeHtml(pl.name)}">
                <span class="pl-pos pos-${groupOf(pl.pos).toLowerCase()}">${posLabel(pl.pos)}</span>
                <span class="pl-name">${escapeHtml(pl.name)}</span>
                <span class="pl-rt">${pl.rating}</span></li>`;
              })
              .join("")}
          </ul>
          <p class="draft-hint">${
            c.selectedPlayer
              ? `Clique numa <strong>vaga compatível</strong> (mesmo setor) para escalar <strong>${escapeHtml(c.selectedPlayer)}</strong>.`
              : "Escolha jogadores que encaixem no setor aberto. Posição exata mantém o over cheio; adaptações próximas perdem um pouco."
          }</p>
        </section>

        <section class="board you-board cup-draft-pitch">
          <h3>Seu time <span class="ovr">${campaignAvg()}</span></h3>
          ${renderPitch(f, c.picks, !!c.selectedPlayer, true)}
        </section>

        <section class="board cup-draft-summary">
          <div class="cup-summary-head">
            <span>Box score</span>
            ${campaignStrengthSummary()}
          </div>
          ${renderCampaignSquadRows()}
          ${campaignProgress(0)}
          <p class="cup-note">Monte os 11 e entre na fase de grupos. Depois dela, o chaveamento começa nos 16-avos.</p>
        </section>
      </div>
    </div>`;
  document.getElementById("cup-exit")!.onclick = campaignExit;
  document.getElementById("cup-reroll-team")!.onclick = () =>
    campaignRerollTeam();
  app.querySelectorAll<HTMLLIElement>(".pl-item.clickable").forEach(
    (li) =>
      (li.onclick = () => {
        c.selectedPlayer = li.dataset.player!;
        render();
      }),
  );
  if (player) {
    app
      .querySelectorAll<HTMLElement>(".you-board .slot.empty")
      .forEach((slotEl) => {
        const slot = f.slots.find((s) => s.id === slotEl.dataset.slot)!;
        if (groupOf(slot.pos) === groupOf(player.pos)) {
          slotEl.classList.add("open");
          slotEl.onclick = () => campaignPlace(slot.id, player);
        } else {
          slotEl.classList.remove("open");
        }
      });
  }
}

function campaignBeginRound() {
  const c = L.campaign!;
  if (c.round < 3) {
    setupCampaignGroup();
    c.currentOpp = c.groupTeams[c.round];
  } else {
    setupKnockoutPath();
    c.currentOpp = c.knockoutPath[c.round - 3];
  }
  c.phase = "preMatch";
}

function renderCampaignPreMatch() {
  const c = L.campaign!;
  const ladder = WC_LADDER[c.round];
  const opp = c.currentOpp!;
  const isGroup = c.round < 3;
  const isFinal = c.round === 7;
  app.innerHTML = `
    <div class="screen cup-screen">
      <div class="cup-head">
        <div><span class="cup-tag">Copa do Mundo</span><h1>${escapeHtml(ladder.label)}</h1></div>
        <button id="cup-exit" class="ghost">Sair</button>
      </div>
      ${campaignProgress(c.round)}
      ${renderCampaignStatus()}
      <div class="panel cup-prematch">
        <div class="cup-vs">
          <div class="cup-vs-side">
            <div class="hero-crest you">${initials("Seu Time")}</div>
            <div class="hero-name">Seu time</div>
            <div class="hero-tag">${c.formationId} · OVR ${campaignAvgNumber()} · ${escapeHtml(mentalityLabel(c.mentality))}</div>
          </div>
          <span class="cup-vs-x">VS</span>
          <div class="cup-vs-side">
            <div class="hero-crest opp">${initials(opp.name)}</div>
            <div class="hero-name">${escapeHtml(opp.name)}</div>
            <div class="hero-tag">Over ${ladder.overRange[0]}-${ladder.overRange[1]}${isFinal ? "+" : ""}</div>
          </div>
        </div>
        <p class="cup-note">${
          isGroup
            ? "Fase de grupos: pontos, saldo e gols marcados definem sua colocação. Os 2 primeiros passam; alguns terceiros também."
            : isFinal
              ? "A GRANDE FINAL — se empatar, a taça será decidida nos pênaltis."
              : "Mata-mata em jogo único: empate leva a disputa para os pênaltis."
        }</p>
        <div class="lobby-actions"><button id="cup-play" class="primary big">Entrar em campo</button></div>
      </div>
    </div>`;
  document.getElementById("cup-exit")!.onclick = campaignExit;
  document.getElementById("cup-play")!.onclick = () => {
    c.phase = "match";
    render();
  };
}

function campaignAdvance() {
  const c = L.campaign!;
  L.playing = false;
  const r = c.lastResult!;
  addCampaignJourneyStats(r);
  if (c.round < 3) {
    recordGroupMatch("you", c.currentOpp!.id, r.youGoals, r.oppGoals);
    simulateOtherGroupFixture(c.round);
    if (c.round < 2) {
      c.round++;
      campaignBeginRound();
    } else {
      const sorted = groupTableSorted();
      const rank = sorted.findIndex((row) => row.id === "you") + 1;
      const youRow = sorted.find((row) => row.id === "you")!;
      c.groupQualified =
        rank <= 2 || (rank === 3 && bestThirdQualifies(youRow));
      c.groupQualifiedLabel = campaignQualificationLabel();
      if (c.groupQualified) {
        c.round = 3;
        setupKnockoutPath();
        campaignBeginRound();
      } else {
        c.phase = "gameover";
      }
    }
  } else if (r.outcome === "win") {
    if (c.round === 7) c.phase = "victory";
    else {
      c.round++;
      campaignBeginRound();
    }
  } else {
    c.phase = "gameover";
  }
  render();
}

function renderCampaignMatch() {
  const c = L.campaign!;
  const oppTeam = c.currentOpp!;
  const youSim = {
    id: "you",
    name: "Seu time",
    picks: c.picks,
    formationId: c.formationId,
    mentality: c.mentality,
  };
  const oppSim = simInputFromTeam(oppTeam, "4-3-3", "equilibrada");
  const r = simulateGauntletMatch(youSim, oppSim, c.round >= 3);
  c.lastResult = r;
  L.playing = true;

  app.innerHTML = `
    <div class="screen live cup-match">
      <div class="live-stage">
        <div class="scoreboard">
          <div class="sb-team"><span class="sb-badge you">VC</span><span class="sb-name">Seu time</span></div>
          <div class="sb-center"><div class="sb-score"><span id="sc-l">0</span><span class="sb-sep">:</span><span id="sc-r">0</span></div><div class="sb-clock"><span id="clk">0</span>'</div></div>
          <div class="sb-team right"><span class="sb-name">${escapeHtml(oppTeam.name)}</span><span class="sb-badge opp">ADV</span></div>
        </div>
        <div class="live-sub"><span class="sb-leg" id="half-label">1º Tempo</span><span class="agg-mini">${escapeHtml(WC_LADDER[c.round].label)}</span></div>
        <div class="ballfield">
          ${ballFieldSvg()}
          <div class="bf-ball" id="bf-ball">${soccerBallSvg()}</div>
        </div>
        <div class="speed-row">
          <span class="spd-label">Velocidade</span>
          ${[1, 1.5, 2].map((v) => `<button class="spd ${v === L.matchSpeed ? "active" : ""}" data-spd="${v}">${v}x</button>`).join("")}
          <button id="skip" class="ghost skip">Pular</button>
        </div>
        <div class="live-leaders" id="live-leaders"></div>
        <div class="shootout-panel" id="shootout-panel" hidden>
          <div class="shootout-head">
            <span>Disputa de pênaltis</span>
            <strong id="pen-score">0 x 0</strong>
          </div>
          <div class="shootout-lanes">
            <div>
              <h4>Seu time</h4>
              <ul id="pen-you"></ul>
            </div>
            <div>
              <h4>${escapeHtml(oppTeam.name)}</h4>
              <ul id="pen-opp"></ul>
            </div>
          </div>
        </div>
        <div class="goal-overlay" id="goal-ov"><div class="goal-word">GOL!</div><div class="goal-scorer" id="goal-scorer"></div></div>
        <ul class="event-feed" id="feed"></ul>
      </div>
    </div>`;

  const $ = (id: string) => document.getElementById(id)!;
  const scL = $("sc-l"),
    scR = $("sc-r"),
    clk = $("clk"),
    halfLabel = $("half-label"),
    feed = $("feed");
  const goalOv = $("goal-ov"),
    goalScorer = $("goal-scorer");
  const ball = $("bf-ball") as HTMLDivElement;
  const liveLeaders = $("live-leaders");
  const shootoutPanel = $("shootout-panel");
  const penScore = $("pen-score");
  const penYou = $("pen-you");
  const penOpp = $("pen-opp");
  const goals = { you: 0, opp: 0 };
  const liveStats = new Map<string, LiveStatLine>();
  renderLiveStats(liveLeaders, liveStats);
  let minute = 0,
    evIdx = 0,
    timer: number | undefined,
    hideTimer: number | undefined;

  const pidOf = (side: MatchEvent["side"]) =>
    side === "home" ? "you" : side === "away" ? "opp" : null;
  function updateScore() {
    scL.textContent = String(goals.you);
    scR.textContent = String(goals.opp);
  }
  function moveBall(ev: MatchEvent, dur: number) {
    if (ev.bx === undefined) return;
    ball.style.transitionDuration = `${Math.max(180, Math.min(1300, dur * 0.85))}ms`;
    ball.style.left = `${((ev.bx - 0.5) / 105) * 100}%`;
    ball.style.top = `${((ev.by! - 0.5) / 68) * 100}%`;
    ball.classList.toggle("goal", ev.type === "goal");
  }
  function addFeed(ev: MatchEvent) {
    const li = document.createElement("li");
    const cardCls =
      ev.type === "card" ? (ev.card === "red" ? " red" : " yellow") : "";
    li.className = `ev ${ev.type}${cardCls}`;
    const pos =
      ev.bx !== undefined
        ? `<span class="ev-pos">${ev.bx}-${ev.by}</span>`
        : "";
    li.innerHTML = `<span class="ev-min">${Math.min(ev.minute, 90)}'</span><span class="ev-tx">${escapeHtml(ev.text)}</span>${pos}`;
    feed.prepend(li);
  }
  function goalAnim(scorer?: string) {
    goalScorer.textContent = scorer ?? "";
    goalOv.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => goalOv.classList.remove("show"), 950);
  }
  function delayFor(ev: MatchEvent): number {
    switch (ev.type) {
      case "goal":
        return 1950;
      case "chance":
      case "save":
      case "corner":
      case "var":
        return 1100;
      case "card":
        return 880;
      case "possession":
        return 340;
      case "halftime":
      case "fulltime":
        return 650;
      case "info":
        return 780;
      default:
        return 760;
    }
  }
  function schedule(d: number, fn: () => void = tick) {
    clearTimeout(timer);
    timer = window.setTimeout(fn, d);
  }
  function tick() {
    if (!L.playing) return;
    if (evIdx < r.timeline.length && r.timeline[evIdx].minute <= minute) {
      const ev = r.timeline[evIdx++];
      const d = delayFor(ev);
      moveBall(ev, d);
      addFeed(ev);
      if (ev.type === "goal") {
        const p = pidOf(ev.side);
        if (p) goals[p as "you" | "opp"]++;
        if (p) {
          bumpStat(liveStats, ev.player, p, "goals");
          bumpStat(liveStats, ev.assist, p, "assists");
          renderLiveStats(liveLeaders, liveStats);
        }
        updateScore();
        goalAnim(ev.player);
      }
      schedule(d / L.matchSpeed);
      return;
    }
    if (minute >= 90) {
      if (r.shootout?.length) schedule(1000, playShootout);
      else schedule(1100, finish);
      return;
    }
    minute++;
    clk.textContent = String(Math.min(minute, 90));
    halfLabel.textContent = minute <= 45 ? "1º Tempo" : "2º Tempo";
    schedule(130 / L.matchSpeed);
  }
  function renderKick(kick: ShootoutKick, score: { you: number; opp: number }) {
    const side = kick.side === "home" ? "you" : "opp";
    if (kick.scored) score[side]++;
    penScore.textContent = `${score.you} x ${score.opp}`;
    const li = document.createElement("li");
    li.className = `pen-kick ${kick.scored ? "made" : "missed"}`;
    li.innerHTML = `<strong>${escapeHtml(kick.taker)}</strong><span>${kick.scored ? "converteu" : "perdeu"}</span>`;
    (side === "you" ? penYou : penOpp).appendChild(li);
  }
  function playShootout() {
    if (!r.shootout?.length) return finish();
    shootoutPanel.hidden = false;
    halfLabel.textContent = "Pênaltis";
    const score = { you: 0, opp: 0 };
    let kickIdx = 0;
    const nextKick = () => {
      if (!L.playing) return;
      const kick = r.shootout![kickIdx++];
      if (!kick) {
        schedule(1300, finish);
        return;
      }
      renderKick(kick, score);
      schedule(900 / L.matchSpeed, nextKick);
    };
    nextKick();
  }
  function finish() {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    campaignAdvance();
  }

  app.querySelectorAll<HTMLButtonElement>(".spd").forEach(
    (b) =>
      (b.onclick = () => {
        setMatchSpeed(Number(b.dataset.spd));
        app
          .querySelectorAll(".spd")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      }),
  );
  $("skip").onclick = () => finish();
  schedule(700);
}

function renderCampaignGameOver() {
  const c = L.campaign!;
  const r = c.lastResult!;
  const fellInGroup = c.groupQualified === false;
  const completed = fellInGroup ? 3 : c.round;
  const title = fellInGroup
    ? "Eliminado na fase de grupos"
    : `Eliminado em ${campaignStageLabel(c.round)}`;
  const detail = fellInGroup
    ? `Você terminou como ${c.groupQualifiedLabel}.`
    : r.penaltyScore
      ? `Empate contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals}. Nos pênaltis, ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}.`
      : `Resultado contra ${r.oppName}: ${r.youGoals} x ${r.oppGoals} (${r.outcome === "draw" ? "empate" : "derrota"}).`;
  const penLine = r.penaltyScore
    ? `<div class="cup-end-pens">Pênaltis ${r.penaltyScore[r.youId]} x ${r.penaltyScore[r.oppId]}</div>`
    : "";
  app.innerHTML = `
    <div class="screen cup-screen cup-end">
      <div class="cup-end-card lose">
        <span class="cup-tag">Game Over</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="cup-end-msg">${escapeHtml(detail)}</p>
        <div class="cup-end-score">${r.youGoals} <span class="x">x</span> ${r.oppGoals}${penLine}<div class="cup-end-opp">contra ${escapeHtml(r.oppName)}</div></div>
        ${renderCampaignJourneyLeaders()}
        ${fellInGroup ? renderGroupTable() : renderKnockoutBracket()}
        ${campaignProgress(completed)}
        <div class="lobby-actions">
          <button id="cup-retry" class="primary big">Tentar de novo</button>
          <button id="cup-exit" class="ghost">Sair</button>
        </div>
      </div>
    </div>`;
  document.getElementById("cup-retry")!.onclick = () => startCampaign();
  document.getElementById("cup-exit")!.onclick = campaignExit;
}

function renderCampaignVictory() {
  const c = L.campaign!;
  app.innerHTML = `
    <div class="screen cup-screen cup-end">
      <div class="cup-end-card win">
        <img class="cup-victory-trophy" src="/world_cup_trophy.png" alt="Troféu da Copa do Mundo" />
        <span class="cup-tag">Campeão do Mundo</span>
        <h1>CAMPEÃO DO MUNDO!</h1>
        <p class="cup-end-msg">Você passou pelo grupo como ${escapeHtml(c.groupQualifiedLabel ?? "classificado")} e venceu todo o mata-mata.</p>
        ${renderCampaignJourneyLeaders()}
        ${renderKnockoutBracket()}
        ${campaignProgress(8)}
        <div class="lobby-actions">
          <button id="cup-retry" class="primary big">Jogar de novo</button>
          <button id="cup-exit" class="ghost">Voltar ao início</button>
        </div>
      </div>
    </div>`;
  document.getElementById("cup-retry")!.onclick = () => startCampaign();
  document.getElementById("cup-exit")!.onclick = campaignExit;
}

// ---------------- Lobby / Setup ----------------

function renderLobby() {
  const s = L.state!;
  const you = me();
  const opp = opponent();
  const youReady = you?.ready;

  app.innerHTML = `
    <div class="screen lobby">
      <div class="topbar">
        <div class="room-code">Sala <strong>${s.code}</strong>
          <button id="copy" class="ghost">copiar</button>
        </div>
        <div class="mode-tag ${s.mode}">${s.mode === "pica" ? "Modo Pica" : "Modo Clássico"}</div>
      </div>

      <div class="players-status">
        ${playerChip(you, "Você")}
        ${opp ? playerChip(opp, "Adversário") : `<div class="chip waiting">Aguardando adversário…</div>`}
      </div>

      <h2>Escolha sua formação</h2>
      <div class="formation-grid">
        ${FORMATIONS.map(
          (f) =>
            `<button class="form-btn ${f.id === L.formationId ? "active" : ""}" data-form="${f.id}">${f.name}</button>`,
        ).join("")}
      </div>

      <div class="setup-cols">
        <div class="mini-pitch-wrap">
          ${renderPitch(getFormation(L.formationId)!, [], false)}
        </div>
        <div class="mentality-col">
          <h2>Mentalidade</h2>
          ${MENTALITIES.map(
            (m) => `
            <button class="ment-btn ${m.id === L.mentality ? "active" : ""}" data-ment="${m.id}">
              <strong>${m.name}</strong>
              <span>${m.desc}</span>
            </button>`,
          ).join("")}
        </div>
      </div>

      <div class="lobby-actions">
        <button id="ready" class="primary big ${youReady ? "done" : ""}" ${youReady ? "disabled" : ""}>
          ${youReady ? "✓ Pronto! Aguardando…" : "Confirmar e ficar pronto"}
        </button>
      </div>
    </div>
  `;

  app.querySelector<HTMLButtonElement>("#copy")!.onclick = () => {
    navigator.clipboard?.writeText(s.code);
    showToast("Código copiado!");
  };

  app.querySelectorAll<HTMLButtonElement>(".form-btn").forEach((btn) => {
    btn.onclick = () => {
      L.formationId = btn.dataset.form!;
      sendSetup(L.formationId, L.mentality);
      render();
    };
  });

  app.querySelectorAll<HTMLButtonElement>(".ment-btn").forEach((btn) => {
    btn.onclick = () => {
      L.mentality = btn.dataset.ment as Mentality;
      sendSetup(L.formationId, L.mentality);
      render();
    };
  });

  app.querySelector<HTMLButtonElement>("#ready")!.onclick = () => {
    sendSetup(L.formationId, L.mentality);
    sendReady();
  };
}

function playerChip(p: PlayerPublic | undefined, label: string): string {
  if (!p) return "";
  const form = p.formationId ?? "—";
  return `
    <div class="chip ${p.ready ? "ready" : ""} ${p.connected ? "" : "offline"}">
      <span class="chip-label">${label}</span>
      <strong>${escapeHtml(p.name)}</strong>
      <span class="chip-sub">${form} ${p.ready ? "• ✓ pronto" : "• escolhendo…"}</span>
    </div>
  `;
}

// ---------------- Draft ----------------

function renderDraft() {
  const s = L.state!;
  const you = me()!;
  const opp = opponent();
  const yourTurn = s.activePlayerId === L.youId;
  const team = s.currentTeam;
  const yourForm = getFormation(you.formationId!)!;
  const renderPlayerItem = (
    pl: NonNullable<typeof team>["players"][number],
  ) => {
    const taken = s.takenThisRound.includes(pl.name);
    const selected = L.selectedPlayer === pl.name;
    const clickable = yourTurn && !taken;
    return `
      <li class="pl-item ${taken ? "taken" : ""} ${selected ? "selected" : ""} ${clickable ? "clickable" : ""}"
          data-player="${escapeHtml(pl.name)}">
        <span class="pl-pos pos-${groupOf(pl.pos).toLowerCase()}">${posLabel(pl.pos)}</span>
        <span class="pl-name">${escapeHtml(pl.name)}</span>
        ${s.hideRatings ? `<span class="pl-rt hidden">??</span>` : `<span class="pl-rt">${pl.rating}</span>`}
        ${taken ? `<span class="pl-tick">✓</span>` : ""}
      </li>`;
  };

  app.innerHTML = `
    <div class="screen draft">
      <div class="topbar">
        <div class="room-code">Sala <strong>${s.code}</strong></div>
        <div class="round-info">Rodada <strong>${s.round + 1}</strong> / ${s.totalSlots}</div>
        <div class="turn-pill ${yourTurn ? "you" : "opp"}">
          ${yourTurn ? "Sua vez de escolher" : `Vez de ${escapeHtml(opp?.name ?? "adversário")}`}
        </div>
      </div>

      <div class="draft-layout">
        <!-- Seu time -->
        <section class="board you-board ${yourTurn ? "active-turn" : ""}">
          <h3>Seu time <span class="ovr">${avgLabel(you)}</span></h3>
          ${renderPitch(yourForm, you.picks, yourTurn && !!L.selectedPlayer, true)}
        </section>

        <!-- Time sorteado -->
        <section class="draw-panel ${yourTurn ? "your-turn" : ""}">
          <div class="draw-head">
            <span class="draw-label">Time sorteado</span>
            <h2>${team ? escapeHtml(`${team.name} ${team.season}`) : "—"}</h2>
            <span class="draw-league">${team?.league ?? ""}</span>
            ${
              s.pvpRerollsEnabled
                ? `<button id="reroll-team" class="ghost reroll" ${!yourTurn || (you.rerollsRemaining ?? 0) <= 0 ? "disabled" : ""}>
                    Atualizar time (${you.rerollsRemaining ?? 0})
                  </button>`
                : ""
            }
          </div>
          <ul class="player-list">
            ${team ? team.players.map(renderPlayerItem).join("") : ""}
          </ul>
          <p class="draft-hint">
            ${
              yourTurn
                ? L.selectedPlayer
                  ? `Agora clique numa <strong>vaga livre</strong> do seu campo para escalar <strong>${escapeHtml(L.selectedPlayer)}</strong>.`
                  : "Selecione um jogador da lista acima."
                : "Aguarde o adversário escolher…"
            }
          </p>
        </section>

        <!-- Adversário -->
        <section class="board opp-board ${!yourTurn ? "active-turn" : ""}">
          <h3>${escapeHtml(opp?.name ?? "Adversário")} <span class="ovr">${opp ? avgLabel(opp) : ""}</span></h3>
          ${opp && opp.formationId ? renderPitch(getFormation(opp.formationId)!, opp.picks, false, false, true) : ""}
        </section>
      </div>
    </div>
  `;

  // select a player
  app
    .querySelector<HTMLButtonElement>("#reroll-team")
    ?.addEventListener("click", () => {
      L.selectedPlayer = null;
      sendRerollTeam();
    });

  // select a player
  app.querySelectorAll<HTMLLIElement>(".pl-item.clickable").forEach((li) => {
    li.onclick = () => {
      L.selectedPlayer = li.dataset.player!;
      render();
    };
  });

  // click an open slot to field the player
  if (yourTurn && L.selectedPlayer) {
    app
      .querySelectorAll<HTMLElement>(".you-board .slot.empty")
      .forEach((slot) => {
        slot.onclick = () => {
          sendPick(slot.dataset.slot!, L.selectedPlayer!);
          L.selectedPlayer = null;
        };
      });
  }
}

function avgLabel(p: PlayerPublic): string {
  if (L.state?.hideRatings) return "OVR ??";
  if (!p.picks.length) return "";
  const avg =
    p.picks.reduce((a, b) => a + b.effectiveRating, 0) / p.picks.length;
  return `OVR ${Math.round(avg)}`;
}

// ---------------- Pitch ----------------

function renderPitch(
  formation: ReturnType<typeof getFormation> & {},
  picks: PlayerPublic["picks"],
  highlightEmpty = false,
  interactive = false,
  small = false,
  showPos = false,
): string {
  const bySlot = new Map(picks.map((p) => [p.slotId, p]));
  const nodes = formation.slots
    .map((slot) => {
      const pick = bySlot.get(slot.id);
      const filled = !!pick;
      const cls = filled ? "filled" : highlightEmpty ? "empty open" : "empty";
      const rating =
        pick && !L.state?.hideRatings
          ? `<span class="slot-rt">${pick.effectiveRating}</span>`
          : "";
      const penal =
        pick &&
        !L.state?.hideRatings &&
        pick.effectiveRating < pick.player.rating
          ? `<span class="slot-pen" title="Fora de posição">▼</span>`
          : "";
      const posTag =
        filled && showPos
          ? `<span class="slot-postag">${posLabel(slot.pos)}</span>`
          : "";
      const label = filled ? lastName(pick!.player.name) : posLabel(slot.pos);
      return `
        <div class="slot ${cls}" data-slot="${slot.id}"
             style="left:${slot.x}%; bottom:${slot.y}%">
          ${posTag}
          <div class="slot-dot pos-${groupOf(slot.pos).toLowerCase()}">
            ${rating}${penal}
          </div>
          <span class="slot-name">${escapeHtml(label)}</span>
        </div>`;
    })
    .join("");

  return `<div class="pitch ${small ? "small" : ""} ${interactive ? "interactive" : ""}">
    <div class="pitch-lines"></div>
    ${nodes}
  </div>`;
}

function reassignPicksToFormation(player: PlayerPublic, formationId: string) {
  const formation = getFormation(formationId);
  if (!formation || player.picks.length !== formation.slots.length) return null;

  const before =
    player.picks.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, player.picks.length);
  const remaining = [...player.picks];
  const next = formation.slots.map((slot) => {
    let bestIdx = 0;
    let bestRating = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const rating = effectiveRating(remaining[i].player, slot.pos);
      if (rating > bestRating) {
        bestRating = rating;
        bestIdx = i;
      }
    }
    const [pick] = remaining.splice(bestIdx, 1);
    return {
      ...pick,
      slotId: slot.id,
      effectiveRating: effectiveRating(pick.player, slot.pos),
    };
  });
  player.formationId = formationId;
  player.picks = next;
  const after =
    next.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, next.length);
  return Math.round((after - before) * 10) / 10;
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildIntervalBench(
  player: PlayerPublic,
): Array<Player & { fromTeamId: string }> {
  const pickedNames = new Set(player.picks.map((pick) => pick.player.name));
  const byName = new Map<string, Player & { fromTeamId: string }>();
  for (const pick of player.picks) {
    const team = getTeam(pick.fromTeamId);
    for (const reserve of team?.bench ?? []) {
      if (pickedNames.has(reserve.name)) continue;
      byName.set(`${pick.fromTeamId}:${reserve.name}`, {
        ...reserve,
        fromTeamId: pick.fromTeamId,
      });
    }
  }
  return shuffled([...byName.values()]).slice(0, 12);
}

function applyIntervalSubstitution(
  player: PlayerPublic,
  outSlotId: string,
  reserveName: string,
  bench = L.intervalBench ?? [],
) {
  const reserve = bench.find((p) => p.name === reserveName);
  const pickIdx = player.picks.findIndex((pick) => pick.slotId === outSlotId);
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const slot = formation?.slots.find((s) => s.id === outSlotId);
  if (!reserve || pickIdx < 0 || !slot) return null;

  const outgoing = player.picks[pickIdx];
  const nextRating = effectiveRating(reserve, slot.pos);
  player.picks[pickIdx] = {
    ...outgoing,
    player: reserve,
    fromTeamId: reserve.fromTeamId,
    effectiveRating: nextRating,
  };
  if (bench === L.intervalBench) {
    L.intervalBench =
      L.intervalBench?.filter((p) => p.name !== reserve.name) ?? null;
  }
  return {
    out: outgoing.player.name,
    in: reserve.name,
    delta: nextRating - outgoing.effectiveRating,
  };
}

function swapLineupSlots(player: PlayerPublic, slotA: string, slotB: string) {
  if (slotA === slotB) return null;
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const pickA = player.picks.find((pick) => pick.slotId === slotA);
  const pickB = player.picks.find((pick) => pick.slotId === slotB);
  const formationSlotA = formation?.slots.find((slot) => slot.id === slotA);
  const formationSlotB = formation?.slots.find((slot) => slot.id === slotB);
  if (!pickA || !pickB || !formationSlotA || !formationSlotB) return null;

  const oldTotal = pickA.effectiveRating + pickB.effectiveRating;
  const nextA = {
    ...pickB,
    slotId: slotA,
    effectiveRating: effectiveRating(pickB.player, formationSlotA.pos),
  };
  const nextB = {
    ...pickA,
    slotId: slotB,
    effectiveRating: effectiveRating(pickA.player, formationSlotB.pos),
  };
  player.picks = player.picks.map((pick) =>
    pick.slotId === slotA ? nextA : pick.slotId === slotB ? nextB : pick,
  );
  const delta = nextA.effectiveRating + nextB.effectiveRating - oldTotal;
  return {
    a: pickA.player.name,
    b: pickB.player.name,
    delta,
  };
}

function lastName(full: string): string {
  const parts = full.split(" ");
  return parts.length > 1 && parts[parts.length - 1].length > 2
    ? parts[parts.length - 1]
    : full;
}

// ---------------- Result ----------------

// dispatcher: play the live match, then show the summary
function renderResult() {
  if (!L.matchPlayed) {
    renderLiveMatch();
  } else {
    renderSummary();
  }
}

// ---------------- Live match (animated simulation) ----------------

const TICK_BASE_MS = 130; // ms per match "minute" at 1x

// Mini pitch (viewBox in meters: 105 x 68) with a light grid and standard markings.
function ballFieldSvg(): string {
  const grid: string[] = [];
  for (let x = 5; x < 105; x += 5)
    grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="68" class="bf-grid"/>`);
  for (let y = 5; y < 68; y += 5)
    grid.push(`<line x1="0" y1="${y}" x2="105" y2="${y}" class="bf-grid"/>`);
  return `
    <svg class="bf-svg" viewBox="0 0 105 68" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="105" height="68" class="bf-pitch"/>
      <g>${grid.join("")}</g>
      <g class="bf-lines">
        <rect x="0.5" y="0.5" width="104" height="67"/>
        <line x1="52.5" y1="0.5" x2="52.5" y2="67.5"/>
        <circle cx="52.5" cy="34" r="9.15" fill="none"/>
        <circle cx="52.5" cy="34" r="0.6" class="bf-spot"/>
        <rect x="0.5" y="13.84" width="16.5" height="40.32" fill="none"/>
        <rect x="88" y="13.84" width="16.5" height="40.32" fill="none"/>
        <rect x="0.5" y="24.84" width="5.5" height="18.32" fill="none"/>
        <rect x="99" y="24.84" width="5.5" height="18.32" fill="none"/>
        <circle cx="11" cy="34" r="0.6" class="bf-spot"/>
        <circle cx="94" cy="34" r="0.6" class="bf-spot"/>
      </g>
    </svg>`;
}

// Classic black/white soccer ball: a center pentagon and five rim pentagons
// clipped to the circle, with a spherical light/shadow overlay for a 3D look.
function soccerBallSvg(): string {
  const pent = (cx: number, cy: number, r: number, rot: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = ((rot + i * 72 - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
  const rim: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = ((i * 72 - 90) * Math.PI) / 180;
    rim.push(pent(50 + 46 * Math.cos(t), 50 + 46 * Math.sin(t), 14, i * 72));
  }
  return `
    <svg class="bf-ball-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="bfClip"><circle cx="50" cy="50" r="47.5"/></clipPath>
        <radialGradient id="bfShine" cx="34%" cy="28%" r="80%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.34"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47.5" fill="#f2f2f2"/>
      <g clip-path="url(#bfClip)" fill="#1a1a1a">
        <polygon points="${pent(50, 50, 15, 0)}"/>
        ${rim.map((p) => `<polygon points="${p}"/>`).join("")}
      </g>
      <circle cx="50" cy="50" r="47.5" fill="url(#bfShine)"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#c2c2c2" stroke-width="1"/>
    </svg>`;
}

function renderLiveMatch() {
  const s = L.state!;
  let r = s.result!;
  const you = me()!;
  const opp = opponent()!;
  const vsAI = s.players.some((p) => p.isAI);
  const speedFactor = () => (vsAI ? L.matchSpeed : 1);
  L.intervalBench ??= buildIntervalBench(you);
  L.playing = true;

  // map home/away side -> you/opponent
  const sideToPid = (side: "home" | "away" | null) =>
    side === "home" ? r.homeId : side === "away" ? r.awayId : "";

  app.innerHTML = `
    <div class="screen live">
      <div class="live-stage">
        <div class="scoreboard">
          <div class="sb-team"><span class="sb-badge you">VC</span><span class="sb-name">${escapeHtml(you.name)}</span></div>
          <div class="sb-center">
            <div class="sb-score"><span id="sc-l">0</span><span class="sb-sep">:</span><span id="sc-r">0</span></div>
            <div class="sb-clock"><span id="clk">0</span>'</div>
          </div>
          <div class="sb-team right"><span class="sb-name">${escapeHtml(opp.name)}</span><span class="sb-badge opp">ADV</span></div>
        </div>
        <div class="live-sub">
          <span class="sb-leg" id="half-label">1º Tempo</span>
          <span class="agg-mini" id="pen-label"></span>
        </div>
        <div class="ballfield">
          ${ballFieldSvg()}
          <div class="bf-ball" id="bf-ball">${soccerBallSvg()}</div>
        </div>
        <div class="speed-row">
          <span class="spd-label">Velocidade</span>
          ${(vsAI ? [1, 1.5, 2] : [1])
            .map(
              (v) =>
                `<button class="spd ${v === speedFactor() ? "active" : ""}" data-spd="${v}">${v}x</button>`,
            )
            .join("")}
          ${vsAI ? "" : `<span class="speed-note">Velocidade extra só contra a máquina</span>`}
          <button id="skip" class="ghost skip">Pular</button>
        </div>
        <div class="live-leaders" id="live-leaders"></div>
        <div class="halftime-panel" id="half-panel" hidden>
          <div class="section-head">
            <h3>Intervalo</h3>
            <span id="sub-count">Substituições 0/5</span>
          </div>
          <div class="half-controls">
            <label>Formação
              <select id="half-form">
                ${FORMATIONS.map((f) => `<option value="${f.id}" ${f.id === (you.formationId ?? L.formationId) ? "selected" : ""}>${f.name}</option>`).join("")}
              </select>
            </label>
            <label>Estilo
              <select id="half-ment">
                ${MENTALITIES.map((m) => `<option value="${m.id}" ${m.id === (you.mentality ?? L.mentality) ? "selected" : ""}>${m.name}</option>`).join("")}
              </select>
            </label>
            <button id="half-continue" class="primary">Voltar para o jogo</button>
          </div>
          <div class="halftime-squad">
            <div>
              <div id="half-pitch" class="half-pitch">
                ${renderPitch(getFormation(you.formationId ?? L.formationId)!, you.picks, false, false, true, true)}
              </div>
              <p id="sub-status" class="sub-status">Clique em um jogador no campo e depois escolha um reserva.</p>
            </div>
            <ul id="reserve-list" class="reserve-list"></ul>
          </div>
        </div>
        <div class="goal-overlay" id="goal-ov">
          <div class="goal-word">GOL!</div>
          <div class="goal-scorer" id="goal-scorer"></div>
        </div>
        <div class="card-overlay" id="card-ov">
          <div class="card-flash" id="card-flash"></div>
          <div class="card-name" id="card-name"></div>
        </div>
        <ul class="event-feed" id="feed"></ul>
      </div>
    </div>
  `;

  const scL = document.getElementById("sc-l")!;
  const scR = document.getElementById("sc-r")!;
  const clk = document.getElementById("clk")!;
  const halfLabel = document.getElementById("half-label")!;
  const penLabel = document.getElementById("pen-label")!;
  const feed = document.getElementById("feed")!;
  const goalOv = document.getElementById("goal-ov")!;
  const goalScorer = document.getElementById("goal-scorer")!;
  const halfPanel = document.getElementById("half-panel") as HTMLDivElement;
  const halfForm = document.getElementById("half-form") as HTMLSelectElement;
  const halfMent = document.getElementById("half-ment") as HTMLSelectElement;
  const halfContinue = document.getElementById(
    "half-continue",
  ) as HTMLButtonElement;
  const halfPitch = document.getElementById("half-pitch") as HTMLDivElement;
  const reserveList = document.getElementById(
    "reserve-list",
  ) as HTMLUListElement;
  const subStatus = document.getElementById(
    "sub-status",
  ) as HTMLParagraphElement;
  const subCount = document.getElementById("sub-count") as HTMLSpanElement;
  const cardOv = document.getElementById("card-ov")!;
  const cardFlash = document.getElementById("card-flash")!;
  const cardName = document.getElementById("card-name")!;
  const ball = document.getElementById("bf-ball") as HTMLDivElement;
  const liveLeaders = document.getElementById("live-leaders")!;
  const liveStats = new Map<string, LiveStatLine>();
  renderLiveStats(liveLeaders, liveStats);

  // engine coords have "home" attacking toward bx=105; rotate 180° if you are the
  // away player so YOUR team always attacks to the right on screen.
  const youAreAway = r.awayId === you.id;
  const displayCoord = (ev: MatchEvent) => {
    let bx = ev.bx ?? 53;
    let by = ev.by ?? 34;
    if (youAreAway) {
      bx = 106 - bx;
      by = 69 - by;
    }
    return { bx, by };
  };
  function moveBall(ev: MatchEvent, durationMs: number) {
    if (ev.bx === undefined) return;
    const { bx, by } = displayCoord(ev);
    ball.style.transitionDuration = `${Math.max(180, Math.min(1300, durationMs * 0.85))}ms`;
    ball.style.left = `${((bx - 0.5) / 105) * 100}%`;
    ball.style.top = `${((by - 0.5) / 68) * 100}%`;
    ball.classList.toggle("goal", ev.type === "goal");
  }

  const goals: Record<string, number> = { [you.id]: 0, [opp.id]: 0 };
  let minute = 0;
  let evIdx = 0;
  let timer: number | undefined;
  let hideTimer: number | undefined;

  function updateScore() {
    scL.textContent = String(goals[you.id]);
    scR.textContent = String(goals[opp.id]);
  }

  function addFeed(ev: MatchEvent) {
    const li = document.createElement("li");
    const cardCls =
      ev.type === "card" ? (ev.card === "red" ? " red" : " yellow") : "";
    li.className = `ev ${ev.type}${cardCls}`;
    const min = Math.min(ev.minute, 90);
    let posTag = "";
    if (ev.bx !== undefined) {
      const { bx, by } = displayCoord(ev);
      posTag = `<span class="ev-pos">${bx}-${by}</span>`;
    }
    li.innerHTML = `<span class="ev-min">${min}'</span><span class="ev-tx">${escapeHtml(ev.text)}</span>${posTag}`;
    feed.prepend(li);
  }

  function renderReserveList() {
    reserveList.innerHTML = (L.intervalBench ?? [])
      .map((p) => {
        const team = getTeam(p.fromTeamId);
        const selected = L.selectedSubIn === p.name ? " selected" : "";
        return `
          <li>
            <button class="reserve-option${selected}" data-reserve="${escapeHtml(p.name)}" ${L.intervalSubCount >= 5 ? "disabled" : ""}>
              <span class="pl-pos pos-${groupOf(p.pos).toLowerCase()}">${posLabel(p.pos)}</span>
              <span class="pl-name">${escapeHtml(p.name)}</span>
              <span class="pl-team">${escapeHtml(team ? `${team.name} ${team.season}` : "Reserva")}</span>
              ${s.hideRatings ? `<span class="pl-rt hidden">??</span>` : `<span class="pl-rt">${p.rating}</span>`}
            </button>
          </li>`;
      })
      .join("");
    reserveList
      .querySelectorAll<HTMLButtonElement>(".reserve-option")
      .forEach((btn) => {
        btn.onclick = () => {
          if (you.halftimeReady) return;
          if (L.intervalSubCount >= 5) return;
          L.selectedSubIn = btn.dataset.reserve ?? null;
          if (!L.selectedSubOut || !L.selectedSubIn) {
            subStatus.textContent =
              "Agora clique em um jogador no campo para definir quem sai.";
            renderReserveList();
            return;
          }
          const result = applyIntervalSubstitution(
            you,
            L.selectedSubOut,
            L.selectedSubIn,
          );
          if (!result) return;
          L.intervalSubCount++;
          L.selectedSubOut = null;
          L.selectedSubIn = null;
          refreshHalftimeSquad(
            `Sai ${result.out}, entra ${result.in} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe).`,
          );
        };
      });
  }

  function refreshHalftimeSquad(status?: string) {
    halfPitch.innerHTML = renderPitch(
      getFormation(you.formationId ?? L.formationId)!,
      you.picks,
      false,
      false,
      true,
      true,
    );
    halfPitch.querySelectorAll<HTMLElement>(".slot.filled").forEach((slot) => {
      slot.onclick = () => {
        if (you.halftimeReady) return;
        const clickedSlot = slot.dataset.slot ?? null;
        if (L.selectedSubOut && clickedSlot && !L.selectedSubIn) {
          const result = swapLineupSlots(you, L.selectedSubOut, clickedSlot);
          L.selectedSubOut = null;
          if (result) {
            refreshHalftimeSquad(
              `Troca de posição: ${result.a} e ${result.b} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe combinado).`,
            );
            return;
          }
        }
        if (L.intervalSubCount >= 5) return;
        L.selectedSubOut = clickedSlot;
        if (L.selectedSubOut && L.selectedSubIn) {
          const result = applyIntervalSubstitution(
            you,
            L.selectedSubOut,
            L.selectedSubIn,
          );
          if (!result) return;
          L.intervalSubCount++;
          L.selectedSubOut = null;
          L.selectedSubIn = null;
          refreshHalftimeSquad(
            `Sai ${result.out}, entra ${result.in} (${result.delta >= 0 ? "+" : ""}${result.delta} no encaixe).`,
          );
          return;
        }
        halfPitch
          .querySelectorAll(".slot")
          .forEach((el) => el.classList.remove("selected-sub"));
        slot.classList.add("selected-sub");
        const pick = you.picks.find((p) => p.slotId === L.selectedSubOut);
        if (pick) {
          const f = getFormation(you.formationId ?? L.formationId);
          const slotPos = f?.slots.find((s) => s.id === L.selectedSubOut)?.pos;
          const posInfo =
            slotPos && slotPos !== pick.player.pos
              ? `${posLabel(slotPos)}, natural ${posLabel(pick.player.pos)}`
              : slotPos
                ? posLabel(slotPos)
                : posLabel(pick.player.pos);
          subStatus.textContent = `${pick.player.name} (${posInfo}) selecionado. Clique em outro jogador para trocar de posição, ou escolha um reserva.`;
        } else {
          subStatus.textContent = "Escolha um reserva.";
        }
      };
    });
    subCount.textContent = `Substituições ${L.intervalSubCount}/5`;
    subStatus.textContent =
      status ??
      (L.intervalSubCount >= 5
        ? "Limite de 5 substituições usado."
        : "Clique em um jogador no campo e depois escolha um reserva.");
    renderReserveList();
  }

  function goalAnim(scorer: string | undefined) {
    goalScorer.textContent = scorer ?? "";
    goalOv.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => goalOv.classList.remove("show"), 950);
  }

  function cardAnim(ev: MatchEvent) {
    cardFlash.className =
      "card-flash " + (ev.card === "red" ? "red" : "yellow");
    cardName.textContent = `${ev.card === "red" ? "Vermelho" : "Amarelo"}${ev.player ? `: ${ev.player}` : ""}`;
    cardOv.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => cardOv.classList.remove("show"), 950);
  }

  function isGoalSetupEvent(ev: MatchEvent, nextEv: MatchEvent | undefined) {
    return (
      (ev.type === "info" || ev.type === "chance") &&
      nextEv?.type === "goal" &&
      nextEv.minute <= ev.minute + 1
    );
  }

  function eventDelay(ev: MatchEvent, isGoalSetup: boolean): number {
    if (isGoalSetup) return 2100;
    switch (ev.type) {
      case "goal":
        return 1950;
      case "chance":
      case "save":
      case "corner":
      case "var":
        return 1100;
      case "card":
        return 880;
      case "foul":
      case "offside":
      case "injury":
        return 820;
      case "info":
        return 780;
      case "possession":
        return 340;
      case "halftime":
      case "fulltime":
        return 650;
      default:
        return 680;
    }
  }

  function processEvent(ev: MatchEvent): number | null {
    const nextEv = r.timeline[evIdx];
    const isGoalSetup = isGoalSetupEvent(ev, nextEv);
    moveBall(ev, eventDelay(ev, isGoalSetup));

    if (ev.type === "goal") {
      const pid = sideToPid(ev.side);
      addFeed(ev);
      if (pid) goals[pid]++;
      if (pid) {
        const side = pid === you.id ? "you" : "opp";
        bumpStat(liveStats, ev.player, side, "goals");
        bumpStat(liveStats, ev.assist, side, "assists");
        renderLiveStats(liveLeaders, liveStats);
      }
      updateScore();
      goalAnim(ev.player);
    } else if (ev.type === "card") {
      addFeed(ev);
      cardAnim(ev);
    } else if (ev.type === "halftime" && !L.halftimeAdjusted) {
      addFeed(ev);
      showHalftimePanel();
      return null;
    } else {
      addFeed(ev);
    }

    return eventDelay(ev, isGoalSetup);
  }

  function tick() {
    if (!L.playing) return;

    if (evIdx < r.timeline.length && r.timeline[evIdx].minute <= minute) {
      const ev = r.timeline[evIdx++];
      const delay = processEvent(ev);
      if (delay === null) return;
      schedule(delay / speedFactor());
      return;
    }

    if (minute >= 90) {
      if (r.shootout && r.shootout.length) {
        schedule(1200, playShootout);
      } else {
        schedule(1200, finish);
      }
      return;
    }

    minute++;
    clk.textContent = String(Math.min(minute, 90));
    halfLabel.textContent = minute <= 45 ? "1º Tempo" : "2º Tempo";
    schedule(TICK_BASE_MS / speedFactor());
  }

  // penalty shootout revealed kick by kick
  function playShootout() {
    halfLabel.textContent = "Pênaltis";
    const kicks = r.shootout!;
    const pen: Record<string, number> = { [you.id]: 0, [opp.id]: 0 };
    let i = 0;
    const next = () => {
      if (!L.playing) return;
      if (i >= kicks.length) {
        schedule(900, finish);
        return;
      }
      const k = kicks[i++];
      const pid = k.side === "home" ? r.homeId : r.awayId;
      if (k.scored) pen[pid]++;
      const who = pid === you.id ? you.name : opp.name;
      addFeed({
        minute: 90,
        type: "penalty",
        side: k.side,
        text: `Pênalti de ${k.taker} (${who}): ${k.scored ? "no gol!" : "defendido!"}`,
      });
      penLabel.textContent = `Pênaltis ${pen[you.id]} - ${pen[opp.id]}`;
      schedule(750 / speedFactor(), next);
    };
    next();
  }

  function schedule(delay: number, fn: () => void = tick) {
    clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  }

  function showHalftimePanel() {
    L.halftimeAdjusted = true;
    halfPanel.hidden = false;
    refreshHalftimeSquad();
    let halftimeResumeStarted = false;

    const halftimeReadyCount = () =>
      L.state?.players.filter((p) => p.halftimeReady || p.isAI).length ?? 0;

    const allHalftimeReady = () =>
      !!L.state?.players.length &&
      L.state.players.every((p) => p.halftimeReady || p.isAI);

    function preserveLocalHalftimeChanges() {
      if (!L.state) return;
      L.state.players = L.state.players.map((p) => {
        if (p.id === you.id) return { ...you, halftimeReady: p.halftimeReady };
        if (opp.isAI && p.id === opp.id) {
          return { ...opp, halftimeReady: p.halftimeReady };
        }
        return p;
      });
    }

    function continueFromHalftime() {
      if (halftimeResumeStarted) return;
      halftimeResumeStarted = true;
      syncLiveUi = null;
      halfPanel.hidden = true;
      // re-read the result: the server has appended the second half (re-simulated
      // with the new lineups), so switch to the updated timeline before resuming.
      if (L.state?.result) r = L.state.result;
      const formationName =
        FORMATIONS.find((f) => f.id === halfForm.value)?.name ?? halfForm.value;
      const mentalityName =
        MENTALITIES.find((m) => m.id === halfMent.value)?.name ??
        halfMent.value;
      addFeed({
        minute: 46,
        type: "info",
        side: null,
        text: `Início do segundo tempo: ${formationName}, estilo ${mentalityName} e ${L.intervalSubCount}/5 substituições.`,
      });
      schedule(800);
    }

    function syncHalftimeReadyUi() {
      if (halfPanel.hidden) return;
      preserveLocalHalftimeChanges();
      const current = me();
      const ready = !!current?.halftimeReady;
      const readyCount = halftimeReadyCount();
      subCount.textContent = ready
        ? `Prontos ${readyCount}/${L.state?.players.length ?? 2}`
        : `Substituições ${L.intervalSubCount}/5 · Prontos ${readyCount}/${L.state?.players.length ?? 2}`;
      halfContinue.disabled = ready;
      halfContinue.classList.toggle("done", ready);
      halfForm.disabled = ready;
      halfMent.disabled = ready;
      reserveList
        .querySelectorAll<HTMLButtonElement>(".reserve-option")
        .forEach((btn) => {
          btn.disabled = ready || L.intervalSubCount >= 5;
        });
      halfPitch.classList.toggle("locked", ready);
      const secondHalfReady = !!L.state?.result?.secondHalfReady;
      halfContinue.textContent = allHalftimeReady()
        ? secondHalfReady
          ? "Voltando..."
          : "Preparando 2º tempo..."
        : ready
          ? "Aguardando adversário..."
          : "Voltar para o jogo";
      // only resume once the server has simulated and appended the second half
      if (allHalftimeReady() && secondHalfReady) continueFromHalftime();
    }

    syncLiveUi = syncHalftimeReadyUi;
    halfForm.onchange = () => {
      const ratingSwing = reassignPicksToFormation(you, halfForm.value);
      L.formationId = halfForm.value;
      L.selectedSubOut = null;
      const impact =
        ratingSwing === null
          ? "Formação atualizada."
          : ratingSwing > 0
            ? `Formação atualizada. Encaixe melhorou +${ratingSwing.toFixed(1)}.`
            : ratingSwing < 0
              ? `Formação atualizada. Encaixe caiu ${ratingSwing.toFixed(1)} por jogadores fora de posição.`
              : "Formação atualizada. Encaixe manteve o mesmo over efetivo.";
      refreshHalftimeSquad(impact);
      syncHalftimeReadyUi();
    };
    halfContinue.onclick = () => {
      if (you.halftimeReady) return;
      L.formationId = halfForm.value;
      L.mentality = halfMent.value as Mentality;
      you.formationId = L.formationId;
      you.mentality = L.mentality;
      you.halftimeReady = true;
      const current = me();
      if (current) {
        current.halftimeReady = true;
        current.formationId = L.formationId;
        current.mentality = L.mentality;
      }
      // send the updated lineup so the server re-simulates the 2nd half with it
      sendHalftimeReady({
        formationId: L.formationId,
        mentality: L.mentality,
        picks: you.picks.map((pk) => ({
          slotId: pk.slotId,
          name: pk.player.name,
          pos: pk.player.pos,
          rating: pk.player.rating,
          fromTeamId: pk.fromTeamId,
        })),
      });
      syncHalftimeReadyUi();
    };
    syncHalftimeReadyUi();
  }

  function finish() {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    syncLiveUi = null;
    L.playing = false;
    L.matchPlayed = true;
    render();
  }

  app.querySelectorAll<HTMLButtonElement>(".spd").forEach((btn) => {
    btn.onclick = () => {
      setMatchSpeed(Number(btn.dataset.spd));
      app.querySelectorAll(".spd").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
  document.getElementById("skip")!.onclick = () => finish();

  // clicking anywhere that isn't a player on the pitch or a reserve clears the selection
  document.querySelector(".live-stage")?.addEventListener("click", (e) => {
    if (!L.selectedSubOut && !L.selectedSubIn) return;
    const t = e.target as HTMLElement;
    if (t.closest(".slot.filled") || t.closest(".reserve-option")) return;
    L.selectedSubOut = null;
    L.selectedSubIn = null;
    refreshHalftimeSquad(
      "Seleção cancelada. Clique em um jogador para trocar de posição ou escolher um reserva.",
    );
  });

  schedule(700);
}

interface Leader {
  name: string;
  val: string;
  side: "you" | "opp";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Derive match leaders (top scorer, top assist, man of the match) from the timeline.
function computeLeaders(r: MatchResult, youId: string) {
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  const sideOf = new Map<string, "you" | "opp">();
  const tag = (sd: "home" | "away" | null) =>
    (sd === "home" ? r.homeId : r.awayId) === youId ? "you" : "opp";

  for (const e of r.timeline) {
    if (e.type !== "goal") continue;
    if (e.player) {
      goals.set(e.player, (goals.get(e.player) ?? 0) + 1);
      sideOf.set(e.player, tag(e.side));
    }
    if (e.assist) {
      assists.set(e.assist, (assists.get(e.assist) ?? 0) + 1);
      sideOf.set(e.assist, tag(e.side));
    }
  }

  const top = (m: Map<string, number>, unit: string): Leader | null => {
    let best: [string, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best
      ? {
          name: best[0],
          val: `${best[1]} ${unit}${best[1] > 1 ? "s" : ""}`,
          side: sideOf.get(best[0])!,
        }
      : null;
  };

  const scorer = top(goals, "gol");
  const assist = top(assists, "assistência");

  // man of the match: top scorer on the winning side, else its best-rated player
  const winnerSide: "you" | "opp" = r.winnerId === youId ? "you" : "opp";
  let motm: Leader | null = null;
  let motmGoals = 0;
  for (const [name, n] of goals) {
    if (sideOf.get(name) !== winnerSide) continue;
    if (n > motmGoals) {
      motmGoals = n;
      motm = { name, val: `${n} gol${n > 1 ? "s" : ""}`, side: winnerSide };
    }
  }
  if (!motm) {
    const winner = L.state!.players.find((p) =>
      winnerSide === "you" ? p.id === youId : p.id !== youId,
    );
    const best = [...(winner?.picks ?? [])].sort(
      (a, b) => b.effectiveRating - a.effectiveRating,
    )[0];
    if (best)
      motm = {
        name: best.player.name,
        val: `${best.effectiveRating} de over`,
        side: winnerSide,
      };
  }

  return { scorer, assist, motm };
}

function leaderCard(label: string, data: Leader | null): string {
  const ic = data
    ? `<div class="leader-ic ${data.side}">${initials(data.name)}</div>`
    : `<div class="leader-ic">–</div>`;
  return `
    <div class="leader-card">
      ${ic}
      <div class="leader-meta">
        <div class="leader-label">${label}</div>
        <div class="leader-name">${data ? escapeHtml(data.name) : "—"}</div>
        <div class="leader-val">${data ? data.val : "Sem destaque"}</div>
      </div>
    </div>`;
}

function eventLog(
  r: MatchResult,
  you: PlayerPublic,
  opp: PlayerPublic,
): string {
  const sideName = (side: "home" | "away" | null) => {
    if (side === "home") return r.homeId === you.id ? you.name : opp.name;
    if (side === "away") return r.awayId === you.id ? you.name : opp.name;
    return "";
  };

  const importantTypes = new Set<MatchEvent["type"]>([
    "goal",
    "card",
    "injury",
    "halftime",
    "fulltime",
  ]);
  const important = r.timeline.filter((ev) => importantTypes.has(ev.type));
  const renderEvents = (events: MatchEvent[]) =>
    events
      .map((ev) => {
        const cardCls =
          ev.type === "card" ? (ev.card === "red" ? " red" : " yellow") : "";
        const team = sideName(ev.side);
        return `
        <li class="ev ${ev.type}${cardCls}">
          <span class="ev-min">${Math.min(ev.minute, 90)}'</span>
          <span class="ev-tx">${escapeHtml(ev.text)}</span>
          ${team ? `<span class="ev-side">${escapeHtml(team)}</span>` : ""}
        </li>`;
      })
      .join("");

  const penalties = r.shootout
    ? r.shootout
        .map((kick) => {
          const pid = kick.side === "home" ? r.homeId : r.awayId;
          const team = pid === you.id ? you.name : opp.name;
          return `
            <li class="ev penalty">
              <span class="ev-min">PEN</span>
              <span class="ev-tx">Pênalti de ${escapeHtml(kick.taker)} (${escapeHtml(team)}): ${
                kick.scored ? "no gol!" : "defendido!"
              }</span>
            </li>`;
        })
        .join("")
    : "";

  return `
    <section class="match-log">
      <div class="section-head">
        <h3>Principais lances</h3>
        <span>${important.length + (r.shootout?.length ?? 0)} destaques</span>
      </div>
      <ul class="event-feed result-feed">
        ${renderEvents(important)}
        ${penalties}
      </ul>
      <button id="toggle-log" class="ghost log-toggle">Ver todos os lances</button>
      <div id="full-log" class="full-log" hidden>
        <div class="section-head compact">
          <h3>Todos os lances</h3>
          <span>${r.timeline.length + (r.shootout?.length ?? 0)} eventos</span>
        </div>
        <ul class="event-feed result-feed">
          ${renderEvents(r.timeline)}
          ${penalties}
        </ul>
      </div>
    </section>`;
}

function renderSummary() {
  const s = L.state!;
  const r = s.result!;
  const you = me()!;
  const opp = opponent()!;
  const youWon = r.winnerId === you.id;
  const outcome = youWon ? "win" : "lose";
  const ys = r.strengths[you.id];
  const os = r.strengths[opp.id];
  const { scorer, assist, motm } = computeLeaders(r, you.id);

  app.innerHTML = `
    <div class="screen result">
      <div class="match-hero">
        <div class="hero-team">
          <div class="hero-crest you">${initials(you.name)}</div>
          <div class="hero-name">${escapeHtml(you.name)}</div>
          <div class="hero-tag">${you.formationId ?? ""}</div>
        </div>
        <div class="hero-center">
          <span class="hero-pill ${outcome}">Final</span>
          <div class="hero-score">${r.goals[you.id]}<span class="dash">-</span>${r.goals[opp.id]}</div>
          <div class="hero-sub">Arena Pebol &middot; Partida única<br>${youWon ? "Você venceu" : "Você perdeu"}</div>
          ${
            r.penaltyScore
              ? `<div class="hero-pens">Pênaltis ${r.penaltyScore[you.id]} - ${r.penaltyScore[opp.id]}</div>`
              : ""
          }
        </div>
        <div class="hero-team">
          <div class="hero-crest opp">${initials(opp.name)}</div>
          <div class="hero-name">${escapeHtml(opp.name)}</div>
          <div class="hero-tag">${opp.formationId ?? ""}</div>
        </div>
      </div>

      <div class="leaders">
        ${leaderCard("Artilheiro", scorer)}
        ${leaderCard("Assistência", assist)}
        ${leaderCard("Craque do Jogo", motm)}
      </div>

      <div class="strength-cmp">
        ${strengthRow("Ataque", ys.attack, os.attack)}
        ${strengthRow("Meio", ys.midfield, os.midfield)}
        ${strengthRow("Defesa", ys.defense, os.defense)}
        ${strengthRow("Geral", ys.overall, os.overall, true)}
      </div>

      ${eventLog(r, you, opp)}

      <div class="result-squads">
        <div class="board"><h3>${escapeHtml(you.name)}</h3>${renderPitch(getFormation(you.formationId!)!, you.picks)}</div>
        <div class="board"><h3>${escapeHtml(opp.name)}</h3>${renderPitch(getFormation(opp.formationId!)!, opp.picks)}</div>
      </div>

      <div class="lobby-actions">
        <button id="rematch" class="primary big">Jogar de novo</button>
      </div>
    </div>
  `;

  app.querySelector<HTMLButtonElement>("#rematch")!.onclick = () =>
    sendRematch();
  app.querySelector<HTMLButtonElement>("#toggle-log")!.onclick = (ev) => {
    const full = document.getElementById("full-log")!;
    const btn = ev.currentTarget as HTMLButtonElement;
    full.hidden = !full.hidden;
    btn.textContent = full.hidden
      ? "Ver todos os lances"
      : "Ocultar lances completos";
  };
}

function strengthRow(
  label: string,
  a: number,
  b: number,
  bold = false,
): string {
  const max = Math.max(a, b, 1);
  return `
    <div class="srow ${bold ? "bold" : ""}">
      <div class="sbar left"><div class="fill" style="width:${(a / max) * 100}%"></div><span>${a.toFixed(1)}</span></div>
      <div class="slabel">${label}</div>
      <div class="sbar right"><div class="fill" style="width:${(b / max) * 100}%"></div><span>${b.toFixed(1)}</span></div>
    </div>`;
}

// ---------------- util ----------------

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

render();
