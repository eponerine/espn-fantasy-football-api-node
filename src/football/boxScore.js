import { BoxPlayer } from './boxPlayer.js';

export class BoxScore {
  constructor(data, proSchedule, positionalRankings, week, year, playerTeamCache = null) {
    this.matchup_type = data.playoffTierType || 'NONE';
    this.is_playoff = this.matchup_type !== 'NONE';

    const [homeTeam, homeScore, homeProjected, homeLineup] = this._getTeamData('home', data, proSchedule, positionalRankings, week, year, playerTeamCache);
    this.home_team = homeTeam;
    this.home_score = homeScore;
    this.home_lineup = homeLineup;
    this.home_projected = this._getProjectedScore(homeProjected, homeLineup);

    const [awayTeam, awayScore, awayProjected, awayLineup] = this._getTeamData('away', data, proSchedule, positionalRankings, week, year, playerTeamCache);
    this.away_team = awayTeam;
    this.away_score = awayScore;
    this.away_lineup = awayLineup;
    this.away_projected = this._getProjectedScore(awayProjected, awayLineup);
  }

  _getProjectedScore(projectedScore, lineup) {
    if (projectedScore !== -1) {
      return projectedScore;
    }

    return lineup
      .filter((player) => player.slot_position !== 'BE' && player.slot_position !== 'IR')
      .reduce((acc, player) => acc + player.projected_points, 0);
  }

  _getTeamData(team, data, proSchedule, positionalRankings, week, year, playerTeamCache) {
    if (!(team in data)) {
      return [null, 0, -1, []];
    }

    const teamId = data[team].teamId;
    let teamProjected = -1;
    let teamScore;
    if ('totalPointsLive' in data[team]) {
      teamScore = Number((data[team].totalPointsLive || 0).toFixed(2));
      teamProjected = Number((data[team].totalProjectedPointsLive ?? -1).toFixed(2));
    } else {
      teamScore = Number((data[team].totalPoints || 0).toFixed(2));
    }

    const roster = data[team].rosterForCurrentScoringPeriod?.entries || [];
    const lineup = roster.map((player) => new BoxPlayer(player, proSchedule, positionalRankings, week, year, playerTeamCache));
    return [teamId, teamScore, teamProjected, lineup];
  }

  toString() {
    const away = this.away_team || 'BYE';
    const home = this.home_team || 'BYE';
    return `Box Score(${away} at ${home})`;
  }
}
