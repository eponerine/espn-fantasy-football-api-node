const RESULT_RANKING = {
  Processed: 7,
  Outbid: 6,
  'Player already dropped': 5,
  'Budget Exceeded': 4,
  'Position Limit Exceeded': 3,
  'Failed Due to Roster Lock': 2,
  Canceled: 1,
  PENDING: 0
};

export class Offer {
  constructor(data) {
    const status = data.status;
    this.id = data.id;
    this.dateTime = null;

    if (status === 'CANCELED') {
      this.result = 'Canceled';
      return;
    }

    if (status === 'EXECUTED') {
      this.result = 'Processed';
    } else if (status === 'FAILED_INVALIDPLAYERSOURCE') {
      this.result = 'Outbid';
    } else if (status === 'FAILED_AUCTIONBUDGETEXCEEDED') {
      this.result = 'Budget Exceeded';
    } else if (status === 'FAILED_POSITIONLIMIT') {
      this.result = 'Position Limit Exceeded';
    } else if (status === 'FAILED_ROSTERLOCK') {
      this.result = 'Failed Due to Roster Lock';
    } else if (status === 'FAILED_PLAYERALREADYDROPPED' || status === 'FAILED_ROSTERLIMIT' || status === 'PENDING') {
      this.result = 'Player already dropped';
    } else {
      this.result = status;
    }

    if (data.processDate) {
      this.dateTime = new Date(data.processDate);
    }

    this.amount = data.bidAmount;
    this.teamId = data.teamId;
    this.droppedPlayer = null;

    for (const item of data.items || []) {
      if (item.type === 'ADD') {
        this.player = item.playerId;
      } else if (item.type === 'DROP' && this.result === 'Processed') {
        this.droppedPlayer = item.playerId;
      }
    }
  }

  compare(other) {
    if (RESULT_RANKING[this.result] !== RESULT_RANKING[other.result]) {
      return RESULT_RANKING[this.result] - RESULT_RANKING[other.result];
    }
    return this.amount - other.amount;
  }

  toString() {
    if (this.result === 'Canceled') {
      return 'Canceled bid';
    }

    let out = `Offer(Date:${this.dateTime}, Player:${this.player}, Team:${this.teamId}, Result:${this.result}, Bid:${this.amount}`;
    if (this.droppedPlayer) {
      out += `, Dropped:${this.droppedPlayer})`;
    } else {
      out += ')';
    }
    return out;
  }
}
