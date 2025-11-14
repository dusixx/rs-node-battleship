import { type RawData, type WebSocket, type WebSocketServer } from 'ws';
import { cyan, yellow } from '../../common/utils/style';
import { ErrorMessage } from '../common/constants';
import type { Credentials, UpdateRoomResponse, UpdateWinnersResponse } from '../common/types';
import { parseCommandRequest } from '../common/utils/request';
import {
  sendCreateGame,
  sendLoginError,
  sendLoginSuccess,
  sendUpdateRoom,
  sendUpdateWinners,
} from '../common/utils/response';
import { Game } from './game';
import { Room } from './room';

export type Player = Credentials & {
  wins: number;
  online: boolean;
  ws: WebSocket;
};

export class SessionManager {
  private static instance: SessionManager | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, Player | null>();
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
    const { parsed, stringified } = parseCommandRequest(rawData);

    const clientId = this.clients.get(ws)?.name ?? 'client';
    console.log(cyan(`\n${clientId}:`), yellow(`${parsed.type}:`), stringified);

    switch (parsed.type) {
      case 'reg': {
        this.login(ws, parsed.data);
        return;
      }
      case 'create_room': {
        this.createRoom(ws);
        return;
      }
      case 'add_user_to_room': {
        void this.addUserToRoom(ws, parsed.data.indexRoom);
        return;
      }
    }
  };

  // TODO: do not add urself
  private addUserToRoom = async (ws: WebSocket, indexRoom: string | number): Promise<void> => {
    const roomId = indexRoom.toString();
    const room = this.rooms.get(roomId);
    const player = this.clients.get(ws);

    if (player) {
      room?.add(player);
    }
    if (!room || room.isAvailable) {
      return;
    }
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    const idGame = this.createGame(roomId);
    for (const { ws, name } of room.players) {
      await sendCreateGame(ws, { idGame, idPlayer: name });
    }
    this.rooms.delete(roomId);
    await sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
  };

  private createGame = (indexRoom: string | number): string => {
    const gameId = indexRoom.toString();
    const game = new Game(indexRoom.toString());
    this.games.set(gameId, game);

    return gameId;
  };

  private createRoom = (ws: WebSocket): void => {
    const player = this.clients.get(ws);
    if (player) {
      // TODO: or exit - create a new one and delete the current one if it is empty after exiting?
      for (const room of this.rooms.values()) {
        if (room.has(player)) {
          return;
        }
      }
      const id = player.name;
      this.rooms.set(id, new Room(id, player));

      void sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    }
  };

  private getAvailableRooms = (): UpdateRoomResponse['data'] => {
    return [...this.rooms]
      .filter(([, room]) => room.isAvailable)
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
    const exists = this.players.get(name);

    if (exists?.online) {
      void sendLoginError(ws, ErrorMessage.PlayerAlreadyOnline);
      return;
    }
    if (exists && exists.password !== password) {
      void sendLoginError(ws, ErrorMessage.InvalidPassword);
      return;
    }
    const player = { name, password, online: true, wins: 0, ws };
    this.players.set(name, player);
    this.clients.set(ws, player);

    this.sendLoginSuccessResponse(ws, name);
  };

  private sendLoginSuccessResponse = (ws: WebSocket, name: string): void => {
    void sendLoginSuccess(ws, name);
    // broadcast
    void sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    void sendUpdateWinners(this.clients.keys(), this.getWinners());
  };

  // private handleClientDisconnect = (): void => {};

  private handleConnection = (ws: WebSocket): void => {
    console.log('\nClient connected');

    this.clients.set(ws, null);

    ws.on('message', data => {
      this.handleMessage(ws, data);
    });
    ws.on('close', () => {
      // TODO: need cleanup (collections)
      const player = this.clients.get(ws);
      if (player) {
        player.online = false;
      }
      this.clients.delete(ws);
    });
  };
}
