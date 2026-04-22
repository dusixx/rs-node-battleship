/* eslint-disable prefer-const */
import type { Position, ShipInfo } from '@common';
import type { GetCellsResult } from './fleet.types';

export const FIELD_SIZE = 10;

const isValidPosition = ({ x, y }: Position): boolean => {
  return x < FIELD_SIZE && x >= 0 && y < FIELD_SIZE && y >= 0;
};

const getOnlyValidCells = (cells: Position[]): Position[] => {
  return cells.filter(isValidPosition);
};

const getVerticalCells = ({ position, length }: ShipInfo): GetCellsResult => {
  const result: GetCellsResult = {
    body: [],
    around: [],
  };
  if (!isValidPosition(position)) {
    return result;
  }
  let { x: x0, y: y0 } = position;
  y0 -= 1;

  for (let i = 0, yn = y0; i < length + 2; i += 1) {
    const cell = { x: x0, y: yn + i };
    const leftCell = { x: x0 - 1, y: yn + i };
    const rightCell = { x: x0 + 1, y: yn + i };

    if (i === 0 || i === length + 1) {
      result.around.push(cell);
    } else {
      result.body.push(cell);
    }
    result.around.push(leftCell, rightCell);
  }
  result.around = getOnlyValidCells(result.around);

  return result;
};

const getHorizontalCells = ({ position, length }: ShipInfo): GetCellsResult => {
  const result: GetCellsResult = {
    body: [],
    around: [],
  };
  if (!isValidPosition(position)) {
    return result;
  }
  let { x: x0, y: y0 } = position;
  x0 -= 1;

  for (let i = 0, xn = x0; i < length + 2; i += 1) {
    const cell = { x: xn + i, y: y0 };
    const topCell = { x: xn + i, y: y0 - 1 };
    const bottomCell = { x: xn + i, y: y0 + 1 };

    if (i === 0 || i === length + 1) {
      result.around.push(cell);
    } else {
      result.body.push(cell);
    }
    result.around.push(topCell, bottomCell);
  }
  result.around = getOnlyValidCells(result.around);

  return result;
};

/**
 * direction: true -> up to down
 *
 * direction: false -> left to right
 *
 * returns { body: [], around: [] } for invalid position
 */
export const getCells = (info: ShipInfo): GetCellsResult => {
  return info.direction ? getVerticalCells(info) : getHorizontalCells(info);
};
