import type { Signal } from "./signal";

export const effectQueue: Set<() => void> = new Set();

let currentEffect: (() => void) | null = null;

let isFlushing = false;

export const getCurrentEffect = () => currentEffect;

export function setCurrentEffect(effect: (() => void) | null): void {
  currentEffect = effect;
}

export const isFlushingEffect = () => isFlushing;

export function setFlushingEffect(flushing: boolean): void {
  isFlushing = flushing;
}

export function queueEffects(effects: Iterable<() => void>): void {
  for (const fn of effects) {
    effectQueue.add(fn);
  }

  if (!isFlushingEffect()) {
    setFlushingEffect(true);
    queueMicrotask(() => {
      const toRun = Array.from(effectQueue);
      effectQueue.clear();
      setFlushingEffect(false);
      for (const fn of toRun) fn();
    });
  }
}

export function flushEffects(): Promise<void> {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => {
      const toRun = Array.from(effectQueue);
      effectQueue.clear();
      setFlushingEffect(false);
      for (const fn of toRun) fn();
      resolve();
    });
  });
}


export function effect(fn: () => void): () => void {
  let isCancelled = false;
  let subscriptions = new Set<Signal<unknown>>();

  // Patch getCurrentEffect to expose subscriptions
  const execute: (() => void) & { subscriptions?: Set<Signal<unknown>> } = () => {
    if (isCancelled) return;
    // Clear previous subscriptions
    subscriptions.forEach(signal => signal.unsubscribe(execute));
    subscriptions.clear();

    // Set up for new subscriptions
    (execute as any).subscriptions = subscriptions;
    setCurrentEffect(execute);
    try {
      fn();
    } finally {
      setCurrentEffect(null);
      (execute as any).subscriptions = undefined;
    }
  };

  execute();

  return () => {
    isCancelled = true;
    // Unsubscribe from all signals
    subscriptions.forEach(signal => signal.unsubscribe(execute));
    subscriptions.clear();
  };
}