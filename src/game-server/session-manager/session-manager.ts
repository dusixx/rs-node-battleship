import EventEmitter from 'node:events';
import { type RawData, type WebSocket, type WebSocketServer } from 'ws';
import { getId } from '../../common/utils';
import { gray } from '../../common/utils/style';
import { ErrorMessage } from '../common/constants';
import type { Credentials, UpdateRoomResponse, UpdateWinnersResponse } from '../common/types';
import { parseCommandRequest } from '../common/utils/request';
import {
  sendLoginError,
  sendLoginSuccess,
  sendUpdateRoom,
  sendUpdateWinners,
} from '../common/utils/response';
import { Room } from './room';

export type Player = Credentials & {
  wins: number;
  online: boolean;
};

export class SessionManager extends EventEmitter {
  private static instance: SessionManager | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, Player | null>();
  private players = new Map<string, Player>();
  private rooms = new Map<string, Room>();

  private constructor(wss: WebSocketServer) {
    super();
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
    const parsedMessage = parseCommandRequest(rawData);

    console.log(gray(this.clients.get(ws)?.name ?? 'client'), parsedMessage);

    switch (parsedMessage.type) {
      case 'reg':
        this.login(ws, parsedMessage.data);
        return;
      case 'create_room':
        this.createRoom(ws);
        void sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
        return;
    }
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
      const id = getId();
      this.rooms.set(id, new Room(id, player));
    }
  };

  private getAvailableRooms = (): UpdateRoomResponse['data'] => {
    return [...this.rooms]
      .filter(([, room]) => room.isAvailable)
      .map(([roomId, room]) => {
        return {
          roomId,
          roomUsers: room.getAll(),
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
    const player = { name, password, online: true, wins: 0 };
    this.players.set(name, player);
    this.clients.set(ws, player);

    // response sequence
    void sendLoginSuccess(ws, name);
    // broadcast
    void sendUpdateRoom(this.clients.keys(), this.getAvailableRooms());
    void sendUpdateWinners(this.clients.keys(), this.getWinners());
  };

  private handleConnection = (ws: WebSocket): void => {
    console.log('Client connected');

    this.clients.set(ws, null);

    ws.on('message', data => {
      this.handleMessage(ws, data);
    });
    ws.on('close', () => {
      const player = this.clients.get(ws);
      if (player) {
        player.online = false;
      }
      this.clients.delete(ws);
    });
  };
}
