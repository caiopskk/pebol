import type {
  AttackFocus,
  ManagerDashboard,
  ManagerFixture,
  ManagerFacilityKind,
  ManagerFacilityUpgradeOption,
  ManagerInboxItem,
  ManagerOpponentScout,
  ManagerPlayer,
  ManagerRoundResult,
  ManagerSave,
  ManagerSeasonPhase,
  ManagerSponsorOffer,
  ManagerStanding,
  ManagerStadiumUpgradeOption,
  ManagerTrainingFocus,
  ManagerTrainingPlan,
  ManagerBoardObjective,
  MatchResult,
  MatchEvent,
  Mentality,
  Player,
  PlayerPublic,
  RoomState,
  SquadPick,
  Team,
  TeamStrength,
} from "../../../shared/types.js";
import {
  continentalQualifications,
  fixturesForDivision,
  getLeagueDivision,
  getLeagueStructure,
  LEAGUE_STRUCTURES,
  promotionRelegationPlan,
  type LeagueDivision,
  type LeagueFixture,
  type LeagueTeamRef,
} from "../../../shared/leagueStructures.js";
import { TEAMS } from "../../../shared/data/teams.js";
import { CLUB_ALIASES } from "../../../shared/data/aliases.js";
import { FORMATIONS, getFormation } from "../../../shared/formations.js";
import {
  computeStrength,
  effectiveRating,
  simInputFromTeam,
  simulateFirstHalf,
  simulateGauntletMatch,
  simulateSecondHalf,
  type SimInput,
} from "../../../shared/engine.js";
import { managerPicks } from "./managerData.js";
import { managerConditionedPlayer } from "./managerFatigue.js";

const STORAGE_KEY = "pebol_manager_career_v1";
const START_MONEY = 25_000_000;
const START_STADIUM = 15_000;
const START_TICKET = 35;
const START_FORMATION = "4-3-3";
const EXPORT_KIND = "pebol-manager-career";
const EXPORT_VERSION = 1;
const SPONSORS = ["Pebol Bank", "Aurora Sports", "NorteBet", "VerdePay", "Atlântico Energia", "Prime Arena"];
const SPONSOR_OFFER_BRANDS = [
  "Pebol Bank",
  "Aurora Sports",
  "NorteBet",
  "VerdePay",
  "Atlântico Energia",
  "Prime Arena",
  "Canarinho Mobile",
  "Litoral Seguros",
  "Volta Redonda Tech",
  "SulBet Arena",
];

export interface ManagerStartTeam {
  id: string;
  name: string;
  season: string;
  league: string;
  leagueKey: string;
  leagueName: string;
  divisionName: string;
}

export interface ManagerCareerState {
  save: ManagerSave;
  phase: ManagerSeasonPhase;
  phaseRound: number;
  inbox: ManagerInboxItem[];
  squads: Record<string, ManagerPlayer[]>;
  standingsByDivision: Record<string, ManagerStanding[]>;
  leagueFixtures: LeagueFixture[];
  preseasonFixtures: LeagueFixture[];
  nationalCupFixtures: LeagueFixture[];
  continentalFixtures: LeagueFixture[];
  nationalCupChampionId: string | null;
  continentalQualifiedIds: string[];
  sponsorOffers: ManagerSponsorOffer[];
  sponsorOfferSeason: number;
  trainingFocus: ManagerTrainingFocus;
  playersDevelopedThisSeason: number;
  seasonStartMoney: number;
  leaguePositionTarget: number;
  lastSummary: string;
}

export interface ManagerCareerExport {
  kind: typeof EXPORT_KIND;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  state: ManagerCareerState;
}

export interface ManagerRoundSession {
  state: ManagerCareerState;
  room: RoomState;
  phaseFixtures: LeagueFixture[];
  fixtures: LeagueFixture[];
  userFixture: LeagueFixture;
  otherPlayed: ManagerRoundResult["fixtures"];
  settleDraw: boolean;
  expelled: Record<string, string[]>;
  initialUserStarterIds: string[];
  finalized: boolean;
}

export type ManagerRoundStart =
  | { state: ManagerCareerState; session: ManagerRoundSession; result?: never }
  | { state: ManagerCareerState; result: ManagerRoundResult; session?: never };

