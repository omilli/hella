import { effect } from "./reactive";
import { cleanNodeRegistry } from "./registry";
import { renderVNode } from "./mount";
import type { VNode, VNodeValue } from "./types";

interface ForProps<T> {
  each: T[] | (() => T[]);
  children: (item: T, index: number) => VNodeValue;
  key?: (item: T, index: number) => any;
}

// Helper to resolve signals or functions
function resolve<T>(v: T[] | (() => T[])): T[] {
  return typeof v === "function" ? v() : v;
}

// Fast keyed For: only diffs and moves nodes, never clears/rebuilds whole list
export function For<T>({ each, children, key }: ForProps<T>): any {
  return function (parent: Node) {
    let nodes: Node[] = [];
    let keys: any[] = [];

    effect(() => {
      const arr = resolve(each) || [];
      const newKeys = arr.map((item, i) => key ? key(item, i) : i);

      // Map old keys to their nodes
      const keyToNode = new Map<any, Node>();
      keys.forEach((k, i) => keyToNode.set(k, nodes[i]));

      // Build new node list, reusing/moving nodes where possible
      const newNodes: Node[] = [];
      arr.forEach((item, i) => {
        const k = newKeys[i];
        let node: Node;
        if (keyToNode.has(k)) {
          node = keyToNode.get(k)!;
          keyToNode.delete(k);
        } else {
          const child = children(item, i);
          if (typeof child === "function") {
            const placeholder = document.createComment("for-dynamic");
            node = placeholder;
            effect(() => {
              const value = child();
              let newNode: Node;
              if (typeof value === "string" || typeof value === "number") {
                newNode = document.createTextNode(String(value));
              } else if (value && typeof value === "object" && "tag" in value) {
                newNode = renderVNode(value as VNode);
              } else if (value instanceof Node) {
                newNode = value;
              } else {
                newNode = document.createComment("for-empty");
              }
              if (node.parentNode === parent) {
                parent.replaceChild(newNode, node);
              }
              node = newNode;
              cleanNodeRegistry();
            });
          } else if (typeof child === "string" || typeof child === "number") {
            node = document.createTextNode(String(child));
          } else if (child instanceof Node) {
            node = child;
          } else if (child && typeof child === "object" && "tag" in child) {
            node = renderVNode(child as VNode);
          } else {
            node = document.createComment("for-empty");
          }
        }
        newNodes.push(node);
      });

      // Remove old nodes not reused
      keyToNode.forEach((node) => {
        if (node.parentNode === parent) parent.removeChild(node);
        cleanNodeRegistry(node);
      });

      // Move/insert nodes in correct order
      let ref = null;
      for (let i = newNodes.length - 1; i >= 0; i--) {
        const node = newNodes[i];
        if (node.nextSibling !== ref || node.parentNode !== parent) {
          parent.insertBefore(node, ref);
        }
        ref = node;
      }

      nodes = newNodes;
      keys = newKeys;
    });
  };
}
