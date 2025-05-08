import { effect } from "./reactive";
import { cleanNodeRegistry, getNodeRegistry } from "./registry";
import type { VNode, VNodeValue } from "./types";
import { renderVNode } from "./mount"; // <-- add this import

// ForProps: each is an array or a signal of array, children is a function
interface ForProps<T> {
  each: T[] | (() => T[]);
  children: (item: T, index: number) => VNodeValue;
  key?: (item: T, index: number) => any;
}

// Helper to resolve signals or functions
function resolve<T>(v: T[] | (() => T[])): T[] {
  return typeof v === "function" ? v() : v;
}

// Main For component
export function For<T>({ each, children, key }: ForProps<T>): VNode {
  const fragment = document.createDocumentFragment();
  let nodes: Node[] = [];
  let disposers: (() => void)[] = [];
  let prevKeys: any[] = [];

  effect(() => {
    const items = resolve(each);
    const newNodes: Node[] = [];
    const newDisposers: (() => void)[] = [];
    const newKeys = items.map((item, i) => key ? key(item, i) : i);

    // Keyed diffing: map old keys to their nodes/disposers
    const keyToNode = new Map<any, Node>();
    const keyToDisposer = new Map<any, () => void>();
    prevKeys.forEach((k, i) => {
      keyToNode.set(k, nodes[i]);
      keyToDisposer.set(k, disposers[i]);
    });

    // Build new node list
    items.forEach((item, i) => {
      const k = newKeys[i];
      let node: Node;
      let disposer: (() => void) | undefined;

      if (keyToNode.has(k)) {
        node = keyToNode.get(k)!;
        disposer = keyToDisposer.get(k);
        keyToNode.delete(k);
        keyToDisposer.delete(k);
      } else {
        // Render new node and track disposer
        const child = children(item, i);
        if (typeof child === "function") {
          // Dynamic child
          const placeholder = document.createComment("for-dynamic");
          node = placeholder;
          const cleanup = effect(() => {
            const value = child();
            let newNode: Node;
            if (typeof value === "string" || typeof value === "number") {
              newNode = document.createTextNode(String(value));
            } else if (value && typeof value === "object" && "tag" in value) {
              newNode = renderVNode(value as VNode); // <-- render VNode to Node
            } else if (value instanceof Node) {
              newNode = value;
            } else {
              newNode = document.createComment("for-empty");
            }
            if (node.parentNode) {
              node.parentNode.replaceChild(newNode, node);
            }
            node = newNode;
            cleanNodeRegistry();
          });
          disposer = cleanup;
        } else if (typeof child === "string" || typeof child === "number") {
          node = document.createTextNode(String(child));
        } else if (child instanceof Node) {
          node = child;
        } else if (child && typeof child === "object" && "tag" in child) {
          node = renderVNode(child as VNode); // <-- render VNode to Node
        } else {
          node = document.createComment("for-empty");
        }
      }
      newNodes.push(node);
      if (disposer) newDisposers.push(disposer);
      else newDisposers.push(() => { });
    });

    // Remove old nodes not in newKeys
    keyToNode.forEach((node, k) => {
      // Remove from DOM if present
      if (node.parentNode) node.parentNode.removeChild(node);
      // Clean up effects/handlers for this node (including comments)
      cleanNodeRegistry(node);
      // Call disposer if present
      const disposer = keyToDisposer.get(k);
      if (disposer) disposer();
      // Explicitly nullify reference for GC
      // @ts-ignore
      node = null;
    });

    // Replace fragment content
    while (fragment.firstChild) fragment.removeChild(fragment.firstChild);
    newNodes.forEach(n => {
      if (n instanceof Node) fragment.appendChild(n);
    });

    // Update refs
    nodes = newNodes;
    disposers = newDisposers;
    prevKeys = newKeys;
  });

  return fragment as unknown as VNode;
}
