import { scope, setCurrentScope, getCurrentScope } from "../reactive";
import { rootRegistry } from "../render";
import type { VNode } from "../types";

export function component<Props extends object>(
  fn: (props: Props) => VNode
) {
  return (props?: Props) => {
    const [componentScope, resetScope] = scope();

    componentScope.eventElements = new Set<HTMLElement>();

    const parentScope = getCurrentScope();
    if (parentScope && parentScope.rootSelector) {
      componentScope.rootSelector = parentScope.rootSelector;
    }

    let result: VNode;
    let userCleanup: (() => void) | undefined;

    try {
      const out = fn(props as Props);
      result = out;
      userCleanup = out.cleanup;
    } finally {
      resetScope();
    }
    if (typeof result === "object") {
      result._scope = componentScope;
      result.cleanup = () => {
        userCleanup?.();
        const rootSelector = componentScope.rootSelector;
        if (rootSelector && componentScope.eventElements?.size) {
          const delegator = rootRegistry.get(rootSelector);
          if (delegator) {
            for (const el of componentScope.eventElements) {
              delegator.removeHandlersForElement(el);
            }
          }
        }
        componentScope.cleanup();
      };
    }
    return result;
  };
}