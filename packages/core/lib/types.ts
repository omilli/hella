export type DynamicValue<T> = T | (() => T);

export type GenericPromise<T> = () => Promise<T>;

export type CleanupFunction = () => void;

export type UnknownFn = (...args: unknown[]) => unknown

export type Context<T> = (typeof globalThis | Window) & T