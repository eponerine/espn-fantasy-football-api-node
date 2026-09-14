# ESPN Fantasy Football Node Port

This folder contains a Node.js port of the Python ESPN fantasy football module and its dependencies.

## Attribution And License

This port is derived from the original ESPN API project by Christian Wendt:

- Source: https://github.com/cwendt94/espn-api

The original project is licensed under the MIT License. This repository follows those terms; see [../LICENSE](../LICENSE).

If you redistribute substantial portions, keep the MIT copyright and permission notice.

## Runtime

- Node.js LTS: 22+

## Install

```bash
cd node-fantasy-football-api
npm install
```

## Use As Library

```js
import { FootballLeague } from './src/index.js';

const league = await FootballLeague.create({
  leagueId: 123456,
  year: 2026,
  espnS2: process.env.ESPN_S2,
  swid: process.env.SWID
});

const standings = league.standings();
console.log(standings[0].team_name);
```

## Run API Locally

```bash
cd node-fantasy-football-api
set LEAGUE_ID=123456
set SEASON_YEAR=2026
set ESPN_S2=your_cookie
set SWID={your-swid}
npm start
```

Endpoints:
- `GET /health`
- `GET /openapi.json`
- `GET /docs`
- `GET /league`
- `GET /standings`
- `GET /scoreboard?week=2`
- `GET /matchups?week=2`
- `GET /box-scores?week=2`
- `GET /settings`
- `GET /teams`
- `GET /draft`
- `GET /roster?teamId=1&week=2`
- `GET /transactions?scoringPeriod=2&types=FREEAGENT,WAIVER,WAIVER_ERROR`
- `GET /activity?size=25&offset=0&msgType=WAIVER`
- `GET /power-rankings?week=5`
- `GET /free-agents?week=5&size=25&position=RB`
- `GET /player-info?playerId=3139477` or `GET /player-info?name=Patrick%20Mahomes`

Notes:
- `GET /box-scores?week=2&includeLineup=true` includes detailed home and away lineup players.
- `/box-scores` rejects future weeks and returns `400` if `week` is greater than the league `current_week`.

All endpoints also accept `leagueId`, `year`, `espnS2`, and `swid` as query parameters if you do not want to use environment variables.

API docs:

- OpenAPI spec: `http://localhost:3000/openapi.json`
- Swagger UI: `http://localhost:3000/docs`

## Deploy To Azure App Service (Linux)

```bash
az login
az group create --name rg-espn-api --location eastus
az appservice plan create --name asp-espn-api --resource-group rg-espn-api --sku B1 --is-linux
az webapp create --resource-group rg-espn-api --plan asp-espn-api --name <unique-app-name> --runtime "NODE|22-lts"
az webapp config appsettings set --resource-group rg-espn-api --name <unique-app-name> --settings LEAGUE_ID=123456 SEASON_YEAR=2026 ESPN_S2=<cookie> SWID=<swid>
az webapp deployment source config-local-git --name <unique-app-name> --resource-group rg-espn-api
```

After local git deployment is configured, push this repo and set startup command to `npm start` in App Service configuration.
