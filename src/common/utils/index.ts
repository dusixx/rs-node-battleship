import { red } from './style';

export const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return obj != null && typeof obj === 'object';
};

export const isStr = (obj: unknown): obj is string => {
  return typeof obj === 'string';
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
