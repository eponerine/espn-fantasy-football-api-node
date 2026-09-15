import { BaseLeague } from '../base/baseLeague.js';
import { Offer } from '../base/baseOffer.js';
import { Team } from './team.js';
import { Matchup } from './matchup.js';
import { BoxScore } from './boxScore.js';
import { BoxPlayer } from './boxPlayer.js';
import { Player } from './player.js';
import { Activity } from './activity.js';
import { Settings } from './settings.js';
import { powerPoints, twoStepDominance } from './utils.js';
import { POSITION_MAP, ACTIVITY_MAP, TRANSACTION_TYPES } from './constant.js';
import { Transaction } from './transaction.js';
import {
  sortByCoinFlip,
  sortByDivisionRecord,
  sortByHeadToHead,
  sortByPointsAgainst,
  sortByPointsFor,
  sortByWinPct,
  sortTeamDataList
} from './helper.js';

export class League extends BaseLeague {
  constructor({ leagueId, year, espnS2 = null, swid = null, debug = false }) {
    super({ leagueId, year, sport: 'nfl', espnS2, swid, debug });
    this.nfl_week = null;
    this._pro_schedule = null;
  }

  static async create({ leagueId, year, espnS2 = null, swid = null, fetchLeague = true, debug = false }) {
    const league = new League({ leagueId, year, espnS2, swid, debug });
    if (fetchLeague) {
      await league.fetchLeague();
    }
    return league;
  }

  async fetchLeague() {
    await this._fetchLeagueData();
  }

  async _fetchLeagueData() {
    const data = await super._fetchLeague(Settings);
    this.nfl_week = data.status.latestScoringPeriod;
    await this._fetchPlayers();
    await this._fetchTeams(data);
    await super._fetchDraft();
  }

  async _fetchTeams(data) {
    if (!this._pro_schedule) {
      this._pro_schedule = await this._getAllProSchedule();
    }
    await super._fetchTeams(data, Team, this._pro_schedule);

    for (const team of this.teams) {
      team.division_name = this.settings.division_map[team.division_id] || '';
      for (let week = 0; week < team.schedule.length; week += 1) {
        const matchup = team.schedule[week];
        const opponent = this.teams.find((t) => t.team_id === matchup);
        if (opponent) {
          team.schedule[week] = opponent;
        }
      }
    }

    for (const team of this.teams) {
      team.mov = [];
      for (let week = 0; week < team.schedule.length; week += 1) {
        const opponent = team.schedule[week];
        team.mov.push(team.scores[week] - opponent.scores[week]);
      }
    }
  }

  async _getPositionalRatings(week) {
    const data = await this.espn_request.leagueGet({
      params: { view: 'mPositionalRatings', scoringPeriodId: week }
    });

    const ratings = data.positionAgainstOpponent?.positionalRatings || {};
    const positionalRatings = {};
    for (const [pos, rating] of Object.entries(ratings)) {
      const teamsRating = {};
      for (const [team, row] of Object.entries(rating.ratingsByOpponent || {})) {
        teamsRating[team] = row.rank;
      }
      positionalRatings[pos] = teamsRating;
    }

    return positionalRatings;
  }

  async refresh() {
    const data = await super._fetchLeague();
    this.nfl_week = data.status.latestScoringPeriod;
    await this._fetchTeams(data);
  }

  async refreshDraft({ refreshPlayers = false, refreshTeams = false } = {}) {
    await super._fetchDraft();
    if (refreshPlayers) {
      await this._fetchPlayers();
    }
    if (refreshTeams) {
      const data = await super._fetchLeague(Settings);
      await this._fetchTeams(data);
    }
  }

  async loadRosterWeek(week) {
    const data = await this.espn_request.leagueGet({ params: { view: 'mRoster', scoringPeriodId: week } });
    const teamRoster = {};

    for (const team of data.teams || []) {
      teamRoster[team.id] = team.roster;
    }

    for (const team of this.teams) {
      team._fetchRoster(teamRoster[team.team_id], this.year, this._pro_schedule);
    }
  }

  standings() {
    return super.standings();
  }

