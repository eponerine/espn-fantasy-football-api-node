import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDivisionRecordDict,
  buildH2hDict,
  sortByHeadToHead,
  sortByWinPct
} from '../src/football/helper.js';

function makeTeam(teamId, divisionId) {
  return {
    team_id: teamId,
    division_id: divisionId,
    scores: [100, 100, 100]
  };
}

test('buildH2hDict tracks wins and games', () => {
  const team1 = makeTeam(1, 1);
  const team2 = makeTeam(2, 1);

  const data = [
    { team: team1, team_id: 1, division_id: 1, schedule: [team2], outcomes: ['W'], win_pct: 1, points_for: 120, points_against: 90 },
    { team: team2, team_id: 2, division_id: 1, schedule: [team1], outcomes: ['L'], win_pct: 0, points_for: 90, points_against: 120 }
  ];

  const h2h = buildH2hDict(data);
  assert.equal(h2h[1][2].h2h_wins, 1);
  assert.equal(h2h[1][2].h2h_games, 1);
});

test('buildDivisionRecordDict computes divisional pct', () => {
  const team1 = makeTeam(1, 1);
  const team2 = makeTeam(2, 1);

  const data = [
    { team: team1, team_id: 1, division_id: 1, schedule: [team2], outcomes: ['W'], win_pct: 1, points_for: 120, points_against: 90 },
    { team: team2, team_id: 2, division_id: 1, schedule: [team1], outcomes: ['L'], win_pct: 0, points_for: 90, points_against: 120 }
  ];

  const records = buildDivisionRecordDict(data);
  assert.equal(records[1], 1);
  assert.equal(records[2], 0);
});

test('sortByHeadToHead handles two team tie', () => {
  const team1 = makeTeam(1, 1);
  const team2 = makeTeam(2, 1);

  const data = [
    { team: team1, team_id: 1, division_id: 1, schedule: [team2], outcomes: ['W'], win_pct: 0.5, points_for: 120, points_against: 100 },
    { team: team2, team_id: 2, division_id: 1, schedule: [team1], outcomes: ['L'], win_pct: 0.5, points_for: 130, points_against: 110 }
  ];

  const sorted = sortByHeadToHead(data);
  assert.equal(sorted[0].team_id, 1);
});

test('sortByWinPct sorts descending', () => {
  const sorted = sortByWinPct([
    { team_id: 1, win_pct: 0.5 },
    { team_id: 2, win_pct: 0.8 },
    { team_id: 3, win_pct: 0.2 }
  ]);

  assert.deepEqual(sorted.map((x) => x.team_id), [2, 1, 3]);
});
