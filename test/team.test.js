import test from 'node:test';
import assert from 'node:assert/strict';

import { League } from '../src/football/league.js';
import { Team } from '../src/football/team.js';
import { EspnFantasyRequests } from '../src/requests/espnFantasyRequests.js';
import { makeLeagueOwnersFixture } from './fixtures/leagueOwners.js';

async function loadFixture(context, data = makeLeagueOwnersFixture()) {
  const league = await League.create({ leagueId: 123456, year: 2026, fetchLeague: false });
  context.mock.method(league.espn_request, 'getLeague', async () => data);
  context.mock.method(league.espn_request, 'getProPlayers', async () => []);
  context.mock.method(league.espn_request, 'getProSchedule', async () => ({ settings: { proTeams: [] } }));
  context.mock.method(league.espn_request, 'getLeagueDraft', async () => ({}));
  await league.fetchLeague();
  return league;
}

test('league request includes the mTeam view', async (context) => {
  const request = new EspnFantasyRequests({ sport: 'nfl', leagueId: 123456, year: 2026 });
  const leagueGet = context.mock.method(request, 'leagueGet', async () => ({}));
  await request.getLeague();
  assert.ok(leagueGet.mock.calls[0].arguments[0].params.view.includes('mTeam'));
});

test('league matches owner IDs to member records and exposes names separately from team names', async (context) => {
  const data = makeLeagueOwnersFixture();
  const league = await loadFixture(context, data);
  const team = league.getTeamData(1);

  assert.strictEqual(league.members, data.members);
  assert.deepEqual(team.owners, [data.members.find((member) => member.id === 'owner-a')]);
  assert.strictEqual(team.owners[0], data.members.find((member) => member.id === 'owner-a'));
  assert.equal(team.team_name, 'Sunday Squad');
  assert.deepEqual(team.owner_names, ['Alex Rivera']);
  assert.strictEqual(league.standings().find((item) => item.team_id === 1), team);
});

test('multiple matching owners retain full member data and unmatched IDs are ignored', async (context) => {
  const league = await loadFixture(context);
  const team = league.getTeamData(2);

  assert.deepEqual(team.owners.map((owner) => owner.id), ['owner-b', 'owner-a']);
  assert.equal(team.owners[0].extra, 'preserved');
  assert.deepEqual(team.owner_names, ['Jordan Lee', 'Alex Rivera']);
});

test('names support displayName fallback, partial names, whitespace, and nameless members', async (context) => {
  const league = await loadFixture(context);
  const team = league.getTeamData(3);

  assert.deepEqual(team.owner_names, ['Coach Morgan', 'Sam', 'Quinn', 'Backup Coach']);
  assert.equal(team.owners.length, 5);
  assert.deepEqual(team.owners[4], { id: 'nameless' });
});

test('missing owners, unmatched owners, and missing league members do not break parsing', async (context) => {
  const data = makeLeagueOwnersFixture();
  data.teams[0].owners = ['unknown-owner'];
  const league = await loadFixture(context, data);
  for (const teamId of [2, 4]) {
    assert.deepEqual(league.getTeamData(teamId).owners, []);
    assert.deepEqual(league.getTeamData(teamId).owner_names, []);
  }

  delete data.members;
  await league.refresh();
  assert.deepEqual(league.members, []);
  for (const team of league.teams) {
    assert.deepEqual(team.owners, []);
    assert.deepEqual(team.owner_names, []);
  }
});

test('direct Team construction defaults to no owner records or names', () => {
  const data = makeLeagueOwnersFixture();
  const team = new Team(data.teams[0], {}, [], data.seasonId);
  assert.deepEqual(team.owners, []);
  assert.deepEqual(team.owner_names, []);
});