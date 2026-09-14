export class BasePick {
  constructor(team, playerId, playerName, roundNum, roundPick, bidAmount, keeperStatus, nominatingTeam) {
    this.team = team;
    this.playerId = playerId;
    this.playerName = playerName;
    this.round_num = roundNum;
    this.round_pick = roundPick;
    this.bid_amount = bidAmount;
    this.keeper_status = keeperStatus;
    this.nominatingTeam = nominatingTeam;
  }

  toString() {
    return `Pick(R:${this.round_num} P:${this.round_pick}, ${this.playerName}, ${this.team})`;
  }

  auctionRepr() {
    return [this.team, this.playerId, this.playerName, this.bid_amount, this.keeper_status].join(', ');
  }
}