  standingsWeekly(week) {
    if (this.currentMatchupPeriod <= 1) {
      return this.standings();
    }

    const teamDataList = this.teams.map((team) => {
      const outcomes = team.outcomes.slice(0, week);
      const gamesPlayed = outcomes.filter((o) => ['W', 'T', 'L'].includes(o)).length;
      const wins = outcomes.filter((o) => o === 'W').length;
      const ties = outcomes.filter((o) => o === 'T').length;

      return {
        team,
        team_id: team.team_id,
        division_id: team.division_id,
        wins,
        ties,
        losses: outcomes.filter((o) => o === 'L').length,
        points_for: team.scores.slice(0, week).reduce((acc, v) => acc + v, 0),
        points_against: team.schedule
          .slice(0, week)
          .reduce((acc, opp, idx) => acc + (opp !== team ? opp.scores[idx] : 0), 0),
        schedule: team.schedule.slice(0, week),
        outcomes,
        win_pct: (wins + ties / 2) / Math.max(gamesPlayed, 1)
      };
    });

    let tiebreakerHierarchy;
    if (this.settings.playoff_seed_tie_rule === 'TOTAL_POINTS_SCORED') {
      tiebreakerHierarchy = [
        [sortByWinPct, 'win_pct'],
        [sortByPointsFor, 'points_for'],
        [sortByHeadToHead, 'h2h_wins'],
        [sortByDivisionRecord, 'division_record'],
        [sortByPointsAgainst, 'points_against'],
        [sortByCoinFlip, 'coin_flip']
      ];
    } else if (this.settings.playoff_seed_tie_rule === 'H2H_RECORD') {
      tiebreakerHierarchy = [
        [sortByWinPct, 'win_pct'],
        [sortByHeadToHead, 'h2h_wins'],
        [sortByPointsFor, 'points_for'],
        [sortByDivisionRecord, 'division_record'],
        [sortByPointsAgainst, 'points_against'],
        [sortByCoinFlip, 'coin_flip']
      ];
    } else if (this.settings.playoff_seed_tie_rule === 'INTRA_DIVISION_RECORD') {
      tiebreakerHierarchy = [
        [sortByDivisionRecord, 'division_record'],
        [sortByHeadToHead, 'h2h_wins'],
        [sortByWinPct, 'win_pct'],
        [sortByPointsFor, 'points_for'],
        [sortByPointsAgainst, 'points_against'],
        [sortByCoinFlip, 'coin_flip']
      ];
    } else {
      throw new Error("Unknown tiebreaker_method: Must be 'TOTAL_POINTS_SCORED', 'H2H_RECORD', or 'INTRA_DIVISION_RECORD'");
    }

    const remaining = [...teamDataList];
    const divisionWinners = [];
    for (const divisionId of Object.keys(this.settings.division_map)) {
      const divisionTeams = remaining.filter((teamData) => String(teamData.division_id) === String(divisionId));
      if (!divisionTeams.length) {
        continue;
      }
      const winner = sortTeamDataList(divisionTeams, tiebreakerHierarchy)[0];
      divisionWinners.push(winner);
      const index = remaining.findIndex((item) => item.team_id === winner.team_id);
      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }

    const sortedDivisionWinners = sortTeamDataList(divisionWinners, tiebreakerHierarchy);
    const sortedRest = sortTeamDataList(remaining, tiebreakerHierarchy);
    return [...sortedDivisionWinners, ...sortedRest].map((row) => row.team);
  }

  topScorer() {
    return [...this.teams].sort((a, b) => b.points_for - a.points_for)[0];
  }

  leastScorer() {
    return [...this.teams].sort((a, b) => a.points_for - b.points_for)[0];
  }

  mostPointsAgainst() {
    return [...this.teams].sort((a, b) => b.points_against - a.points_against)[0];
  }

  topScoredWeek() {
    return this.teams
      .map((team) => [team, Math.max(...team.scores.slice(0, this.current_week))])
      .sort((a, b) => b[1] - a[1])[0];
  }

  leastScoredWeek() {
    return this.teams
      .map((team) => [team, Math.min(...team.scores.slice(0, this.current_week))])
      .sort((a, b) => a[1] - b[1])[0];
  }

