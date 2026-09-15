import { BaseSettings } from '../base/baseSettings.js';
import { PLAYER_STATS_MAP, SETTINGS_SCORING_FORMAT_MAP, POSITION_MAP } from './constant.js';

const LINEUP_SLOT_DEFINITIONS = {
  0: { slot: 'QB', eligible_positions: ['QB'], type: 'START' },
  2: { slot: 'RB', eligible_positions: ['RB'], type: 'START' },
  4: { slot: 'WR', eligible_positions: ['WR'], type: 'START' },
  6: { slot: 'TE', eligible_positions: ['TE'], type: 'START' },
  16: { slot: 'D/ST', eligible_positions: ['D/ST'], type: 'START' },
  17: { slot: 'K', eligible_positions: ['K'], type: 'START' },
  3: { slot: 'RB/WR', eligible_positions: ['RB', 'WR'], type: 'FLEX' },
  5: { slot: 'WR/TE', eligible_positions: ['WR', 'TE'], type: 'FLEX' },
  23: { slot: 'RB/WR/TE', eligible_positions: ['RB', 'WR', 'TE'], type: 'FLEX' },
  7: { slot: 'OP', eligible_positions: ['QB', 'RB', 'WR', 'TE'], type: 'FLEX' },
  20: { slot: 'BE', eligible_positions: [], type: 'BENCH' },
  21: { slot: 'IR', eligible_positions: [], type: 'IR' }
};

export class Settings extends BaseSettings {
  constructor(data) {
    super(data);
    this.scoring_format = [];

    const scoringItems = data.scoringSettings?.scoringItems || [];
    const lineupSlotCounts = data.rosterSettings?.lineupSlotCounts || {};
    this.position_slot_counts = Object.fromEntries(
      Object.entries(lineupSlotCounts).map(([slotId, count]) => {
        const label = POSITION_MAP[Number(slotId)] || `SLOT_${slotId}`;
        return [label, count];
      })
    );
    this.lineup_slots = Object.entries(lineupSlotCounts)
      .filter(([, count]) => Number(count) !== 0)
      .map(([slotId, count]) => {
        const id = Number(slotId);
        const label = POSITION_MAP[id] || `SLOT_${slotId}`;
        const definition = LINEUP_SLOT_DEFINITIONS[id] || {
          slot: label,
          eligible_positions: label.startsWith('SLOT_') ? [] : [label],
          type: 'START'
        };
        return { slot_id: id, ...definition, count };
      });

    for (const scoringItem of scoringItems) {
      const statId = scoringItem.statId;
      const pointsOverride = scoringItem.pointsOverrides?.['16'];
      const statLabel = PLAYER_STATS_MAP[statId];
      const scoringType = {
        ...(SETTINGS_SCORING_FORMAT_MAP[statId]
          || (statLabel ? { abbr: String(statId), label: statLabel } : { abbr: 'Unknown', label: `Unknown (statId ${statId})` }))
      };
      scoringType.id = statId;
      scoringType.points = pointsOverride ?? (scoringItem.points || 0);
      this.scoring_format.push(scoringType);
    }
  }
}
