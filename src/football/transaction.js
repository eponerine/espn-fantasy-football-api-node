export class TransactionItem {
  constructor(data, playerMap) {
    this.type = data.type;
    this.playerId = data.playerId;
    this.player = playerMap[data.playerId] || 'Unknown';
  }

  toString() {
    return `${this.type} ${this.player}`;
  }
}

export class Transaction {
  constructor(data, playerMap, getTeamData) {
    this.team = getTeamData(data.teamId);
    this.type = data.type;
    this.status = data.status;
    this.scoring_period = data.scoringPeriodId;
    this.date = data.processDate || data.proposedDate;
    this.bid_amount = data.bidAmount;
    this.items = (data.items || []).map((item) => new TransactionItem(item, playerMap));
  }

  toString() {
    const items = this.items.map((item) => item.toString()).join(', ');
    return `Transaction(${this.team?.team_name} ${this.type} ${items})`;
  }
}
