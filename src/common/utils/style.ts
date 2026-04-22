import { styleText } from 'node:util';

export const style = (mod: Parameters<typeof styleText>[0], ...args: unknown[]): string => {
  return styleText(mod, args.join(' '));
};
export const cyan = style.bind(null, 'cyan');
export const red = style.bind(null, 'red');
export const yellow = style.bind(null, 'yellow');
export const green = style.bind(null, 'green');
export const gray = style.bind(null, 'gray');
export const magenta = style.bind(null, 'magenta');

export const stylizeHttpStatus = (result: number): string => {
  if (result < 200) {
    return cyan(result);
  } else if (result < 300) {
    return green(result);
  } else if (result < 400) {
    return yellow(result);
  }
  return red(result);
};
