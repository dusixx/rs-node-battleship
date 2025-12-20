import type { WebSocket } from 'ws';
import { type RawData, type WebSocketServer } from 'ws';
import { Bot } from '../bot/bot';
import { BOT_ALIAS, ErrorMessage, GameEvent } from '../common/constants';
import type { Credentials, UpdateRoomResponse, UpdateWinnersResponse } from '../common/types/game';
import { magenta, parseCommandRequest } from '../common/utils';
import { logger } from '../common/utils/logger';
import {
  sendCreateGame,
  sendLoginError,
  sendLoginSuccess,
  sendUpdateRoom,
  sendUpdateWinners,
} from '../common/utils/response';
import type { GameFinishEventResult } from '../game/game';
import { Game } from '../game/game';
import { Room } from '../room/room';

export type Player = Credentials & {
  isBot?: boolean;
  wins: number;
  online: boolean;
  ws: WebSocket;
};

export class SessionManager {
  private static instance: SessionManager | null = null;
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, Player | undefined>();
  private players = new Map<string, Player>();
  private rooms = new Map<string, Room>();
  private games = new Map<string, Game>();

  private constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on('connection', this.handleConnection);
  }

  public static getInstance(wss: WebSocketServer): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(wss);
    }
    return SessionManager.instance;
  }

  private handleMessage = (ws: WebSocket, rawData: RawData): void => {
    let parsedResult;
    try {
      parsedResult = parseCommandRequest(rawData);
    } catch (err) {
      logger.error(err);
      return;
    }
    const { parsed } = parsedResult;

    const clientId = this.clients.get(ws)?.name ?? BOT_ALIAS;
    logger.client(clientId, parsedResult);

    switch (parsed.type) {
      case 'reg': {
        void this.handleLogin(ws, parsed.data);
        return;
      }
      case 'create_room': {
        void this.handleCreateRoom(ws);
        return;
      }
      case 'add_user_to_room': {
        void this.handleAddUserToRoom(ws, parsed.data.indexRoom);
        return;
      }
      case 'single_play': {
        void this.handleSinglePlay(ws);
      }
    }
  };

  private initGame = (game: Game): void => {
    game.on(GameEvent.Finish, ({ game, winner }: GameFinishEventResult) => {
      if (winner) {
        winner.wins += 1;
      }
      this.games.delete(game.id);
      this.rooms.delete(game.id);
      void sendUpdateWinners(this.clients.keys(), this.getWinners());
    });
  };

  private createGame = (indexRoom: string | number): boolean => {
    const room = this.rooms.get(indexRoom.toString());
    if (!room) {
      return false;
    }
    const game = new Game(room);
    this.games.set(room.id, game);
    this.initGame(game);

    return true;
  };

  private getAvailableRooms = (): UpdateRoomResponse['data'] => {
    return [...this.rooms]
      .filter(([, room]) => room.players.length === 1)
      .map(([roomId, room]) => {
        return {
          roomId,
          roomUsers: room.roomUsers,
        };
      });
  };

  private getWinners = (): UpdateWinnersResponse['data'] => {
    return [...this.players.values()]
      .map(({ name, wins }) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins);
  };

  private handleSinglePlay = async (ws: WebSocket): Promise<void> => {
    const player = this.clients.get(ws);
    if (!player) {
      return;
    }
    // do not add bot to players
    const bot = new Bot(this.wss);

    const room = new Room(bot);
    this.rooms.set(bot.name, room);
    await this.handleAddUserToRoom(ws, room.id);

    bot.addShips();
  };

  private handleCreateRoom = async (ws: WebSocket): Promise<string | undefined> => {
    const player = this.clients.get(ws);
    if (!player) {
      return;
    }
    const alreadyInTheRoom = this.rooms.values().find(room => room.has(player));
    if (alreadyInTheRoom) {
      return;
    }
    const id = player.name;
    this.rooms.set(id, new Room(player));
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());

    return id;
  };

  private addUserToRoom = async (
    ws: WebSocket,
    indexRoom: string | number,
  ): Promise<Room | undefined> => {
    const roomId = indexRoom.toString();
    const room = this.rooms.get(roomId);
    const player = this.clients.get(ws);

    // do not add to our or to empty room
    if (!player || !room || room.has(player) || room.players.length !== 1) {
      return;
    }
    room.add(player);
    // remove room(s) created by the player
    this.rooms.forEach(room => {
      if (room.id === player.name) {
        this.rooms.delete(room.id);
      }
    });
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());

    return room;
  };

  private handleAddUserToRoom = async (
    ws: WebSocket,
    indexRoom: string | number,
  ): Promise<void> => {
    const room = await this.addUserToRoom(ws, indexRoom);
    if (!room) {
      return;
    }
    const success = this.createGame(room.id);
    if (!success) {
      return;
    }
    for (const { ws, name } of room.players) {
      await sendCreateGame(ws, { idGame: room.id, idPlayer: name });
    }
    // remove room from availables
    this.rooms.delete(room.id);
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
  };

  private addPlayer = (player: Player): void => {
    this.players.set(player.name, player);
    this.clients.set(player.ws, player);
  };

  private sendLogin = async (ws: WebSocket, name: string): Promise<void> => {
    await sendLoginSuccess(ws, name);
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    await sendUpdateWinners(this.clients.keys(), this.getWinners());
  };

  private signin = async (ws: WebSocket, existsPlayer: Player, password: string): Promise<void> => {
    if (existsPlayer.online) {
      await sendLoginError(ws, ErrorMessage.PlayerAlreadyOnline);
      return;
    }
    if (existsPlayer.password !== password) {
      await sendLoginError(ws, ErrorMessage.InvalidPassword);
      return;
    }
    existsPlayer.ws = ws;
    existsPlayer.online = true;
    this.clients.set(ws, existsPlayer);
    await this.sendLogin(ws, existsPlayer.name);
  };

  private signup = async (ws: WebSocket, { name, password }: Credentials): Promise<void> => {
    if (!/^[a-z][a-z0-9]+$/i.test(name)) {
      await sendLoginError(ws, ErrorMessage.InvalidLogin);
      return;
    }
    const player = { name, password, online: true, wins: 0, ws };
    this.addPlayer(player);
    await this.sendLogin(ws, name);
  };

  private handleLogin = async (ws: WebSocket, { name, password }: Credentials): Promise<void> => {
    const existsPlayer = this.players.get(name);
    if (existsPlayer) {
      await this.signin(ws, existsPlayer, password);
    } else {
      await this.signup(ws, { name, password });
    }
  };

  private handleConnectionClose = (ws: WebSocket): void => {
    const player = this.clients.get(ws);

    if (player) {
      player.online = false;

      // cleanup
      this.rooms.forEach(room => {
        // remove player from room
        room.remove(player);
        // remove room if nobody inside
        if (!room.players.length) {
          this.rooms.delete(room.id);
        }
      });
      // remove game with given player
      this.games.forEach(game => {
        if (game.has(player)) {
          this.games.delete(game.id);
        }
      });
    }
    this.clients.delete(ws);
  };

  private handleConnection = (ws: WebSocket): void => {
    logger.server('someone connected');

    ws.on('message', data => {
      this.handleMessage(ws, data);
    });
    ws.on('close', () => {
      const clientId = this.clients.get(ws)?.name ?? BOT_ALIAS;
      logger.server(magenta(clientId), 'disconnected');
      this.handleConnectionClose(ws);
    });
  };
}
