import { removeNodeHandler } from "../events";

export type Context = {
  name: string;
  effects: Set<() => void>;
  signals: Set<{ cleanup: () => void }>;
  eventDelegates: Set<{ node: Node, type: string }>;
  parent?: Context;
};

const contextStack: Context[] = [];

export function pushContext(name: string) {
  const ctx: Context = {
    name,
    effects: new Set(),
    signals: new Set(),
    eventDelegates: new Set(),
    parent: contextStack[contextStack.length - 1]
  };
  contextStack.push(ctx);
  return ctx;
}

export function popContext() {
  const ctx = contextStack.pop();
  if (ctx) {
    ctx.effects.forEach(cleanup => cleanup());
    ctx.effects.clear();
    ctx.signals.forEach(signal => signal.cleanup());
    ctx.signals.clear();
    for (const { node, type } of ctx.eventDelegates) {
      removeNodeHandler(node, type);
    }
    ctx.eventDelegates.clear();
  }
  return ctx;
}

export function currentContext() {
  return contextStack[contextStack.length - 1] || null;
}