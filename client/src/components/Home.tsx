import { useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { GameMode } from "../../../shared/types.js";
import type {
  AccountUser,
  LeaderboardEntry,
  UserProgress,
} from "../api.js";

interface HomeProps {
  account: AccountUser | null;
  progress: UserProgress | null;
  leaderboard: LeaderboardEntry[] | null;
  savedName: string;
  hardcoreUnlocked: boolean;
  hardcoreLockText: string;
  onCreateRoom: (name: string, mode: GameMode, solo: boolean) => void;
  onJoinRoom: (name: string, code: string) => void;
  onOpenLogin: () => void;
  onOpenAdmin: () => void;
  onOpenAchievements: () => void;
  onLogout: () => void;
  onWorldCup: () => void;
  onSoon: (mode: "carreira" | "liga") => void;
}

const card = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1 },
};

function rankClass(rank: number, isYou: boolean) {
  return `rank-${rank} ${rank <= 3 ? "podium" : ""} ${isYou ? "you" : ""}`;
}

export function Home({
  account,
  progress,
  leaderboard,
  savedName,
  hardcoreUnlocked,
  hardcoreLockText,
  onCreateRoom,
  onJoinRoom,
  onOpenLogin,
  onOpenAdmin,
  onOpenAchievements,
  onLogout,
  onWorldCup,
  onSoon,
}: HomeProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>("classico");
  const [roomTab, setRoomTab] = useState<"create" | "join">("create");
  const createNameRef = useRef<HTMLInputElement>(null);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreateRoom(String(data.get("name") ?? ""), selectedMode, false);
  };

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onJoinRoom(
      String(data.get("name") ?? ""),
      String(data.get("code") ?? ""),
    );
  };

  const solo = () => {
    onCreateRoom(createNameRef.current?.value ?? "", selectedMode, true);
  };

  return (
    <motion.div
      className="screen home"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.055, delayChildren: 0.03 }}
    >
      <motion.div className={`home-account-row ${account ? "signed" : "anonymous"}`} variants={card}>
        {account ? (
          <>
            <div className="home-account-card">
              <div className="ha-main">
                <span className="ha-kicker">Conta conectada</span>
                <strong>{account.username}</strong>
                <span>
                  {account.role === "admin" ? "Administrador" : "Usuário"} ·
                  {" "}Nível {progress?.level ?? 1} · {progress?.title ?? "Aspirante"}
                </span>
              </div>
            </div>
            <div className="home-account-actions">
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenAchievements} className="primary alt account-action">
                Progresso
              </motion.button>
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenAdmin} className="primary account-action">
                Gerenciar times
              </motion.button>
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} type="button" onClick={onLogout} className="primary alt account-action">
                Sair
              </motion.button>
            </div>
          </>
        ) : (
          <div className="home-account-actions">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} type="button" onClick={onOpenLogin} className="primary account-action">
              Entrar / Criar conta
            </motion.button>
          </div>
        )}
      </motion.div>

      <div className="cards home-board">
        <motion.div className="panel home-panel room-card" variants={card}>
          <div className="home-card-inner">
            <div className="room-tabs">
              <button
                type="button"
                className={`room-tab ${roomTab === "create" ? "active" : ""}`}
                onClick={() => setRoomTab("create")}
              >
                Criar sala
              </button>
              <button
                type="button"
                className={`room-tab ${roomTab === "join" ? "active" : ""}`}
                onClick={() => setRoomTab("join")}
              >
                Entrar numa sala
              </button>
            </div>
            <div className="room-panes">
              <form
                className={`room-pane ${roomTab === "create" ? "" : "hidden"}`}
                onSubmit={submitCreate}
              >
                <label htmlFor="c-name">Seu nome</label>
                <input ref={createNameRef} id="c-name" name="name" maxLength={20} placeholder="Insira seu nome" defaultValue={savedName} />
                <label>Modo de jogo</label>
                <div className="mode-pick">
                  <button
                    type="button"
                    className={`mode-btn ${selectedMode === "classico" ? "active" : ""}`}
                    data-mode="classico"
                    onClick={() => setSelectedMode("classico")}
                  >
                    <strong>Clássico</strong>
                    <span>Ratings visíveis</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${selectedMode === "hardcore" ? "active" : ""} ${hardcoreUnlocked ? "" : "locked"}`}
                    data-mode="hardcore"
                    disabled={!hardcoreUnlocked}
                    title={hardcoreUnlocked ? "Ratings ocultos" : hardcoreLockText}
                    onClick={() => {
                      if (hardcoreUnlocked) setSelectedMode("hardcore");
                    }}
                  >
                    <strong>Hardcore</strong>
                    <span>{hardcoreUnlocked ? "Ratings ocultos" : hardcoreLockText}</span>
                  </button>
                </div>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} id="c-create" className="primary">
                  Criar sala (online)
                </motion.button>
              </form>
              <form
                className={`room-pane ${roomTab === "join" ? "" : "hidden"}`}
                onSubmit={submitJoin}
              >
                <label htmlFor="j-name">Seu nome</label>
                <input id="j-name" name="name" maxLength={20} placeholder="Insira seu nome" defaultValue={savedName} />
                <label htmlFor="j-code">Código da sala</label>
                <input id="j-code" name="code" maxLength={4} placeholder="XXXX" style={{ textTransform: "uppercase" }} />
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} id="j-join" className="primary">
                  Entrar
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>

        <motion.div className="home-logo-tile" variants={card}>
          <img className="logo" src="/pebol_logo.png" alt="Pebol" />
          <p>Monte seu time no draft e desafie um amigo 1v1 ou jogue contra a máquina.</p>
        </motion.div>

        <motion.div className="panel solo-panel" variants={card}>
          <div className="solo-actions">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} id="c-solo" type="button" className="primary alt solo-action" onClick={solo}>
              Jogar sozinho (vs Máquina)
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} type="button" className="primary alt solo-action" onClick={() => onSoon("carreira")}>
              Modo carreira
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} type="button" className="primary alt solo-action" onClick={() => onSoon("liga")}>
              Modo liga
            </motion.button>
          </div>
        </motion.div>

        <motion.aside className="panel cup-panel" variants={card} whileHover={{ y: -2 }}>
          <img className="cup-panel-trophy" src="/world_cup_trophy.png" alt="Troféu da Copa do Mundo" />
          <span className="cup-tag">Modo solo</span>
          <h2>Copa do Mundo</h2>
          <p>Monte uma seleção no draft, dispute a fase de grupos e avance pelo chaveamento de 32 times até a final.</p>
          <ul className="cup-feature-list">
            <li>48 seleções</li>
            <li>Grupo + mata-mata</li>
            <li>Campanha offline</li>
          </ul>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} type="button" id="c-worldcup" className="primary cup-panel-action" onClick={onWorldCup}>
            Jogar campanha
          </motion.button>
        </motion.aside>

        <motion.section className="panel leaderboard-panel" variants={card}>
          <div className="leaderboard-head">
            <div>
              <span className="cup-tag">Ranking</span>
              <h2>Leaderboard por nível</h2>
            </div>
          </div>
          <ol className="leaderboard-list">
            {Array.from({ length: 10 }, (_, index) => {
              const rank = index + 1;
              const p = leaderboard?.[index];
              if (!p) {
                return (
                  <li key={`placeholder-${rank}`} className="placeholder">
                    <span className="rank">#{rank}</span>
                    <strong>{leaderboard === null ? "..." : "Vago"}</strong>
                    <em>Aguardando jogador</em>
                    <span className="level">Nv. --</span>
                    <span className="xp">-- XP</span>
                  </li>
                );
              }
              return (
                <motion.li
                  layout
                  key={p.userId}
                  className={rankClass(p.rank, account?.id === p.userId)}
                  whileHover={{ x: 2 }}
                >
                  <span className="rank">#{p.rank}</span>
                  <strong>{p.username}</strong>
                  <em>{p.title}</em>
                  <span className="level">Nv. {p.level}</span>
                  <span className="xp">{p.xp} XP</span>
                </motion.li>
              );
            })}
          </ol>
        </motion.section>
      </div>
    </motion.div>
  );
}
