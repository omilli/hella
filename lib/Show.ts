import { effect, pushContext, popContext } from "./reactive";
import { cleanNodeRegistry, getNodeRegistry } from "./registry";
import { renderVNode } from "./mount";
import type { VNode, VNodeValue } from "./types";

interface ShowProps {
  when: boolean | (() => boolean);
  children: () => VNodeValue;
}

export function Show({ when, children }: ShowProps): VNode {
  const placeholder = document.createComment("show");
  let currentNode: Node | null = null;
  let cleanupSubtree: (() => void) | null = null;

  // Return a wrapper fragment that will always be inserted into the DOM
  // and will be replaced by the effect as needed.
  const fragment = document.createDocumentFragment();
  fragment.appendChild(placeholder);

  effect(() => {
    const condition = typeof when === "function" ? when() : when;

    // Clean up previous subtree/effect if toggling off or replacing
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
      // Set up context for this subtree
      let node: Node;
      let registryCleanup: (() => void) | null = null;
      pushContext({
        registerEffect: (cleanup: () => void) => {
          registryCleanup = cleanup;
        }
      });
      let value = children();
      if (typeof value === "string" || typeof value === "number") {
        node = document.createTextNode(String(value));
      } else if (value && typeof value === "object" && "tag" in value) {
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

  // Return the fragment so Show always inserts something into the DOM on mount
  return fragment as unknown as VNode;
}
