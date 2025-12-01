import EventEmitter from 'node:events';
import { type RawData, type WebSocket } from 'ws';
import { BOT_ALIAS, GameEvent } from '../common/constants';
import type {
  AddShipsRequest,
  AnyFunction,
  AttackRequest,
  RandomAttackRequest,
} from '../common/types/index';
import {
  sendAttack as _sendAttack,
  gray,
  green,
  parseCommandRequest,
  sendFinishGame,
  sendStartGame,
  sendTurn,
} from '../common/utils';
import type { Bot } from '../session-manager/components/bot';
import { Room } from '../session-manager/components/room';
import type { Player } from '../session-manager/session-manager';
import { Fleet } from './fleet/fleet';
type PlayerEventName = 'message' | 'close';

export type GameFinishEventResult = {
  winner?: Player;
  game: Game;
};

export class Game extends EventEmitter {
  private _room;
  private fleets = new Map<string, Fleet>();
  private currentAttackingPlayerName: string = '';
  private playerListeners = new Map<WebSocket, Record<PlayerEventName, AnyFunction>>();
  private bot: Bot | undefined;

  constructor(room: Room) {
    super();

    this._room = room;
    if (room.players.length !== Room.PLAYERS_LIMIT) {
      throw Error(`${Room.PLAYERS_LIMIT} players needed`);
    }
    this.bot = room.players.find(p => p.isBot) as Bot;
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

  public async finish(player: Player): Promise<void> {
    this.removeListeners();

    const winner = player.isBot ? undefined : player;
    const name = winner?.name ?? BOT_ALIAS;

    if (this.bot) {
      this.bot.ws.close();
    }
    console.log(green(`[game]:`), gray(`(${this.id})`), name, 'won');
    await sendFinishGame(this.getClients(), name);
    // TODO: need to type
    this.emit(GameEvent.Finish, { winner, game: this });
  }

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

  private getClients = (): WebSocket[] => {
    return this.room.players.map(({ ws }) => ws);
  };

  private handleMessage = (ws: WebSocket, rawData: RawData): void => {
    const { parsed } = parseCommandRequest(rawData);

    console.log(
      green(`[game]:`),
      gray(`(${this.id})`),
      this.room.findPlayer(ws)?.name,
      parsed.type,
    );

    switch (parsed.type) {
      case 'add_ships': {
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

  private isCurrentAttackingPlayer = (playerName: string): boolean => {
    return !this.currentAttackingPlayerName || this.currentAttackingPlayerName === playerName;
  };

  private getAttackedFleet = (attackingPlayerName: string): Fleet | undefined => {
    const player = this.room.players.find(p => p.name !== attackingPlayerName);
    if (player) {
      return this.fleets.get(player.name);
    }
  };

  private sendAttack = async (data: Parameters<typeof _sendAttack>[1]): Promise<void> => {
    await _sendAttack(this.getClients(), data);
  };

  private handleRandomAttack = async ({
    gameId,
    indexPlayer,
  }: RandomAttackRequest['data']): Promise<void> => {
    await this.handleAttack({ gameId, indexPlayer, x: -1, y: -1 }, true);
  };

  private handleAttack = async (data: AttackRequest['data'], random?: boolean): Promise<void> => {
    const { gameId, x, y, indexPlayer } = data;
    const attackingPlayerName = indexPlayer.toString();

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
    const attackResult = attackedFleet.attack(random ? undefined : { x, y });
    const { status, position, around, defeat } = attackResult;

    switch (status) {
      case 'miss': {
        this.currentAttackingPlayerName = attackedPlayerName;
        await this.sendAttack({ currentPlayer: attackingPlayerName, status, position });
        break;
      }
      case 'shot': {
        this.currentAttackingPlayerName = attackingPlayerName;
        await this.sendAttack({ currentPlayer: attackingPlayerName, status, position });
        break;
      }
      case 'killed': {
        this.currentAttackingPlayerName = attackingPlayerName;
        await this.sendAttack({ currentPlayer: attackingPlayerName, status, position, around });
        if (defeat) {
          const winner = this.room.findPlayer(attackingPlayerName)!;
          await this.finish(winner);
          return;
        }
        break;
      }
      case 'touched': {
        this.currentAttackingPlayerName = attackedPlayerName;
      }
    }
    await sendTurn(this.getClients(), this.currentAttackingPlayerName);

    if (this.currentAttackingPlayerName === this.bot?.name) {
      await this.bot.randomAttack();
    }
  };

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
