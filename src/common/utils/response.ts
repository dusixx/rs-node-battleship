import WebSocket from 'ws';
import type {
  AttackResponse,
  CommandResponse,
  CommandType,
  CreateGameResponse,
  Position,
  StartGameResponse,
  UpdateRoomResponse,
  UpdateWinnersResponse,
  WithOptional,
} from '../types/index';
import { cyan, gray, yellow } from './style';

export const send = async (ws: WebSocket, data: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    ws.send(data, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const sendCommandResponse = async <T extends CommandType>(
  webSocket: Iterable<WebSocket> | WebSocket,
  response: WithOptional<CommandResponse<T>, 'id'>,
): Promise<void> => {
  const body = {
    id: 0,
    ...response,
    data: JSON.stringify(response.data),
  };
  const stringified = JSON.stringify(body);

  if (webSocket instanceof WebSocket) {
    webSocket = [webSocket];
  }
  for (const ws of webSocket) {
    if (ws.readyState === ws.OPEN) {
      await send(ws, stringified);
      console.log(cyan('[server]:'), yellow(`${response.type}:`), gray(stringified));
    }
  }
};

export const sendLoginError = async (
  ws: Iterable<WebSocket> | WebSocket,
  error: string,
): Promise<void> => {
  await sendCommandResponse<'reg'>(ws, {
    type: 'reg',
    data: {
      error: true,
      errorText: error,
      name: '',
      index: '',
    },
  });
};

export const sendLoginSuccess = async (
  ws: Iterable<WebSocket> | WebSocket,
  name: string,
): Promise<void> => {
  await sendCommandResponse<'reg'>(ws, {
    type: 'reg',
    data: {
      error: false,
      errorText: '',
      name,
      index: name,
    },
  });
};

export const sendUpdateWinners = async (
  ws: Iterable<WebSocket> | WebSocket,
  data: UpdateWinnersResponse['data'],
): Promise<void> => {
  await sendCommandResponse<'update_winners'>(ws, {
    type: 'update_winners',
    data,
  });
};

export const sendUpdateRoom = async (
  ws: Iterable<WebSocket> | WebSocket,
  data: UpdateRoomResponse['data'],
): Promise<void> => {
  await sendCommandResponse<'update_room'>(ws, {
    type: 'update_room',
    data,
  });
};

export const sendCreateGame = async (
  ws: Iterable<WebSocket> | WebSocket,
  data: CreateGameResponse['data'],
): Promise<void> => {
  await sendCommandResponse<'create_game'>(ws, {
    type: 'create_game',
    data,
  });
};

export const sendStartGame = async (
  ws: Iterable<WebSocket> | WebSocket,
  data: StartGameResponse['data'],
): Promise<void> => {
  await sendCommandResponse<'start_game'>(ws, {
    type: 'start_game',
    data,
  });
};

export const sendFinishGame = async (
  ws: Iterable<WebSocket> | WebSocket,
  winPlayer: string,
): Promise<void> => {
  await sendCommandResponse<'finish'>(ws, {
    type: 'finish',
    data: { winPlayer },
  });
};

export const sendTurn = async (
  ws: Iterable<WebSocket> | WebSocket,
  name: string,
): Promise<void> => {
  await sendCommandResponse<'turn'>(ws, {
    type: 'turn',
    data: { currentPlayer: name },
  });
};

const _sendAttack = async (
  ws: Iterable<WebSocket> | WebSocket,
  data: AttackResponse['data'],
): Promise<void> => {
  await sendCommandResponse<'attack'>(ws, {
    type: 'attack',
    data,
  });
};

export const sendAttack = async (
  ws: Iterable<WebSocket>,
  data: AttackResponse['data'] & { around?: Position[] },
): Promise<void> => {
  const { currentPlayer, status, position, around = [] } = data;
  await _sendAttack(ws, {
    currentPlayer,
    status,
    position,
  });
  if (status === 'killed') {
    for (const position of around) {
      await _sendAttack(ws, {
        currentPlayer,
        status: 'miss',
        position,
      });
    }
  }
};
