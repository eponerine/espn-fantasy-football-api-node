export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ESPN Fantasy Football Node API',
    version: '0.1.0',
    description: 'Node.js port of ESPN fantasy football access patterns with league endpoints.'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development server' }
  ],
  components: {
    parameters: {
      leagueId: {
        name: 'leagueId',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'ESPN fantasy league ID. Can be set via LEAGUE_ID env var instead.'
      },
      year: {
        name: 'year',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Season year. Can be set via SEASON_YEAR env var instead.'
      },
      espnS2: {
        name: 'espnS2',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'espn_s2 cookie value for private leagues.'
      },
      swid: {
        name: 'swid',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'SWID cookie value for private leagues.'
      },
      week: {
        name: 'week',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1 },
        description: 'Scoring week.'
      },
      teamId: {
        name: 'teamId',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1 },
        description: 'Fantasy team ID.'
      },
      includeLineup: {
        name: 'includeLineup',
        in: 'query',
        required: false,
        schema: { type: 'boolean', default: false },
        description: 'When true, include full home and away lineup player details in each box score.'
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
        responses: {
          200: {
            description: 'Healthy response'
          }
        }
      }
    },
    '/league': {
      get: {
        summary: 'Get league summary',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' }
        ],
        responses: {
          200: { description: 'League summary' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/standings': {
      get: {
        summary: 'Get league standings',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' }
        ],
        responses: {
          200: { description: 'Standings list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/settings': {
      get: {
        summary: 'Get league settings',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' }
        ],
        responses: {
          200: { description: 'Settings object' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/teams': {
      get: {
        summary: 'Get all fantasy teams in league',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' }
        ],
        responses: {
          200: { description: 'Teams list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/draft': {
      get: {
        summary: 'Get league draft picks',
        description: 'Returns drafted picks for the league, including round, player, bid, and keeper status.',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' }
        ],
        responses: {
          200: { description: 'Draft picks list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/roster': {
      get: {
        summary: 'Get a specific team roster for a specific week',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/teamId' },
          { $ref: '#/components/parameters/week' }
        ],
        responses: {
          200: { description: 'Team roster for week' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/scoreboard': {
      get: {
        summary: 'Get weekly scoreboard',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/week' }
        ],
        responses: {
          200: { description: 'Scoreboard for week' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/matchups': {
      get: {
        summary: 'Get matchup list for week',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/week' }
        ],
        responses: {
          200: { description: 'Matchups for week' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/box-scores': {
      get: {
        summary: 'Get box scores for week',
        description: 'Returns box scores for the requested week. Requests for weeks greater than current_week return HTTP 400.',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/week' },
          { $ref: '#/components/parameters/includeLineup' }
        ],
        responses: {
          200: { description: 'Box scores for week' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/transactions': {
      get: {
        summary: 'Get transaction history for scoring period',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          {
            name: 'scoringPeriod',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1 }
          },
          {
            name: 'types',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Comma-separated transaction types, such as FREEAGENT,WAIVER,WAIVER_ERROR.'
          }
        ],
        responses: {
          200: { description: 'Transactions list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/activity': {
      get: {
        summary: 'Get recent league activity',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          {
            name: 'size',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 25 }
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 0 }
          },
          {
            name: 'msgType',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Message type filter, for example WAIVER, FA, or TRADED.'
          }
        ],
        responses: {
          200: { description: 'Activity list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/power-rankings': {
      get: {
        summary: 'Get computed power rankings',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/week' }
        ],
        responses: {
          200: { description: 'Power ranking list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/free-agents': {
      get: {
        summary: 'Get free agents and waiver players',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          { $ref: '#/components/parameters/week' },
          {
            name: 'size',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 50 }
          },
          {
            name: 'position',
            in: 'query',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'positionId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Free-agent player list' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/player-info': {
      get: {
        summary: 'Get player card by playerId or name',
        parameters: [
          { $ref: '#/components/parameters/leagueId' },
          { $ref: '#/components/parameters/year' },
          { $ref: '#/components/parameters/espnS2' },
          { $ref: '#/components/parameters/swid' },
          {
            name: 'playerId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          },
          {
            name: 'name',
            in: 'query',
            required: false,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'Player card' },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    }
  }
};
