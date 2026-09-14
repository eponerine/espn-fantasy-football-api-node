import { ACTIVITY_MAP } from './constant.js';

export class Activity {
  constructor(data, playerMap, getTeamData, playerInfo) {
    this.actions = [];
    this.date = data.date;

    for (const msg of data.messages || []) {
      const msgId = msg.messageTypeId;

      if (msgId === 244) {
        const fromTeam = getTeamData(msg.from);
        const toTeam = getTeamData(msg.to);

        let player = null;
        if (fromTeam) {
          player = fromTeam.roster.find((teamPlayer) => teamPlayer.playerId === msg.targetId) || null;
        }
        if (!player && toTeam) {
          player = toTeam.roster.find((teamPlayer) => teamPlayer.playerId === msg.targetId) || null;
        }
        if (!player) {
          player = playerInfo({ playerId: msg.targetId });
        }
        if (!player) {
          player = msg.targetId || 'Unknown';
        }

        this.actions.push([fromTeam, 'TRADE_SENT', player, 0]);
        if (toTeam) {
          this.actions.push([toTeam, 'TRADE_RECEIVED', player, 0]);
        }
        continue;
      }

      let team;
      let action = 'UNKNOWN';
      let player = null;
      let bidAmount = 0;

      if (msgId === 239) {
        team = getTeamData(msg.for);
      } else {
        team = getTeamData(msg.to);
      }

      if (msgId in ACTIVITY_MAP) {
        action = ACTIVITY_MAP[msgId];
      }

      if (action === 'WAIVER ADDED') {
        bidAmount = msg.from || 0;
      }

      if (team) {
        player = team.roster.find((teamPlayer) => teamPlayer.playerId === msg.targetId) || null;
      }

      if (!player) {
        player = playerInfo({ playerId: msg.targetId });
      }
      if (!player) {
        player = msg.targetId || 'Unknown';
      }

      this.actions.push([team, action, player, bidAmount]);
    }
  }

  toString() {
    const rows = this.actions.map((row) => `(${row[0]},${row[1]},${row[2]})`);
    return `Activity(${rows.join(' ')})`;
  }
}
