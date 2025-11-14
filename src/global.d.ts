import type { WebSocket as Websock } from 'ws';

declare namespace NodeJS {
  type WebSocket = Websock;
  type ProcessEnv = {
    HTTP_PORT: string;
    WS_PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
  };
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type PartialWithRequired<T, K extends keyof T> = Pick<Required<T>, K> & Partial<T>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type WithRequired<Type, Key extends keyof Type> = Type & Required<Pick<Type, Key>>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type Throwable = (err: unknown) => never;
type Either<T = never> = T extends never ? unknown : T;
