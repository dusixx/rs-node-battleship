import type { RoomUsers } from '../common/types';
import { isStr } from './../../common/utils/index';
import type { Player } from './session-manager';

export class Room {
  public static PLAYERS_LIMIT = 2;
  private _players: Player[] = [];

  constructor(
    private _id: string,
    player?: Player,
  ) {
    if (player) {
      this.add(player);
    }
  }

  public get players(): Player[] {
    return [...this._players];
  }

  public get roomUsers(): RoomUsers {
    return this._players.map(({ name }) => ({ name, index: name }));
  }

  public get id(): string {
    return this._id;
  }

  public add(player: Player): void {
    if (this._players.length < Room.PLAYERS_LIMIT) {
      this._players.push(player);
    }
  }

  public has(player?: Player | string): boolean {
    return Boolean(
      this._players.find(p => {
        const name = isStr(player) ? player : player?.name;
        return p.name === name;
      }),
    );
  }

  public remove(player: Player): void {
    this._players = this._players.filter(p => p.name !== player.name);
  }
}
