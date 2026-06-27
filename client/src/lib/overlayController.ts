import { ACHIEVEMENT_COPY } from "../../../shared/achievements.js";
import { setWriteRequestLock } from "../api.js";
import { overlays } from "../components/Overlays.js";
import { createNoticeQueue } from "./noticeQueue.js";

interface AchievementNotice {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface XpNotice {
  amount: number;
  reason: string;
  level: number;
  title: string;
}

const achievementNotices = createNoticeQueue<AchievementNotice>({
  set: (notice) => overlays.setAchievement(notice),
  durationMs: 4200,
});

const xpNotices = createNoticeQueue<XpNotice>({
  set: (notice) => overlays.setXp(notice),
  durationMs: 3200,
});

let toastTimer: number | undefined;
let writeLockCount = 0;

export function configureWriteLock() {
  setWriteRequestLock({
    begin: () => {
      writeLockCount += 1;
      overlays.setWriteLock(true);
    },
    end: () => {
      writeLockCount = Math.max(0, writeLockCount - 1);
      if (!writeLockCount) overlays.setWriteLock(false);
    },
  });
}

export function showToast(msg: string) {
  overlays.setToast(msg);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    overlays.setToast(null);
  }, 2600);
}

export function queueAchievementNotice(id: string) {
  const meta = ACHIEVEMENT_COPY[id] ?? {
    title: "Conquista desbloqueada",
    description: "Uma nova conquista foi adicionada ao seu perfil.",
    points: 0,
  };
  achievementNotices.push({ id, ...meta });
}

export function queueXpNotice(notice: XpNotice) {
  xpNotices.push(notice);
}
