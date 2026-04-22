import type { AddShipsRequest, RandomAttackRequest, ShipInfo } from '@common';
import {
  BOT_ATTACK_DELAY,
  DEF_HOSTNAME,
  getId,
  hasOwnKeys,
  logger,
  PORT,
  rndInt,
  sleep,
  stringifyRequest,
} from '@common';
import type { Player } from '@components';
import type { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { fleets } from './data/fleets';

export class Bot implements Player {
  public name: string;
  public password: string = '';
  public isBot: boolean = true;
  public online: boolean = true;
  public wins: number;
  public ws: WebSocket;

  constructor(wss: WebSocketServer) {
    const address = wss.address();
    const port = hasOwnKeys(address, 'port') ? address.port : address || PORT;

    this.ws = new WebSocket(`ws://${DEF_HOSTNAME}:${port}`);
    this.name = `bot-${getId()}`;
  }

  public addShips(): void {
    const { ws, name } = this;
    const idx = rndInt(0, fleets.length - 1);
    const ships = (fleets as ShipInfo[][])[idx]!;
    const req: AddShipsRequest = {
      id: 0,
      type: 'add_ships',
      data: { gameId: name, indexPlayer: name, ships },
    };
    logger.debug(`fleet (${idx})`);
    ws.emit('message', stringifyRequest(req));
  }

  public async randomAttack(delay: number = BOT_ATTACK_DELAY): Promise<void> {
    const { ws, name } = this;
    const req: RandomAttackRequest = {
      id: 0,
      type: 'randomAttack',
      data: { gameId: name, indexPlayer: name },
    };
    await sleep(delay);
    ws.emit('message', stringifyRequest(req));
  }
}
