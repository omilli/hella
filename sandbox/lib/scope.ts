
// --- Context Stack ---
export type Context = {
  name: string;
  effects: Set<() => void>;
  signals: Set<{ cleanup: () => void }>;
  parent?: Context;
};

const contextStack: Context[] = [];

export function pushContext(name: string) {
  const ctx: Context = { name, effects: new Set(), signals: new Set(), parent: contextStack[contextStack.length - 1] };
  contextStack.push(ctx);
  return ctx;
}

export function popContext() {
  const ctx = contextStack.pop();
  if (ctx) {
    // Cleanup all effects
    ctx.effects.forEach(cleanup => cleanup());
    ctx.effects.clear();
    // Cleanup all signals
    ctx.signals.forEach(signal => signal.cleanup());
    ctx.signals.clear();
  }
  return ctx;
}

export function currentContext() {
  return contextStack[contextStack.length - 1] || null;
}