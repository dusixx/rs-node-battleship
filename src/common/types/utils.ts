/* eslint-disable @typescript-eslint/no-explicit-any */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type PartialWithRequired<T, K extends keyof T> = Pick<Required<T>, K> & Partial<T>;
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type WithRequired<Type, Key extends keyof Type> = Type & Required<Pick<Type, Key>>;
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
export type Throwable = (err: unknown) => never;
export type Either<T = never> = T extends never ? unknown : T;
export type AnyFunction<T = any, R = any> = (...args: T[]) => R;
