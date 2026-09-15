# ESPN Fantasy Football API for Node.js

A Node.js port of the [espn-api](https://github.com/cwendt94/espn-api) fantasy football library, with an Express API on top.

This project turns ESPN's fantasy data into something an application can actually use: league settings become readable roster-slot rules, teams and players become domain objects, and raw matchup, transaction, activity, and scoring data are exposed through stable JSON routes. It is read-only. Nothing here can set a lineup, claim a player, or otherwise mutate a league.

The same code can be used in two ways:

- As a JavaScript library through `FootballLeague` and the supporting domain classes.
- As a small HTTP service for tools, scripts, dashboards, or the companion [ESPN Fantasy Football MCP server](https://github.com/eponerine/espn-fantasy-football-mcp-node).

## How It Works

```text
your app / MCP server / curl
              |
              v
       Express API routes
              |
              v
       FootballLeague model
              |
              v
    ESPN fantasy API requests
```

`FootballLeague` is the center of the library. It loads the league, settings, teams, standings, and draft, then provides methods for week-specific data such as scoreboards, box scores, rosters, transactions, activity, free agents, and player information. The model classes (`Team`, `Player`, `Matchup`, `BoxPlayer`, and related classes) keep ESPN's response shape from leaking into every consumer.

The API layer creates a league from request configuration, calls the corresponding library method, and serializes the result as JSON. Query parameters are useful for one-off requests or multi-league clients; environment variables are better for a single deployed league.

## Requirements And Setup

- Node.js 22 LTS or newer
- An ESPN fantasy football league ID and season year
- `ESPN_S2` and `SWID` for private leagues

```bash
npm install
npm test
npm start
```

The server listens on `PORT` when set, or `3000` by default.

### Configuration

For a Windows PowerShell session:

```powershell
$env:LEAGUE_ID = "123456"
$env:SEASON_YEAR = "2026"
$env:ESPN_S2 = "your_espn_s2_cookie"
$env:SWID = "{your-swid-cookie}"
npm start
```

For a bash-compatible shell:

```bash
LEAGUE_ID=123456 \
SEASON_YEAR=2026 \
ESPN_S2=your_espn_s2_cookie \
SWID='{your-swid-cookie}' \
npm start
```

`leagueId`, `year`, `espnS2`, and `swid` can also be supplied as query parameters. A query parameter takes precedence over its environment-variable counterpart. Public leagues may work without the cookies; private leagues require both cookies.

Do not put ESPN cookies in source control, URLs that will be shared, client-side code, or prompts sent to an LLM. Configure them on the API server whenever possible.

## Library Usage

```js
import { FootballLeague } from './src/index.js';

const league = await FootballLeague.create({
  leagueId: 123456,
  year: 2026,
  espnS2: process.env.ESPN_S2,
  swid: process.env.SWID
});

console.log(league.name);
console.log(league.current_week);
console.log(league.standings().map((team) => team.team_name));

const week = await league.boxScores(league.current_week);
const transactions = await league.transactions({ scoringPeriod: league.current_week });
```

The factory fetches the league by default. The library also exports `Team`, `Matchup`, `Player`, and `BoxPlayer` for consumers that need the domain objects directly. Week arguments refer to ESPN scoring periods, not necessarily NFL calendar weeks; playoff and consolation matchups are still represented by the league's schedule data.

## Routes

The route layer is intentionally boring: every endpoint is `GET`, every response is JSON, and all league-specific routes use the same league configuration. The interesting part is the fantasy context behind each response.

### Discovery And Documentation

| Route | What it does |
| --- | --- |
| `GET /health` | Returns a lightweight service health response. It does not contact ESPN, so a healthy response means the Node process is up, not that league credentials are valid. |
| `GET /openapi.json` | Returns the OpenAPI 3 document for the service. Useful for generated clients and the MCP server. |
| `GET /docs` | Serves the Swagger UI for exploring the OpenAPI document. |

### League Shape And Rules

| Route | Parameters | What it returns |
| --- | --- | --- |
| `GET /league` | None beyond league configuration | League name, ID, season, team count, and ESPN's current scoring period. This is a good first request when diagnosing configuration. |
| `GET /settings` | None beyond league configuration | Scoring settings, playoff rules, waiver settings, roster settings, and `lineup_slots`. Each lineup slot includes its ESPN slot ID and eligible positions, so a FLEX or OP slot is not mistaken for a normal position. The raw roster settings are retained under `_raw_roster_settings`. |
| `GET /teams` | None beyond league configuration | Team IDs, names, abbreviations, records, points for and against, and division information. Use this to resolve a human team name to the ID needed by `/roster`. |
| `GET /standings` | None beyond league configuration | Current standings with wins, losses, ties, and points for. |
| `GET /power-rankings?week=5` | Optional `week` | A schedule-aware power estimate. It combines dominance, score, and margin-of-victory signals; it is not the same thing as the official standings. The week defaults to ESPN's current week. |
| `GET /draft` | None beyond league configuration | Draft picks with round, pick, player, bid amount, keeper status, and nominating/team information. |

### Weekly Competition Data

| Route | Parameters | What it returns |
| --- | --- | --- |
| `GET /scoreboard?week=2` | Optional `week` | Head-to-head matchups for a scoring period, including home and away teams and scores. Defaults to the current week. |
| `GET /matchups?week=2` | Optional `week` | The matchup schedule plus matchup type, such as regular season, playoff, or consolation. Defaults to the current week. |
| `GET /box-scores?week=2` | Required `week`; optional `includeLineup=true` | Per-matchup box scores. With `includeLineup=true`, the response includes home and away lineup players with lineup slots, actual points, projections, game-played state, and related player detail. Future weeks are rejected with `400`; ESPN cannot provide a completed box score for them. |
| `GET /roster?teamId=1&week=2` | Required `teamId` and `week` | A team's roster for a scoring period, including lineup slot, eligible slots, projections, totals, average points, positional rank, acquisition type, injury information, and bye-week status. The bye flag comes from the player's pro-team schedule, not from whether the player has scored yet. |

### Player Movement And Lookup

| Route | Parameters | What it returns |
| --- | --- | --- |
| `GET /transactions?scoringPeriod=2&types=FREEAGENT,WAIVER,WAIVER_ERROR` | Optional `scoringPeriod`, comma-separated `types` | Adds, drops, waivers, waiver errors, trades, FAAB bids, and related transaction details. When `types` is omitted, the common free-agent and waiver types are requested. |
| `GET /activity?size=25&offset=0&msgType=WAIVER` | Optional `size`, `offset`, `msgType` | ESPN's chronological league activity feed. `msgType` can narrow the feed to categories such as `WAIVER`, `FA`, or `TRADE`. ESPN's activity endpoint is supported for seasons from 2019 onward. |
| `GET /free-agents?week=5&size=25&position=RB` | Optional `week`, `size`, `position`, `positionId` | Players available on the wire, with team, position, slot position, projected points, and points. `size` defaults to 50; filter by a position name such as `RB` or by ESPN's position ID. This endpoint is supported for seasons from 2019 onward. |
| `GET /player-info?playerId=3139477` | `playerId` or `name` | A player card with stats and schedule information by scoring period. Name searches may return multiple players; an unknown player returns `null`. |

Most routes return an object containing a collection such as `teams`, `matchups`, `box_scores`, `transactions`, `activity`, or `players`. The OpenAPI document at `/openapi.json` is the authoritative response schema.

## ESPN Data Notes

Fantasy APIs have a few traps that are easy to turn into bad advice:

- Roster `projected_points` and `total_points` are season-level values from ESPN's roster response. Use the average fields for per-game comparisons, or use `/box-scores` for a specific week's actual and projected lineup output.
- A player's `active_status` can look like `bye` before real stats exist. Use `on_bye_week`, injury status, and the schedule rather than treating a pregame player as unavailable.
- `settings.lineup_slots` is the important piece for understanding custom leagues. Slot IDs encode rules such as FLEX, OP, bench, and IR; position labels alone are not enough.
- `/box-scores` and some player data are only meaningful for completed or current scoring periods. A future-week request is rejected instead of being presented as real data.
- ESPN's modern league endpoint and its historical `leagueHistory` endpoint have different shapes. The request layer handles the endpoint selection and fallback for older seasons.

## Errors And Debugging

Invalid request parameters and ESPN request failures are returned as JSON errors. Missing league configuration is a `400`; an invalid private-league cookie commonly surfaces as `ESPNAccessDenied`; and a league ESPN cannot find is reported as `404`.

Set `DEBUG=true`, or pass `debug=true` on a request, to enable request logging while diagnosing endpoint behavior. Treat debug output as sensitive because it concerns authenticated ESPN requests.

## Development

The test suite uses Node's built-in test runner:

```bash
npm test
```

The tests cover the fantasy-specific helpers used for standings/tiebreaker ordering and ESPN roster-slot interpretation. The service has no build step; it runs plain ESM JavaScript directly from `src/`.

## Deploy To Azure App Service

```bash
az login
az group create --name rg-espn-api --location eastus
az appservice plan create --name asp-espn-api --resource-group rg-espn-api --sku B1 --is-linux
az webapp create --resource-group rg-espn-api --plan asp-espn-api --name <unique-app-name> --runtime "NODE|22-lts"
az webapp config appsettings set --resource-group rg-espn-api --name <unique-app-name> --settings LEAGUE_ID=123456 SEASON_YEAR=2026 ESPN_S2=<cookie> SWID=<swid>
az webapp deployment source config-local-git --name <unique-app-name> --resource-group rg-espn-api
```

After local Git deployment is configured, push the repository and set the App Service startup command to `npm start`.

## Attribution And License

This port is derived from the original ESPN API project by Christian Wendt:

- Source: https://github.com/cwendt94/espn-api

The original project is licensed under the MIT License. This repository follows those terms; see [LICENSE](LICENSE). If you redistribute substantial portions, keep the original MIT copyright and permission notice.
