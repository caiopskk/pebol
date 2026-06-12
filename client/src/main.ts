import "./styles.css";
import type { RoomState, PlayerPublic, GameMode, Mentality, MatchResult, MatchEvent } from "../../shared/types.js";
import { FORMATIONS, getFormation, groupOf, posLabel } from "../../shared/formations.js";
import { MENTALITIES } from "../../shared/mentalities.js";
import {
  onRoomUpdate,
  onError,
  createRoom,
  joinRoom,
  sendSetup,
  sendReady,
  sendPick,
  sendRematch,
} from "./net.js";

const app = document.getElementById("app")!;

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
}

const L: Local = {
  youId: null,
  state: null,
  selectedPlayer: null,
  formationId: "4-3-3",
  mentality: "equilibrada",
  toast: null,
  matchPlayed: false,
  matchSpeed: 1,
  playing: false,
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
  // outside the result phase, reset the playback state
  if (L.state?.phase !== "result") {
    L.matchPlayed = false;
    L.playing = false;
  }
  // during live playback, don't re-render (preserve the animation)
  if (L.playing) {
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

// ---------------- Home ----------------

function renderHome() {
  app.innerHTML = `
    <div class="screen home">
      <header class="brand">
        <img class="logo" src="/pebol_logo.png" alt="Pebol" />
        <p>Monte seu time no draft e desafie um amigo 1v1.</p>
      </header>

      <div class="cards">
        <div class="panel">
          <h2>Criar sala</h2>
          <label>Seu nome</label>
          <input id="c-name" maxlength="20" placeholder="Ex: Caio" />
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
          <div class="or-sep"><span>ou</span></div>
          <button id="c-solo" class="primary alt">Jogar sozinho (vs Máquina)</button>
        </div>

        <div class="panel">
          <h2>Entrar numa sala</h2>
          <label>Seu nome</label>
          <input id="j-name" maxlength="20" placeholder="Ex: Léo" />
          <label>Código da sala</label>
          <input id="j-code" maxlength="4" placeholder="XXXX" style="text-transform:uppercase" />
          <button id="j-join" class="primary">Entrar</button>
        </div>
      </div>
    </div>
  `;

  let mode: GameMode = "classico";
  app.querySelectorAll<HTMLButtonElement>(".mode-btn").forEach((btn) => {
    btn.onclick = () => {
      app.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode as GameMode;
    };
  });

  const doCreate = async (solo: boolean) => {
    const name = (app.querySelector<HTMLInputElement>("#c-name")!.value || "").trim();
    if (!name) return showToast("Digite seu nome.");
    const res = await createRoom(name, mode, solo);
    if (res.ok && res.youId) {
      L.youId = res.youId;
    } else {
      showToast(res.error || "Erro ao criar sala.");
    }
  };
  app.querySelector<HTMLButtonElement>("#c-create")!.onclick = () => doCreate(false);
  app.querySelector<HTMLButtonElement>("#c-solo")!.onclick = () => doCreate(true);

  app.querySelector<HTMLButtonElement>("#j-join")!.onclick = async () => {
    const name = (app.querySelector<HTMLInputElement>("#j-name")!.value || "").trim();
    const code = (app.querySelector<HTMLInputElement>("#j-code")!.value || "").trim().toUpperCase();
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
          (f) => `<button class="form-btn ${f.id === L.formationId ? "active" : ""}" data-form="${f.id}">${f.name}</button>`
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
            </button>`
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
        <section class="board you-board">
          <h3>Seu time <span class="ovr">${avgLabel(you)}</span></h3>
          ${renderPitch(yourForm, you.picks, yourTurn && !!L.selectedPlayer, true)}
        </section>

        <!-- Time sorteado -->
        <section class="draw-panel">
          <div class="draw-head">
            <span class="draw-label">Time sorteado</span>
            <h2>${team ? escapeHtml(`${team.name} ${team.season}`) : "—"}</h2>
            <span class="draw-league">${team?.league ?? ""}</span>
          </div>
          <ul class="player-list">
            ${
              team
                ? team.players
                    .map((pl) => {
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
                    })
                    .join("")
                : ""
            }
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
        <section class="board opp-board">
          <h3>${escapeHtml(opp?.name ?? "Adversário")} <span class="ovr">${opp ? avgLabel(opp) : ""}</span></h3>
          ${opp && opp.formationId ? renderPitch(getFormation(opp.formationId)!, opp.picks, false, false, true) : ""}
        </section>
      </div>
    </div>
  `;

  // select a player
  app.querySelectorAll<HTMLLIElement>(".pl-item.clickable").forEach((li) => {
    li.onclick = () => {
      L.selectedPlayer = li.dataset.player!;
      render();
    };
  });

  // click an open slot to field the player
  if (yourTurn && L.selectedPlayer) {
    app.querySelectorAll<HTMLElement>(".you-board .slot.empty").forEach((slot) => {
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
  const avg = p.picks.reduce((a, b) => a + b.effectiveRating, 0) / p.picks.length;
  return `OVR ${Math.round(avg)}`;
}

// ---------------- Pitch ----------------

function renderPitch(
  formation: ReturnType<typeof getFormation> & {},
  picks: PlayerPublic["picks"],
  highlightEmpty = false,
  interactive = false,
  small = false
): string {
  const bySlot = new Map(picks.map((p) => [p.slotId, p]));
  const nodes = formation.slots
    .map((slot) => {
      const pick = bySlot.get(slot.id);
      const filled = !!pick;
      const cls = filled ? "filled" : highlightEmpty ? "empty open" : "empty";
      const rating =
        pick && !L.state?.hideRatings ? `<span class="slot-rt">${pick.effectiveRating}</span>` : "";
      const penal =
        pick && !L.state?.hideRatings && pick.effectiveRating < pick.player.rating
          ? `<span class="slot-pen" title="Fora de posição">▼</span>`
          : "";
      const label = filled ? lastName(pick!.player.name) : posLabel(slot.pos);
      return `
        <div class="slot ${cls}" data-slot="${slot.id}"
             style="left:${slot.x}%; bottom:${slot.y}%">
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

const TICK_BASE_MS = 125; // ms per match "minute" at 1x

function renderLiveMatch() {
  const s = L.state!;
  const r = s.result!;
  const you = me()!;
  const opp = opponent()!;
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
        <div class="speed-row">
          <span class="spd-label">Velocidade</span>
          ${[1, 1.5, 2]
            .map((v) => `<button class="spd ${v === L.matchSpeed ? "active" : ""}" data-spd="${v}">${v}x</button>`)
            .join("")}
          <button id="skip" class="ghost skip">Pular</button>
        </div>
        <ul class="event-feed" id="feed"></ul>
      </div>
      <div class="goal-overlay" id="goal-ov">
        <div class="goal-word">G<span>O</span>O<span>O</span>L!</div>
        <div class="goal-scorer" id="goal-scorer"></div>
      </div>
      <div class="card-overlay" id="card-ov"><div class="card-flash" id="card-flash"></div><div class="card-name" id="card-name"></div></div>
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
  const cardOv = document.getElementById("card-ov")!;
  const cardFlash = document.getElementById("card-flash")!;
  const cardName = document.getElementById("card-name")!;

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
    const cardCls = ev.type === "card" ? (ev.card === "red" ? " red" : " yellow") : "";
    li.className = `ev ${ev.type}${cardCls}`;
    const min = Math.min(ev.minute, 90);
    li.innerHTML = `<span class="ev-min">${min}'</span><span class="ev-tx">${escapeHtml(ev.text)}</span>`;
    feed.prepend(li);
  }

  function goalAnim(scorer: string | undefined) {
    goalScorer.textContent = scorer ?? "";
    goalOv.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => goalOv.classList.remove("show"), 1500);
  }

  function cardAnim(ev: MatchEvent) {
    cardFlash.className = "card-flash " + (ev.card === "red" ? "red" : "yellow");
    cardName.textContent = ev.player ?? "";
    cardOv.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => cardOv.classList.remove("show"), 900);
  }

  function tick() {
    if (!L.playing) return;
    minute++;
    clk.textContent = String(Math.min(minute, 90));
    halfLabel.textContent = minute <= 45 ? "1º Tempo" : "2º Tempo";
    let pause = 0;
    while (evIdx < r.timeline.length && r.timeline[evIdx].minute <= minute) {
      const ev = r.timeline[evIdx++];
      addFeed(ev);
      if (ev.type === "goal") {
        const pid = sideToPid(ev.side);
        if (pid) goals[pid]++;
        updateScore();
        goalAnim(ev.player);
        pause = Math.max(pause, 1500);
      } else if (ev.type === "card") {
        cardAnim(ev);
        pause = Math.max(pause, 850);
      } else if (ev.type === "halftime") {
        pause = Math.max(pause, 900);
      }
    }

    if (minute >= 90) {
      if (r.shootout && r.shootout.length) {
        schedule(1000, playShootout);
      } else {
        schedule(900, finish);
      }
      return;
    }
    schedule((pause || TICK_BASE_MS) / L.matchSpeed);
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
      schedule(750 / L.matchSpeed, next);
    };
    next();
  }

  function schedule(delay: number, fn: () => void = tick) {
    clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  }

  function finish() {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    L.playing = false;
    L.matchPlayed = true;
    render();
  }

  app.querySelectorAll<HTMLButtonElement>(".spd").forEach((btn) => {
    btn.onclick = () => {
      L.matchSpeed = Number(btn.dataset.spd);
      app.querySelectorAll(".spd").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
  document.getElementById("skip")!.onclick = () => finish();

  schedule(700);
}

interface Leader {
  name: string;
  val: string;
  side: "you" | "opp";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
    return best ? { name: best[0], val: `${best[1]} ${unit}${best[1] > 1 ? "s" : ""}`, side: sideOf.get(best[0])! } : null;
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
    const winner = L.state!.players.find((p) => (winnerSide === "you" ? p.id === youId : p.id !== youId));
    const best = [...(winner?.picks ?? [])].sort((a, b) => b.effectiveRating - a.effectiveRating)[0];
    if (best) motm = { name: best.player.name, val: `${best.effectiveRating} de over`, side: winnerSide };
  }

  return { scorer, assist, motm };
}

function leaderCard(label: string, data: Leader | null): string {
  const ic = data ? `<div class="leader-ic ${data.side}">${initials(data.name)}</div>` : `<div class="leader-ic">–</div>`;
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

function eventLog(r: MatchResult, you: PlayerPublic, opp: PlayerPublic): string {
  const sideName = (side: "home" | "away" | null) => {
    if (side === "home") return r.homeId === you.id ? you.name : opp.name;
    if (side === "away") return r.awayId === you.id ? you.name : opp.name;
    return "";
  };

  const timeline = r.timeline
    .map((ev) => {
      const cardCls = ev.type === "card" ? (ev.card === "red" ? " red" : " yellow") : "";
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
        <h3>Lances da partida</h3>
        <span>${r.timeline.length + (r.shootout?.length ?? 0)} eventos</span>
      </div>
      <ul class="event-feed result-feed">
        ${timeline}
        ${penalties}
      </ul>
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

  app.querySelector<HTMLButtonElement>("#rematch")!.onclick = () => sendRematch();
}

function strengthRow(label: string, a: number, b: number, bold = false): string {
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
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

render();
