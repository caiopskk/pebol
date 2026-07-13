import assert from "node:assert/strict";
import type { ManagerCareerState } from "./lib/managerCareer.js";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

if (!globalThis.crypto?.randomUUID) {
  let id = 0;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      randomUUID: () => `manager-test-${++id}`,
    },
  });
}

const manager = await import("./lib/managerCareer.js");
const { getLeagueDivision } = await import("../../shared/leagueStructures.js");
const { TEAMS } = await import("../../shared/data/teams.js");

function rate(n: number, total: number): number {
  return Math.round((n / total) * 1000) / 10;
}

function tablePlayed(state: ManagerCareerState): number {
  return (state.standingsByDivision[state.save.divisionId] ?? [])
    .reduce((sum, row) => sum + row.played, 0);
}

function assertCreateExportImport(): ManagerCareerState {
  const startTeams = manager.managerStartTeams();
  assert.ok(startTeams.length > 0, "manager mode needs playable start teams");
  const playableIds = new Set(startTeams.map((team) => team.id));
  const missingSeeds = TEAMS.map((team) => team.id).filter((teamId) => !playableIds.has(teamId));
  assert.deepEqual(missingSeeds, [], "every seeded club should be playable in manager season structures");
  const chosen = startTeams.find((team) => team.id === "flamengo") ?? startTeams[0];
  const state = manager.createManagerCareer(chosen.id, "manager-user-a");
  const dashboard = manager.managerDashboard(state);

  assert.equal(state.phase, "preseason");
  assert.equal(state.phaseRound, 1);
  assert.equal(dashboard.save.teamId, chosen.id);
  assert.ok(dashboard.save.supporterMembers > 0, "career should start with supporter members");
  assert.ok(dashboard.save.sponsorWeeklyIncome > 0, "career should start with sponsorship income");
  assert.ok(dashboard.commercial.supporterIncome > 0, "supporter program should generate recurring income");
  assert.ok(dashboard.commercial.sponsorIncome > 0, "sponsor should generate recurring income");
  assert.equal(dashboard.transferWindowOpen, true, "preseason should open the transfer window");
  assert.ok(dashboard.inbox.length >= 2, "career should start with board/sponsor emails");
  assert.ok(dashboard.squad.length >= 14, "user squad should have enough players for transfers");
  assert.equal(dashboard.trainingPlans.length, 5, "career should offer distinct weekly training plans");
  assert.equal(dashboard.boardObjectives.length, 3, "board should set sporting, development and finance goals");
  assert.equal(dashboard.facilityUpgradeOptions.length, 3, "club should expose training, medical and academy facilities");
  assert.ok(dashboard.squad.every((player) => player.fitness > 0 && player.sharpness > 0));
  assert.equal(dashboard.squad.filter((player) => player.isStarter).length, 11);
  assert.ok(state.preseasonFixtures.length >= 3, "preseason should offer short friendly slate");
  assert.ok(state.leagueFixtures.length > 0, "league calendar should be generated");

  const division = getLeagueDivision(state.save.divisionId)!;
  assert.equal(
    state.leagueFixtures.length,
    division.teams.length * (division.teams.length - 1),
    "double round-robin must schedule home and away games",
  );

  const exported = manager.exportManagerCareer(state);
  const parsed = JSON.parse(exported) as { kind: string; version: number; state: ManagerCareerState };
  assert.equal(parsed.kind, "pebol-manager-career");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.state.save.id, state.save.id);

  const imported = manager.importManagerCareer(exported, "manager-user-a");
  assert.equal(imported.save.id, state.save.id);
  assert.equal(manager.loadManagerCareer("manager-user-a")?.save.id, state.save.id);
  assert.equal(manager.loadManagerCareer("manager-user-b"), null, "other users must not see this career");
  const otherUserCareer = manager.createManagerCareer(chosen.id, "manager-user-b");
  assert.notEqual(otherUserCareer.save.id, state.save.id, "each user should own a separate career");
  assert.equal(manager.loadManagerCareer("manager-user-a")?.save.id, state.save.id);
  assert.equal(manager.loadManagerCareer("manager-user-b")?.save.id, otherUserCareer.save.id);
  manager.deleteManagerCareer("manager-user-b");
  assert.equal(manager.loadManagerCareer("manager-user-b"), null, "deleted career should be removed for that user");
  const unread = imported.inbox.find((item) => item.unread);
  assert.ok(unread, "career should have at least one unread inbox item");
  const readState = manager.markManagerInboxRead(imported, unread.id);
  assert.equal(readState.inbox.find((item) => item.id === unread.id)?.unread, false);
  assert.throws(() => manager.parseManagerCareerImport("{"), /JSON/);
  assert.throws(() => manager.parseManagerCareerImport("{}"), /inválido|não encontrado/i);

  return imported;
}

