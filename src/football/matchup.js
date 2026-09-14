export class Matchup {
  constructor(data) {
    this.matchup_type = data.playoffTierType || 'NONE';
    this.is_playoff = this.matchup_type !== 'NONE';

    const [homeId, homeScore] = this._fetchMatchupInfo(data, 'home');
    const [awayId, awayScore] = this._fetchMatchupInfo(data, 'away');
    this._home_team_id = homeId;
    this.home_score = homeScore;
    this._away_team_id = awayId;
    this.away_score = awayScore;
  }

  _fetchMatchupInfo(data, team) {
    if (!(team in data)) {
      return [0, 0];
    }

    return [data[team].teamId, data[team].totalPoints];
  }

  toString() {
    if (this.away_team) {
      return `Matchup(${this.home_team}, ${this.away_team})`;
    }
    return `Matchup(${this.home_team}, N/A)`;
  }
}
