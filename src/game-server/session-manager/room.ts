import type { RoomUsers } from '../common/types';
import type { Player } from './session-manager';

export class Room {
  public static PlayersLimit = 2;
  private _players: Player[] = [];

  constructor(
    private id: string,
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

  public get roomId(): string {
    return this.id;
  }

  public get isAvailable(): boolean {
    return this._players.length < Room.PlayersLimit;
  }

  public add(player: Player): void {
    if (this._players.length < Room.PlayersLimit) {
      this._players.push(player);
    }
  }

  public has(player: Player): boolean {
    return Boolean(this._players.find(p => p.name === player.name));
  }

  public remove(player: Player): void {
    this._players = this._players.filter(p => p.name !== player.name);
  }
}
