export class BaseSettings {
  constructor(data) {
    this.reg_season_count = data.scheduleSettings.matchupPeriodCount;
    this.matchup_periods = data.scheduleSettings.matchupPeriods;
    this.veto_votes_required = data.tradeSettings.vetoVotesRequired;
    this.team_count = data.size;
    this.playoff_team_count = data.scheduleSettings.playoffTeamCount;
    this.keeper_count = data.draftSettings.keeperCount;
    this.trade_deadline = data.tradeSettings.deadlineDate || 0;
    this.division_map = {};

    this.name = data.name;
    this.tie_rule = data.scoringSettings.matchupTieRule;
    this.playoff_tie_rule = data.scoringSettings.playoffMatchupTieRule;
    this.playoff_matchup_period_length = data.scheduleSettings?.playoffMatchupPeriodLength || 0;
    this.playoff_seed_tie_rule = data.scheduleSettings.playoffSeedingRule;
    this.scoring_type = data.scoringSettings?.scoringType;
    this.median_scoring = data.scoringSettings?.scoringEnhancementType === 'WIN_BONUS_TOP_HALF';
    this._raw_scoring_settings = data.scoringSettings || {};
    this._raw_schedule_settings = data.scheduleSettings || {};
    this._raw_roster_settings = data.rosterSettings || {};

    this.faab = data.acquisitionSettings.isUsingAcquisitionBudget;
    this.acquisition_budget = data.acquisitionSettings?.acquisitionBudget || 0;
    this.acquisition_limit = data.acquisitionSettings?.acquisitionLimit;
    this.matchup_acquisition_limit = data.acquisitionSettings?.matchupAcquisitionLimit;
    this.matchup_limit_per_scoring_period = data.acquisitionSettings?.matchupLimitPerScoringPeriod;
    this.minimum_bid = data.acquisitionSettings?.minimumBid || 0;
    this.waiver_process_days = Array.from(data.acquisitionSettings?.waiverProcessDays || []);
    this.waiver_process_hour = data.acquisitionSettings?.waiverProcessHour;
    this.trade_revision_hours = data.tradeSettings?.revisionHours;

    const divisions = data.scheduleSettings?.divisions || [];
    for (const division of divisions) {
      this.division_map[division.id || 0] = division.name;
    }
  }

  toString() {
    return `Settings(${this.name})`;
  }
}
