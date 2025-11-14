/* eslint-disable @typescript-eslint/no-base-to-string */
import type { RawData } from 'ws';
import { hasOwnKeys, isObject, isStr, JSONParse } from '../../../common/utils';
import { ErrorMessage } from '../constants';
import type { CommandRequest, CommandRequestWithStrigifiedData, CommandType } from '../types';

export const isLikeCommandRequest = (req: unknown): req is CommandRequestWithStrigifiedData => {
  return hasOwnKeys<CommandRequestWithStrigifiedData>(req, 'type', 'data', 'id') && isStr(req.data);
};

export const parseCommandRequest = <T extends CommandType>(buf: RawData): CommandRequest<T> => {
  const req = JSONParse(buf.toString('utf-8'));

  // with stringified data
  if (!isLikeCommandRequest(req)) {
    throw new Error(ErrorMessage.InvalidCommandRequest);
  }
  const parsedData = JSONParse(req.data);

  // create_room -> {data: ''} -> {data: null}
  if (parsedData !== null && !isObject(parsedData)) {
    throw new Error(ErrorMessage.InvalidCommandRequest);
  }
  return { ...req, data: parsedData } as CommandRequest<T>;
};
