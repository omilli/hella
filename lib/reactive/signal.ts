import { getCurrentEffect, queueEffects } from "./effect";
import { currentContext } from "./scope"; // Adjust path as needed

export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    const currentEffect = getCurrentEffect();

    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    // Register with current Context
    const ctx = currentContext();
    if (ctx) {
      ctx.signals.add(signalFn as Signal<unknown>);
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

  return signalFn;
}