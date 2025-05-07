import { effect, popContext, pushContext } from "./reactive";
import type { VNode } from "./types";

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
    pushContext((vnode as Function).name);
    const result = mount((vnode as Function)(), parent);
    popContext();
    return result;
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
    if (typeof child === "function") {
      // If it's a signal/computed (has .set), treat as reactive text
      if ("set" in child) {
        const text = document.createTextNode(child() as string);
        el.appendChild(text);
        effect(() => {
          text.textContent = child() as string ?? "";
        });
      } else {
        // Dynamic/computed child (arrow function, e.g. conditional component)
        let currentNode: Node | null = null;
        effect(() => {
          // Remove previous node if present
          if (currentNode && currentNode.parentNode === el) {
            el.removeChild(currentNode);
          }
          const result = child();
          if (typeof result === "string" || typeof result === "number") {
            currentNode = document.createTextNode(result as string);
            el.appendChild(currentNode);
          } else if (typeof result === "function" && result.name && result.prototype) {
            currentNode = mount(result as () => VNode, el);
          } else if (result != null) {
            currentNode = mount(result as () => VNode, el);
          } else {
            currentNode = null;
          }
        });
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
