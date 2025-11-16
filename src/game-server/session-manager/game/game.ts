import EventEmitter from 'node:events';
import { type RawData, type WebSocket } from 'ws';
import { sleep } from '../../../common/utils';
import { green } from '../../../common/utils/style';
import type { AnyFunction } from '../../../global';
import type {
  AddShipsRequest,
  AttackRequest,
  Position,
  RandomAttackRequest,
} from '../../common/types';
import { parseCommandRequest } from '../../common/utils/request';
import { sendAttack, sendFinishGame, sendStartGame, sendTurn } from '../../common/utils/response';
import { Room } from '../room/room';
import type { Player } from '../session-manager';
import { Fleet } from './fleet/fleet';

const BOT_ATTACK_DELAY = 250;

export const GameEvent = {
  Finish: 'finish',
};

export type GameFinishEventResult = {
  winner: Player;
  game: Game;
  bot?: Player;
};

type PlayerEventName = 'message' | 'close';

export class Game extends EventEmitter {
  private _room;
  private fleets = new Map<string, Fleet>();
  private currentAttackingPlayerName: string = '';
  private playerListeners = new Map<WebSocket, Record<PlayerEventName, AnyFunction>>();
  private bot: Player | undefined;

  constructor(room: Room) {
    super();

    this._room = room;
    if (room.players.length !== Room.PLAYERS_LIMIT) {
      throw Error(`${Room.PLAYERS_LIMIT} players needed`);
    }
    this.bot = room.players.find(p => p.isBot);
    this.addListeners();
  }

  public get id(): string {
    return this.room.id;
  }

  public get room(): Readonly<Room> {
    return Object.freeze(this._room);
  }

  public has: typeof this.room.has = (...args) => {
    return this.room.has(...args);
  };

  public async finish(winner: Player | string): Promise<void> {
    this.removeListeners();

    if (this.bot) {
      this.bot.ws.close();
    }
    const player = this.room.findPlayer(winner);
    if (!player) {
      return;
    }
    console.log(green('[game]:'), 'winner is', player.isBot ? 'bot' : player.name);

    await sendFinishGame(this.getClients(), player.name);
    // TODO: need to type
    this.emit(GameEvent.Finish, {
      winner: player,
      game: this,
      bot: this.bot,
    });
  }

  private getClients = (): WebSocket[] => {
    return this.room.players.map(({ ws }) => ws);
  };

  private handleMessage = (_ws: WebSocket, rawData: RawData): void => {
    const { parsed } = parseCommandRequest(rawData);

    console.log(green('[game]:'), this.room.findPlayer(_ws)?.name, parsed.type);

    switch (parsed.type) {
      case 'add_ships': {
        if (this.bot) {
          console.log(green('[game]:'), 'launching, please wait...');
        }
        this.addShips(parsed.data);
        return;
      }
      case 'attack': {
        void this.handleAttack(parsed.data);
        return;
      }
      case 'randomAttack': {
        void this.handleRandomAttack(parsed.data);
        return;
      }
    }
  };

  private handleRandomAttack = async ({
    gameId,
    indexPlayer,
  }: RandomAttackRequest['data']): Promise<void> => {
    await this.handleAttack({ gameId, indexPlayer, x: -1, y: -1 }, true);
  };

  private isCurrentAttackingPlayer = (playerName: string): boolean => {
    return !this.currentAttackingPlayerName || this.currentAttackingPlayerName === playerName;
  };

  private getAttackedFleet = (attackingPlayerName: string): Fleet | undefined => {
    const player = this.room.players.find(p => p.name !== attackingPlayerName);
    if (player) {
      return this.fleets.get(player.name);
    }
  };

  private sendCellsAroundKilled = async (
    attackingPlayerName: string,
    around: Position[],
  ): Promise<void> => {
    for (const position of around) {
      await sendAttack(this.getClients(), {
        currentPlayer: attackingPlayerName,
        status: 'miss',
        position,
      });
    }
  };

  private handleAttack = async (data: AttackRequest['data'], random?: boolean): Promise<void> => {
    const { gameId, x, y, indexPlayer } = data;
    const attackingPlayerName = indexPlayer.toString();

    // invalid gameId or player
    if (this.id !== gameId || !this.room.has(attackingPlayerName)) {
      return;
    }
    // stop an attempt to attack by a player whose turn is not yet
    if (!this.isCurrentAttackingPlayer(attackingPlayerName)) {
      return;
    }
    const attackedFleet = this.getAttackedFleet(attackingPlayerName);
    if (!attackedFleet) {
      return;
    }
    const attackedPlayerName = attackedFleet.playerName;
    const attackedPosition = random ? attackedFleet.getValidRandomPosition() : { x, y };
    const attackResult = attackedFleet.attack(attackedPosition);

    const { status, position, around, defeat } = attackResult;

    switch (status) {
      case 'miss': {
        this.currentAttackingPlayerName = attackedPlayerName;
        await sendAttack(this.getClients(), {
          currentPlayer: attackingPlayerName,
          status,
          position,
        });
        break;
      }
      case 'shot': {
        this.currentAttackingPlayerName = attackingPlayerName;
        await sendAttack(this.getClients(), {
          currentPlayer: attackingPlayerName,
          status,
          position,
        });
        break;
      }
      case 'killed': {
        this.currentAttackingPlayerName = attackingPlayerName;
        await sendAttack(this.getClients(), {
          currentPlayer: attackingPlayerName,
          status,
          position,
        });
        await this.sendCellsAroundKilled(attackingPlayerName, around);
        if (defeat) {
          await this.finish(attackingPlayerName);
          return;
        }
        break;
      }
      case 'touched': {
        this.currentAttackingPlayerName = attackedPlayerName;
      }
    }
    // bot attack
    if (this.bot && this.currentAttackingPlayerName === this.bot.name) {
      const data = JSON.stringify({ gameId, indexPlayer: this.bot.name });
      const req = { id: 0, type: 'randomAttack', data };
      const bot = this.bot;

      await sendTurn(this.getClients(), this.currentAttackingPlayerName);
      await sleep(BOT_ATTACK_DELAY);
      bot.ws.emit('message', JSON.stringify(req));

      return;
    }
    await sendTurn(this.getClients(), this.currentAttackingPlayerName);
  };

  public addShips(data: AddShipsRequest['data']): void {
    const { indexPlayer, ships: shipsInfo, gameId } = data;

    if (this.id !== gameId || this.fleets.size === Room.PLAYERS_LIMIT) {
      return;
    }
    const playerName = indexPlayer.toString();
    if (this.id !== gameId || !this.room.has(playerName)) {
      return;
    }
    this.fleets.set(playerName, new Fleet(playerName, shipsInfo));
    // both fleets where created
    if (this.fleets.size === Room.PLAYERS_LIMIT) {
      void sendStartGame(this.getClients(), { currentPlayerIndex: playerName, ships: shipsInfo });
      void sendTurn(this.getClients(), playerName);
    }
  }

  private handleClose = (ws: WebSocket): void => {
    const disconnectedPlayer = this.room.findPlayer(ws);
    if (!disconnectedPlayer) {
      return;
    }
    const winner = this.room.players.find(p => p.name !== disconnectedPlayer.name);
    if (winner) {
      void this.finish(winner);
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
