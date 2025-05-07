import { registerDelegatedEvent, removeHandlers, setNodeHandler } from "./events";
import { currentContext, effect, popContext, pushContext, type Context } from "./reactive";
import type { VNode, VNodeValue } from "./types";

interface ContextNode extends Node {
  __ctx?: Context;
}

// --- Helper: is named function (component) ---
function isComponent(fn: any): boolean {
  return typeof fn === "function" && fn.prototype;
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
    if (typeof value === "function" && key.startsWith("on")) {
      // e.g. onClick -> click
      const event = key.slice(2).toLowerCase();
      registerDelegatedEvent(event);
      setNodeHandler(el, event, value as EventListener);

      // Register for context cleanup
      const ctx = currentContext();
      console.log("ctx", ctx);
      if (ctx) {
        ctx.eventDelegates.add({ node: el, type: event });
      }
    } else if (typeof value === "function") {
      effect(() => {
        removeHandlers();
        el.setAttribute(key, value());
      });
    } else {
      el.setAttribute(key, value as string);
    }
  }

  // Recursively mount children
  (vnode.children || []).forEach(child => {
    if (Array.isArray(child)) {
      child.forEach(grandchild => mount(grandchild, el));
    } else if (typeof child === "function") {
      if (child.length === 1) {
        (child as (parent: HTMLElement) => VNodeValue)(el);
      } else {
        if ("set" in child) {
          const text = document.createTextNode(child() as string);
          el.appendChild(text);
          effect(() => {
            removeHandlers();
            text.textContent = child() as string ?? "";
          });
        } else {
          let currentNode: Node | null = null;
          let cleanupContext: (() => void) | null = null;
          effect(() => {
            removeHandlers();
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
            } else if (isComponent(result)) {
              const ctx = pushContext((result as Function).name);
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

export function For<T>(props: { each: () => T[]; children: (item: T, index: number) => VNode, key: (item: T) => any }) {
  let keyToNode = new Map<any, Node>();
  let lastKeys: any[] = [];
  // Use the children function as the WeakMap key
  return function (parent: HTMLElement) {
    effect(() => {
      removeHandlers();
      const items = props.each();
      const keys = items.map(props.key);
      const prevKeys = lastKeys;
      const prevKeyToNode = keyToNode;
      const nextKeys: any[] = [];
      const nextKeyToNode = new Map<any, Node>();

      // 1. Build nextKeyToNode and nextKeys, reusing nodes where possible
      for (let i = 0; i < items.length; i++) {
        const key = keys[i];
        nextKeys.push(key);
        let node = prevKeyToNode.get(key);
        if (!node || node.parentNode !== parent) {
          node = mount(props.children(items[i], i), parent);
        }
        nextKeyToNode.set(key, node);
      }

      // 2. Remove nodes that are no longer present
      for (const key of prevKeys) {
        if (!nextKeyToNode.has(key)) {
          const node = prevKeyToNode.get(key);
          if (node && node.parentNode === parent) parent.removeChild(node);
        }
      }

      // 3. Detect swap optimization
      let swapIndices: [number, number] | null = null;
      if (nextKeys.length === prevKeys.length) {
        let differences = 0;
        let firstDiff = -1;
        let secondDiff = -1;
        for (let i = 0; i < nextKeys.length; i++) {
          if (nextKeys[i] !== prevKeys[i]) {
            if (differences === 0) firstDiff = i;
            else if (differences === 1) secondDiff = i;
            differences++;
            if (differences > 2) break;
          }
        }
        if (
          differences === 2 &&
          nextKeys[firstDiff] === prevKeys[secondDiff] &&
          nextKeys[secondDiff] === prevKeys[firstDiff]
        ) {
          swapIndices = [firstDiff, secondDiff];
        }
      }

      if (swapIndices) {
        // Only swap the two nodes
        const [i, j] = swapIndices;
        const node1 = nextKeyToNode.get(nextKeys[i])!;
        const node2 = nextKeyToNode.get(nextKeys[j])!;
        const next1 = node1.nextSibling;
        const next2 = node2.nextSibling;
        if (next1 === node2) {
          parent.insertBefore(node2, node1);
        } else if (next2 === node1) {
          parent.insertBefore(node1, node2);
        } else {
          parent.insertBefore(node2, node1);
          parent.insertBefore(node1, next2);
        }
      } else {
        // Efficiently reorder/insert nodes with minimal DOM ops
        let domChild = parent.firstChild;
        for (let i = 0; i < nextKeys.length; i++) {
          const key = nextKeys[i];
          const node = nextKeyToNode.get(key)!;
          if (node === domChild) {
            domChild = domChild!.nextSibling;
            continue;
          }
          parent.insertBefore(node, domChild);
          // domChild remains the same
        }
      }

      // 4. Update state
      keyToNode = nextKeyToNode;
      lastKeys = nextKeys;
    });
    return null;
  } as unknown as VNode;
}