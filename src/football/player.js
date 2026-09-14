import { POSITION_MAP, PRO_TEAM_MAP, PLAYER_STATS_MAP } from './constant.js';
import { jsonParsing } from './utils.js';

export class Player {
  constructor(data, year, proTeamSchedule = null) {
    this.name = jsonParsing(data, 'fullName');
    this.playerId = jsonParsing(data, 'id');
    this.posRank = jsonParsing(data, 'positionalRanking');
    this.eligibleSlots = (jsonParsing(data, 'eligibleSlots') || []).map((pos) => POSITION_MAP[pos]);
    this.acquisitionType = jsonParsing(data, 'acquisitionType');
    this.proTeam = PRO_TEAM_MAP[jsonParsing(data, 'proTeamId')];
    this.jersey = jsonParsing(data, 'jersey');
    this.injuryStatus = jsonParsing(data, 'injuryStatus');
    this.onTeamId = jsonParsing(data, 'onTeamId');
    this.lineupSlot = POSITION_MAP[data?.lineupSlotId] || '';
    this.position = '';
    this.stats = {};
    this.schedule = {};

    for (const pos of jsonParsing(data, 'eligibleSlots') || []) {
      if ((pos !== 25 && !String(POSITION_MAP[pos]).includes('/')) || String(this.name).includes('/')) {
        this.position = POSITION_MAP[pos];
        break;
      }
    }

    if (proTeamSchedule) {
      const proTeamId = jsonParsing(data, 'proTeamId');
      const proTeam = proTeamSchedule?.[proTeamId] || {};
      for (const key of Object.keys(proTeam)) {
        const game = proTeam[key][0];
        const team = game.awayProTeamId !== proTeamId ? game.awayProTeamId : game.homeProTeamId;
        this.schedule[key] = {
          team: PRO_TEAM_MAP[team],
          date: new Date(game.date)
        };
      }
    }

    const player = data.playerPoolEntry ? data.playerPoolEntry.player : data.player;
    this.injuryStatus = player?.injuryStatus || this.injuryStatus;
    this.injured = player?.injured || false;
    this.percent_owned = Number((player?.ownership?.percentOwned ?? -1).toFixed(2));
    this.percent_started = Number((player?.ownership?.percentStarted ?? -1).toFixed(2));

    this.active_status = 'bye';
    const playerStats = player?.stats || [];
    for (const statEntry of playerStats) {
      if (statEntry.seasonId !== year || statEntry.statSplitTypeId === 2) {
        continue;
      }

      const breakdown = {};
      for (const [k, v] of Object.entries(statEntry.stats || {})) {
        breakdown[PLAYER_STATS_MAP[Number(k)] || k] = v;
      }

      const pointsBreakdown = {};
      for (const [k, v] of Object.entries(statEntry.appliedStats || {})) {
        pointsBreakdown[PLAYER_STATS_MAP[Number(k)] || k] = v;
      }

      const points = Number((statEntry.appliedTotal || 0).toFixed(2));
      const avgPoints = Number((statEntry.appliedAverage || 0).toFixed(2));
      const scoringPeriod = statEntry.scoringPeriodId;
      const statSource = statEntry.statSourceId;

      const pointsType = statSource === 0 ? 'points' : 'projected_points';
      const breakdownType = statSource === 0 ? 'breakdown' : 'projected_breakdown';
      const pointsBreakdownType = statSource === 0 ? 'points_breakdown' : 'projected_points_breakdown';
      const avgType = statSource === 0 ? 'avg_points' : 'projected_avg_points';

      this.stats[scoringPeriod] = this.stats[scoringPeriod] || {};
      this.stats[scoringPeriod][pointsType] = points;
      this.stats[scoringPeriod][breakdownType] = breakdown;
      this.stats[scoringPeriod][pointsBreakdownType] = pointsBreakdown;
      this.stats[scoringPeriod][avgType] = avgPoints;

      if (statSource === 0) {
        this.active_status = Object.keys(this.stats[scoringPeriod][breakdownType]).length ? 'active' : 'inactive';
      }
    }

    this.total_points = this.stats?.[0]?.points || 0;
    this.projected_total_points = this.stats?.[0]?.projected_points || 0;
    this.avg_points = this.stats?.[0]?.avg_points || 0;
    this.projected_avg_points = this.stats?.[0]?.projected_avg_points || 0;
  }

  toString() {
    return `Player(${this.name})`;
  }
}
