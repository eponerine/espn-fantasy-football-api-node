import { BaseSettings } from '../base/baseSettings.js';
import { SETTINGS_SCORING_FORMAT_MAP, POSITION_MAP } from './constant.js';

export class Settings extends BaseSettings {
  constructor(data) {
    super(data);
    this.scoring_format = [];

    const scoringItems = data.scoringSettings?.scoringItems || [];
    const lineupSlotCounts = data.rosterSettings?.lineupSlotCounts || {};
    const positionLabels = Object.values(POSITION_MAP).slice(0, Object.keys(lineupSlotCounts).length);
    this.position_slot_counts = Object.fromEntries(positionLabels.map((label, idx) => [label, Object.values(lineupSlotCounts)[idx]]));

    for (const scoringItem of scoringItems) {
      const statId = scoringItem.statId;
      const pointsOverride = scoringItem.pointsOverrides?.['16'];
      const scoringType = { ...(SETTINGS_SCORING_FORMAT_MAP[statId] || { abbr: 'Unknown', label: 'Unknown' }) };
      scoringType.id = statId;
      scoringType.points = pointsOverride ?? (scoringItem.points || 0);
      this.scoring_format.push(scoringType);
    }
  }
}