function assertMarketAndEconomy(initial: ManagerCareerState): ManagerCareerState {
  let state = initial;
  const originalMoney = state.save.money;
  const originalSquadSize = state.squads[state.save.teamId].length;
  const market = manager.searchManagerClientMarket(state, { minRating: 70 });
  const target = market.find((player) => state.save.money >= Math.round(player.value * 1.08));
  assert.ok(target, "market should expose at least one affordable listed player");

  const sourceTeamId = target.teamId;
  const buyPrice = Math.round(target.value * 1.08);
  const sellReturn = Math.round(target.value * 0.72);
  assert.ok(buyPrice > sellReturn, "transfer spread must prevent buy/sell money loops");

  state = manager.buyManagerClientPlayer(state, target.id);
  assert.equal(state.save.money, originalMoney - buyPrice);
  assert.equal(state.squads[state.save.teamId].length, originalSquadSize + 1);
  assert.ok(state.squads[state.save.teamId].some((player) => player.id === target.id));
  assert.ok(!(state.squads[sourceTeamId] ?? []).some((player) => player.id === target.id));

  state = manager.sellManagerClientPlayer(state, target.id);
  assert.equal(state.save.money, originalMoney - buyPrice + sellReturn);
  assert.ok(state.save.money < originalMoney, "round-trip transfer should have a real financial cost");
  assert.equal(state.squads[state.save.teamId].length, originalSquadSize);
  assert.ok(!state.squads[state.save.teamId].some((player) => player.id === target.id));
  assert.equal(
    Object.values(state.squads).flat().filter((player) => player.id === target.id).length,
    1,
    "sold player should exist in exactly one squad",
  );

  const beforeUpgradeMoney = state.save.money;
  const beforeCapacity = state.save.stadiumCapacity;
  const stadiumOptions = manager.managerDashboard(state).stadiumUpgradeOptions;
  assert.ok(stadiumOptions.length >= 4, "stadium should expose multiple upgrade options");
  state = manager.upgradeManagerClientStadium(state, stadiumOptions[0].id);
  assert.equal(state.save.stadiumCapacity, beforeCapacity + 2500);
  assert.ok(state.save.money < beforeUpgradeMoney, "stadium upgrade must spend money");

  const trainingLevel = state.save.trainingCenterLevel;
  const facilityMoney = state.save.money;
  state = manager.upgradeManagerFacility(state, "training");
  assert.equal(state.save.trainingCenterLevel, trainingLevel + 1);
  assert.ok(state.save.money < facilityMoney, "facility upgrade must spend money");
  state = manager.setManagerTrainingFocus(state, "development");
  assert.equal(state.trainingFocus, "development");

  const offer = state.inbox.find((item) => item.type === "player_offer" && !item.handled);
  if (offer) {
    state = manager.rejectManagerInboxOffer(state, offer.id);
    assert.equal(state.inbox.find((item) => item.id === offer.id)?.handled, true);
  }
  return state;
}

