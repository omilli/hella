import { popContext, pushContext, type Context } from "./scope";
import { effect } from "./effect";
import type { VNode, VNodeValue } from "../../lib/types";

interface ContextNode extends Node {
  __ctx?: Context;
}

const FRAGMENT = Symbol.for("fragment"); // Use the same symbol as in For

// --- Helper: is named function (component) ---
function isComponent(fn: any): boolean {
  return typeof fn === "function" && fn.name && fn.prototype;
}

// --- Fine-grained recursive mount with context ---
export function mount(vnode: (() => VNode) | VNode, parent?: HTMLElement): Node {
  // Text node
  if (typeof vnode === "string" || typeof vnode === "number") {
    const text = document.createTextNode(String(vnode));
    parent?.appendChild(text);
    return text;
  }

  // Named function component: create new context
  if (isComponent(vnode)) {
    const ctx = pushContext((vnode as Function).name);
    const node = mount((vnode as Function)(), parent);
    // Attach context to the node for later cleanup
    if (node && typeof node === "object") {
      (node as ContextNode).__ctx = ctx;
    }
    return node;
  }

  // Arrow function or computed: just call
  if (typeof vnode === "function") {
    return mount(vnode(), parent);
  }

  // DOM element
  const el = document.createElement(vnode.tag as string);

  // Fine-grained props reactivity
  for (const [key, value] of Object.entries(vnode.props || {})) {
    if (typeof value === "function" && !key.startsWith("on")) {
      effect(() => {
        el.setAttribute(key, value());
      });
    } else if (key.startsWith("on") && typeof value === "function") {
      // Add event listener (e.g., onClick -> click)
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value as EventListener);
    } else {
      el.setAttribute(key, value as string);
    }
  }

  // Recursively mount children
  (vnode.children || []).forEach(child => {
    if (Array.isArray(child)) {
      // FIX: Recursively mount each child in the array
      child.forEach(grandchild => mount(grandchild, el));
    } else if (typeof child === "function") {
      if (child.length === 1) {
        (child as (parent: HTMLElement) => VNodeValue)(el);
      } else {
        if ("set" in child) {
          const text = document.createTextNode(child() as string);
          el.appendChild(text);
          effect(() => {
            text.textContent = child() as string ?? "";
          });
        } else {
          let currentNode: Node | null = null;
          let cleanupContext: (() => void) | null = null;
          effect(() => {
            if (cleanupContext) {
              cleanupContext();
              cleanupContext = null;
            }
            if (currentNode && currentNode.parentNode === el) {
              el.removeChild(currentNode);
              currentNode = null;
            }
            const result = child();
            // FIX: If result is an array, mount each item
            if (Array.isArray(result)) {
              result.forEach(grandchild => mount(grandchild, el));
            } else if (typeof result === "string" || typeof result === "number") {
              currentNode = document.createTextNode(result as string);
              el.appendChild(currentNode);
            } else if (typeof result === "function" && result.name && result.prototype) {
              const ctx = pushContext(result.name);
              currentNode = mount(result as () => VNode, el);
              if (currentNode && typeof currentNode === "object") {
                (currentNode as ContextNode).__ctx = ctx;
              }
              cleanupContext = () => {
                popContext();
              };
            } else if (result != null) {
              currentNode = mount(result as () => VNode, el);
            }
          });
        }
      }
    } else if (typeof child === "string" || typeof child === "number") {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child != null) {
      mount(child as VNode, el);
    }
  });

  parent?.appendChild(el);
  return el;
}

export function show(conditions: Array<[() => boolean, (() => unknown) | VNode]>) {
  return () => {
    for (const [when, children] of conditions) {
      if (when()) {
        return typeof children === 'function' ? children() : children;
      }
    }
    return null;
  };
}

export function For<T>(props: { each: () => T[]; children: (item: T, index: number) => VNode, key?: (item: T) => any }) {
  return function (parent: HTMLElement) {
    let nodes: Node[] = [];
    let keys: any[] = [];
    let keyFn = props.key || ((item: any) => item.id ?? item);

    effect(() => {
      const items = props.each();
      const newKeys = items.map(keyFn);
      const newNodes: Node[] = new Array(items.length);

      // Map old keys to their node and index
      const oldKeyToIndex = new Map<any, number>();
      keys.forEach((k, i) => oldKeyToIndex.set(k, i));

      // Track which old nodes are reused
      const reused = new Set<number>();

      // --- Efficient DOM update ---
      let nextSibling: ChildNode | null = null;
      // Traverse from end to start for stable insertBefore
      for (let i = items.length - 1; i >= 0; i--) {
        const k = newKeys[i];
        const oldIdx = oldKeyToIndex.get(k);
        if (oldIdx != null) {
          // Reuse node
          const node = nodes[oldIdx];
          newNodes[i] = node;
          reused.add(oldIdx);
          // Move in DOM only if needed
          if (node.nextSibling !== nextSibling) {
            parent.insertBefore(node, nextSibling);
          }
          nextSibling = node as ChildNode;
        } else {
          // Create new node
          const vnode = props.children(items[i], i);
          const node = mount(vnode, parent);
          newNodes[i] = node;
          parent.insertBefore(node, nextSibling);
          nextSibling = node as ChildNode;
        }
      }

      // Remove old nodes not reused
      for (let i = 0; i < nodes.length; i++) {
        if (!reused.has(i)) {
          if (nodes[i].parentNode === parent) parent.removeChild(nodes[i]);
        }
      }

      nodes = newNodes;
      keys = newKeys;
    });

    return null;
  } as unknown as VNode;
}