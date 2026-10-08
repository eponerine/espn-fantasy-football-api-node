export function makeLeagueOwnersFixture() {
  return {
    seasonId: 2026,
    scoringPeriodId: 1,
    status: {
      currentMatchupPeriod: 1,
      firstScoringPeriod: 1,
      finalScoringPeriod: 17,
      latestScoringPeriod: 1
    },
    settings: {
      size: 4,
      name: 'Owner Fixture League',
      scheduleSettings: { divisions: [] },
      tradeSettings: {},
      draftSettings: {},
      acquisitionSettings: {},
      scoringSettings: {},
      rosterSettings: {}
    },
    members: [
      { id: 'owner-b', firstName: '  Jordan ', lastName: ' Lee  ', displayName: 'jlee', extra: 'preserved' },
      { id: 'unrelated', firstName: 'Not', lastName: 'An Owner' },
      { id: 'owner-a', firstName: 'Alex', lastName: 'Rivera', displayName: 'arivera' },
      { id: 'display-only', displayName: '  Coach Morgan  ' },
      { id: 'first-only', firstName: ' Sam ', displayName: 'sam123' },
      { id: 'last-only', lastName: ' Quinn ' },
      { id: 'blank-name', firstName: ' ', lastName: '', displayName: '  Backup Coach ' },
      { id: 'nameless' }
    ],
    teams: [
      { id: 2, name: 'Co-managed Club', owners: ['owner-a', 'owner-b', 'unknown-owner'] },
      { id: 1, name: 'Sunday Squad', owners: ['owner-a'] },
      { id: 3, name: 'Fallback Club', owners: ['display-only', 'first-only', 'last-only', 'blank-name', 'nameless'] },
      { id: 4, name: 'Unclaimed Club' }
    ].map((team) => ({
      ...team,
      divisionId: 0,
      record: { overall: { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 } },
      roster: { entries: [] }
    })),
    schedule: []
  };
}