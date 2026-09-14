import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { League } from '../football/league.js';
import { openApiSpec } from './openapi.js';

const app = express();
app.use(express.json());

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  explorer: true,
  customSiteTitle: 'ESPN Fantasy Football API Docs'
}));

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}

function serializeRosterPlayer(player) {
  return {
    player_id: player.playerId,
    name: player.name,
    position: player.position,
    lineup_slot: player.lineupSlot,
    eligible_slots: player.eligibleSlots,
    pro_team: player.proTeam,
    jersey: player.jersey,
    injury_status: player.injuryStatus,
    injured: player.injured,
    percent_owned: player.percent_owned,
    percent_started: player.percent_started,
    active_status: player.active_status
  };
}

function serializeLineupPlayer(player) {
  return {
    player_id: player.playerId,
    name: player.name,
    position: player.position,
    slot_position: player.slot_position,
    pro_team: player.proTeam,
    pro_opponent: player.pro_opponent,
    pro_pos_rank: player.pro_pos_rank,
    game_played: player.game_played,
    on_bye_week: player.on_bye_week,
    injury_status: player.injuryStatus,
    points: player.points,
    projected_points: player.projected_points
  };
}

function parseLeagueConfig(req) {
  const leagueId = Number(req.query.leagueId || process.env.LEAGUE_ID);
  const year = Number(req.query.year || process.env.SEASON_YEAR);

  if (!leagueId || !year) {
    throw new Error('leagueId and year are required (query or env: LEAGUE_ID, SEASON_YEAR)');
  }

  return {
    leagueId,
    year,
    espnS2: req.query.espnS2 || process.env.ESPN_S2 || null,
    swid: req.query.swid || process.env.SWID || null,
    debug: String(req.query.debug || process.env.DEBUG || 'false').toLowerCase() === 'true'
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'espn-fantasy-football-node' });
});

