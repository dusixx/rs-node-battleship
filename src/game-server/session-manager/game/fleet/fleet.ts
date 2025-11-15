import type { AttackResponse, Position, ShipInfo } from '../../../common/types';
import { getCells } from './fleet.utils';

type Boat = {
  body: Set<string>; // {"1,2", "1,4"...}
  around: Position[]; // cells around [{1,2},{1,3},...]
};

export type AttackResult =
  | (Omit<AttackResponse['data'], 'currentPlayer'> & {
      around: Position[];
      defeat?: boolean;
    })
  | ({ status: 'touched' } & Record<string, unknown>);

export class Fleet {
  private _boats: Boat[] = [];
  private touched = new Set<string>();

  constructor(
    private _playerName: string,
    shipsInfo: ShipInfo[],
  ) {
    this.parseShipsInfos(shipsInfo);
  }

  public get playerName(): string {
    return this._playerName;
  }

  public get boats(): Readonly<Boat[]> {
    return Object.freeze(this._boats);
  }

  /**
   * return undefined if already touched cell is attacked
   */
  public attack({ x, y }: Position): AttackResult {
    const strPos = `${x},${y}`;
    const foundBoat = this.boats.find(({ body }) => body.has(strPos));

    if (this.touched.has(strPos)) {
      return { status: 'touched' };
    }
    this.touched.add(strPos);

    if (!foundBoat) {
      return {
        position: { x, y },
        status: 'miss',
        around: [],
      };
    }
    foundBoat.body.delete(strPos);

    // boat still alive
    if (foundBoat.body.size !== 0) {
      return {
        position: { x, y },
        status: 'shot',
        around: [],
      };
    }
    // remove killed boat
    this._boats = this._boats.filter(b => b !== foundBoat);
    return {
      position: { x, y },
      status: 'killed',
      around: foundBoat.around,
      defeat: this.boats.length === 0,
    };
  }

  private parseShipsInfos(infos: ShipInfo[]): void {
    for (const info of infos) {
      const boat: Boat = {
        body: new Set<string>(),
        around: [],
      };
      const { body, around } = getCells(info);
      boat.around = around;
      body.forEach(({ x, y }) => {
        boat.body.add(`${x},${y}`);
      });
      this._boats.push(boat);
    }
  }
}
