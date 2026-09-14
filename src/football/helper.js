function buildDivisionRecordDict(teamDataList) {
  const divOutcomes = {};
  for (const teamData of teamDataList) {
    divOutcomes[teamData.team_id] = { wins: 0, divisional_games: 0 };
  }

  for (const teamData of teamDataList) {
    const team = teamData.team;
    for (let i = 0; i < teamData.schedule.length; i += 1) {
      const opp = teamData.schedule[i];
      const outcome = teamData.outcomes[i];

      if (opp.team_id === team.team_id) {
        continue;
      }

      if (teamData.division_id === opp.division_id) {
        if (outcome === 'W') {
          divOutcomes[teamData.team_id].wins += 1;
        }
        if (outcome === 'T') {
          divOutcomes[teamData.team_id].wins += 0.5;
        }
        divOutcomes[teamData.team_id].divisional_games += 1;
      }
    }
  }

  const divRecord = {};
  for (const teamData of teamDataList) {
    const row = divOutcomes[teamData.team_id];
    divRecord[teamData.team_id] = row.wins / Math.max(row.divisional_games, 1);
  }

  return divRecord;
}

function buildH2hDict(teamDataList) {
  const h2hOutcomes = {};

  for (const teamData of teamDataList) {
    h2hOutcomes[teamData.team_id] = {};
    for (const opp of teamDataList) {
      if (opp.team_id !== teamData.team_id) {
        h2hOutcomes[teamData.team_id][opp.team_id] = { h2h_wins: 0, h2h_games: 0 };
      }
    }
  }

  for (const teamData of teamDataList) {
    const team = teamData.team;
    for (let i = 0; i < teamData.schedule.length; i += 1) {
      const opp = teamData.schedule[i];
      const outcome = teamData.outcomes[i];

      if (!(opp.team_id in h2hOutcomes[team.team_id])) {
        continue;
      }

      if (outcome === 'W') {
        h2hOutcomes[team.team_id][opp.team_id].h2h_wins += 1;
      }
      if (outcome === 'T') {
        h2hOutcomes[team.team_id][opp.team_id].h2h_wins += 0.5;
      }
      h2hOutcomes[team.team_id][opp.team_id].h2h_games += 1;
    }
  }

  return h2hOutcomes;
}

function sortByWinPct(teamDataList) {
  return [...teamDataList].sort((a, b) => b.win_pct - a.win_pct);
}

function sortByPointsFor(teamDataList) {
  return [...teamDataList].sort((a, b) => b.points_for - a.points_for);
}

function sortByDivisionRecord(teamDataList) {
  const divisionRecords = buildDivisionRecordDict(teamDataList);
  for (const teamData of teamDataList) {
    teamData.division_record = divisionRecords[teamData.team_id];
  }
  return [...teamDataList].sort((a, b) => b.division_record - a.division_record);
}

function sortByPointsAgainst(teamDataList) {
  return [...teamDataList].sort((a, b) => b.points_against - a.points_against);
}

function sortByCoinFlip(teamDataList) {
  for (const teamData of teamDataList) {
    teamData.coin_flip = Math.random();
  }
  return [...teamDataList].sort((a, b) => b.coin_flip - a.coin_flip);
}

function sortByHeadToHead(teamDataList) {
  const h2hDict = buildH2hDict(teamDataList);

  if (teamDataList.length < 2) {
    return teamDataList;
  }

  if (Object.keys(h2hDict).length === 2) {
    for (const teamData of teamDataList) {
      teamData.h2h_wins = Object.keys(h2hDict[teamData.team_id])
        .reduce((acc, oppId) => acc + h2hDict[teamData.team_id][oppId].h2h_wins, 0);
    }
    return [...teamDataList].sort((a, b) => b.h2h_wins - a.h2h_wins);
  }

  const matchupCounts = [];
  for (const teamId of Object.keys(h2hDict)) {
    for (const oppId of Object.keys(h2hDict[teamId])) {
      matchupCounts.push(h2hDict[teamId][oppId].h2h_games);
    }
  }

  const allEqual = new Set(matchupCounts).size === 1;
  if (allEqual) {
    for (const teamData of teamDataList) {
      teamData.h2h_wins = Object.keys(h2hDict[teamData.team_id])
        .reduce((acc, oppId) => acc + h2hDict[teamData.team_id][oppId].h2h_wins, 0);
    }
    return [...teamDataList].sort((a, b) => b.h2h_wins - a.h2h_wins);
  }

  for (const teamData of teamDataList) {
    teamData.h2h_wins = 0;
  }
  return teamDataList;
}

function sortTeamDataList(teamDataList, tiebreakerHierarchy) {
  if (!tiebreakerHierarchy.length || teamDataList.length === 1) {
    return teamDataList;
  }

  const [tiebreakerFn, tiebreakerCol] = tiebreakerHierarchy[0];
  const sorted = tiebreakerFn(teamDataList);

  const uniqueVals = [...new Set(sorted.map((teamData) => teamData[tiebreakerCol]))].sort((a, b) => b - a);

  let output = [];
  for (const val of uniqueVals) {
    const subset = sorted.filter((teamData) => teamData[tiebreakerCol] === val);
    output = output.concat(sortTeamDataList(subset, tiebreakerHierarchy.slice(1)));
  }

  return output;
}

export {
  buildDivisionRecordDict,
  buildH2hDict,
  sortByCoinFlip,
  sortByDivisionRecord,
  sortByHeadToHead,
  sortByPointsAgainst,
  sortByPointsFor,
  sortByWinPct,
  sortTeamDataList
};
