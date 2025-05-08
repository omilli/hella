let contextStack: any[] = [];

export function pushContext(ctx: any) {
  contextStack.push(ctx);
}

export function popContext() {
  contextStack.pop();
}

export function getCurrentContext() {
  return contextStack[contextStack.length - 1] || null;
}