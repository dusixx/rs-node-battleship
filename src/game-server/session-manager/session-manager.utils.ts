import { config } from 'dotenv';
import type { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { getId, hasOwnKeys, rndInt } from '../../common/utils';
import { gray } from '../../common/utils/style';
import { DEF_WS_PORT } from '../common/constants';
import type { AddShipsRequest, Credentials, ShipInfo } from '../common/types';
import { stringifyRequest } from '../common/utils/request';
import { fleets } from '../data/fleets.data';

config({ quiet: true });

const { WS_PORT } = process.env;

export type Player = Credentials & {
  wins: number;
  online: boolean;
  ws: WebSocket;
  isBot?: boolean;
};

export const createBot = (wss: WebSocketServer): Player => {
  const address = wss.address();
  const port = hasOwnKeys(address, 'port')
    ? address.port
    : address || Number(WS_PORT) || DEF_WS_PORT;
  const ws = new WebSocket(`ws://localhost:${port}`);
  return {
    name: `bot-${getId()}`,
    password: '',
    online: true,
    isBot: true,
    wins: 0,
    ws,
  };
};

export const addBotShips = (bot: Player): void => {
  const idx = rndInt(0, fleets.length - 1);
  const ships = (fleets as ShipInfo[][])[idx]!;
  const req: AddShipsRequest = {
    id: 0,
    type: 'add_ships',
    data: { gameId: bot.name, indexPlayer: bot.name, ships },
  };
  console.log(gray(`[debug]: fleet (${idx})`));
  bot.ws.emit('message', stringifyRequest(req));
};
