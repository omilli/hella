import { effect, pushContext, popContext } from "./reactive";
import { cleanNodeRegistry, getNodeRegistry } from "./registry";
import { isFunction, isText, isVNode, renderVNode } from "./mount";
import type { VNode, VNodeValue } from "./types";

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

      pushContext({
        registerEffect: (cleanup: () => void) => {
          registryCleanup = cleanup;
        }
      });

      let value = children();

      if (isText(value)) {
        node = document.createTextNode(String(value));
      } else if (isVNode(value)) {
        node = renderVNode(value as VNode);
      } else if (value instanceof Node) {
        node = value;
      } else {
        node = document.createComment("show-empty");
      }

      popContext();

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
