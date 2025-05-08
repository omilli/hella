import type { Signal } from "./signal";

export type Context = {
  name: string;
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  parent?: Context;
};

const contextStack: Context[] = [];

export function pushContext(name: string) {
  const ctx: Context = {
    name,
    effects: new Set(),
    signals: new Set(),
    parent: contextStack[contextStack.length - 1]
  };
  contextStack.push(ctx);
  console.log("pushContext:", name, "stack:", contextStack.map(c => c.name));
  return ctx;
}

export function popContext() {
  const ctx = contextStack.pop();
  if (ctx) {
    ctx.effects.forEach(cleanup => cleanup());
    ctx.effects.clear();
    ctx.signals.forEach(signal => signal.cleanup());
    ctx.signals.clear();
  }
  console.log("popContext:", ctx?.name, "stack:", contextStack.map(c => c.name));
  return ctx;
}

export function currentContext() {
  return contextStack[contextStack.length - 1] || null;
}