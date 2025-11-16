import { WebSocket, type RawData, type WebSocketServer } from 'ws';
import { getId, hasOwnKeys, rndInt, showError } from '../../common/utils';
import { cyan, gray, magenta, yellow } from '../../common/utils/style';
import { BOT_ALIAS, ErrorMessage, GameEvent } from '../common/data/constants';
import type {
  AddShipsRequest,
  Credentials,
  ShipInfo,
  UpdateRoomResponse,
  UpdateWinnersResponse,
} from '../common/types';
import { parseCommandRequest } from '../common/utils/request';
import {
  sendCreateGame,
  sendLoginError,
  sendLoginSuccess,
  sendUpdateRoom,
  sendUpdateWinners,
} from '../common/utils/response';
import { DEF_WS_PORT } from './../common/data/constants';

import { config } from 'dotenv';
import { fleets } from '../common/data/fleets.data';
import type { GameFinishEventResult } from './game/game';
import { Game } from './game/game';
import { Room } from './room/room';

config({ quiet: true });

const { WS_PORT } = process.env;

export type Player = Credentials & {
  wins: number;
  online: boolean;
  ws: WebSocket;
  isBot?: boolean;
};

export class SessionManager {
  private static instance: SessionManager | null = null;
  private wss: WebSocketServer | null = null;
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
      showError(err);
      return;
    }
    const { parsed, stringified } = parsedResult;

    const clientId = this.clients.get(ws)?.name ?? BOT_ALIAS;
    console.log(magenta(`[${clientId}]:`), yellow(`${parsed.type}:`), gray(stringified));

    switch (parsed.type) {
      case 'reg': {
        this.login(ws, parsed.data);
        return;
      }
      case 'create_room': {
        void this.createRoom(ws);
        return;
      }
      case 'add_user_to_room': {
        void this.addUserToRoom(ws, parsed.data.indexRoom);
        return;
      }
      case 'single_play': {
        void this.handleSinglePlay(ws);
        return;
      }
    }
  };

  private handleSinglePlay = async (playerWebsocket: WebSocket): Promise<void> => {
    if (!this.wss) {
      return;
    }
    const address = this.wss.address();
    const port = hasOwnKeys(address, 'port')
      ? address.port
      : address || Number(WS_PORT) || DEF_WS_PORT;
    const ws = new WebSocket(`ws://localhost:${port}`);

    const bot: Player = {
      name: `bot-${getId()}`,
      password: '',
      online: true,
      isBot: true,
      wins: 0,
      ws,
    };
    this.clients.set(ws, bot);
    this.players.set(bot.name, bot);

    const room = new Room(bot.name, bot);
    this.rooms.set(bot.name, room);
    const player = this.clients.get(playerWebsocket);
    if (!player) {
      return;
    }
    await this.addUserToRoom(playerWebsocket, room.id);
    this.addBotShips(bot);
  };

  private addBotShips = (bot: Player): void => {
    const idx = rndInt(0, fleets.length - 1);
    const req: AddShipsRequest = {
      id: 0,
      type: 'add_ships',
      data: {
        gameId: bot.name,
        indexPlayer: bot.name,
        ships: (fleets as ShipInfo[][])[idx]!,
      },
    };
    console.log(gray(`[debug]: fleet (${idx})`));
    const obj = { ...req, data: JSON.stringify(req.data) };
    bot.ws.emit('message', JSON.stringify(obj));
  };

  private addUserToRoom = async (ws: WebSocket, indexRoom: string | number): Promise<void> => {
    const roomId = indexRoom.toString();
    const room = this.rooms.get(roomId);
    const player = this.clients.get(ws);

    if (player) {
      // do not add urself
      if (room?.has(player)) {
        return;
      }
      room?.add(player);
    }
    if (!room || room.players.length !== Room.PLAYERS_LIMIT) {
      return;
    }
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    const success = this.createGame(roomId);
    if (!success) {
      return;
    }
    for (const { ws, name } of room.players) {
      await sendCreateGame(ws, { idGame: roomId, idPlayer: name });
    }
    this.rooms.delete(roomId);
    // remove room created by the player
    this.rooms.forEach(room => {
      if (room.has(player) && room.players.length === 1) {
        this.rooms.delete(room.id);
      }
    });
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
  };

  private initGame = (game: Game): void => {
    game.on(GameEvent.Finish, ({ game, winner, bot }: GameFinishEventResult) => {
      winner.wins += 1;
      this.games.delete(game.id);
      this.rooms.delete(game.id);
      // remove bot
      if (bot) {
        this.clients.delete(bot.ws);
        this.players.delete(bot.name);
      }
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

  private createRoom = async (ws: WebSocket): Promise<string | undefined> => {
    const player = this.clients.get(ws);
    if (player) {
      for (const room of this.rooms.values()) {
        if (room.has(player)) {
          return;
        }
      }
      const id = player.name;
      this.rooms.set(id, new Room(id, player));

      await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());

      return id;
    }
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

  private login = (ws: WebSocket, { name, password }: Credentials): void => {
    const existsPlayer = this.players.get(name);

    // signin
    if (existsPlayer) {
      if (existsPlayer.online) {
        void sendLoginError(ws, ErrorMessage.PlayerAlreadyOnline);
        return;
      }
      if (existsPlayer.password !== password) {
        void sendLoginError(ws, ErrorMessage.InvalidPassword);
        return;
      }
      existsPlayer.ws = ws;
      existsPlayer.online = true;
      this.clients.set(ws, existsPlayer);
      // signup
    } else {
      if (!/^[a-z][a-z0-9]+$/i.test(name)) {
        void sendLoginError(ws, ErrorMessage.LoginAllowed);
        return;
      }
      const player = { name, password, online: true, wins: 0, ws };
      this.players.set(name, player);
      this.clients.set(ws, player);
    }
    this.sendLoginSuccessResponse(ws, name);
  };

  private sendLoginSuccessResponse = (ws: WebSocket, name: string): void => {
    void sendLoginSuccess(ws, name);
    void sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    void sendUpdateWinners(this.clients.keys(), this.getWinners());
  };

  private handleClose = (ws: WebSocket): void => {
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
    console.log(cyan('[server]:'), 'someone connected');

    this.clients.set(ws, undefined);

    ws.on('message', data => {
      this.handleMessage(ws, data);
    });
    ws.on('close', () => {
      const clientId = this.clients.get(ws)?.name ?? BOT_ALIAS;
      console.log(cyan('[server]:'), magenta(clientId), 'disconnected');
      this.handleClose(ws);
    });
  };
}
