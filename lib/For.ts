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

// For is a function that returns nothing, but mutates the parent node directly
export function For<T>({ each, children, key }: ForProps<T>): any {
  // This function will be called by the renderer with the parent node as context
  return function (parent: Node) {
    let nodes: Node[] = [];
    let prevKeys: any[] = [];

    effect(() => {
      const arr = resolve(each) || [];
      const newKeys = arr.map((item, i) => key ? key(item, i) : i);

      // Remove old nodes
      nodes.forEach(node => {
        if (node.parentNode === parent) parent.removeChild(node);
        cleanNodeRegistry(node);
      });

      // Build and insert new nodes
      nodes = arr.map((item, i) => {
        const child = children(item, i);
        let node: Node;
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
        parent.appendChild(node);
        return node;
      });

      prevKeys = newKeys;
    });
  };
}
