import { effect, pushScope, popScope } from "./reactive";
import { cleanNodeRegistry } from "./registry";
import { isFunction, resolveNode } from "./mount";
import type { VNodeValue } from "./types";

interface Show {
  when: boolean | (() => boolean);
  children: () => VNodeValue;
}

export function show({ when, children }: Show): Node {
  let currentNode: Node | null = null;
  let cleanupSubtree: (() => void) | null = null;

  const placeholder = document.createComment("show");
  const fragment = document.createDocumentFragment();
  fragment.appendChild(placeholder);

  effect(() => {
    const condition = isFunction(when) ? when() : when;

    if (currentNode && currentNode.parentNode) {
      cleanNodeRegistry(currentNode);
      currentNode.parentNode.replaceChild(placeholder, currentNode);
      currentNode = null;
    }

    if (cleanupSubtree) {
      cleanupSubtree();
      cleanupSubtree = null;
    }

    if (condition) {
      let node: Node;
      let registryCleanup: (() => void) | null = null;

      pushScope({
        registerEffect: (cleanup: () => void) => {
          registryCleanup = cleanup;
        }
      });

      let value = children();
      node = resolveNode(value);

      popScope();

      if (placeholder.parentNode) {
        placeholder.parentNode.replaceChild(node, placeholder);
        currentNode = node;
      }

      cleanupSubtree = () => {
        cleanNodeRegistry(node);
        if (registryCleanup) registryCleanup();
      };
    }
  });

  return fragment;
}
