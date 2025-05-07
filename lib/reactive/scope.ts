import type { Signal } from "./signal";

export interface Scope {
  effects: Set<() => void>;
  signals: Set<Signal<unknown>>;
  cleanup: () => void;
  parent?: Scope;
  eventElements?: Set<HTMLElement>;
  rootSelector?: string;
}

let currentScope: Scope | null = null;

export const getCurrentScope = () => currentScope;

export function setCurrentScope(scope: Scope | null): void {
  currentScope = scope;
}

export function scope(parent: Scope | null = getCurrentScope()): [Scope, () => void] {
  const newScope: Scope = {
    effects: new Set(),
    signals: new Set(),
    parent: parent || undefined,
    cleanup() {
      for (const cleanup of this.effects) cleanup();
      this.effects.clear();
      for (const signal of this.signals) signal.cleanup();
      this.signals.clear();
      this.parent = undefined;
    },
  };
  const previousScope = getCurrentScope();

  setCurrentScope(newScope);

  return [newScope, () => setCurrentScope(previousScope)];
}