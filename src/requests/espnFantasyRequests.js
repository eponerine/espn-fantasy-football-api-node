import { FANTASY_BASE_ENDPOINT, NEWS_BASE_ENDPOINT, FANTASY_SPORTS } from './constants.js';

export class ESPNAccessDenied extends Error {}
export class ESPNInvalidLeague extends Error {}
export class ESPNUnknownError extends Error {}

function makeCookieHeader(cookies) {
  if (!cookies) {
    return null;
  }

  const cookiePairs = Object.entries(cookies)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`);

  if (!cookiePairs.length) {
    return null;
  }

  return cookiePairs.join('; ');
}

function appendParams(url, params) {
  if (!params) {
    return url;
  }

  const out = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        out.searchParams.append(key, String(item));
      }
    } else if (value !== undefined && value !== null) {
      out.searchParams.append(key, String(value));
    }
  }

  return out.toString();
}

export class EspnFantasyRequests {
  constructor({ sport, year, leagueId, cookies = null, logger = null }) {
    if (!(sport in FANTASY_SPORTS)) {
      throw new Error(`Unknown sport: ${sport}, available options are ${Object.keys(FANTASY_SPORTS).join(', ')}`);
    }

    this.year = year;
    this.leagueId = leagueId;
    this.sportKey = FANTASY_SPORTS[sport];
    this.ENDPOINT = `${FANTASY_BASE_ENDPOINT}${this.sportKey}/seasons/${this.year}`;
    this.NEWS_ENDPOINT = `${NEWS_BASE_ENDPOINT}${this.sportKey}/news/players`;
    this.cookies = cookies;
    this.logger = logger;

    this.LEAGUE_ENDPOINT = `${FANTASY_BASE_ENDPOINT}${this.sportKey}`;
    if (year < 2018) {
      this.LEAGUE_ENDPOINT += `/leagueHistory/${leagueId}?seasonId=${year}`;
    } else {
      this.LEAGUE_ENDPOINT += `/seasons/${year}/segments/0/leagues/${leagueId}`;
    }
  }

  async requestJson(baseEndpoint, { params = null, headers = null, extend = '' } = {}) {
    const endpoint = `${baseEndpoint}${extend}`;
    const url = appendParams(endpoint, params);
    const mergedHeaders = { ...(headers || {}) };

    const cookie = makeCookieHeader(this.cookies);
    if (cookie) {
      mergedHeaders.Cookie = cookie;
    }

    const response = await fetch(url, { headers: mergedHeaders });
    return { response, endpoint, mergedHeaders };
  }

  async checkRequestStatus(status, { extend = '', params = null, headers = null } = {}) {
    if (status === 401) {
      const originalEndpoint = this.LEAGUE_ENDPOINT;

      if (this.LEAGUE_ENDPOINT.includes('/leagueHistory/')) {
        const base = this.LEAGUE_ENDPOINT.split('/leagueHistory/')[0];
        this.LEAGUE_ENDPOINT = `${base}/seasons/${this.year}/segments/0/leagues/${this.leagueId}`;
      } else {
        const base = this.LEAGUE_ENDPOINT.split('/seasons/')[0];
        this.LEAGUE_ENDPOINT = `${base}/leagueHistory/${this.leagueId}?seasonId=${this.year}`;
      }

      const secondTry = await this.requestJson(this.LEAGUE_ENDPOINT, { params, headers, extend });
      if (secondTry.response.status === 200) {
        return secondTry.response.json();
      }

      this.LEAGUE_ENDPOINT = originalEndpoint;

      if (!this.cookies || !this.cookies.espn_s2 || !this.cookies.SWID) {
        throw new ESPNAccessDenied('espn_s2 and swid are required');
      }

      throw new ESPNAccessDenied(`League ${this.leagueId} cannot be accessed with the provided credentials`);
    }

    if (status === 404) {
      throw new ESPNInvalidLeague(`League ${this.leagueId} does not exist`);
    }

    if (status !== 200) {
      throw new ESPNUnknownError(`ESPN returned an HTTP ${status}`);
    }

    return null;
  }

  async leagueGet({ params = null, headers = null, extend = '' } = {}) {
    const { response } = await this.requestJson(this.LEAGUE_ENDPOINT, { params, headers, extend });
    const alternateResponse = await this.checkRequestStatus(response.status, { extend, params, headers });
    const parsed = alternateResponse || (await response.json());

    if (this.logger) {
      this.logger.logRequest(`${this.LEAGUE_ENDPOINT}${extend}`, parsed, params, headers);
    }

    return Array.isArray(parsed) ? parsed[0] : parsed;
  }

  async get({ params = null, headers = null, extend = '' } = {}) {
    const { response, endpoint } = await this.requestJson(this.ENDPOINT, { params, headers, extend });
    await this.checkRequestStatus(response.status);
    const parsed = await response.json();

    if (this.logger) {
      this.logger.logRequest(endpoint, parsed, params, headers);
    }

    return parsed;
  }

  async newsGet({ params = null, headers = null, extend = '' } = {}) {
    const { response, endpoint } = await this.requestJson(this.NEWS_ENDPOINT, { params, headers, extend });
    const parsed = await response.json();

    if (this.logger) {
      this.logger.logRequest(endpoint, parsed, params, headers);
    }

    return parsed;
  }

  async getLeague() {
    return this.leagueGet({
      params: { view: ['mTeam', 'mRoster', 'mMatchup', 'mSettings', 'mStandings'] }
    });
  }

  async getProSchedule() {
    return this.get({ params: { view: 'proTeamSchedules_wl' } });
  }

  async getProPlayers() {
    const headers = {
      'x-fantasy-filter': JSON.stringify({ filterActive: { value: true } })
    };
    return this.get({ extend: '/players', params: { view: 'players_wl' }, headers });
  }

  async getLeagueDraft() {
    return this.leagueGet({ params: { view: 'mDraftDetail' } });
  }

  async getLeagueMessageBoard(msgTypes = null) {
    const params = { view: 'kona_league_messageboard' };
    let headers = null;

    if (msgTypes !== null) {
      const filters = { topicsByType: {} };
      const baseFilter = { sortMessageDate: { sortPriority: 1, sortAsc: false } };
      for (const msgType of msgTypes) {
        filters.topicsByType[msgType] = baseFilter;
      }
      headers = { 'x-fantasy-filter': JSON.stringify(filters) };
    }

    const extend = `/segments/0/leagues/${this.leagueId}/communication`;
    return this.get({ params, headers, extend });
  }

  async getLeagueOffers(week) {
    const params = { scoringPeriodId: week, view: 'mTransactions2' };
    const headers = {
      'x-fantasy-filter': JSON.stringify({
        transactions: { filterType: { value: ['WAIVER', 'WAIVER_ERROR'] } }
      })
    };

    return this.leagueGet({ params, headers });
  }

  async getPlayerCard(playerIds, maxScoringPeriod, additionalFilters = null) {
    const additionalValue = [`00${this.year}`, `10${this.year}`];
    if (additionalFilters) {
      additionalValue.push(...additionalFilters);
    }

    const headers = {
      'x-fantasy-filter': JSON.stringify({
        players: {
          filterIds: { value: playerIds },
          filterStatsForTopScoringPeriodIds: {
            value: maxScoringPeriod,
            additionalValue
          }
        }
      })
    };

    return this.leagueGet({ params: { view: 'kona_playercard' }, headers });
  }

  async getPlayerNews(playerId) {
    return this.newsGet({ params: { playerId } });
  }
}
