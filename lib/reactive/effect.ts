import type { Signal } from "./signal";
import { getCurrentContext } from "./context";

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

  const execute: (() => void) & { subscriptions?: Set<Signal<unknown>> } = () => {
    if (isCancelled) return;
    subscriptions.forEach(signal => signal.unsubscribe(execute));
    subscriptions.clear();

    (execute as any).subscriptions = subscriptions;
    setCurrentEffect(execute);
    try {
      fn();
    } finally {
      setCurrentEffect(null);
      (execute as any).subscriptions = undefined;
    }
  };

  // Register with current context if possible
  const ctx = getCurrentContext();
  if (ctx && typeof ctx.registerEffect === "function") {
    ctx.registerEffect(() => cleanup());
  }

  execute();

  function cleanup() {
    isCancelled = true;
    subscriptions.forEach(signal => signal.unsubscribe(execute));
    subscriptions.clear();
  }

  return cleanup;
}