  async recentActivity({ size = 25, msgType = null, offset = 0 } = {}) {
    if (this.year < 2019) {
      throw new Error('Cant use recent activity before 2019');
    }

    let msgTypes = [178, 180, 179, 239, 181, 244];
    if (msgType in ACTIVITY_MAP) {
      msgTypes = [ACTIVITY_MAP[msgType]];
    }

    const filters = {
      topics: {
        filterType: { value: ['ACTIVITY_TRANSACTIONS'] },
        limit: size,
        limitPerMessageSet: { value: 25 },
        offset,
        sortMessageDate: { sortPriority: 1, sortAsc: false },
        sortFor: { sortPriority: 2, sortAsc: false },
        filterIncludeMessageTypeIds: { value: msgTypes }
      }
    };

    const data = await this.espn_request.leagueGet({
      extend: '/communication/',
      params: { view: 'kona_league_communication' },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) }
    });

    return (data.topics || []).map((topic) =>
      new Activity(
        topic,
        this.player_map,
        (teamId) => this.getTeamData(teamId),
        ({ playerId }) => this.player_map[playerId] || null
      )
    );
  }

  async scoreboard(week = null) {
    const resolvedWeek = week || this.current_week;
    const data = await this.espn_request.leagueGet({ params: { view: 'mMatchupScore' } });

    const matchups = (data.schedule || [])
      .filter((m) => m.matchupPeriodId === resolvedWeek)
      .map((matchup) => new Matchup(matchup));

    for (const team of this.teams) {
      for (const matchup of matchups) {
        if (matchup._home_team_id === team.team_id) {
          matchup.home_team = team;
        } else if (matchup._away_team_id === team.team_id) {
          matchup.away_team = team;
        }
      }
    }

    return matchups;
  }

  async boxScores(week = null, playerTeamCache = null) {
    if (this.year < 2019) {
      throw new Error('Cant use box score before 2019');
    }

    const requestedWeek = week ? Number(week) : null;
    if (requestedWeek !== null && (!Number.isInteger(requestedWeek) || requestedWeek < 1)) {
      throw new Error('week must be a positive integer');
    }
    if (requestedWeek !== null && requestedWeek > this.current_week) {
      throw new Error(`week ${requestedWeek} has not occurred yet (current_week=${this.current_week})`);
    }

    const scoringPeriod = requestedWeek || this.current_week;
    if (scoringPeriod > this.finalScoringPeriod) {
      throw new Error(`week must be <= final scoring period (${this.finalScoringPeriod})`);
    }

    let matchupPeriod = this.currentMatchupPeriod;
    for (const matchupId of Object.keys(this.settings.matchup_periods || {})) {
      if ((this.settings.matchup_periods[matchupId] || []).includes(scoringPeriod)) {
        matchupPeriod = Number(matchupId);
        break;
      }
    }

    const filters = { schedule: { filterMatchupPeriodIds: { value: [matchupPeriod] } } };
    const data = await this.espn_request.leagueGet({
      params: { view: ['mMatchupScore', 'mScoreboard'], scoringPeriodId: scoringPeriod },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) }
    });

    const schedule = data.schedule || [];
    const proSchedule = await this._getProSchedule(scoringPeriod);
    const positionalRankings = await this._getPositionalRatings(scoringPeriod);
    const boxData = schedule.map((matchup) => new BoxScore(matchup, proSchedule, positionalRankings, scoringPeriod, this.year, playerTeamCache || {}));

    for (const team of this.teams) {
      for (const matchup of boxData) {
        if (matchup.home_team === team.team_id) {
          matchup.home_team = team;
        } else if (matchup.away_team === team.team_id) {
          matchup.away_team = team;
        }
      }
    }

    return boxData;
  }

  powerRankings(week = null) {
    let resolvedWeek = week;
    if (!resolvedWeek || resolvedWeek <= 0 || resolvedWeek > this.current_week) {
      resolvedWeek = this.current_week;
    }

    const teamsSorted = [...this.teams].sort((a, b) => a.team_id - b.team_id);
    const winMatrix = [];
    for (const team of teamsSorted) {
      const wins = Array.from({ length: teamsSorted.length }, () => 0);
      for (let i = 0; i < resolvedWeek; i += 1) {
        const mov = team.mov[i];
        const opp = team.schedule[i];
        const idx = teamsSorted.indexOf(opp);
        if (mov > 0 && idx >= 0) {
          wins[idx] += 1;
        }
      }
      winMatrix.push(wins);
    }

    const dominance = twoStepDominance(winMatrix);
    return powerPoints(dominance, teamsSorted, resolvedWeek);
  }

  async freeAgents({ week = null, size = 50, position = null, positionId = null } = {}) {
    if (this.year < 2019) {
      throw new Error('Cant use free agents before 2019');
    }

    const resolvedWeek = week || this.current_week;
    const slotFilter = [];
    if (position && position in POSITION_MAP) {
      slotFilter.push(POSITION_MAP[position]);
    }
    if (positionId) {
      slotFilter.push(positionId);
    }

    const filters = {
      players: {
        filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
        filterSlotIds: { value: slotFilter },
        limit: size,
        sortPercOwned: { sortPriority: 1, sortAsc: false },
        sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' }
      }
    };

    const data = await this.espn_request.leagueGet({
      params: { view: 'kona_player_info', scoringPeriodId: resolvedWeek },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) }
    });

    const players = data.players || [];
    const proSchedule = await this._getProSchedule(resolvedWeek);
    const positionalRankings = await this._getPositionalRatings(resolvedWeek);

    return players.map((player) => new BoxPlayer(player, proSchedule, positionalRankings, resolvedWeek, this.year));
  }

  async playerInfo({ name = null, playerId = null } = {}) {
    let resolvedPlayerId = playerId;
    if (name) {
      resolvedPlayerId = this.player_map[name];
    }

    if (resolvedPlayerId === null || resolvedPlayerId === undefined || typeof resolvedPlayerId === 'string') {
      return null;
    }

    const playerIds = Array.isArray(resolvedPlayerId) ? resolvedPlayerId : [resolvedPlayerId];
    const data = await this.espn_request.getPlayerCard(playerIds, this.finalScoringPeriod);
    const proSchedule = await this._getAllProSchedule();

    if ((data.players || []).length === 1) {
      return new Player(data.players[0], this.year, proSchedule);
    }

    if ((data.players || []).length > 1) {
      return data.players.map((player) => new Player(player, this.year, proSchedule));
    }

    return null;
  }

  async messageBoard(msgTypes = null) {
    const data = await this.espn_request.getLeagueMessageBoard(msgTypes);
    const topics = Object.keys(data.topicsByType || {});
    const messages = [];
    for (const topic of topics) {
      messages.push(...(data.topicsByType[topic] || []));
    }
    return messages;
  }

  async transactions({ scoringPeriod = null, types = new Set(['FREEAGENT', 'WAIVER', 'WAIVER_ERROR']) } = {}) {
    const resolvedScoringPeriod = scoringPeriod || this.scoringPeriodId;

    for (const type of types) {
      if (!TRANSACTION_TYPES.has(type)) {
        throw new Error('Invalid transaction type');
      }
    }

    const filters = { transactions: { filterType: { value: [...types] } } };
    const data = await this.espn_request.leagueGet({
      params: { view: 'mTransactions2', scoringPeriodId: resolvedScoringPeriod },
      headers: { 'x-fantasy-filter': JSON.stringify(filters) }
    });

    if (!('transactions' in data)) {
      throw new Error('No transactions found');
    }

    return data.transactions.map((transaction) => new Transaction(transaction, this.player_map, (teamId) => this.getTeamData(teamId)));
  }

  async offersReport(week = null) {
    const data = await this._getOffers(week);
    const bids = data.map((bid) => new Offer(bid));
    if (!bids.length) {
      return [];
    }

    for (const bid of bids) {
      if (bid.result !== 'Canceled' && bid.dateTime === null) {
        const fallback = bids.find((other) =>
          bid.id !== other.id &&
          other.dateTime !== null &&
          other.player === bid.player &&
          other.teamId === bid.teamId
        );
        if (fallback) {
          bid.dateTime = fallback.dateTime;
        }
      }
    }

    const reports = new Map();
    for (const bid of bids) {
      const key = bid.dateTime ? bid.dateTime.toISOString() : 'null';
      if (!reports.has(key)) {
        reports.set(key, []);
      }
      reports.get(key).push(bid);
    }

    const sortedTimes = [...reports.keys()].filter((t) => t !== 'null').sort();
    const sortedOffers = [];

    for (const reportTime of sortedTimes) {
      const report = reports.get(reportTime);
      report.sort((a, b) => b.compare(a));

      const processedPlayers = new Set();
      for (const bid of report) {
        if (processedPlayers.has(bid.player)) {
          continue;
        }

        sortedOffers.push(bid);
        processedPlayers.add(bid.player);

        for (const otherBid of report) {
          if (otherBid.id !== bid.id && otherBid.player === bid.player) {
            sortedOffers.push(otherBid);
          }
        }
      }
    }

    return sortedOffers;
  }
}
