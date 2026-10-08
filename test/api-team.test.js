import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';

import { EspnFantasyRequests } from '../src/requests/espnFantasyRequests.js';
import { makeLeagueOwnersFixture } from './fixtures/leagueOwners.js';

test('teams and standings HTTP responses expose owner names and raw member records', async (context) => {
  const data = makeLeagueOwnersFixture();
  context.mock.method(EspnFantasyRequests.prototype, 'getLeague', async () => data);
  context.mock.method(EspnFantasyRequests.prototype, 'getProPlayers', async () => []);
  context.mock.method(EspnFantasyRequests.prototype, 'getProSchedule', async () => ({ settings: { proTeams: [] } }));
  context.mock.method(EspnFantasyRequests.prototype, 'getLeagueDraft', async () => ({}));

  const listen = express.application.listen;
  let server;
  context.mock.method(express.application, 'listen', function (_port, callback) {
    server = listen.call(this, 0, '127.0.0.1', callback);
    return server;
  });

  await import('../src/api/server.js');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  if (!server.listening) {
    await once(server, 'listening');
  }

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['teams', 'standings']) {
    const response = await fetch(`${baseUrl}/${route}?leagueId=123456&year=2026`);
    assert.equal(response.status, 200);
    const body = await response.json();
    const teams = body[route];
    const team = teams.find((item) => item.team_id === 2);
    assert.equal(team.team_name, 'Co-managed Club');
    assert.deepEqual(team.owner_names, ['Jordan Lee', 'Alex Rivera']);
    assert.deepEqual(team.owners, [data.members[0], data.members[2]]);
    assert.deepEqual(teams.find((item) => item.team_id === 3).owner_names,
      ['Coach Morgan', 'Sam', 'Quinn', 'Backup Coach']);
    assert.deepEqual(teams.find((item) => item.team_id === 4).owner_names, []);
    assert.deepEqual(teams.find((item) => item.team_id === 4).owners, []);
  }
});