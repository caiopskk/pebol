const MATCH_SPEED_KEY = "pebol:match-speed";
const MATCH_SPEEDS = [1, 1.5, 2];

export function normalizeMatchSpeed(speed: number): number {
  return MATCH_SPEEDS.includes(speed) ? speed : 1;
}

export function readSavedMatchSpeed(): number {
  return normalizeMatchSpeed(Number(localStorage.getItem(MATCH_SPEED_KEY)));
}

export function saveMatchSpeed(speed: number): number {
  const normalized = normalizeMatchSpeed(speed);
  localStorage.setItem(MATCH_SPEED_KEY, String(normalized));
  return normalized;
}