function careerStorageKey(userId?: string | null): string {
  return userId && userId !== "local" ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function hashStr(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFor(key: string): () => number {
  let a = hashStr(key);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function roundMoney(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function valueForRating(rating: number): number {
  return Math.round(((rating - 45) ** 2 * 12500 + 150000) / 1000) * 1000;
}

function teamScale(teamId: string, division: LeagueDivision): number {
  const giant = new Set([
    "flamengo", "palmeiras", "corinthians", "sao-paulo", "real-madrid", "barcelona",
    "man-city", "liverpool", "man-united", "bayern", "psg", "inter", "milan", "juventus",
  ]);
  const big = new Set([
    "botafogo", "fluminense", "atletico-mg", "gremio", "internacional", "cruzeiro", "vasco",
    "chelsea", "arsenal", "atletico-madrid", "dortmund", "benfica", "sporting", "braga",
  ]);
  const tier = division.tier === 1 ? 1 : 0.72;
  return giant.has(teamId) ? 1.55 * tier : big.has(teamId) ? 1.22 * tier : tier;
}

function commercialForStart(teamId: string, division: LeagueDivision) {
  const scale = teamScale(teamId, division);
  const sponsorTier = clamp(2 + scale * 2, 1, 5);
  return {
    prestige: clamp(48 + scale * 23, 35, 90),
    boardConfidence: 65,
    fanbase: clamp(120000 + scale * 780000, 60000, 2500000),
    supporterMembers: clamp(9000 + scale * 36000, 2500, 130000),
    sponsorName: SPONSORS[hashStr(teamId) % SPONSORS.length],
    sponsorTier,
    sponsorWeeklyIncome: Math.round((160000 + sponsorTier * 180000) * scale),
  };
}

function divisionForTeam(teamId: string): { leagueId: string; division: LeagueDivision } {
  for (const league of LEAGUE_STRUCTURES) {
    for (const division of league.divisions) {
      if (division.teams.some((team) => team.playableTeamId === teamId || team.id === teamId)) {
        return { leagueId: league.id, division };
      }
    }
  }
  return { leagueId: "brasil", division: getLeagueDivision("brasil-serie-a")! };
}

function playerCountryForTeam(teamId: string): string {
  return divisionForTeam(teamId).leagueId;
}

function playerMeta(player: Player, teamId: string, index: number) {
  const age = clamp((player.rating >= 86 ? 27 : player.rating >= 80 ? 25 : 23) + (index % 7) - 3, 17, 38);
  const growth = age <= 21 ? 8 : age <= 24 ? 5 : age <= 27 ? 2 : 0;
  return {
    age,
    countryOrigin: playerCountryForTeam(teamId),
    potentialRating: clamp(player.rating + growth, player.rating, 99),
    morale: 70,
    fitness: 92,
    sharpness: 62,
    developmentProgress: 0,
    injuryRounds: 0,
    suspensionMatches: 0,
  };
}

const SEEDED_TEAM_IDS = new Set(TEAMS.map((team) => team.id));

function playableIdForRef(team: LeagueTeamRef): string | null {
  return team.playableTeamId ?? (SEEDED_TEAM_IDS.has(team.id) ? team.id : null);
}

function managerPlayer(
  player: Player,
  teamId: string,
  teamName: string,
  index: number,
  starterSlotId: string | null,
): ManagerPlayer {
  const meta = playerMeta(player, teamId, index);
  return {
    id: `${teamId}:${index}:${player.name}`,
    teamId,
    originalTeamId: teamId,
    teamName,
    name: player.name,
    pos: player.pos,
    altPositions: player.altPositions,
    rating: player.rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    value: valueForRating(player.rating),
    isStarter: !!starterSlotId,
    lineupSlotId: starterSlotId,
    isListed: index >= 11 || player.rating < 76,
    individualInstructions: {},
    ...meta,
  };
}

function syntheticPlayers(team: LeagueTeamRef, division: LeagueDivision): Player[] {
  const rng = rngFor(team.id);
  const tierBase = division.tier === 1 ? 74 : 68;
  const playableBias = team.playableTeamId ? 3 : 0;
  const positions: Player["pos"][] = ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CAM", "RW", "ST", "LW", "GK", "CB", "CM", "LW", "ST", "RB", "CAM"];
  return positions.map((pos, index) => ({
    name: `${team.alias.split(" ")[0]} ${index < 11 ? "Titular" : "Reserva"} ${index + 1}`,
    pos,
    rating: clamp(tierBase + playableBias + (index < 11 ? 2 : -3) + Math.floor(rng() * 8), 52, 84),
  }));
}

function teamPlayers(team: LeagueTeamRef, division: LeagueDivision): Player[] {
  const seededId = playableIdForRef(team);
  const real = seededId ? TEAMS.find((t) => t.id === seededId) : undefined;
  return real ? [...real.players, ...(real.bench ?? [])] : syntheticPlayers(team, division);
}

function teamAlias(team: LeagueTeamRef): string {
  const seededId = playableIdForRef(team);
  return seededId ? (CLUB_ALIASES[seededId] ?? team.alias) : team.alias;
}

function buildSquads(division: LeagueDivision, userTeamId: string): Record<string, ManagerPlayer[]> {
  const slots = getFormation(START_FORMATION)!.slots;
  const squads: Record<string, ManagerPlayer[]> = {};
  for (const team of division.teams) {
    const teamId = playableIdForRef(team) ?? team.id;
    const alias = teamAlias(team);
    squads[teamId] = teamPlayers(team, division).map((player, index) =>
      managerPlayer(player, teamId, alias, index, teamId === userTeamId && index < 11 ? slots[index].id : null),
    );
  }
  return squads;
}

function buildLeagueSquads(leagueId: string, userTeamId: string): Record<string, ManagerPlayer[]> {
  const league = getLeagueStructure(leagueId);
  return Object.assign(
    {},
    ...(league?.divisions ?? [divisionForTeam(userTeamId).division]).map((division) =>
      buildSquads(division, userTeamId),
    ),
  );
}

function hydrateManagerCareer(state: ManagerCareerState): ManagerCareerState {
  const generatedSquads = buildLeagueSquads(state.save.leagueId, state.save.teamId);
  state.squads = { ...generatedSquads, ...state.squads };
  const division = currentDivision(state);
  const defaults = commercialForStart(state.save.teamId, division);
  state.inbox ??= [];
  state.save.prestige ??= defaults.prestige;
  state.save.boardConfidence ??= defaults.boardConfidence;
  state.save.fanbase ??= defaults.fanbase;
  state.save.supporterMembers ??= defaults.supporterMembers;
  state.save.sponsorName ??= defaults.sponsorName;
  state.save.sponsorTier ??= defaults.sponsorTier;
  state.save.sponsorWeeklyIncome ??= defaults.sponsorWeeklyIncome;
  state.sponsorOffers ??= [];
  state.sponsorOfferSeason ??= state.save.season;
  state.trainingFocus ??= "balanced";
  state.playersDevelopedThisSeason ??= 0;
  state.seasonStartMoney ??= state.save.money;
  state.leaguePositionTarget ??= leaguePositionTarget(state);
  for (const squad of Object.values(state.squads)) {
    for (const player of squad) {
      player.fitness ??= 92;
      player.sharpness ??= 62;
      player.developmentProgress ??= 0;
      player.injuryRounds ??= 0;
      player.suspensionMatches ??= 0;
    }
  }
  if (!state.standingsByDivision[state.save.divisionId]) {
    state.standingsByDivision[state.save.divisionId] = standingsForDivision(division);
  }
  if (!state.preseasonFixtures?.length) state.preseasonFixtures = preseasonFixtures(state);
  if (!state.nationalCupFixtures?.length) state.nationalCupFixtures = nationalCupFixtures(state);
  if (!state.leagueFixtures?.length) state.leagueFixtures = fixturesForDivision(currentDivision(state));
  return state;
}

function transferWindowOpen(state: ManagerCareerState): boolean {
  return state.phase === "preseason";
}

function inboxId(state: ManagerCareerState, type: string): string {
  return `${type}-${state.save.season}-${state.phase}-${state.phaseRound}-${state.inbox.length + 1}`;
}

function addInbox(
  state: ManagerCareerState,
  item: Omit<ManagerInboxItem, "id" | "createdAt" | "unread">,
): void {
  state.inbox = [
    {
      ...item,
      id: inboxId(state, item.type),
      createdAt: Date.now(),
      unread: true,
    },
    ...(state.inbox ?? []),
  ].slice(0, 24);
}

function supporterIncome(state: ManagerCareerState): number {
  return Math.round(state.save.supporterMembers * (18 + state.save.prestige / 8));
}

function sponsorIncome(state: ManagerCareerState): number {
  return Math.round(state.save.sponsorWeeklyIncome * (0.82 + state.save.prestige / 330));
}

function projectedHomeIncome(state: ManagerCareerState): number {
  const demand = clamp(state.save.prestige + state.save.boardConfidence / 3, 35, 118) / 118;
  const attendance = Math.round(state.save.stadiumCapacity * Math.min(0.98, 0.45 + demand * 0.45));
  return Math.round(attendance * state.save.ticketPrice);
}

function commercialSnapshot(state: ManagerCareerState) {
  return {
    reputation: state.save.prestige,
    supporterMembers: state.save.supporterMembers,
    supporterIncome: supporterIncome(state),
    sponsorName: state.save.sponsorName,
    sponsorIncome: sponsorIncome(state),
    projectedHomeIncome: projectedHomeIncome(state),
  };
}

const TRAINING_PLANS: ManagerTrainingPlan[] = [
  {
    id: "balanced",
    name: "Equilibrado",
    description: "Mantém condição, ritmo e evolução em níveis seguros.",
    fitnessEffect: 3,
    sharpnessEffect: 3,
    developmentEffect: 4,
    injuryRiskLabel: "Normal",
  },
  {
    id: "recovery",
    name: "Recuperação",
    description: "Reduz carga, recupera titulares e diminui o risco médico.",
    fitnessEffect: 9,
    sharpnessEffect: -2,
    developmentEffect: 1,
    injuryRiskLabel: "Muito baixo",
  },
  {
    id: "physical",
    name: "Físico",
    description: "Melhora resistência e desenvolvimento, com carga mais agressiva.",
    fitnessEffect: 5,
    sharpnessEffect: 1,
    developmentEffect: 6,
    injuryRiskLabel: "Alto",
  },
  {
    id: "tactical",
    name: "Tático",
    description: "Aumenta ritmo e preparação imediata para o próximo adversário.",
    fitnessEffect: 1,
    sharpnessEffect: 8,
    developmentEffect: 2,
    injuryRiskLabel: "Baixo",
  },
  {
    id: "development",
    name: "Desenvolvimento",
    description: "Prioriza jovens e potencial, sacrificando parte da recuperação.",
    fitnessEffect: 1,
    sharpnessEffect: 3,
    developmentEffect: 10,
    injuryRiskLabel: "Normal",
  },
];

function leaguePositionTarget(state: ManagerCareerState): number {
  const size = currentDivision(state).teams.length;
  if (state.save.prestige >= 82) return 1;
  if (state.save.prestige >= 70) return Math.min(4, size);
  if (state.save.prestige >= 58) return Math.min(8, size);
  return Math.max(1, size - Math.max(2, currentDivision(state).relegationSlots));
}

function managerBoardObjectives(state: ManagerCareerState): ManagerBoardObjective[] {
  const position = Math.max(1, currentStandings(state).findIndex((row) => row.teamId === state.save.teamId) + 1);
  const seasonFinished = state.phase === "season-end";
  const financeTarget = Math.round(state.seasonStartMoney * 0.82);
  return [
    {
      id: "league",
      title: `Terminar entre os ${state.leaguePositionTarget}`,
      description: "A campanha na liga é a principal medida da diretoria.",
      progressLabel: `${position}º lugar agora`,
      completed: position <= state.leaguePositionTarget,
      failed: seasonFinished && position > state.leaguePositionTarget,
    },
    {
      id: "development",
      title: "Evoluir um atleta",
      description: "Transforme treino e estrutura em pelo menos +1 de overall.",
      progressLabel: `${state.playersDevelopedThisSeason}/1 evolução`,
      completed: state.playersDevelopedThisSeason >= 1,
      failed: seasonFinished && state.playersDevelopedThisSeason < 1,
    },
    {
      id: "finance",
      title: "Preservar o caixa",
      description: "Feche a temporada com pelo menos 82% do orçamento inicial.",
      progressLabel: `${moneyText(state.save.money)} de ${moneyText(financeTarget)}`,
      completed: state.save.money >= financeTarget,
      failed: seasonFinished && state.save.money < financeTarget,
    },
  ];
}

export function managerFacilityUpgradeOptions(state: ManagerCareerState): ManagerFacilityUpgradeOption[] {
  const options: Array<{ kind: ManagerFacilityKind; title: string; description: string; benefit: string; level: number }> = [
    {
      kind: "training",
      title: "Centro de treinamento",
      description: "Campos, análise de desempenho e preparação individual.",
      benefit: "+20% de evolução e mais ritmo por nível",
      level: state.save.trainingCenterLevel,
    },
    {
      kind: "medical",
      title: "Departamento médico",
      description: "Prevenção, diagnóstico e recuperação de atletas.",
      benefit: "Menos lesões e recuperação mais rápida",
      level: state.save.medicalDepartmentLevel,
    },
    {
      kind: "academy",
      title: "Divisão de base",
      description: "Captação regional e formação de novos talentos.",
      benefit: "Regens melhores a cada nova temporada",
      level: state.save.youthAcademyLevel,
    },
  ];
  return options.map((option) => ({
    id: option.kind,
    title: option.title,
    description: option.description,
    currentLevel: option.level,
    nextLevel: Math.min(5, option.level + 1),
    cost: option.level >= 5 ? 0 : roundMoney((2_400_000 + option.level * 2_100_000) * teamScale(state.save.teamId, currentDivision(state))),
    benefit: option.benefit,
    maxed: option.level >= 5,
  }));
}

export function managerStadiumUpgradeOptions(state: ManagerCareerState): ManagerStadiumUpgradeOption[] {
  const capacity = state.save.stadiumCapacity;
  const scale = teamScale(state.save.teamId, currentDivision(state));
  const capacityCost = 650 + capacity / 115;
  return [
    {
      id: "arquibancada-modular",
      kind: "capacity",
      title: "Arquibancada modular",
      description: "Aumenta a lotação com obra rápida e pouco impacto comercial.",
      cost: roundMoney(2_150_000 + 2500 * capacityCost * scale),
      capacityGain: 2500,
      ticketPriceGain: 0,
      supporterBoost: 650,
      sponsorIncomeBoostPct: 0,
      prestigeGain: 1,
      boardConfidenceGain: 0,
    },
    {
      id: "anel-superior",
      kind: "capacity",
      title: "Anel superior",
      description: "Obra grande para clubes que querem crescer bilheteria no longo prazo.",
      cost: roundMoney(5_900_000 + 7000 * capacityCost * scale),
      capacityGain: 7000,
      ticketPriceGain: 1,
      supporterBoost: 1400,
      sponsorIncomeBoostPct: 1,
      prestigeGain: 2,
      boardConfidenceGain: -1,
    },
    {
      id: "hospitalidade-vip",
      kind: "premium",
      title: "Setor VIP e camarotes",
      description: "Menos lugares novos, mas melhora preço médio, prestígio e patrocínio.",
      cost: roundMoney(4_350_000 + capacity * 92 * scale),
      capacityGain: 900,
      ticketPriceGain: 5,
      supporterBoost: 450,
      sponsorIncomeBoostPct: 5,
      prestigeGain: 2,
      boardConfidenceGain: 1,
    },
    {
      id: "experiencia-torcedor",
      kind: "comfort",
      title: "Experiência do torcedor",
      description: "Acessos, bares e tecnologia para converter público em sócio torcedor.",
      cost: roundMoney(3_150_000 + capacity * 68 * scale),
      capacityGain: 500,
      ticketPriceGain: 2,
      supporterBoost: 2200,
      sponsorIncomeBoostPct: 2,
      prestigeGain: 1,
      boardConfidenceGain: 2,
    },
    {
      id: "midia-arena",
      kind: "commercial",
      title: "Mídia da arena",
      description: "Painéis, naming assets e ativações que valorizam contratos comerciais.",
      cost: roundMoney(2_850_000 + capacity * 54 * scale),
      capacityGain: 0,
      ticketPriceGain: 1,
      supporterBoost: 300,
      sponsorIncomeBoostPct: 8,
      prestigeGain: 1,
      boardConfidenceGain: 1,
    },
  ];
}

function sponsorOffersForSeason(state: ManagerCareerState): ManagerSponsorOffer[] {
  const rng = rngFor(`sponsor-offers:${state.save.teamId}:${state.save.season}:${state.save.prestige}:${state.save.boardConfidence}`);
  const currentBase = Math.max(state.save.sponsorWeeklyIncome, 320000);
  const appeal = 0.92 + state.save.prestige / 210 + state.save.supporterMembers / 900000;
  const nextBrand = (slot: number) => SPONSOR_OFFER_BRANDS[
    (Math.floor(rng() * SPONSOR_OFFER_BRANDS.length) + slot * 3 + state.save.season) % SPONSOR_OFFER_BRANDS.length
  ];
  const tierBase = clamp(1 + state.save.prestige / 21, 1, 5);
  return [
    {
      id: `seguro-${state.save.season + 1}`,
      name: nextBrand(0),
      tier: clamp(tierBase, 1, 5),
      weeklyIncome: roundMoney(currentBase * (0.9 + rng() * 0.12) * appeal),
      signingBonus: roundMoney(currentBase * (1.6 + rng())),
      durationSeasons: 2,
      description: "Contrato estável, boa luva inicial e baixa pressão por resultado.",
      riskLabel: "Seguro",
    },
    {
      id: `crescimento-${state.save.season + 1}`,
      name: nextBrand(1),
      tier: clamp(tierBase + 1, 1, 5),
      weeklyIncome: roundMoney(currentBase * (1.08 + rng() * 0.18) * appeal),
      signingBonus: roundMoney(currentBase * (0.75 + rng() * 0.5)),
      durationSeasons: 1,
      description: "Paga melhor por rodada e acompanha clubes em alta, mas oferece luva menor.",
      riskLabel: "Crescimento",
    },
    {
      id: `impacto-${state.save.season + 1}`,
      name: nextBrand(2),
      tier: clamp(tierBase + 1, 1, 5),
      weeklyIncome: roundMoney(currentBase * (0.78 + rng() * 0.14) * appeal),
      signingBonus: roundMoney(currentBase * (3.2 + rng() * 1.4)),
      durationSeasons: 1,
      description: "Muito dinheiro imediato para reforços, com receita recorrente menor.",
      riskLabel: "Impacto",
    },
  ];
}

function generateSponsorOffers(state: ManagerCareerState): void {
  state.sponsorOffers = sponsorOffersForSeason(state);
  state.sponsorOfferSeason = state.save.season + 1;
  addInbox(state, {
    type: "sponsor",
    title: "Novas propostas de patrocínio",
    body: `A área comercial recebeu ${state.sponsorOffers.length} propostas para a próxima temporada. Compare luva, receita por rodada e perfil de risco antes de assinar.`,
  });
}

function applyOperatingRevenue(state: ManagerCareerState, fixture: LeagueFixture): number {
  const base = supporterIncome(state) + sponsorIncome(state);
  const gate = fixture.homeTeamId === state.save.teamId ? projectedHomeIncome(state) : 0;
  const total = base + gate;
  state.save.money += total;
  return total;
}

function updateCommercialMood(state: ManagerCareerState, gf: number, ga: number, knockoutWin = false): void {
  const delta = gf > ga || knockoutWin ? 2 : gf === ga ? 0 : -3;
  state.save.prestige = clamp(state.save.prestige + delta, 20, 99);
  state.save.boardConfidence = clamp(state.save.boardConfidence + delta * 2, 5, 99);
  state.save.supporterMembers = clamp(
    state.save.supporterMembers + Math.round(state.save.supporterMembers * (delta / 220)),
    1000,
    250000,
  );
  state.save.fanbase = clamp(
    state.save.fanbase + Math.round(state.save.fanbase * (delta / 450)),
    25000,
    5000000,
  );
  const oldTier = state.save.sponsorTier;
  const newTier = clamp(1 + state.save.prestige / 20, 1, 5);
  if (newTier !== oldTier) {
    state.save.sponsorTier = newTier;
    state.save.sponsorWeeklyIncome = Math.round(state.save.sponsorWeeklyIncome * (newTier > oldTier ? 1.12 : 0.9));
  }
}

function leaguePrizeForPosition(state: ManagerCareerState): number {
  const table = currentStandings(state);
  const pos = table.findIndex((row) => row.teamId === state.save.teamId) + 1;
  const scale = teamScale(state.save.teamId, currentDivision(state));
  if (pos === 1) return Math.round(18_000_000 * scale);
  if (pos <= 4) return Math.round(7_500_000 * scale);
  if (pos <= 8) return Math.round(3_000_000 * scale);
  return Math.round(750_000 * scale);
}

function awardPrize(state: ManagerCareerState, title: string, amount: number): void {
  if (amount <= 0) return;
  state.save.money += amount;
  addInbox(state, {
    type: "finance",
    title,
    body: `A diretoria confirmou a entrada de ${moneyText(amount)} em premiação. Esse valor não depende de vitória isolada, e sim da campanha na competição.`,
  });
}

function moneyText(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function maybeGenerateTransferEmails(state: ManagerCareerState): void {
  const key = `${state.save.season}-${state.phaseRound}-${state.save.teamId}`;
  const rng = rngFor(key);
  const otherTeams = currentDivision(state).teams
    .map((team) => ({ id: team.playableTeamId ?? team.id, name: teamAlias(team) }))
    .filter((team) => team.id !== state.save.teamId);
  const from = otherTeams[Math.floor(rng() * otherTeams.length)];
  if (transferWindowOpen(state)) {
    const squad = (state.squads[state.save.teamId] ?? [])
      .filter((player) => !player.isStarter || player.rating >= 78)
      .sort((a, b) => b.value - a.value);
    const player = squad[Math.floor(rng() * Math.max(1, Math.min(squad.length, 8)))];
    if (player && from && rng() > 0.35) {
      const amount = Math.round(player.value * (1.05 + rng() * 0.42) / 1000) * 1000;
      addInbox(state, {
        type: "player_offer",
        title: `Proposta por ${player.name}`,
        body: `${from.name} enviou uma proposta de ${moneyText(amount)}. Você pode aceitar ou recusar até o fim da janela.`,
        playerId: player.id,
        playerName: player.name,
        fromTeamId: from.id,
        fromTeamName: from.name,
        amount,
      });
    }
  }
  if ((transferWindowOpen(state) || state.phase === "season-end") && state.save.prestige >= 62 && rng() > 0.72) {
    const target = otherTeams[Math.floor(rng() * otherTeams.length)];
    if (target) {
      addInbox(state, {
        type: "manager_offer",
        title: `Contato de ${target.name}`,
        body: `${target.name} quer conversar com você para assumir o projeto esportivo. Aceitar troca seu clube atual no save.`,
        targetTeamId: target.id,
        targetTeamName: target.name,
      });
    }
  }
}

function blankStanding(teamId: string, teamName: string): ManagerStanding {
  return {
    teamId,
    teamName,
    played: 0,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function sortStandings(rows: ManagerStanding[]): ManagerStanding[] {
  return [...rows].sort((a, b) =>
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.teamName.localeCompare(b.teamName),
  );
}

function standingsForDivision(division: LeagueDivision): ManagerStanding[] {
  return division.teams.map((team) =>
    blankStanding(playableIdForRef(team) ?? team.id, teamAlias(team)),
  );
}

function fixtureToManager(fixture: LeagueFixture): ManagerFixture {
  return {
    round: fixture.round,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeName: fixture.homeName,
    awayName: fixture.awayName,
  };
}

function tacticFor(teamId: string): { formationId: string; mentality: Mentality; attackFocus: AttackFocus } {
  const h = hashStr(teamId);
  const formations = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "3-5-2"];
  const mentalities: Mentality[] = ["equilibrada", "pressao", "posse", "contra_ataque", "retranca"];
  const focuses: AttackFocus[] = ["equilibrado", "lados", "meio"];
  return {
    formationId: formations[h % formations.length],
    mentality: mentalities[(h >>> 8) % mentalities.length],
    attackFocus: focuses[(h >>> 16) % focuses.length],
  };
}

function playerAvailable(player: ManagerPlayer): boolean {
  return player.injuryRounds <= 0 && player.suspensionMatches <= 0;
}

function ensureAvailableUserLineup(state: ManagerCareerState): void {
  const squad = state.squads[state.save.teamId] ?? [];
  const formation = getFormation(state.save.formationId) ?? FORMATIONS[0];
  const slotIds = new Set(formation.slots.map((slot) => slot.id));
  const occupied = new Set<string>();
  for (const player of squad) {
    if (!player.isStarter || !player.lineupSlotId || !slotIds.has(player.lineupSlotId) || !playerAvailable(player) || occupied.has(player.lineupSlotId)) {
      player.isStarter = false;
      player.lineupSlotId = null;
      continue;
    }
    occupied.add(player.lineupSlotId);
  }
  for (const slot of formation.slots.filter((candidate) => !occupied.has(candidate.id))) {
    const replacement = squad
      .filter((player) => !player.isStarter && playerAvailable(player))
      .sort((a, b) => effectiveRating(b, slot.pos) - effectiveRating(a, slot.pos) || b.fitness - a.fitness)[0];
    if (!replacement) break;
    replacement.isStarter = true;
    replacement.lineupSlotId = slot.id;
    occupied.add(slot.id);
  }
}

function autoTeam(players: ManagerPlayer[], teamId: string, teamName: string, formationId: string): Team {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const slots = getFormation(formationId)?.slots ?? FORMATIONS[0].slots;
  const used = new Set<string>();
  return {
    id: teamId,
    name: teamName,
    season: "",
    league: "Manager",
    players: slots.map((slot) => {
      let best = sorted.find((p) => !used.has(p.id)) ?? sorted[0];
      let bestScore = -1;
      for (const candidate of sorted) {
        if (used.has(candidate.id)) continue;
        const score = effectiveRating(candidate, slot.pos);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      used.add(best.id);
      return best;
    }),
    bench: sorted.filter((p) => !used.has(p.id)).slice(0, 7),
  };
}

function simInput(state: ManagerCareerState, teamId: string): SimInput {
  const squad = state.squads[teamId] ?? [];
  if (teamId === state.save.teamId) {
    const formation = getFormation(state.save.formationId) ?? FORMATIONS[0];
    const picks = managerPicks(formation, squad.map(managerConditionedPlayer));
    if (picks.length === 11) {
      return {
        id: teamId,
        name: state.save.teamName,
        picks,
        formationId: state.save.formationId,
        mentality: state.save.mentality,
        attackFocus: state.save.attackFocus,
      };
    }
  }
  const standing = currentStandings(state).find((s) => s.teamId === teamId);
  const tactic = tacticFor(teamId);
  return {
    ...simInputFromTeam(autoTeam(squad, teamId, standing?.teamName ?? squad[0]?.teamName ?? teamId, tactic.formationId), tactic.formationId, tactic.mentality),
    attackFocus: tactic.attackFocus,
  };
}

function publicFromSimInput(input: SimInput, isAI: boolean): PlayerPublic {
  return {
    id: input.id,
    name: input.name,
    connected: true,
    isAI,
    ready: true,
    preMatchReady: true,
    halftimeReady: isAI,
    formationId: input.formationId,
    mentality: input.mentality,
    attackFocus: input.attackFocus,
    picks: input.picks,
  };
}

function simInputFromPublic(player: PlayerPublic): SimInput {
  return {
    id: player.id,
    name: player.name,
    picks: player.picks,
    formationId: player.formationId ?? START_FORMATION,
    mentality: player.mentality ?? "equilibrada",
    attackFocus: player.attackFocus ?? "equilibrado",
  };
}

function winnerFromScore(fixture: LeagueFixture, homeGoals: number, awayGoals: number): string | null {
  if (homeGoals > awayGoals) return fixture.homeTeamId;
  if (awayGoals > homeGoals) return fixture.awayTeamId;
  return null;
}

function managerPlayerIdFromPick(state: ManagerCareerState, pick: SquadPick): string | null {
  const withId = pick.player as Player & { id?: string };
  if (withId.id) return withId.id;
  const squad = state.squads[state.save.teamId] ?? [];
  return squad.find((player) =>
    player.name === pick.player.name &&
    player.pos === pick.player.pos &&
    player.rating === pick.player.rating
  )?.id ?? null;
}

function applyUserLineupFromPicks(
  state: ManagerCareerState,
  formationId: string,
  mentality: Mentality,
  attackFocus: AttackFocus,
  picks: SquadPick[],
): void {
  const slotByPlayerId = new Map<string, string>();
  for (const pick of picks) {
    const playerId = managerPlayerIdFromPick(state, pick);
    if (playerId) slotByPlayerId.set(playerId, pick.slotId);
  }
  state.save.formationId = formationId;
  state.save.mentality = mentality;
  state.save.attackFocus = attackFocus;
  state.squads[state.save.teamId] = (state.squads[state.save.teamId] ?? []).map((player) => ({
    ...player,
    isStarter: slotByPlayerId.has(player.id),
    lineupSlotId: slotByPlayerId.get(player.id) ?? null,
  }));
}

function applyStanding(rows: ManagerStanding[], teamId: string, gf: number, ga: number): ManagerStanding[] {
  return sortStandings(rows.map((row) => {
    if (row.teamId !== teamId) return row;
    const wins = row.wins + (gf > ga ? 1 : 0);
    const draws = row.draws + (gf === ga ? 1 : 0);
    const losses = row.losses + (gf < ga ? 1 : 0);
    const goalsFor = row.goalsFor + gf;
    const goalsAgainst = row.goalsAgainst + ga;
    return {
      ...row,
      played: row.played + 1,
      points: row.points + (gf > ga ? 3 : gf === ga ? 1 : 0),
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
    };
  }));
}

function currentDivision(state: ManagerCareerState): LeagueDivision {
  return getLeagueDivision(state.save.divisionId) ?? getLeagueDivision("brasil-serie-a")!;
}

function currentStandings(state: ManagerCareerState): ManagerStanding[] {
  return state.standingsByDivision[state.save.divisionId] ?? [];
}

function preseasonFixtures(state: ManagerCareerState): LeagueFixture[] {
  const division = currentDivision(state);
  const teams = division.teams
    .map((team) => ({ id: playableIdForRef(team) ?? team.id, name: teamAlias(team) }))
    .filter((team) => team.id !== state.save.teamId)
    .slice(0, 4);
  return teams.map((team, index) => ({
    round: index + 1,
    leg: 1,
    homeTeamId: index % 2 === 0 ? state.save.teamId : team.id,
    awayTeamId: index % 2 === 0 ? team.id : state.save.teamId,
    homeName: index % 2 === 0 ? state.save.teamName : team.name,
    awayName: index % 2 === 0 ? team.name : state.save.teamName,
  }));
}

function nationalCupFixtures(state: ManagerCareerState): LeagueFixture[] {
  const league = getLeagueStructure(state.save.leagueId);
  const teams = league?.divisions.flatMap((division) =>
    division.teams.slice(0, 8).map((team) => ({ id: playableIdForRef(team) ?? team.id, name: teamAlias(team) })),
  ) ?? [];
  const unique = [...new Map(teams.map((team) => [team.id, team])).values()].slice(0, 16);
  if (!unique.some((team) => team.id === state.save.teamId)) {
    unique[unique.length - 1] = { id: state.save.teamId, name: state.save.teamName };
  }
  return unique.flatMap((team, index, arr) => {
    if (index % 2 || !arr[index + 1]) return [];
    return [{
      round: 1,
      leg: 1 as const,
      homeTeamId: team.id,
      awayTeamId: arr[index + 1].id,
      homeName: team.name,
      awayName: arr[index + 1].name,
    }];
  });
}

function continentalFixtures(state: ManagerCareerState): LeagueFixture[] {
  const ids = state.continentalQualifiedIds.slice(0, 8);
  return ids.flatMap((id, index) => {
    if (index % 2 || !ids[index + 1]) return [];
    const home = currentStandings(state).find((s) => s.teamId === id);
    const away = currentStandings(state).find((s) => s.teamId === ids[index + 1]);
    return [{
      round: 1,
      leg: 1 as const,
      homeTeamId: id,
      awayTeamId: ids[index + 1],
      homeName: home?.teamName ?? id,
      awayName: away?.teamName ?? ids[index + 1],
    }];
  });
}

export function managerStartTeams(): ManagerStartTeam[] {
  return LEAGUE_STRUCTURES.flatMap((league) =>
    league.divisions.flatMap((division) =>
      division.teams
        .map((team) => ({ team, teamId: playableIdForRef(team) }))
        .filter((entry): entry is { team: LeagueTeamRef; teamId: string } => !!entry.teamId)
        .map(({ team, teamId }) => ({
          id: teamId,
          name: teamAlias(team),
          season: "2025",
          league: `${league.alias} - ${division.alias}`,
          leagueKey: division.id,
          leagueName: league.alias,
          divisionName: division.alias,
        })),
    ),
  );
}

export function createManagerCareer(teamId: string, userId = "local"): ManagerCareerState {
  const { leagueId, division } = divisionForTeam(teamId);
  const teamRef = division.teams.find((team) => team.playableTeamId === teamId || team.id === teamId)!;
  const standings = standingsForDivision(division);
  const commercial = commercialForStart(teamId, division);
  const state: ManagerCareerState = {
    save: {
      id: crypto.randomUUID(),
      userId,
      teamId,
      teamName: teamAlias(teamRef),
      money: START_MONEY,
      stadiumCapacity: START_STADIUM,
      ticketPrice: START_TICKET,
      season: 1,
      round: 1,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      prestige: commercial.prestige,
      boardConfidence: commercial.boardConfidence,
      supporterMembers: commercial.supporterMembers,
      fanbase: commercial.fanbase,
      sponsorName: commercial.sponsorName,
      sponsorWeeklyIncome: commercial.sponsorWeeklyIncome,
      sponsorTier: commercial.sponsorTier,
      formationId: START_FORMATION,
      mentality: "equilibrada",
      attackFocus: "equilibrado",
      trainingCenterLevel: 1,
      medicalDepartmentLevel: 1,
      youthAcademyLevel: 1,
      countryOrigin: leagueId,
      leagueId,
      divisionId: division.id,
    },
    phase: "preseason",
    phaseRound: 1,
    inbox: [],
    squads: buildLeagueSquads(leagueId, teamId),
    standingsByDivision: { [division.id]: standings },
    leagueFixtures: fixturesForDivision(division),
    preseasonFixtures: [],
    nationalCupFixtures: [],
    continentalFixtures: [],
    nationalCupChampionId: null,
    continentalQualifiedIds: [],
    sponsorOffers: [],
    sponsorOfferSeason: 1,
    trainingFocus: "balanced",
    playersDevelopedThisSeason: 0,
    seasonStartMoney: START_MONEY,
    leaguePositionTarget: 1,
    lastSummary: "Pré-temporada aberta. Use os amistosos para testar o elenco sem perder pontos.",
  };
  state.leaguePositionTarget = leaguePositionTarget(state);
  state.preseasonFixtures = preseasonFixtures(state);
  state.nationalCupFixtures = nationalCupFixtures(state);
  addInbox(state, {
    type: "board",
    title: "Bem-vindo ao cargo",
    body: `A diretoria espera uma temporada competitiva. A janela de transferências está aberta na pré-temporada; depois disso, compras e propostas ficam suspensas.`,
  });
  addInbox(state, {
    type: "sponsor",
    title: `Contrato com ${state.save.sponsorName}`,
    body: `O patrocinador atual paga uma base de ${moneyText(state.save.sponsorWeeklyIncome)} por rodada. O valor cresce com prestígio, sócios e campanhas fortes.`,
  });
  maybeGenerateTransferEmails(state);
  return persistManagerCareer(state, userId);
}

export function loadManagerCareer(userId?: string | null): ManagerCareerState | null {
  try {
    const raw = localStorage.getItem(careerStorageKey(userId));
    return raw ? hydrateManagerCareer(JSON.parse(raw) as ManagerCareerState) : null;
  } catch {
    return null;
  }
}

export function persistManagerCareer(state: ManagerCareerState, userId = state.save.userId): ManagerCareerState {
  state.save.userId = userId || "local";
  localStorage.setItem(careerStorageKey(state.save.userId), JSON.stringify(state));
  return state;
}

export function deleteManagerCareer(userId?: string | null): void {
  localStorage.removeItem(careerStorageKey(userId));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateManagerCareerState(value: unknown): ManagerCareerState {
  if (!isRecord(value)) throw new Error("Arquivo de carreira inválido.");
  const save = value.save;
  if (!isRecord(save)) throw new Error("Save da carreira não encontrado.");
  const teamId = save.teamId;
  const phase = value.phase;
  const validPhases: ManagerSeasonPhase[] = ["preseason", "league", "national-cup", "continental", "season-end"];
  if (typeof teamId !== "string" || !teamId) throw new Error("Clube da carreira inválido.");
  if (typeof save.teamName !== "string" || !save.teamName) throw new Error("Nome do clube inválido.");
  if (!validPhases.includes(phase as ManagerSeasonPhase)) throw new Error("Fase da temporada inválida.");
  if (!isRecord(value.squads) || !Array.isArray(value.squads[teamId])) {
    throw new Error("Elenco do clube não encontrado no arquivo.");
  }
  if (!isRecord(value.standingsByDivision)) throw new Error("Tabela da liga não encontrada no arquivo.");
  if (!Array.isArray(value.leagueFixtures)) throw new Error("Calendário da liga não encontrado no arquivo.");
  return hydrateManagerCareer(value as unknown as ManagerCareerState);
}

export function exportManagerCareer(state: ManagerCareerState): string {
  const payload: ManagerCareerExport = {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseManagerCareerImport(raw: string): ManagerCareerState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Arquivo de carreira não é um JSON válido.");
  }
  if (isRecord(parsed) && parsed.kind === EXPORT_KIND) {
    if (parsed.version !== EXPORT_VERSION) {
      throw new Error("Versão do save de carreira não suportada.");
    }
    return validateManagerCareerState(parsed.state);
  }
  return validateManagerCareerState(parsed);
}

export function importManagerCareer(raw: string, userId = "local"): ManagerCareerState {
  return persistManagerCareer(parseManagerCareerImport(raw), userId);
}

export function managerDashboard(state: ManagerCareerState): ManagerDashboard {
  const standings = currentStandings(state);
  const nextFixture = nextManagerFixture(state);
  const scout = nextOpponentScout(state);
  return {
    save: state.save,
    squad: state.squads[state.save.teamId] ?? [],
    standings,
    nextFixture: nextFixture ? fixtureToManager(nextFixture) : null,
    nextOpponentStrength: scout?.strength ?? null,
    nextOpponentScout: scout,
    inbox: state.inbox ?? [],
    transferWindowOpen: transferWindowOpen(state),
    commercial: commercialSnapshot(state),
    stadiumUpgradeOptions: managerStadiumUpgradeOptions(state),
    sponsorOffers: state.sponsorOffers ?? [],
    trainingFocus: state.trainingFocus,
    trainingPlans: TRAINING_PLANS,
    boardObjectives: managerBoardObjectives(state),
    facilityUpgradeOptions: managerFacilityUpgradeOptions(state),
  };
}

function nextManagerFixture(state: ManagerCareerState): LeagueFixture | null {
  return fixturesForCurrentPhase(state).find((fixture) =>
    fixture.round === state.phaseRound &&
    (fixture.homeTeamId === state.save.teamId || fixture.awayTeamId === state.save.teamId),
  ) ?? null;
}

function fixturesForCurrentPhase(state: ManagerCareerState): LeagueFixture[] {
  if (state.phase === "preseason") return state.preseasonFixtures;
  if (state.phase === "league") return state.leagueFixtures;
  if (state.phase === "national-cup") return state.nationalCupFixtures;
  if (state.phase === "continental") return state.continentalFixtures;
  return [];
}

function nextOpponentScout(state: ManagerCareerState): ManagerOpponentScout | null {
  const fixture = nextManagerFixture(state);
  if (!fixture) return null;
  const oppId = fixture.homeTeamId === state.save.teamId ? fixture.awayTeamId : fixture.homeTeamId;
  const input = simInput(state, oppId);
  return {
    teamId: oppId,
    teamName: input.name,
    formationId: input.formationId,
    mentality: input.mentality,
    attackFocus: input.attackFocus ?? "equilibrado",
    strength: computeStrength(input.picks, input.formationId),
  };
}

function applyUserResult(state: ManagerCareerState, gf: number, ga: number): void {
  if (state.phase === "league") {
    state.save.goalsFor += gf;
    state.save.goalsAgainst += ga;
    state.save.wins += gf > ga ? 1 : 0;
    state.save.draws += gf === ga ? 1 : 0;
    state.save.losses += gf < ga ? 1 : 0;
    state.save.points += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
}

function applySquadRoundEffects(
  state: ManagerCareerState,
  gf: number,
  ga: number,
  timeline: MatchEvent[],
  userSide: "home" | "away",
  initialStarterIds?: Iterable<string>,
): void {
  const squad = state.squads[state.save.teamId] ?? [];
  const plan = TRAINING_PLANS.find((candidate) => candidate.id === state.trainingFocus) ?? TRAINING_PLANS[0];
  const developmentScale = 0.8 + state.save.trainingCenterLevel * 0.2;
  const initialStarters = new Set(initialStarterIds ?? squad.filter((player) => player.isStarter).map((player) => player.id));
  let developed = 0;

  for (const player of squad) {
    player.injuryRounds = Math.max(0, player.injuryRounds - 1);
    player.suspensionMatches = Math.max(0, player.suspensionMatches - 1);
    const startedFirstHalf = initialStarters.has(player.id);
    const startedSecondHalf = player.isStarter;
    const minutesPlayed = (startedFirstHalf ? 45 : 0) + (startedSecondHalf ? 45 : 0);
    const played = minutesPlayed > 0;
    const fullMatchLoad = state.phase === "preseason" ? 10 : 16;
    const matchLoad = played ? Math.round(fullMatchLoad * ((minutesPlayed / 90) ** 0.85)) : -4;
    player.fitness = clamp(player.fitness + plan.fitnessEffect - matchLoad + state.save.medicalDepartmentLevel, 35, 100);
    player.sharpness = clamp(player.sharpness + plan.sharpnessEffect + (minutesPlayed === 90 ? 4 : minutesPlayed === 45 ? 2 : -2), 25, 100);
    player.morale = clamp(player.morale + (gf > ga ? (played ? 4 : 2) : gf === ga ? 0 : played ? -3 : -1), 20, 100);

    if (player.potentialRating > player.rating && player.injuryRounds === 0) {
      const ageScale = player.age <= 21 ? 1.35 : player.age <= 24 ? 1 : 0.55;
      player.developmentProgress += plan.developmentEffect * developmentScale * ageScale;
      if (player.developmentProgress >= 100) {
        player.developmentProgress -= 100;
        player.rating++;
        player.value = valueForRating(player.rating);
        developed++;
      }
    }
  }

  if (developed) {
    state.playersDevelopedThisSeason += developed;
    addInbox(state, {
      type: "board",
      title: developed === 1 ? "Evolução no treinamento" : "Evoluções no treinamento",
      body: `${developed} atleta(s) ganharam +1 de overall após o trabalho do centro de treinamento.`,
    });
  }

  for (const event of timeline) {
    if (event.type !== "card" || event.card !== "red" || event.side !== userSide || !event.player) continue;
    const suspended = squad.find((player) => player.name === event.player);
    if (suspended) suspended.suspensionMatches = Math.max(1, suspended.suspensionMatches);
  }

  const rng = rngFor(`medical:${state.save.id}:${state.save.season}:${state.phase}:${state.phaseRound}`);
  const loadRisk = state.trainingFocus === "physical" ? 1.55 : state.trainingFocus === "recovery" ? 0.35 : 1;
  const medicalProtection = 1 - (state.save.medicalDepartmentLevel - 1) * 0.11;
  const candidates = squad.filter((player) =>
    (initialStarters.has(player.id) || player.isStarter) && player.injuryRounds === 0
  );
  const fatigueRisk = candidates.length
    ? candidates.reduce((sum, player) => sum + Math.max(0, 78 - player.fitness) / 100, 0) / candidates.length
    : 0;
  if (candidates.length && rng() < 0.065 * loadRisk * medicalProtection * (1 + fatigueRisk)) {
    const weighted = candidates.flatMap((player) => Array.from({ length: 1 + Math.max(0, Math.floor((80 - player.fitness) / 8)) }, () => player));
    const injured = weighted[Math.floor(rng() * weighted.length)];
    injured.injuryRounds = Math.max(1, Math.ceil((1 + rng() * 3) - state.save.medicalDepartmentLevel * 0.35));
    addInbox(state, {
      type: "board",
      title: `Departamento médico: ${injured.name}`,
      body: `${injured.name} sofreu uma lesão e ficará indisponível por ${injured.injuryRounds} partida(s). Ajuste a escalação e considere reduzir a carga de treino.`,
    });
  }
  ensureAvailableUserLineup(state);
}

function simulateFixture(state: ManagerCareerState, fixture: LeagueFixture, settleDraw = false) {
  const result = simulateGauntletMatch(
    simInput(state, fixture.homeTeamId),
    simInput(state, fixture.awayTeamId),
    settleDraw,
  );
  return {
    result,
    homeGoals: result.youGoals,
    awayGoals: result.oppGoals,
  };
}

function completedFixtureRow(
  fixture: LeagueFixture,
  homeGoals: number,
  awayGoals: number,
  winnerTeamId: string | null,
  wentToExtraTime = false,
): ManagerRoundResult["fixtures"][number] {
  return {
    ...fixtureToManager(fixture),
    homeGoals,
    awayGoals,
    winnerTeamId,
    wentToExtraTime,
  };
}

function applyCompletedUserFixture(
  state: ManagerCareerState,
  session: ManagerRoundSession,
  result: MatchResult,
): { state: ManagerCareerState; result: ManagerRoundResult } {
  const fixture = session.userFixture;
  const homeGoals = result.goals[fixture.homeTeamId] ?? 0;
  const awayGoals = result.goals[fixture.awayTeamId] ?? 0;
  const scoreWinner = winnerFromScore(fixture, homeGoals, awayGoals);
  const winnerTeamId = result.winnerId || scoreWinner;
  const userRow = completedFixtureRow(
    fixture,
    homeGoals,
    awayGoals,
    winnerTeamId,
    !!result.penaltyScore,
  );

  if (state.phase === "league") {
    const table = currentStandings(state);
    state.standingsByDivision[state.save.divisionId] = applyStanding(
      applyStanding(table, fixture.homeTeamId, homeGoals, awayGoals),
      fixture.awayTeamId,
      awayGoals,
      homeGoals,
    );
  }

  const gf = fixture.homeTeamId === state.save.teamId ? homeGoals : awayGoals;
  const ga = fixture.homeTeamId === state.save.teamId ? awayGoals : homeGoals;
  const userWonKnockout = session.settleDraw && winnerTeamId === state.save.teamId;
  const revenue = applyOperatingRevenue(state, fixture);
  applyUserResult(state, gf, ga);
  updateCommercialMood(state, gf, ga, userWonKnockout);
  applySquadRoundEffects(
    state,
    gf,
    ga,
    result.timeline,
    fixture.homeTeamId === state.save.teamId ? "home" : "away",
    session.initialUserStarterIds,
  );
  if (userWonKnockout && state.phase === "national-cup") {
    state.nationalCupChampionId = state.save.teamId;
    awardPrize(state, "Premiação da Copa Nacional", Math.round(8_000_000 * teamScale(state.save.teamId, currentDivision(state))));
  }
  if (userWonKnockout && state.phase === "continental") {
    awardPrize(state, "Premiação continental", Math.round(14_000_000 * teamScale(state.save.teamId, currentDivision(state))));
  }
  state.lastSummary = gf > ga ? `Vitória por ${gf} a ${ga}.` : gf === ga ? `Empate em ${gf} a ${ga}.` : `Derrota por ${ga} a ${gf}.`;
  addInbox(state, {
    type: "match",
    title: state.lastSummary,
    body: `Receita operacional da rodada: ${moneyText(revenue)}. O resultado mexeu com sócios, prestígio e confiança da diretoria, mas a vitória não gerou prêmio direto.`,
  });

  state.phaseRound++;
  const maxRound = Math.max(...session.phaseFixtures.map((roundFixture) => roundFixture.round));
  if (state.phaseRound > maxRound) advancePhase(state);
  maybeGenerateTransferEmails(state);

  const played = session.fixtures.map((roundFixture) =>
    roundFixture.homeTeamId === fixture.homeTeamId && roundFixture.awayTeamId === fixture.awayTeamId
      ? userRow
      : session.otherPlayed.find((playedFixture) =>
          playedFixture.homeTeamId === roundFixture.homeTeamId &&
          playedFixture.awayTeamId === roundFixture.awayTeamId
        ),
  ).filter((row): row is ManagerRoundResult["fixtures"][number] => !!row);

  const saved = persistManagerCareer(state);
  return {
    state: saved,
    result: {
      save: saved.save,
      timeline: result.timeline,
      goals: result.goals,
      fixtures: played,
      standings: currentStandings(saved),
      summary: saved.lastSummary,
    },
  };
}

function advancePhase(state: ManagerCareerState): void {
  if (state.phase === "preseason") {
    addInbox(state, {
      type: "board",
      title: "Janela encerrada",
      body: "A pré-temporada acabou. Novas compras e propostas de jogadores ficam bloqueadas até a próxima janela.",
    });
    state.phase = "league";
    state.phaseRound = 1;
    state.lastSummary = "Começa a liga nacional: turno e returno valendo pontos.";
    return;
  }
  if (state.phase === "league") {
    const prize = leaguePrizeForPosition(state);
    const pos = currentStandings(state).findIndex((row) => row.teamId === state.save.teamId) + 1;
    awardPrize(state, pos === 1 ? "Título da liga nacional" : "Premiação da liga nacional", prize);
    updateCommercialMood(state, pos === 1 ? 3 : 1, pos <= 8 ? 0 : 2, pos === 1);
    state.phase = "national-cup";
    state.phaseRound = 1;
    state.lastSummary = "A Copa Nacional começou. Mata-mata, prorrogação e pênaltis se precisar.";
    return;
  }
  if (state.phase === "national-cup") {
    const league = getLeagueStructure(state.save.leagueId);
    const topIds = currentStandings(state).map((row) => row.teamId);
    state.continentalQualifiedIds = league
      ? continentalQualifications(league, topIds).flatMap((q) => q.teamIds)
      : [];
    if (state.nationalCupChampionId && !state.continentalQualifiedIds.includes(state.nationalCupChampionId)) {
      state.continentalQualifiedIds.unshift(state.nationalCupChampionId);
    }
    state.continentalFixtures = continentalFixtures(state);
    state.phase = "continental";
    state.phaseRound = 1;
    state.lastSummary = "Competições continentais liberadas para os classificados da temporada anterior.";
    return;
  }
  if (state.phase === "continental") {
    const league = getLeagueStructure(state.save.leagueId);
    if (league) {
      promotionRelegationPlan(league, {
        [state.save.divisionId]: currentStandings(state).map((row) => row.teamId),
      });
    }
    const completedObjectives = managerBoardObjectives(state).filter((objective) => objective.completed).length;
    state.save.boardConfidence = clamp(state.save.boardConfidence + (completedObjectives - 1) * 4, 5, 99);
    state.phase = "season-end";
    state.lastSummary = "Temporada encerrada. A diretoria já prepara o calendário do próximo ano.";
    generateSponsorOffers(state);
    if (state.save.boardConfidence >= 58) {
      maybeGenerateTransferEmails(state);
    }
  }
}

export function managerClientBench(state: ManagerCareerState): Array<ManagerPlayer & { fromTeamId: string }> {
  return (state.squads[state.save.teamId] ?? [])
    .filter((player) => !player.isStarter && playerAvailable(player))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 12)
    .map((player) => ({ ...managerConditionedPlayer(player), fromTeamId: player.teamId }));
}

export function startManagerClientRound(state: ManagerCareerState): ManagerRoundStart {
  ensureAvailableUserLineup(state);
  const phaseFixtures = fixturesForCurrentPhase(state);
  const fixtures = phaseFixtures.filter((fixture) => fixture.round === state.phaseRound);
  if (!fixtures.length) {
    advancePhase(state);
    if (state.phase === "season-end") {
      return {
        state: persistManagerCareer(state),
        result: {
          save: state.save,
          timeline: [],
          goals: {},
          fixtures: [],
          standings: currentStandings(state),
          summary: state.lastSummary,
        },
      };
    }
    return startManagerClientRound(state);
  }

  const userFixture = fixtures.find((fixture) =>
    fixture.homeTeamId === state.save.teamId || fixture.awayTeamId === state.save.teamId
  );
  if (!userFixture) return playManagerClientRound(state);

  const settleDraw = state.phase === "national-cup" || state.phase === "continental";
  const otherPlayed: ManagerRoundResult["fixtures"] = [];
  for (const fixture of fixtures) {
    if (fixture === userFixture) continue;
    const { result, homeGoals, awayGoals } = simulateFixture(state, fixture, settleDraw);
    otherPlayed.push(completedFixtureRow(fixture, homeGoals, awayGoals, result.winnerId, result.wentToExtraTime));
    if (state.phase === "league") {
      const table = currentStandings(state);
      state.standingsByDivision[state.save.divisionId] = applyStanding(
        applyStanding(table, fixture.homeTeamId, homeGoals, awayGoals),
        fixture.awayTeamId,
        awayGoals,
        homeGoals,
      );
    }
  }

  const home = simInput(state, userFixture.homeTeamId);
  const away = simInput(state, userFixture.awayTeamId);
  const firstHalf = simulateFirstHalf(home, away);
  const matchResult: MatchResult = {
    homeId: userFixture.homeTeamId,
    awayId: userFixture.awayTeamId,
    timeline: firstHalf.timeline,
    secondHalfReady: false,
    firstHalfGoals: firstHalf.goals,
    goals: firstHalf.goals,
    shootout: null,
    penaltyScore: null,
    strengths: firstHalf.strengths,
    winnerId: "",
    summary: "",
  };
  const room: RoomState = {
    code: "MGR",
    phase: "result",
    mode: "classico",
    hostId: state.save.teamId,
    totalSlots: 11,
    players: [
      publicFromSimInput(home, home.id !== state.save.teamId),
      publicFromSimInput(away, away.id !== state.save.teamId),
    ],
    currentTeam: null,
    round: state.phaseRound,
    activePlayerId: null,
    takenThisRound: [],
    usedTeamIds: [],
    pvpRerollsEnabled: false,
    hideRatings: false,
    result: matchResult,
  };
  return {
    state,
    session: {
      state,
      room,
      phaseFixtures,
      fixtures,
      userFixture,
      otherPlayed,
      settleDraw,
      expelled: firstHalf.expelled,
      initialUserStarterIds: (state.squads[state.save.teamId] ?? []).filter((player) => player.isStarter).map((player) => player.id),
      finalized: false,
    },
  };
}

export function completeManagerClientSecondHalf(
  session: ManagerRoundSession,
  lineup: {
    formationId: string;
    mentality: Mentality;
    attackFocus: AttackFocus;
    picks: SquadPick[];
  },
): { session: ManagerRoundSession; state: ManagerCareerState; result: ManagerRoundResult } {
  const room = session.room;
  const match = room.result;
  if (!match) throw new Error("Partida de carreira não encontrada.");
  const user = room.players.find((player) => player.id === session.state.save.teamId);
  if (!user) throw new Error("Seu clube não está nesta partida.");

  user.formationId = lineup.formationId;
  user.mentality = lineup.mentality;
  user.attackFocus = lineup.attackFocus;
  user.picks = lineup.picks;
  user.halftimeReady = true;
  applyUserLineupFromPicks(session.state, lineup.formationId, lineup.mentality, lineup.attackFocus, lineup.picks);

  if (!match.secondHalfReady) {
    const home = simInputFromPublic(room.players.find((player) => player.id === match.homeId)!);
    const away = simInputFromPublic(room.players.find((player) => player.id === match.awayId)!);
    const secondHalf = simulateSecondHalf(
      home,
      away,
      match.firstHalfGoals,
      session.expelled,
      session.settleDraw,
    );
    match.timeline = [...match.timeline, ...secondHalf.timeline];
    match.secondHalfReady = true;
    match.goals = secondHalf.goals;
    match.shootout = secondHalf.shootout;
    match.penaltyScore = secondHalf.penaltyScore;
    match.strengths = secondHalf.strengths;
    match.winnerId = secondHalf.winnerId;
    match.summary = secondHalf.summary;
  }

  if (!session.finalized) {
    const completed = applyCompletedUserFixture(session.state, session, match);
    session.state = completed.state;
    session.finalized = true;
    return { session, state: completed.state, result: completed.result };
  }
  return {
    session,
    state: session.state,
    result: {
      save: session.state.save,
      timeline: match.timeline,
      goals: match.goals,
      fixtures: session.otherPlayed,
      standings: currentStandings(session.state),
      summary: session.state.lastSummary,
    },
  };
}

export function playManagerClientRound(state: ManagerCareerState): { state: ManagerCareerState; result: ManagerRoundResult } {
  ensureAvailableUserLineup(state);
  const phaseFixtures = fixturesForCurrentPhase(state);
  const fixtures = phaseFixtures.filter((fixture) => fixture.round === state.phaseRound);
  if (!fixtures.length) {
    advancePhase(state);
    if (state.phase === "season-end") {
      return {
        state: persistManagerCareer(state),
        result: {
          save: state.save,
          timeline: [],
          goals: {},
          fixtures: [],
          standings: currentStandings(state),
          summary: state.lastSummary,
        },
      };
    }
    return playManagerClientRound(state);
  }

  let userTimeline: MatchEvent[] = [];
  let goals: Record<string, number> = {};
  const played: ManagerRoundResult["fixtures"] = [];
  for (const fixture of fixtures) {
    const settle = state.phase === "national-cup" || state.phase === "continental";
    const { result, homeGoals, awayGoals } = simulateFixture(state, fixture, settle);
    played.push({
      ...fixtureToManager(fixture),
      homeGoals,
      awayGoals,
      winnerTeamId: result.winnerId,
      wentToExtraTime: result.wentToExtraTime,
    });
    if (state.phase === "league") {
      const table = currentStandings(state);
      state.standingsByDivision[state.save.divisionId] = applyStanding(
        applyStanding(table, fixture.homeTeamId, homeGoals, awayGoals),
        fixture.awayTeamId,
        awayGoals,
        homeGoals,
      );
    }
    if (fixture.homeTeamId === state.save.teamId || fixture.awayTeamId === state.save.teamId) {
      userTimeline = result.timeline;
      goals = { [fixture.homeTeamId]: homeGoals, [fixture.awayTeamId]: awayGoals };
      const gf = fixture.homeTeamId === state.save.teamId ? homeGoals : awayGoals;
      const ga = fixture.homeTeamId === state.save.teamId ? awayGoals : homeGoals;
      const userWonKnockout = settle && result.winnerId === state.save.teamId;
      const revenue = applyOperatingRevenue(state, fixture);
      applyUserResult(state, gf, ga);
      updateCommercialMood(state, gf, ga, userWonKnockout);
      applySquadRoundEffects(
        state,
        gf,
        ga,
        result.timeline,
        fixture.homeTeamId === state.save.teamId ? "home" : "away",
      );
      if (settle && userWonKnockout && state.phase === "national-cup") {
        state.nationalCupChampionId = state.save.teamId;
        awardPrize(state, "Premiação da Copa Nacional", Math.round(8_000_000 * teamScale(state.save.teamId, currentDivision(state))));
      }
      if (settle && userWonKnockout && state.phase === "continental") {
        awardPrize(state, "Premiação continental", Math.round(14_000_000 * teamScale(state.save.teamId, currentDivision(state))));
      }
      state.lastSummary = gf > ga ? `Vitória por ${gf} a ${ga}.` : gf === ga ? `Empate em ${gf} a ${ga}.` : `Derrota por ${ga} a ${gf}.`;
      addInbox(state, {
        type: "match",
        title: state.lastSummary,
        body: `Receita operacional da rodada: ${moneyText(revenue)}. O resultado mexeu com sócios, prestígio e confiança da diretoria, mas a vitória não gerou prêmio direto.`,
      });
    }
  }

  state.phaseRound++;
  const maxRound = Math.max(...phaseFixtures.map((fixture) => fixture.round));
  if (state.phaseRound > maxRound) advancePhase(state);
  maybeGenerateTransferEmails(state);

  const saved = persistManagerCareer(state);
  return {
    state: saved,
    result: {
      save: saved.save,
      timeline: userTimeline,
      goals,
      fixtures: played,
      standings: currentStandings(saved),
      summary: saved.lastSummary,
    },
  };
}

export function updateManagerClientLineup(
  state: ManagerCareerState,
  payload: {
    formationId: string;
    mentality: Mentality;
    attackFocus: AttackFocus;
    starters: Array<{ playerId: string; slotId: string }>;
  },
): ManagerCareerState {
  const ids = new Set(payload.starters.map((starter) => starter.playerId));
  if (ids.size !== 11) throw new Error("Escolha exatamente 11 titulares.");
  const squad = state.squads[state.save.teamId] ?? [];
  const unavailable = squad.find((player) => ids.has(player.id) && !playerAvailable(player));
  if (unavailable) throw new Error(`${unavailable.name} está indisponível por lesão ou suspensão.`);
  const slots = new Set(payload.starters.map((starter) => starter.slotId));
  if (slots.size !== 11) throw new Error("Cada titular precisa ocupar uma posição diferente.");
  state.save.formationId = payload.formationId;
  state.save.mentality = payload.mentality;
  state.save.attackFocus = payload.attackFocus;
  const slotByPlayer = new Map(payload.starters.map((starter) => [starter.playerId, starter.slotId]));
  state.squads[state.save.teamId] = squad.map((player) => ({
    ...player,
    isStarter: ids.has(player.id),
    lineupSlotId: slotByPlayer.get(player.id) ?? null,
  }));
  return persistManagerCareer(state);
}

export function searchManagerClientMarket(
  state: ManagerCareerState,
  filters: { pos?: string; minRating?: number; maxRating?: number },
): ManagerPlayer[] {
  if (!transferWindowOpen(state)) return [];
  return Object.values(state.squads)
    .flat()
    .filter((player) => player.teamId !== state.save.teamId && player.isListed)
    .filter((player) => !filters.pos || player.pos === filters.pos)
    .filter((player) => !filters.minRating || player.rating >= filters.minRating)
    .filter((player) => !filters.maxRating || player.rating <= filters.maxRating)
    .sort((a, b) => b.rating - a.rating || a.value - b.value)
    .slice(0, 80);
}

export function buyManagerClientPlayer(state: ManagerCareerState, playerId: string): ManagerCareerState {
  if (!transferWindowOpen(state)) throw new Error("Compras só podem ser feitas na janela de transferências da pré-temporada.");
  const sourceEntry = Object.entries(state.squads).find(([, squad]) =>
    squad.some((candidate) => candidate.id === playerId),
  );
  const player = sourceEntry?.[1].find((candidate) => candidate.id === playerId);
  if (!sourceEntry || !player) throw new Error("Jogador não encontrado.");
  const price = Math.round(player.value * 1.08);
  if (state.save.money < price) throw new Error("Saldo insuficiente.");
  state.save.money -= price;
  const [sourceTeamId, sourceSquad] = sourceEntry;
  state.squads[sourceTeamId] = sourceSquad.filter((candidate) => candidate.id !== playerId);
  const signed: ManagerPlayer = {
    ...player,
    teamId: state.save.teamId,
    teamName: state.save.teamName,
    isListed: false,
    isStarter: false,
    lineupSlotId: null,
  };
  state.squads[state.save.teamId] = [...(state.squads[state.save.teamId] ?? []), signed];
  addInbox(state, {
    type: "finance",
    title: `Contratação: ${signed.name}`,
    body: `${signed.name} chegou por ${moneyText(price)}. O registro foi concluído dentro da janela de transferências.`,
  });
  return persistManagerCareer(state);
}

export function sellManagerClientPlayer(state: ManagerCareerState, playerId: string): ManagerCareerState {
  if (!transferWindowOpen(state)) throw new Error("Vendas diretas só podem ser feitas na janela de transferências da pré-temporada.");
  const squad = state.squads[state.save.teamId] ?? [];
  const player = squad.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Jogador não pertence ao seu clube.");
  if (squad.length <= 14) throw new Error("Você precisa manter pelo menos 14 jogadores.");
  state.save.money += Math.round(player.value * 0.72);
  const destinationTeamId = player.originalTeamId === state.save.teamId
    ? currentStandings(state).find((row) => row.teamId !== state.save.teamId)?.teamId ?? player.originalTeamId
    : player.originalTeamId;
  const sold: ManagerPlayer = {
    ...player,
    teamId: destinationTeamId,
    teamName: currentStandings(state).find((row) => row.teamId === destinationTeamId)?.teamName ?? "Mercado",
    isListed: true,
    isStarter: false,
    lineupSlotId: null,
  };
  state.squads[state.save.teamId] = squad.filter((candidate) => candidate.id !== playerId);
  state.squads[destinationTeamId] = [...(state.squads[destinationTeamId] ?? []), sold];
  addInbox(state, {
    type: "finance",
    title: `Venda: ${sold.name}`,
    body: `${sold.name} saiu por ${moneyText(Math.round(player.value * 0.72))}. A operação reduz o elenco, mas preserva caixa para a temporada.`,
  });
  return persistManagerCareer(state);
}

export function upgradeManagerClientStadium(
  state: ManagerCareerState,
  optionId = "arquibancada-modular",
): ManagerCareerState {
  const option = managerStadiumUpgradeOptions(state).find((candidate) => candidate.id === optionId);
  if (!option) throw new Error("Opção de estádio não encontrada.");
  if (state.save.money < option.cost) throw new Error("Saldo insuficiente para essa obra.");
  state.save.money -= option.cost;
  state.save.stadiumCapacity += option.capacityGain;
  state.save.ticketPrice = clamp(state.save.ticketPrice + option.ticketPriceGain, 20, 180);
  state.save.supporterMembers = clamp(
    state.save.supporterMembers + option.supporterBoost,
    1000,
    250000,
  );
  state.save.sponsorWeeklyIncome = roundMoney(
    state.save.sponsorWeeklyIncome * (1 + option.sponsorIncomeBoostPct / 100),
  );
  state.save.prestige = clamp(state.save.prestige + option.prestigeGain, 20, 99);
  state.save.boardConfidence = clamp(state.save.boardConfidence + option.boardConfidenceGain, 5, 99);
  addInbox(state, {
    type: "finance",
    title: `Obra aprovada: ${option.title}`,
    body: `${option.title} custou ${moneyText(option.cost)}. Efeitos: ${option.capacityGain ? `+${option.capacityGain.toLocaleString("pt-BR")} lugares, ` : ""}${option.ticketPriceGain ? `ingresso +${moneyText(option.ticketPriceGain)}, ` : ""}${option.supporterBoost ? `+${option.supporterBoost.toLocaleString("pt-BR")} sócios, ` : ""}patrocínio ${option.sponsorIncomeBoostPct ? `+${option.sponsorIncomeBoostPct}%` : "inalterado"}.`,
  });
  return persistManagerCareer(state);
}

export function chooseManagerSponsor(state: ManagerCareerState, offerId: string): ManagerCareerState {
  const offer = (state.sponsorOffers ?? []).find((candidate) => candidate.id === offerId);
  if (!offer) throw new Error("Proposta de patrocínio não encontrada.");
  state.save.sponsorName = offer.name;
  state.save.sponsorTier = offer.tier;
  state.save.sponsorWeeklyIncome = offer.weeklyIncome;
  state.save.money += offer.signingBonus;
  state.sponsorOffers = [];
  state.sponsorOfferSeason = state.save.season;
  addInbox(state, {
    type: "sponsor",
    title: `Patrocínio assinado: ${offer.name}`,
    body: `${offer.name} assinou por ${offer.durationSeasons} temporada(s). Luva: ${moneyText(offer.signingBonus)}. Receita base por rodada: ${moneyText(offer.weeklyIncome)}.`,
  });
  return persistManagerCareer(state);
}

export function setManagerTrainingFocus(state: ManagerCareerState, focus: ManagerTrainingFocus): ManagerCareerState {
  if (!TRAINING_PLANS.some((plan) => plan.id === focus)) throw new Error("Plano de treino inválido.");
  state.trainingFocus = focus;
  const plan = TRAINING_PLANS.find((candidate) => candidate.id === focus)!;
  addInbox(state, {
    type: "board",
    title: `Treino definido: ${plan.name}`,
    body: `${plan.description} A comissão aplicará esse plano até que você escolha outro.`,
  });
  return persistManagerCareer(state);
}

export function upgradeManagerFacility(state: ManagerCareerState, kind: ManagerFacilityKind): ManagerCareerState {
  const option = managerFacilityUpgradeOptions(state).find((candidate) => candidate.id === kind);
  if (!option) throw new Error("Estrutura não encontrada.");
  if (option.maxed) throw new Error("Essa estrutura já está no nível máximo.");
  if (state.save.money < option.cost) throw new Error("Saldo insuficiente para essa melhoria.");
  state.save.money -= option.cost;
  if (kind === "training") state.save.trainingCenterLevel++;
  if (kind === "medical") state.save.medicalDepartmentLevel++;
  if (kind === "academy") state.save.youthAcademyLevel++;
  addInbox(state, {
    type: "finance",
    title: `${option.title} no nível ${option.nextLevel}`,
    body: `A diretoria investiu ${moneyText(option.cost)}. ${option.benefit}.`,
  });
  return persistManagerCareer(state);
}

function createAcademyProspects(state: ManagerCareerState): ManagerPlayer[] {
  const rng = rngFor(`academy:${state.save.id}:${state.save.season + 1}:${state.save.youthAcademyLevel}`);
  const positions: Player["pos"][] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "RW", "LW", "ST"];
  const firstNames = ["Caio", "Davi", "Enzo", "Gabriel", "João", "Lucas", "Matheus", "Rafael"];
  const lastNames = ["Alves", "Barbosa", "Costa", "Freitas", "Lima", "Moura", "Silva", "Souza"];
  return [0, 1].map((index) => {
    const rating = clamp(59 + state.save.youthAcademyLevel * 2 + Math.floor(rng() * 5), 60, 78);
    const potential = clamp(rating + 5 + state.save.youthAcademyLevel * 2 + Math.floor(rng() * 4), rating + 2, 92);
    const name = `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]}`;
    return {
      ...managerPlayer({ name, pos: positions[Math.floor(rng() * positions.length)], rating }, state.save.teamId, state.save.teamName, 100 + index, null),
      id: `${state.save.teamId}:academy:${state.save.season + 1}:${index}:${name}`,
      age: 17,
      potentialRating: potential,
      morale: 76,
      fitness: 95,
      sharpness: 45,
      isListed: false,
    };
  });
}

export function advanceManagerSeason(state: ManagerCareerState): ManagerCareerState {
  if (state.phase !== "season-end") throw new Error("A temporada atual ainda não terminou.");
  const prospects = createAcademyProspects(state);
  const squad = state.squads[state.save.teamId] ?? [];
  for (const player of squad) {
    player.age++;
    player.fitness = Math.max(player.fitness, 88);
    player.sharpness = clamp(player.sharpness - 8, 35, 85);
    player.injuryRounds = 0;
    player.suspensionMatches = 0;
    if (player.age >= 32 && player.rating > 60 && player.rating >= player.potentialRating && hashStr(`${player.id}:${state.save.season}`) % 3 === 0) {
      player.rating--;
      player.value = valueForRating(player.rating);
    }
  }
  state.squads[state.save.teamId] = [...squad, ...prospects];
  state.save.season++;
  state.save.round = 1;
  state.save.points = 0;
  state.save.wins = 0;
  state.save.draws = 0;
  state.save.losses = 0;
  state.save.goalsFor = 0;
  state.save.goalsAgainst = 0;
  state.phase = "preseason";
  state.phaseRound = 1;
  state.playersDevelopedThisSeason = 0;
  state.seasonStartMoney = state.save.money;
  state.leaguePositionTarget = leaguePositionTarget(state);
  state.standingsByDivision[state.save.divisionId] = standingsForDivision(currentDivision(state));
  state.leagueFixtures = fixturesForDivision(currentDivision(state));
  state.preseasonFixtures = preseasonFixtures(state);
  state.nationalCupFixtures = nationalCupFixtures(state);
  state.continentalFixtures = [];
  state.continentalQualifiedIds = [];
  state.nationalCupChampionId = null;
  state.lastSummary = `Temporada ${state.save.season} aberta. Dois atletas chegaram da divisão de base.`;
  addInbox(state, {
    type: "board",
    title: "Nova temporada e captação da base",
    body: `${prospects.map((player) => `${player.name} (${player.pos}, ${player.rating}/${player.potentialRating})`).join(" e ")} foram promovidos. A meta da liga é terminar entre os ${state.leaguePositionTarget}.`,
  });
  ensureAvailableUserLineup(state);
  maybeGenerateTransferEmails(state);
  return persistManagerCareer(state);
}

export function skipManagerClientPreseason(state: ManagerCareerState): ManagerCareerState {
  if (state.phase !== "preseason") return state;
  addInbox(state, {
    type: "board",
    title: "Pré-temporada pulada",
    body: "A janela de transferências foi encerrada manualmente. O elenco atual será usado no começo da liga.",
  });
  state.phase = "league";
  state.phaseRound = 1;
  state.lastSummary = "Pré-temporada pulada. A liga nacional começa agora.";
  return persistManagerCareer(state);
}

export function acceptManagerInboxOffer(state: ManagerCareerState, offerId: string): ManagerCareerState {
  const offer = state.inbox.find((item) => item.id === offerId);
  if (!offer || offer.handled) throw new Error("Oferta não encontrada.");
  if (offer.type === "player_offer") {
    if (!transferWindowOpen(state)) throw new Error("Propostas por jogadores só podem ser aceitas durante a janela.");
    if (!offer.playerId || !offer.amount || !offer.fromTeamId) throw new Error("Proposta de jogador incompleta.");
    const squad = state.squads[state.save.teamId] ?? [];
    const player = squad.find((candidate) => candidate.id === offer.playerId);
    if (!player) throw new Error("Jogador não está mais no elenco.");
    if (squad.length <= 14) throw new Error("Você precisa manter pelo menos 14 jogadores.");
    state.save.money += offer.amount;
    state.squads[state.save.teamId] = squad.filter((candidate) => candidate.id !== offer.playerId);
    state.squads[offer.fromTeamId] = [
      ...(state.squads[offer.fromTeamId] ?? []),
      {
        ...player,
        teamId: offer.fromTeamId,
        teamName: offer.fromTeamName ?? "Novo clube",
        isListed: false,
        isStarter: false,
        lineupSlotId: null,
      },
    ];
    offer.handled = true;
    offer.unread = false;
    addInbox(state, {
      type: "finance",
      title: `Proposta aceita: ${player.name}`,
      body: `${player.name} foi vendido para ${offer.fromTeamName ?? "outro clube"} por ${moneyText(offer.amount)}.`,
    });
    return persistManagerCareer(state);
  }
  if (offer.type === "manager_offer") {
    if (!offer.targetTeamId || !offer.targetTeamName) throw new Error("Proposta de clube incompleta.");
    const target = divisionForTeam(offer.targetTeamId);
    const teamRef = target.division.teams.find((team) => (team.playableTeamId ?? team.id) === offer.targetTeamId);
    const teamName = teamRef ? teamAlias(teamRef) : offer.targetTeamName;
    state.save.teamId = offer.targetTeamId;
    state.save.teamName = teamName;
    state.save.leagueId = target.leagueId;
    state.save.divisionId = target.division.id;
    state.save.countryOrigin = target.leagueId;
    state.save.formationId = START_FORMATION;
    state.phase = "preseason";
    state.phaseRound = 1;
    state.save.season++;
    const commercial = commercialForStart(offer.targetTeamId, target.division);
    state.save.prestige = Math.round((state.save.prestige + commercial.prestige) / 2);
    state.save.boardConfidence = 62;
    state.save.fanbase = commercial.fanbase;
    state.save.supporterMembers = commercial.supporterMembers;
    state.save.sponsorName = commercial.sponsorName;
    state.save.sponsorTier = commercial.sponsorTier;
    state.save.sponsorWeeklyIncome = commercial.sponsorWeeklyIncome;
    state.squads = { ...buildLeagueSquads(target.leagueId, offer.targetTeamId), ...state.squads };
    state.standingsByDivision[state.save.divisionId] = standingsForDivision(target.division);
    state.leagueFixtures = fixturesForDivision(target.division);
    state.preseasonFixtures = preseasonFixtures(state);
    state.nationalCupFixtures = nationalCupFixtures(state);
    state.continentalFixtures = [];
    state.continentalQualifiedIds = [];
    state.sponsorOffers = [];
    state.sponsorOfferSeason = state.save.season;
    offer.handled = true;
    offer.unread = false;
    addInbox(state, {
      type: "board",
      title: `Novo clube: ${teamName}`,
      body: `Você assumiu ${teamName}. A janela está aberta para ajustar o elenco antes da liga.`,
    });
    maybeGenerateTransferEmails(state);
    return persistManagerCareer(state);
  }
  throw new Error("Este e-mail não possui ação de aceite.");
}

export function rejectManagerInboxOffer(state: ManagerCareerState, offerId: string): ManagerCareerState {
  const offer = state.inbox.find((item) => item.id === offerId);
  if (!offer) throw new Error("Oferta não encontrada.");
  offer.handled = true;
  offer.unread = false;
  return persistManagerCareer(state);
}

export function markManagerInboxRead(state: ManagerCareerState, itemId: string): ManagerCareerState {
  const item = state.inbox.find((candidate) => candidate.id === itemId);
  if (!item || !item.unread) return state;
  item.unread = false;
  return persistManagerCareer(state);
}
