export interface LevelProgress {
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  title: string;
  nextTitle: string | null;
  nextTitleLevel: number | null;
}

export const XP_PER_LEVEL = 100;
export const HARDCORE_UNLOCK_LEVEL = 5;

const LEVEL_TITLES = [
  { level: 1, title: "Aspirante" },
  { level: 10, title: "Promessa" },
  { level: 20, title: "Titular" },
  { level: 30, title: "Capitão" },
  { level: 40, title: "Craque" },
  { level: 50, title: "Ídolo" },
  { level: 60, title: "Maestro" },
  { level: 70, title: "Lenda" },
  { level: 80, title: "Campeão continental" },
  { level: 90, title: "Campeão do mundo" },
  { level: 100, title: "Imortal" },
];

export function titleForLevel(level: number): string {
  let current = LEVEL_TITLES[0].title;
  for (const item of LEVEL_TITLES) {
    if (level >= item.level) current = item.title;
    else break;
  }
  return current;
}

export function buildLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const levelStart = (level - 1) * XP_PER_LEVEL;
  const next = LEVEL_TITLES.find((item) => item.level > level) ?? null;
  return {
    xp: safeXp,
    level,
    currentLevelXp: safeXp - levelStart,
    nextLevelXp: XP_PER_LEVEL,
    title: titleForLevel(level),
    nextTitle: next?.title ?? null,
    nextTitleLevel: next?.level ?? null,
  };
}

