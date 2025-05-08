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

// Highly optimized keyed diffing For: uses LIS for minimal DOM moves (SolidJS-style)
export function For<T>({ each, children, key }: ForProps<T>): any {
  return function (parent: Node) {
    let nodes: Node[] = [];
    let keys: any[] = [];

    effect(() => {
      const arr = resolve(each) || [];
      const newKeys = arr.map((item, i) => key ? key(item, i) : i);

      // Map old keys to their node index
      const oldKeyToIdx = new Map<any, number>();
      for (let i = 0; i < keys.length; i++) {
        oldKeyToIdx.set(keys[i], i);
      }

      // Build new node list, reusing/moving nodes where possible
      const newNodes: Node[] = [];
      for (let i = 0; i < arr.length; i++) {
        const k = newKeys[i];
        let node: Node | undefined;
        if (oldKeyToIdx.has(k)) {
          node = nodes[oldKeyToIdx.get(k)!];
        } else {
          const child = children(arr[i], i);
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
              if (node!.parentNode === parent) {
                parent.replaceChild(newNode, node!);
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
        newNodes.push(node!);
      }

      // Remove old nodes not reused (must check by key, not by index)
      for (let i = 0; i < nodes.length; i++) {
        const k = keys[i];
        if (!newKeys.includes(k)) {
          const node = nodes[i];
          if (node.parentNode === parent) parent.removeChild(node);
          cleanNodeRegistry(node);
        }
      }

      // --- LIS-based minimal DOM moves ---
      // Find the mapping from newNodes to oldNodes
      const newIdxToOldIdx = newNodes.map(n => nodes.indexOf(n));
      // Compute LIS on the mapping (ignoring -1s)
      function lis(a: number[]) {
        const p = a.slice();
        const result: number[] = [];
        let u: number, v: number;
        for (let i = 0; i < a.length; i++) {
          if (a[i] === -1) continue;
          if (result.length === 0 || a[result[result.length - 1]] < a[i]) {
            p[i] = result.length ? result[result.length - 1] : -1;
            result.push(i);
            continue;
          }
          u = 0;
          v = result.length - 1;
          while (u < v) {
            const c = ((u + v) / 2) | 0;
            if (a[result[c]] < a[i]) u = c + 1;
            else v = c;
          }
          if (a[i] < a[result[u]]) {
            if (u > 0) p[i] = result[u - 1];
            result[u] = i;
          }
        }
        u = result.length;
        v = result[result.length - 1];
        while (u-- > 0) {
          result[u] = v;
          v = p[v];
        }
        return result;
      }
      const lisIdx = lis(newIdxToOldIdx);

      // Move/insert nodes in correct order, minimizing DOM ops
      let lisPos = lisIdx.length - 1;
      let ref = null;
      for (let i = newNodes.length - 1; i >= 0; i--) {
        const node = newNodes[i];
        if (newIdxToOldIdx[i] === -1 || lisIdx[lisPos] !== i) {
          if (node.nextSibling !== ref || node.parentNode !== parent) {
            parent.insertBefore(node, ref);
          }
        } else {
          lisPos--;
        }
        ref = node;
      }

      nodes = newNodes;
      keys = newKeys;
    });
  };
}
