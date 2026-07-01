import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface AchievementPopData {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface XpPopData {
  amount: number;
  reason: string;
  level: number;
  title: string;
}

interface OverlaysState {
  toast: string | null;
  writeLock: boolean;
  achievement: AchievementPopData | null;
  xp: XpPopData | null;
}

type Listener = (s: OverlaysState) => void;
let current: OverlaysState = {
  toast: null,
  writeLock: false,
  achievement: null,
  xp: null,
};
const listeners = new Set<Listener>();
function emit() {
  for (const l of listeners) l(current);
}

export const overlays = {
  setToast(msg: string | null) {
    current = { ...current, toast: msg };
    emit();
  },
  setWriteLock(visible: boolean) {
    current = { ...current, writeLock: visible };
    emit();
  },
  setAchievement(data: AchievementPopData | null) {
    current = { ...current, achievement: data };
    emit();
  },
  setXp(data: XpPopData | null) {
    current = { ...current, xp: data };
    emit();
  },
  hasAchievement(): boolean {
    return current.achievement !== null;
  },
  hasXp(): boolean {
    return current.xp !== null;
  },
};

function useOverlays(): OverlaysState {
  const [state, setState] = useState(current);
  useEffect(() => {
    const l: Listener = (s) => setState(s);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      key={message}
      className="toast"
      initial={{ opacity: 0, x: "-50%", y: 12 }}
      animate={{ opacity: 1, x: "-50%", y: 0 }}
      exit={{ opacity: 0, x: "-50%", y: 12 }}
      transition={{ duration: 0.18 }}
    >
      {message}
    </motion.div>
  );
}

function WriteLock({ visible }: { visible: boolean }) {
  return (
    <div
      className={`write-lock ${visible ? "active" : ""}`}
      role="status"
      aria-label="Salvando alterações"
      aria-live="polite"
      aria-hidden={visible ? "false" : "true"}
    >
      <div className="write-lock-card">
        <span className="write-spinner" aria-hidden="true">
          Pebol
        </span>
      </div>
    </div>
  );
}

function AchievementPop({ data }: { data: AchievementPopData }) {
  return (
    <motion.div
      key={data.id}
      className="achievement-pop"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.22 }}
      layout
    >
      <div className="achievement-pop-icon">✓</div>
      <div className="achievement-pop-copy">
        <span>Conquista desbloqueada</span>
        <strong>{data.title}</strong>
        <p>{data.description}</p>
      </div>
      <em>{data.points} XP</em>
    </motion.div>
  );
}

function XpPop({ data }: { data: XpPopData }) {
  return (
    <motion.div
      key={`${data.amount}-${data.reason}`}
      className="achievement-pop xp-pop"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.22 }}
      layout
    >
      <div className="achievement-pop-icon">XP</div>
      <div className="achievement-pop-copy">
        <span>Experiência</span>
        <strong>+{data.amount} XP</strong>
        <p>
          {data.reason} · Nível {data.level} — {data.title}
        </p>
      </div>
    </motion.div>
  );
}

export function Overlays() {
  const { toast, writeLock, achievement, xp } = useOverlays();
  return (
    <>
      <WriteLock visible={writeLock} />
      <AnimatePresence>{toast ? <Toast message={toast} /> : null}</AnimatePresence>
      <div className="notice-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {achievement ? <AchievementPop data={achievement} /> : null}
          {xp ? <XpPop data={xp} /> : null}
        </AnimatePresence>
      </div>
    </>
  );
}
