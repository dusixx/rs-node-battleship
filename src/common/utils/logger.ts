import { BOT_ALIAS } from '../constants';
import type { CommandType } from '../types';
import { getErrorMessage } from './misc';
import type { ParseCommandRequestResult } from './request';
import { cyan, gray, green, magenta, red, style, yellow } from './style';

export const logger = {
  server(...args: unknown[]): void {
    console.log(cyan('[server]:'), ...args);
  },
  client(
    clientId: string | undefined,
    cmd: ParseCommandRequestResult<CommandType>,
    ...args: unknown[]
  ): void {
    const { parsed, stringified } = cmd;
    console.log(
      magenta(`[${clientId ?? BOT_ALIAS}]:`),
      yellow(`${parsed.type}:`),
      gray(stringified),
      ...args,
    );
  },
  game(gameId: string, ...args: unknown[]): void {
    console.log(green(`[game]:`), gray(`(${gameId})`), ...args);
  },
  error(err: unknown): void {
    console.log(red('[error]: '), getErrorMessage(err));
  },
  debug(...args: unknown[]): void {
    console.log(gray('[debug]: '), ...args);
  },
  log(color: Parameters<typeof style>[0], ...args: unknown[]): void {
    console.log(style(color, ...args));
  },
};
