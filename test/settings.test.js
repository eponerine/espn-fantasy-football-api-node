import test from 'node:test';
import assert from 'node:assert/strict';

import { Settings } from '../src/football/settings.js';

function makeSettings(lineupSlotCounts, scoringItems = []) {
  return new Settings({
    size: 10,
    name: 'Fixture League',
    scheduleSettings: {
      matchupPeriodCount: 14,
      matchupPeriods: [],
      playoffTeamCount: 4,
      playoffSeedingRule: 'TOTAL_POINTS_SCORED',
      divisions: []
    },
    tradeSettings: { vetoVotesRequired: 2, deadlineDate: 0 },
    draftSettings: { keeperCount: 0 },
    acquisitionSettings: { isUsingAcquisitionBudget: false },
    scoringSettings: {
      matchupTieRule: 'NONE',
      playoffMatchupTieRule: 'NONE',
      scoringItems
    },
    rosterSettings: { lineupSlotCounts }
  });
}

test('maps sparse lineup slot counts by slot ID', () => {
  const settings = makeSettings({ 0: 1, 2: 2, 4: 2, 6: 1, 16: 1, 17: 1, 20: 7, 21: 1, 23: 2 });

  assert.deepEqual(settings.position_slot_counts, {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    'D/ST': 1,
    K: 1,
    BE: 7,
    IR: 1,
    'RB/WR/TE': 2
  });
});

test('maps full contiguous lineup slot counts without reverse-map shear', () => {
  const settings = makeSettings(Object.fromEntries(Array.from({ length: 25 }, (_, slotId) => [slotId, slotId])));

  assert.equal(settings.position_slot_counts.QB, 0);
  assert.equal(settings.position_slot_counts['RB/WR/TE'], 23);
  assert.equal(settings.position_slot_counts.SLOT_22, 22);
});

test('describes FLEX and OP lineup eligibility and preserves raw roster settings', () => {
  const rosterSettings = { lineupSlotCounts: { 7: 1, 23: 2 } };
  const settings = makeSettings(rosterSettings.lineupSlotCounts);

  assert.deepEqual(settings.lineup_slots.find((slot) => slot.slot_id === 23), {
    slot_id: 23,
    slot: 'RB/WR/TE',
    count: 2,
    eligible_positions: ['RB', 'WR', 'TE'],
    type: 'FLEX'
  });
  assert.deepEqual(settings.lineup_slots.find((slot) => slot.slot_id === 7), {
    slot_id: 7,
    slot: 'OP',
    count: 1,
    eligible_positions: ['QB', 'RB', 'WR', 'TE'],
    type: 'FLEX'
  });
  assert.deepEqual(settings._raw_roster_settings, { lineupSlotCounts: { 7: 1, 23: 2 } });
});

test('falls back to PLAYER_STATS_MAP labels for unmapped scoring IDs', () => {
  const settings = makeSettings({ 0: 1 }, [{ statId: 62, points: 2 }]);

  assert.deepEqual(settings.scoring_format[0], {
    id: 62,
    abbr: '62',
    label: '2PtConversions',
    points: 2
  });
});