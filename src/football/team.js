import { Player } from './player.js';
import { PLAYER_STATS_MAP } from './constant.js';

export class Team {
  constructor(data, roster, schedule, year, kwargs = {}) {
    this.team_id = data.id;
    this.team_abbrev = data.abbrev;
    this.team_name = data.name || 'Unknown';
    if (this.team_name === 'Unknown') {
      this.team_name = `${data.location || 'Unknown'} ${data.nickname || 'Unknown'}`;
    }

    this.division_id = data.divisionId;
    this.division_name = '';
    this.wins = data.record.overall.wins;
    this.losses = data.record.overall.losses;
    this.ties = data.record.overall.ties;
    this.points_for = data.record.overall.pointsFor;
    this.points_against = Number((data.record.overall.pointsAgainst || 0).toFixed(2));
    this.acquisitions = data.transactionCounter?.acquisitions || 0;
    this.acquisition_budget_spent = data.transactionCounter?.acquisitionBudgetSpent || 0;
    this.drops = data.transactionCounter?.drops || 0;
    this.trades = data.transactionCounter?.trades || 0;
    this.move_to_ir = data.transactionCounter?.moveToIR || 0;
    this.playoff_pct = (data.currentSimulationResults?.playoffPct || 0) * 100;
    this.draft_projected_rank = data.draftDayProjectedRank || 0;
    this.streak_length = data.record.overall.streakLength;
    this.streak_type = data.record.overall.streakType;
    this.standing = data.playoffSeed;
    this.final_standing = data.rankFinal || data.rankCalculatedFinal || 0;
    this.waiver_rank = data.waiverRank || 0;
    this.logo_url = data.logo || '';

    this.roster = [];
    this.schedule = [];
    this.scores = [];
    this.outcomes = [];
    this.mov = [];

    this._fetchSchedule(schedule);
    this._fetchRoster(roster, year, kwargs.proSchedule);
    this.owners = kwargs.owners || [];

    this.stats = {};
    const valuesByStat = data.valuesByStat || {};
    for (const [k, v] of Object.entries(valuesByStat)) {
      this.stats[PLAYER_STATS_MAP[Number(k)] || k] = v;
    }
  }

  toString() {
    return `Team(${this.team_name})`;
  }

  _fetchRoster(data, year, proSchedule = null) {
    this.roster = [];
    for (const player of data?.entries || []) {
      this.roster.push(new Player(player, year, proSchedule));
    }
  }

  _fetchSchedule(data) {
    for (const matchup of data || []) {
      const homeTeam = matchup.home || {};
      const awayTeam = matchup.away || {};
      const homeId = homeTeam.teamId ?? -1;
      const awayId = awayTeam.teamId ?? -1;

      if (this.team_id === homeId || this.team_id === awayId) {
        const isHome = homeId === this.team_id;
        const currentTeam = isHome ? homeTeam : awayTeam;
        let opponentId = isHome ? awayId : homeId;
        const isAway = !isHome;

        if (opponentId === -1) {
          opponentId = this.team_id;
        }

        this.outcomes.push(this._getWinner(matchup.winner, isAway));
        this.scores.push(currentTeam.totalPoints);
        this.schedule.push(opponentId);
      }
    }
  }

  _getWinner(winner, isAway) {
    if (winner === 'UNDECIDED') {
      return 'U';
    }
    if (winner === 'TIE') {
      return 'T';
    }
    if ((isAway && winner === 'AWAY') || (!isAway && winner === 'HOME')) {
      return 'W';
    }
    return 'L';
  }

  getPlayerName(playerId) {
    const player = this.roster.find((p) => p.playerId === playerId);
    return player ? player.name : '';
  }
}
