import type { RoomUsers } from '../common/types';
import type { Player } from './session-manager';

const ROOM_MAX_PLAYERS = 2;

export class Room {
  private players: Player[] = [];

  constructor(
    private id: string,
    player?: Player,
  ) {
    if (player) {
      this.add(player);
    }
  }

  public get roomId(): string {
    return this.id;
  }

  public get isAvailable(): boolean {
    return this.players.length < ROOM_MAX_PLAYERS;
  }

  public add(player: Player): void {
    if (this.players.length < ROOM_MAX_PLAYERS) {
      this.players.push(player);
    }
  }

  public has(player: Player): boolean {
    return Boolean(this.players.find(p => p.name === player.name));
  }

  public remove(player: Player): void {
    this.players = this.players.filter(p => p.name !== player.name);
  }

  public getAll(): RoomUsers {
    return this.players.map(({ name }) => ({ name, index: name }));
  }
}
