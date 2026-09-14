import { Logger } from '../utils/logger.js';
import { EspnFantasyRequests } from '../requests/espnFantasyRequests.js';
import { BaseSettings } from './baseSettings.js';
import { BasePick } from './basePick.js';

export class BaseLeague {
  constructor({ leagueId, year, sport, espnS2 = null, swid = null, debug = false }) {
    this.logger = new Logger(`${sport} league`, debug);
    this.league_id = leagueId;
    this.year = year;
    this.teams = [];
    this.members = [];
    this.draft = [];
    this.player_map = {};

    let cookies = null;
    if (espnS2 && swid) {
      cookies = { espn_s2: espnS2, SWID: swid };
    }

    this.espn_request = new EspnFantasyRequests({
      sport,
      year,
      leagueId,
      cookies,
      logger: this.logger
    });
  }

  toString() {
    return `League(${this.league_id}, ${this.year})`;
  }

  async _fetchLeague(SettingsClass = BaseSettings) {
    const data = await this.espn_request.getLeague();
    this.currentMatchupPeriod = data.status.currentMatchupPeriod;
    this.scoringPeriodId = data.scoringPeriodId;
    this.firstScoringPeriod = data.status.firstScoringPeriod;
    this.finalScoringPeriod = data.status.finalScoringPeriod;
    this.previousSeasons = (data.status.previousSeasons || []).filter((year) => year < this.year);

    if (this.year < 2018) {
      this.current_week = data.scoringPeriodId;
    } else {
      this.current_week = this.scoringPeriodId <= data.status.finalScoringPeriod ? this.scoringPeriodId : data.status.finalScoringPeriod;
    }

    this.settings = new SettingsClass(data.settings);
    this.members = data.members || [];
    return data;
  }

  async _fetchDraft() {
    const data = await this.espn_request.getLeagueDraft();
    if (!data?.draftDetail?.drafted) {
      return;
    }

    const picks = data.draftDetail?.picks || [];
    for (const pick of picks) {
      const team = this.getTeamData(pick.teamId);
      const playerId = pick.playerId;
      let playerName = '';
      if (playerId in this.player_map) {
        playerName = this.player_map[playerId];
      }

      this.draft.push(
        new BasePick(
          team,
          playerId,
          playerName,
          pick.roundId,
          pick.roundPickNumber,
          pick.bidAmount,
          pick.keeper,
          this.getTeamData(pick.nominatingTeamId)
        )
      );
    }
  }

  async _fetchTeams(data, TeamClass, proSchedule = null) {
    this.teams = [];
    const teams = data.teams || [];
    const schedule = data.schedule || [];
    const seasonId = data.seasonId;
    const members = data.members || [];

    const teamRoster = {};
    for (const team of data.teams || []) {
      teamRoster[team.id] = team.roster || {};
    }

    for (const team of teams) {
      const roster = teamRoster[team.id];
      const owners = members.filter((member) => (team.owners || []).includes(member.id));
      this.teams.push(new TeamClass(team, roster, schedule, seasonId, { owners, proSchedule }));
    }

    this.teams.sort((a, b) => a.team_id - b.team_id);
  }

  async _fetchPlayers() {
    const data = await this.espn_request.getProPlayers();
    for (const player of data) {
      this.player_map[player.id] = player.fullName;
      if (!(player.fullName in this.player_map)) {
        this.player_map[player.fullName] = player.id;
      }
    }
  }

  async _getProSchedule(scoringPeriodId = null) {
    const data = await this.espn_request.getProSchedule();
    const proTeams = data.settings?.proTeams || [];
    const out = {};

    for (const team of proTeams) {
      const proGame = team.proGamesByScoringPeriod || {};
      if (team.id !== 0 && Object.prototype.hasOwnProperty.call(proGame, String(scoringPeriodId)) && proGame[String(scoringPeriodId)]) {
        const gameData = proGame[String(scoringPeriodId)][0];
        out[team.id] = team.id === gameData.awayProTeamId
          ? [gameData.homeProTeamId, gameData.date]
          : [gameData.awayProTeamId, gameData.date];
      }
    }

    return out;
  }

  async _getAllProSchedule() {
    const data = await this.espn_request.getProSchedule();
    const proTeams = data.settings?.proTeams || [];
    const out = {};

    for (const team of proTeams) {
      out[team.id] = team.proGamesByScoringPeriod || {};
    }

    return out;
  }

  async _getOffers(week = null) {
    if (week === null || week === undefined) {
      const bids = [];
      for (let scoringWeek = 0; scoringWeek <= this.finalScoringPeriod; scoringWeek += 1) {
        const data = await this.espn_request.getLeagueOffers(scoringWeek);
        const transactions = data.transactions || [];
        for (const tx of transactions) {
          bids.push(tx);
        }
      }
      return bids;
    }

    const data = await this.espn_request.getLeagueOffers(week);
    return data.transactions || [];
  }

  standings() {
    return [...this.teams].sort((a, b) => {
      const aStanding = a.final_standing !== 0 ? a.final_standing : a.standing;
      const bStanding = b.final_standing !== 0 ? b.final_standing : b.standing;
      return aStanding - bStanding;
    });
  }

  getTeamData(teamId) {
    return this.teams.find((team) => team.team_id === teamId) || null;
  }
}
