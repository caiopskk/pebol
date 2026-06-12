import type { Mentality } from "../types.js";

export interface Manager {
  name: string;
  club: string;
  mentality: Mentality;
  formationId: string;
}

// Real managers used as AI opponents. "estilo" maps to a mentality:
// agressivo -> aura, equilibrado -> equilibrada, defensivo -> retranca.
export const MANAGERS: Manager[] = [
  // Brasileirão
  { name: "Artur Jorge", club: "Botafogo", mentality: "aura", formationId: "4-2-4" },
  { name: "Abel Ferreira", club: "Palmeiras", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Leonardo Jardim", club: "Flamengo", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Juan Pablo Vojvoda", club: "Fortaleza", mentality: "aura", formationId: "4-3-3" },
  { name: "Roger Machado", club: "São Paulo", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Gabriel Milito", club: "Atlético-MG", mentality: "aura", formationId: "3-4-2-1" },
  { name: "Fernando Diniz", club: "Fluminense", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Renato Gaúcho", club: "Grêmio", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Eduardo Coudet", club: "Internacional", mentality: "aura", formationId: "4-1-3-2" },
  { name: "Rogério Ceni", club: "Bahia", mentality: "aura", formationId: "4-3-3" },
  { name: "António Oliveira", club: "Corinthians", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Álvaro Pacheco", club: "Vasco", mentality: "equilibrada", formationId: "3-4-3" },
  { name: "Cláudio Caçapa", club: "Cruzeiro", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Odair Hellmann", club: "Athletico-PR", mentality: "retranca", formationId: "4-3-3" },
  { name: "Jair Ventura", club: "Vitória", mentality: "retranca", formationId: "4-1-4-1" },
  { name: "Umberto Louzer", club: "Atlético-GO", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Pepa", club: "Sport Recife", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Jorginho", club: "Coritiba", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Lisca", club: "América-MG", mentality: "retranca", formationId: "4-2-3-1" },
  { name: "Guto Ferreira", club: "Goiás", mentality: "retranca", formationId: "4-2-3-1" },
  // Champions League
  { name: "Pep Guardiola", club: "Manchester City", mentality: "aura", formationId: "4-3-3" },
  { name: "Mikel Arteta", club: "Arsenal", mentality: "aura", formationId: "4-3-3" },
  { name: "Arne Slot", club: "Liverpool", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Unai Emery", club: "Aston Villa", mentality: "equilibrada", formationId: "4-4-2" },
  { name: "Hansi Flick", club: "Barcelona", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Diego Simeone", club: "Atlético de Madrid", mentality: "retranca", formationId: "5-3-2" },
  { name: "Michel", club: "Girona", mentality: "aura", formationId: "4-3-3" },
  { name: "Luis Enrique", club: "Paris Saint-Germain", mentality: "aura", formationId: "4-3-3" },
  { name: "Simone Inzaghi", club: "Inter de Milão", mentality: "equilibrada", formationId: "3-5-2" },
  { name: "Thiago Motta", club: "Juventus", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Paulo Fonseca", club: "Milan", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Gian Piero Gasperini", club: "Atalanta", mentality: "aura", formationId: "3-4-2-1" },
  { name: "Vincent Kompany", club: "Bayern de Munique", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Xabi Alonso", club: "Bayer Leverkusen", mentality: "equilibrada", formationId: "3-4-2-1" },
  { name: "Edin Terzić", club: "Borussia Dortmund", mentality: "equilibrada", formationId: "4-2-3-1" },
  { name: "Sebastian Hoeneß", club: "Stuttgart", mentality: "aura", formationId: "4-2-3-1" },
  { name: "Peter Bosz", club: "PSV Eindhoven", mentality: "aura", formationId: "4-3-3" },
];

export function randomManager(): Manager {
  return MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
}
