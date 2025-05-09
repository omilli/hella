let contextStack: unknown[] = [];

export function pushContext<T>(ctx: T) {
  contextStack.push(ctx);
}

export function popContext() {
  contextStack.pop();
}

export function getCurrentContext() {
  return contextStack[contextStack.length - 1] || null;
}