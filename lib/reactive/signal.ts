import { getCurrentEffect, queueEffects } from "./effect";

export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
  unsubscribe: (fn: () => void) => void
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    const currentEffect = getCurrentEffect();

    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
      // Track this signal in the effect's subscriptions
      if ((currentEffect as any).subscriptions) {
        (currentEffect as any).subscriptions.add(signalFn);
      }
    }

    return value;
  };

  signalFn.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    if (subscribers) {
      const subs = Array.from(subscribers);
      queueEffects(subs);
      subscribers.clear();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
  };

  // Add unsubscribe method
  signalFn.unsubscribe = (fn: () => void) => {
    subscribers?.delete(fn);
  };

  return signalFn;
}