import { red } from './style';

export const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return obj != null && typeof obj === 'object';
};

export const isStr = (obj: unknown): obj is string => {
  return typeof obj === 'string';
};

export const isEmptyStr = (obj: unknown): obj is string => {
  return !obj && isStr(obj);
};

export const hasOwnKeys = <T extends object>(obj: unknown, ...keys: (keyof T)[]): obj is T => {
  return isObject(obj) && keys.every(key => Object.hasOwn(obj, key));
};

export const getErrorMessage = (err: unknown, defaultMessage = 'something went wrong'): string => {
  return err instanceof Error ? err.message : isStr(err) ? err : defaultMessage;
};

export const JSONParse = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export const showError = (err: unknown): void => {
  console.log(red('Error: '), getErrorMessage(err));
};

export const getId = (): string => {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
};

export const isIterable = <T>(v: unknown): v is Iterable<T> => {
  return isObject(v) && Symbol.iterator in v && typeof v[Symbol.iterator] === 'function';
};

export const rndInt = (min: number, max: number): number => {
  return Math.round(min + Math.random() * (max - min));
};

export const sleep = async (ms: number): Promise<void> => {
  return new Promise(r => setTimeout(r, ms));
};