app.get('/league', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const league = await League.create({ ...config, fetchLeague: true });
    res.json({
      league_id: league.league_id,
      year: league.year,
      current_week: league.current_week,
      team_count: league.teams.length,
      name: league.settings?.name
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/standings', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const league = await League.create({ ...config, fetchLeague: true });
    const standings = league.standings().map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      points_for: team.points_for
    }));
    res.json({ standings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/settings', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const league = await League.create({ ...config, fetchLeague: true });
    res.json({ settings: league.settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/teams', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const league = await League.create({ ...config, fetchLeague: true });
    const teams = league.teams.map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      team_abbrev: team.team_abbrev,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      points_for: team.points_for,
      points_against: team.points_against,
      division_id: team.division_id,
      division_name: team.division_name
    }));
    res.json({ teams });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/draft', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const league = await League.create({ ...config, fetchLeague: true });

    res.json({
      draft: (league.draft || []).map((pick) => ({
        round_num: pick.round_num,
        round_pick: pick.round_pick,
        player_id: pick.playerId,
        player_name: pick.playerName,
        bid_amount: pick.bid_amount,
        keeper_status: pick.keeper_status,
        team_id: pick.team?.team_id || null,
        team_name: pick.team?.team_name || null,
        nominating_team_id: pick.nominatingTeam?.team_id || null,
        nominating_team_name: pick.nominatingTeam?.team_name || null
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/roster', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const teamId = Number(req.query.teamId);
    const week = Number(req.query.week);

    if (!teamId || !week) {
      throw new Error('teamId and week are required query parameters');
    }

    const league = await League.create({ ...config, fetchLeague: true });
    await league.loadRosterWeek(week);

    const team = league.teams.find((item) => item.team_id === teamId);
    if (!team) {
      throw new Error(`No team found for teamId=${teamId}`);
    }

    res.json({
      week,
      team_id: team.team_id,
      team_name: team.team_name,
      roster: (team.roster || []).map((player) => serializeRosterPlayer(player))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/scoreboard', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const week = req.query.week ? Number(req.query.week) : null;
    const league = await League.create({ ...config, fetchLeague: true });
    const scoreboard = await league.scoreboard(week);

    res.json({
      week: week || league.current_week,
      matchups: scoreboard.map((m) => ({
        home_team: m.home_team?.team_name || null,
        away_team: m.away_team?.team_name || null,
        home_score: m.home_score,
        away_score: m.away_score,
        is_playoff: m.is_playoff
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/matchups', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const week = req.query.week ? Number(req.query.week) : null;
    const league = await League.create({ ...config, fetchLeague: true });
    const matchups = await league.scoreboard(week);

    res.json({
      week: week || league.current_week,
      matchups: matchups.map((m) => ({
        home_team: m.home_team?.team_name || null,
        away_team: m.away_team?.team_name || null,
        home_score: m.home_score,
        away_score: m.away_score,
        is_playoff: m.is_playoff,
        matchup_type: m.matchup_type
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/box-scores', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const week = req.query.week ? Number(req.query.week) : null;
    const includeLineup = toBoolean(req.query.includeLineup);
    const league = await League.create({ ...config, fetchLeague: true });
    const boxScores = await league.boxScores(week);

    res.json({
      week: week || league.current_week,
      include_lineup: includeLineup,
      box_scores: boxScores.map((box) => ({
        home_team: box.home_team?.team_name || null,
        away_team: box.away_team?.team_name || null,
        home_score: box.home_score,
        away_score: box.away_score,
        home_projected: box.home_projected,
        away_projected: box.away_projected,
        is_playoff: box.is_playoff,
        matchup_type: box.matchup_type,
        ...(includeLineup
          ? {
              home_lineup: (box.home_lineup || []).map((player) => serializeLineupPlayer(player)),
              away_lineup: (box.away_lineup || []).map((player) => serializeLineupPlayer(player))
            }
          : {})
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const scoringPeriod = req.query.scoringPeriod ? Number(req.query.scoringPeriod) : null;
    const types = req.query.types
      ? new Set(String(req.query.types).split(',').map((type) => type.trim()).filter((type) => type.length > 0))
      : undefined;

    const league = await League.create({ ...config, fetchLeague: true });
    const transactions = await league.transactions({ scoringPeriod, types });

    res.json({
      transactions: transactions.map((tx) => ({
        team_id: tx.team?.team_id || null,
        team_name: tx.team?.team_name || null,
        type: tx.type,
        status: tx.status,
        scoring_period: tx.scoring_period,
        date: tx.date,
        bid_amount: tx.bid_amount,
        items: tx.items
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/activity', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const size = req.query.size ? Number(req.query.size) : 25;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const msgType = req.query.msgType ? String(req.query.msgType) : null;

    const league = await League.create({ ...config, fetchLeague: true });
    const activity = await league.recentActivity({ size, offset, msgType });

    res.json({ activity });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/power-rankings', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const week = req.query.week ? Number(req.query.week) : null;
    const league = await League.create({ ...config, fetchLeague: true });
    const rankings = league.powerRankings(week).map(([score, team]) => ({
      power_score: Number(score),
      team_id: team.team_id,
      team_name: team.team_name
    }));
    res.json({ rankings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/free-agents', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const week = req.query.week ? Number(req.query.week) : null;
    const size = req.query.size ? Number(req.query.size) : 50;
    const position = req.query.position ? String(req.query.position) : null;
    const positionId = req.query.positionId ? Number(req.query.positionId) : null;

    const league = await League.create({ ...config, fetchLeague: true });
    const players = await league.freeAgents({ week, size, position, positionId });

    res.json({
      players: players.map((player) => ({
        player_id: player.playerId,
        name: player.name,
        pro_team: player.proTeam,
        position: player.position,
        slot_position: player.slot_position,
        projected_points: player.projected_points,
        points: player.points
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/player-info', async (req, res) => {
  try {
    const config = parseLeagueConfig(req);
    const name = req.query.name ? String(req.query.name) : null;
    const playerId = req.query.playerId ? Number(req.query.playerId) : null;

    if (!name && !playerId) {
      throw new Error('name or playerId is required');
    }

    const league = await League.create({ ...config, fetchLeague: true });
    const player = await league.playerInfo({ name, playerId });
    res.json({ player });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Fantasy football API listening on port ${port}`);
});
