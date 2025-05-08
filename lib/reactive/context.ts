import type { Signal } from "./signal";

export type Owner = {
  name: string;
  owned: Set<Owner>;
  cleanups: Set<() => void>;
  signals: Set<Signal<unknown>>;
  parent?: Owner;
};

let ownerStack: Owner[] = [];

export function pushOwner(name: string) {
  const parent = ownerStack[ownerStack.length - 1];
  const owner: Owner = {
    name,
    owned: new Set(),
    cleanups: new Set(),
    signals: new Set(),
    parent
  };
  if (parent) parent.owned.add(owner);
  ownerStack.push(owner);
  return owner;
}

export function popOwner() {
  const owner = ownerStack.pop();
  if (owner) {
    // Clean up owned children first
    owner.owned.forEach(child => {
      owner.owned.delete(child);
      ownerStack.push(child);
      popOwner();
    });
    owner.cleanups.forEach(fn => fn());
    owner.cleanups.clear();
    owner.signals.forEach(signal => signal.cleanup());
    owner.signals.clear();
  }
  return owner;
}

export function currentOwner() {
  return ownerStack[ownerStack.length - 1] || null;
}