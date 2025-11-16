import { rndInt } from '../../../../common/utils';
import type { AttackResponse, Position, ShipInfo } from '../../../common/types';
import { FIELD_SIZE, getCells } from './fleet.utils';

type XYPair = `${number},${number}`;

type Boat = {
  body: Set<XYPair>; // {"1,2", "1,4"...}
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
  private availableCells = new Set<XYPair>();

  constructor(
    private _playerName: string,
    shipsInfo: ShipInfo[],
  ) {
    this.init(shipsInfo);
  }

  public get playerName(): string {
    return this._playerName;
  }

  public get boats(): Readonly<Boat[]> {
    return Object.freeze(this._boats);
  }

  public getValidRandomPosition(): Position {
    const idx = rndInt(0, this.availableCells.size - 1);
    const pos = [...this.availableCells][idx];
    const [x, y] = (pos ?? '').split(',');
    return {
      x: Number(x ?? -1),
      y: Number(y ?? -1),
    };
  }

  public randomAttack(): AttackResult {
    return this.attack(this.getValidRandomPosition());
  }

  public attack({ x, y }: Position): AttackResult {
    const strPos: XYPair = `${x},${y}`;
    const foundBoat = this.boats.find(({ body }) => body.has(strPos));

    if (!this.availableCells.has(strPos)) {
      return { status: 'touched' };
    }
    this.availableCells.delete(strPos);

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
    this.removeAroundCellsFromAvailable(foundBoat.around);
    return {
      position: { x, y },
      status: 'killed',
      around: foundBoat.around,
      defeat: this.boats.length === 0,
    };
  }

  private init(infos: ShipInfo[]): void {
    this.parseShipsInfos(infos);
    this.initAvailableCells();
  }

  private initAvailableCells = (): void => {
    for (let i = 0; i < FIELD_SIZE; i += 1) {
      for (let j = 0; j < FIELD_SIZE; j += 1) {
        this.availableCells.add(`${i},${j}`);
      }
    }
  };

  private removeAroundCellsFromAvailable = (around: Position[]): void => {
    for (const { x, y } of around) {
      this.availableCells.delete(`${x},${y}`);
    }
  };

  private parseShipsInfos(infos: ShipInfo[]): void {
    for (const info of infos) {
      const boat: Boat = {
        body: new Set<XYPair>(),
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
