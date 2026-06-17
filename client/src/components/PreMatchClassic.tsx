import { motion } from "framer-motion";
import type {
  AttackFocus,
  GameMode,
  Mentality,
  PlayerPublic,
} from "../../../shared/types.js";
import { MENTALITIES } from "../../../shared/mentalities.js";
import { ATTACK_FOCUS_OPTIONS } from "./SetupBoard.js";
import { screenIn } from "../lib/motion.js";
import { TacticBannerList, type BannerSpec } from "./TacticBanner.js";

interface PreMatchClassicProps {
  code: string;
  mode: GameMode;
  vsAI: boolean;
  you: PlayerPublic;
  opponent?: PlayerPublic;
  youOvrText: string;
  oppOvrText: string;
  youMentalityLabel: string;
  youFocusLabel: string;
  oppMentalityLabel: string;
  oppFocusLabel: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  banners: BannerSpec[];
  onLeave: () => void;
  onSelectMentality: (mentality: Mentality) => void;
  onSelectFocus: (focus: AttackFocus) => void;
  onContinue: () => void;
}

export function PreMatchClassic({
  code,
  mode,
  vsAI,
  you,
  opponent,
  youOvrText,
  oppOvrText,
  youMentalityLabel,
  youFocusLabel,
  oppMentalityLabel,
  oppFocusLabel,
  mentality,
  attackFocus,
  banners,
  onLeave,
  onSelectMentality,
  onSelectFocus,
  onContinue,
}: PreMatchClassicProps) {
  const youReady = !!you.preMatchReady;
  const oppReady = !!opponent?.preMatchReady;
  const oppName = opponent?.name ?? "Adversário";
  const youFormation = you.formationId ?? "—";
  const oppFormation = opponent?.formationId ?? "—";

  return (
    <motion.div className="screen cup-screen cup-prematch-screen" {...screenIn}>
      <div className="topbar">
        {vsAI ? (
          <div className="room-code">
            Modo solo <strong>vs Máquina</strong>
          </div>
        ) : (
          <div className="room-code">
            Sala <strong>{code}</strong>
          </div>
        )}
        <div className={`mode-tag ${mode}`}>
          {mode === "hardcore" ? "Modo Hardcore" : "Modo Clássico"}
        </div>
        <button type="button" className="ghost" onClick={onLeave}>
          Sair
        </button>
      </div>
      <div className="cup-prematch-grid single">
        <div className="panel cup-prematch wide">
          <div className="cup-vs">
            <div className="cup-vs-side">
              <div className="hero-crest you">VC</div>
              <div className="hero-name">{you.name}</div>
              <div className="hero-tag">
                {youFormation} · {youOvrText} · {youMentalityLabel} · {youFocusLabel}
              </div>
            </div>
            <span className="cup-vs-x">VS</span>
            <div className="cup-vs-side">
              <div className="hero-crest opp">
                {(oppName[0] ?? "?").toUpperCase()}
              </div>
              <div className="hero-name">{oppName}</div>
              <div className="hero-tag">
                {oppFormation} · {oppOvrText} · {oppMentalityLabel} · {oppFocusLabel}
              </div>
            </div>
          </div>
          {banners.length ? (
            <div className="prematch-banners">
              <TacticBannerList banners={banners} />
            </div>
          ) : null}
          <div className="prematch-control-grid">
            <div className="prematch-ment">
              <span className="prematch-ment-label">Mentalidade (peso dobrado)</span>
              <div className="prematch-ment-row">
                {MENTALITIES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ment-chip ${m.id === mentality ? "active" : ""}`}
                    title={m.desc}
                    disabled={youReady}
                    onClick={() => onSelectMentality(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="prematch-ment">
              <span className="prematch-ment-label">Foco de ataque</span>
              <div className="prematch-ment-row">
                {ATTACK_FOCUS_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`focus-chip ${f.id === attackFocus ? "active" : ""}`}
                    title={f.desc}
                    disabled={youReady}
                    onClick={() => onSelectFocus(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lobby-actions">
            <button
              type="button"
              className={`primary big ${youReady ? "done" : ""}`}
              disabled={youReady}
              onClick={onContinue}
            >
              {youReady
                ? vsAI
                  ? "Carregando…"
                  : oppReady
                    ? "Carregando…"
                    : "✓ Pronto! Aguardando adversário…"
                : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
