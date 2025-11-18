import { config } from 'dotenv';
import type { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { getId, hasOwnKeys, rndInt, sleep } from '../../common/utils';
import { gray } from '../../common/utils/style';
import { BOT_ATTACK_DELAY, DEF_HOSTNAME, DEF_WS_PORT } from '../common/constants';
import type { AddShipsRequest, RandomAttackRequest, ShipInfo } from '../common/types';
import { stringifyRequest } from '../common/utils/request';
import { fleets } from '../data/fleets';
import type { Player } from './session-manager';

config({ quiet: true });

const { WS_PORT } = process.env;

export type Bot = Player & {
  isBot: true;
  addShips: () => void;
  randomAttack: (delay?: number) => Promise<void>;
};

export const createBot = (wss: WebSocketServer): Bot => {
  const address = wss.address();
  const port = hasOwnKeys(address, 'port')
    ? address.port
    : address || Number(WS_PORT) || DEF_WS_PORT;

  const ws = new WebSocket(`ws://${DEF_HOSTNAME}:${port}`);
  const name = `bot-${getId()}`;

  const addShips = (): void => {
    const idx = rndInt(0, fleets.length - 1);
    const ships = (fleets as ShipInfo[][])[idx]!;
    const req: AddShipsRequest = {
      id: 0,
      type: 'add_ships',
      data: { gameId: name, indexPlayer: name, ships },
    };
    console.log(gray(`[debug]: fleet (${idx})`));
    ws.emit('message', stringifyRequest(req));
  };

  const randomAttack = async (delay: number = BOT_ATTACK_DELAY): Promise<void> => {
    const req: RandomAttackRequest = {
      id: 0,
      type: 'randomAttack',
      data: { gameId: name, indexPlayer: name },
    };
    await sleep(delay);
    ws.emit('message', stringifyRequest(req));
  };
  return {
    addShips,
    randomAttack,
    name,
    password: '',
    wins: 0,
    online: true,
    isBot: true,
    ws,
  };
};
