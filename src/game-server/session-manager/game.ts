import EventEmitter from 'node:events';
import { type RawData, type WebSocket } from 'ws';
import { isStr, rndInt } from '../../common/utils';
import type { AddShipsRequest, ShipInfo } from '../common/types';
import { parseCommandRequest } from '../common/utils/request';
import { sendFinishGame, sendStartGame, sendTurnPlayer } from '../common/utils/response';
import { Room } from './room';
import type { Player } from './session-manager';

export const GameEvent = {
  Finish: 'finish',
};

export type GameFinishEventResult = {
  winner: Player;
  game: Game;
};

export class Game extends EventEmitter {
  private _room;
  private ships = new Map<string /*name*/, ShipInfo[]>();

  private playerListeners = new Map<
    WebSocket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<'message' | 'close', (...args: any[]) => void>
  >();

  constructor(room: Room) {
    super();
    this._room = room;
    this.addListeners();
  }

  public get id(): string {
    return this.room.id;
  }

  public get room(): Room {
    return this._room;
  }

  public has: typeof this.room.has = (...args) => {
    return this.room.has(...args);
  };

  public async finish(player: Player | string): Promise<void> {
    this.removeListeners();

    const name = isStr(player) ? player : player.name;
    await sendFinishGame(this.getClients(), name);

    this.emit(GameEvent.Finish, {
      winner: player,
      game: this,
    });
  }

  private getClients = (): WebSocket[] => {
    return this.room.players.map(({ ws }) => ws);
  };

  private handleMessage = (_ws: WebSocket, rawData: RawData): void => {
    const { parsed } = parseCommandRequest(rawData);

    switch (parsed.type) {
      case 'add_ships': {
        this.addShips(parsed.data);
      }
    }
  };

  private addShips(data: AddShipsRequest['data']): void {
    const { indexPlayer, ships: shipsInfo, gameId } = data;

    if (this.ships.size === Room.PLAYERS_LIMIT) {
      return;
    }
    const name = indexPlayer.toString();
    if (this.id !== gameId || !this.room.has(name)) {
      return;
    }
    this.ships.set(name, shipsInfo);
    if (this.ships.size === Room.PLAYERS_LIMIT) {
      // to both players
      void sendStartGame(this.getClients(), { currentPlayerIndex: indexPlayer, ships: shipsInfo });
      // random turn
      const randomPlayerName = this.room.players[rndInt(0, 1)]?.name;
      if (randomPlayerName) {
        void sendTurnPlayer(this.getClients(), randomPlayerName);
      }
    }
  }

  private handleClose = (ws: WebSocket): void => {
    const disconnectedPlayer = this.room.players.find(p => p.ws === ws);
    if (!disconnectedPlayer) {
      return;
    }
    // winner
    const anotherPlayer = this.room.players.find(p => p.name !== disconnectedPlayer.name);
    if (anotherPlayer) {
      anotherPlayer.wins += 1;
      void this.finish(anotherPlayer);
    }
  };

  private removeListeners(): void {
    this.room.players.forEach(({ ws }) => {
      ws.off('message', this.playerListeners.get(ws)!.message);
      ws.off('close', this.playerListeners.get(ws)!.close);
      this.playerListeners.delete(ws);
    });
  }

  private addListeners(): void {
    this.room.players.forEach(({ ws }) => {
      this.playerListeners.set(ws, {
        message: (data: RawData): void => {
          this.handleMessage(ws, data);
        },
        close: (): void => {
          this.handleClose(ws);
        },
      });
      ws.on('message', this.playerListeners.get(ws)!.message);
      ws.on('close', this.playerListeners.get(ws)!.close);
    });
  }
}
