import { Player } from './player.js';
import { POSITION_MAP, PRO_TEAM_MAP } from './constant.js';

export class BoxPlayer extends Player {
  constructor(data, proSchedule, positionalRankings, week, year, playerTeamCache = null) {
    super(data, year);
    this.slot_position = 'FA';
    this.pro_opponent = 'None';
    this.pro_pos_rank = 0;
    this.game_played = 100;
    this.on_bye_week = false;

    if ('lineupSlotId' in data) {
      this.slot_position = POSITION_MAP[data.lineupSlotId];
    }

    const player = data.playerPoolEntry ? data.playerPoolEntry.player : data.player;
    let proTeamId = player.proTeamId;

    const playerStats = player.stats || [];
    let foundActual = false;
    for (const stat of playerStats) {
      if (stat.scoringPeriodId === week && stat.statSourceId === 0 && (stat.proTeamId || 0) !== 0) {
        proTeamId = stat.proTeamId;
        this.proTeam = PRO_TEAM_MAP[proTeamId] || this.proTeam;
        foundActual = true;
        break;
      }
    }

    if (!foundActual && playerTeamCache) {
      const cached = playerTeamCache[this.playerId];
      if (cached) {
        proTeamId = cached;
        this.proTeam = PRO_TEAM_MAP[proTeamId] || this.proTeam;
      }
    }

    if (playerTeamCache && foundActual) {
      playerTeamCache[this.playerId] = proTeamId;
    }

    if (proSchedule[proTeamId]) {
      const [oppId, date] = proSchedule[proTeamId];
      this.game_date = new Date(date);
      this.game_played = Date.now() > (new Date(date).getTime() + (3 * 60 * 60 * 1000)) ? 100 : 0;
      const posId = String(player.defaultPositionId);
      if (posId in positionalRankings) {
        this.pro_opponent = PRO_TEAM_MAP[oppId];
        this.pro_pos_rank = positionalRankings[posId]?.[String(oppId)] || 0;
      }
    } else {
      this.on_bye_week = true;
    }

    const stats = this.stats?.[week] || {};
    this.points = stats.points || 0;
    this.breakdown = stats.breakdown || {};
    this.points_breakdown = stats.points_breakdown || {};
    this.projected_points = stats.projected_points || 0;
    this.projected_breakdown = stats.projected_breakdown || {};
    this.projected_points_breakdown = stats.projected_points_breakdown || {};
  }

  toString() {
    return `Player(${this.name}, points:${this.points}, projected:${this.projected_points})`;
  }
}
