import { scope, getCurrentScope, setCurrentScope } from "../reactive";
import type { Signal } from "../reactive";
import type { VNode } from "../types";

/**
 * Iterates over a reactive array (`Signal<T[]>`) and maps each item to a VNode using the provided mapping function.
 * All items are scoped to a single scope for isolation and cleanup, similar to a component.
 * The scope includes an eventElements set for event handler cleanup.
 */
export function list<T>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => {
    const listScope = scope();
    listScope.eventElements = new Set<HTMLElement>();
    const prev = getCurrentScope();
    setCurrentScope(listScope);
    try {
      const vnodes = data().map((item, index) => {
        const vNode = mapFn(item, index);
        vNode._item = item;
        vNode._scope = listScope;
        return vNode;
      });
      (vnodes as VNode[] & { cleanup: () => void }).cleanup = () => listScope.cleanup();
      return vnodes;
    } finally {
      setCurrentScope(prev);
    }
  };
}