function assertRoundScenarios(initial: ManagerCareerState): ManagerCareerState {
  let state = initial;
  const moneyBeforeFriendly = state.save.money;
  const expectedFriendlyIncome = manager.managerDashboard(state).commercial.supporterIncome +
    manager.managerDashboard(state).commercial.sponsorIncome +
    manager.managerDashboard(state).commercial.projectedHomeIncome;
  const pointsBeforeFriendly = state.save.points;
  const fitnessBeforeFriendly = state.squads[state.save.teamId].find((player) => player.isStarter)!.fitness;
  const tableBeforeFriendly = tablePlayed(state);
  let played = manager.playManagerClientRound(state);
  state = played.state;

  assert.ok(played.result.timeline.length > 0, "user friendly should return a visual timeline");
  assert.ok(played.result.fixtures.length > 0, "preseason round should simulate fixtures");
  assert.equal(state.save.points, pointsBeforeFriendly, "preseason friendlies must not award league points");
  assert.equal(tablePlayed(state), tableBeforeFriendly, "preseason must not update the league table");
  assert.notEqual(
    state.squads[state.save.teamId].find((player) => player.isStarter)!.fitness,
    fitnessBeforeFriendly,
    "matches and training should update player condition",
  );
  assert.equal(
    state.save.money,
    moneyBeforeFriendly + expectedFriendlyIncome,
    "friendly revenue should come from operations, not from winning",
  );

  const liveStart = manager.startManagerClientRound(state);
  assert.ok(liveStart.session, "manager round should open a live-match session when the user has a fixture");
  assert.equal(liveStart.session.room.result?.secondHalfReady, false, "live manager match should pause after the first half");
  assert.ok(
    liveStart.session.room.result?.timeline.some((event) => event.type === "halftime"),
    "first half should include the halftime event",
  );
  const user = liveStart.session.room.players.find((player) => player.id === liveStart.session!.state.save.teamId)!;
  const completedLive = manager.completeManagerClientSecondHalf(liveStart.session, {
    formationId: user.formationId!,
    mentality: user.mentality!,
    attackFocus: user.attackFocus ?? "equilibrado",
    picks: user.picks,
  });
  state = completedLive.state;
  assert.equal(completedLive.session.room.result?.secondHalfReady, true, "second half should be generated after halftime confirmation");
  assert.ok(
    completedLive.session.room.result?.timeline.some((event) => event.type === "fulltime"),
    "completed live manager match should include fulltime",
  );

  state = manager.skipManagerClientPreseason(state);
  assert.equal(state.phase, "league");
  assert.equal(manager.searchManagerClientMarket(state, { minRating: 70 }).length, 0, "market should close after preseason");
  assert.throws(
    () => manager.buyManagerClientPlayer(state, Object.values(state.squads).flat().find((player) => player.teamId !== state.save.teamId)!.id),
    /janela de transferências/i,
  );

  let totalGoals = 0;
  let totalFixtures = 0;
  const leagueRoundsToSample = 8;
  for (let i = 0; i < leagueRoundsToSample; i++) {
    const beforePlayed = tablePlayed(state);
    played = manager.playManagerClientRound(state);
    state = played.state;
    assert.ok(played.result.fixtures.length > 0, "league round should have fixtures");
    assert.equal(
      tablePlayed(state),
      beforePlayed + played.result.fixtures.length * 2,
      "each league fixture should update two table rows",
    );
    for (const fixture of played.result.fixtures) {
      totalGoals += fixture.homeGoals + fixture.awayGoals;
      totalFixtures++;
    }
  }

  const avgGoals = totalGoals / totalFixtures;
  console.log(`[manager-career-test] sampled league goals: ${avgGoals.toFixed(2)} per match over ${totalFixtures} fixtures`);
  assert.ok(avgGoals >= 0.4 && avgGoals <= 5.5, `manager league goal rate looks off: ${avgGoals.toFixed(2)}`);

  let guard = 60;
  while (state.phase === "league" && guard-- > 0) {
    state = manager.playManagerClientRound(state).state;
  }
  assert.equal(state.phase, "national-cup", "league should advance into the national cup phase");

  const cupRound = manager.playManagerClientRound(state);
  state = cupRound.state;
  assert.ok(cupRound.result.fixtures.length > 0, "national cup should simulate knockout fixtures");
  for (const fixture of cupRound.result.fixtures) {
    assert.ok(fixture.winnerTeamId, "national cup knockout must resolve draws with a winner");
    assert.ok(
      fixture.winnerTeamId === fixture.homeTeamId || fixture.winnerTeamId === fixture.awayTeamId,
      "national cup winner must be one of the fixture teams",
    );
  }
  assert.equal(state.phase, "continental", "national cup should advance into continental phase");

  const continentalRound = manager.playManagerClientRound(state);
  state = continentalRound.state;
  if (continentalRound.result.fixtures.length) {
    for (const fixture of continentalRound.result.fixtures) {
      assert.ok(fixture.winnerTeamId, "continental knockout must resolve draws with a winner");
      assert.ok(
        fixture.winnerTeamId === fixture.homeTeamId || fixture.winnerTeamId === fixture.awayTeamId,
        "continental winner must be one of the fixture teams",
      );
    }
  }
  assert.equal(state.phase, "season-end", "continental phase should close the season");
  assert.ok(manager.managerDashboard(state).sponsorOffers.length >= 3, "season end should generate sponsor options");
  const offer = manager.managerDashboard(state).sponsorOffers[0];
  const moneyBeforeSponsor = state.save.money;
  state = manager.chooseManagerSponsor(state, offer.id);
  assert.equal(state.save.sponsorName, offer.name);
  assert.equal(manager.managerDashboard(state).sponsorOffers.length, 0, "chosen sponsor should clear pending offers");
  assert.equal(state.save.money, moneyBeforeSponsor + offer.signingBonus);

  const previousSeason = state.save.season;
  const previousSquadSize = state.squads[state.save.teamId].length;
  state = manager.advanceManagerSeason(state);
  assert.equal(state.save.season, previousSeason + 1);
  assert.equal(state.phase, "preseason");
  assert.equal(state.squads[state.save.teamId].length, previousSquadSize + 2, "academy should promote two prospects");
  assert.ok(state.squads[state.save.teamId].some((player) => player.age === 17 && player.potentialRating > player.rating));

  return state;
}

const created = assertCreateExportImport();
const afterEconomy = assertMarketAndEconomy(created);
const finished = assertRoundScenarios(afterEconomy);

console.log(
  `[manager-career-test] ok - ${finished.save.teamName}, ${finished.save.season} temporada, saldo ${finished.save.money.toLocaleString("pt-BR")}`,
);
