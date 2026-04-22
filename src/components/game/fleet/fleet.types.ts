import type { AttackResponse, Position } from '@common';

export type GetCellsResult = {
  body: Position[];
  around: Position[];
};

export type XYPair = `${number},${number}`;

export type Boat = {
  body: Set<XYPair>; // {"1,2", "1,4"...}
  around: Position[]; // cells around [{1,2},{1,3},...]
};

export type AttackResult =
  | (Omit<AttackResponse['data'], 'currentPlayer'> & {
      around: Position[];
      defeat?: boolean;
    })
  | ({ status: 'touched' } & Record<string, unknown>);
