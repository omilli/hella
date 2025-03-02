import { Signal, UnknownFn } from "@hellajs/core";

export interface StoreHella {
  stores: WeakMap<
    object,
    {
      store: Set<StoreEffect>;
      effects: Set<() => void>;
    }
  >;
}
export interface StoreOptions {
  readonly?: boolean | (string | number | symbol)[];
}

export type StoreMethods<T> = {
  [K in keyof T as T[K] extends unknown ? K : never]: T[K];
};

export type StoreState<T> = {
  [K in keyof T as T[K] extends UnknownFn ? never : K]: T[K];
};

export type StoreEffectFn = (fn: () => void) => () => void;

export type StoreComputed<T> = {
  [K in keyof T]: T[K] extends UnknownFn
  ? ReturnType<T[K]>
  : T[K];
};

export type StoreSignals<T> = {
  [K in keyof StoreState<T>]: Signal<StoreState<T>[K]>;
} & StoreMethods<T> & {
  set(
    update:
      | Partial<StoreState<T>>
      | ((storeSignals: StoreSignals<T>) => Partial<StoreState<T>>),
  ): void;
  cleanup(): void;
  computed(): StoreComputed<T>;
};

export interface StoreBase<T> {
  signals: Map<keyof T, Signal<unknown>>;
  methods: Map<keyof T, UnknownFn>;
  effects: Set<() => void>;
  isDisposed: boolean;
  isInternal: boolean;
}

export type StoreEffect = (key: string | number | symbol, value: unknown) => void;

export interface StoreUpdateArgs<T> {
  signals: Map<keyof T, Signal<unknown>>;
  update:
  | Partial<StoreState<T>>
  | ((store: StoreSignals<T>) => Partial<StoreState<T>>);
}

export interface StoreWithFnArgs<T> {
  storeBase: StoreBase<T>;
  fn: (...args: unknown[]) => unknown;
}

export interface StoreValidatedArgs<T, V> {
  key: keyof T;
  value: V;
  storeBase: StoreBase<T>;
  storeProxy: object;
  options?: StoreOptions;
}

export type StoreFactory<T> = T | ((store: StoreSignals<T>) => T);
