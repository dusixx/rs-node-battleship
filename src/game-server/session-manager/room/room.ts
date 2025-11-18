import { WebSocket } from 'ws';
import { isStr } from '../../../common/utils/index';
import type { RoomUsers } from '../../common/types';
import type { Player } from '../session-manager';

type PlayerItem = string | WebSocket | Player;

export class Room {
  public static PLAYERS_LIMIT = 2;
  private _players: Player[] = [];
  private _id: string;

  constructor(owner: Player) {
    this.add(owner);
    this._id = owner.name;
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
    if (this._players.length < Room.PLAYERS_LIMIT && !this.has(player)) {
      this._players.push(player);
    }
  }

  public findPlayer(obj: PlayerItem): Player | undefined {
    return this.players.find(p => {
      if (isStr(obj) && p.name === obj) {
        return true;
      }
      if (obj instanceof WebSocket && p.ws === obj) {
        return true;
      }
      return p === obj;
    });
  }

  public has(obj?: PlayerItem): boolean {
    return Boolean(obj && this.findPlayer(obj));
  }

  public remove(obj: PlayerItem): void {
    const player = this.findPlayer(obj);
    if (player) {
      this._players = this._players.filter(p => p.name !== player.name);
    }
  }
}
