import { registerDelegatedEvent, setNodeHandler } from "./events";
import { effect as rawEffect } from "./reactive";
import type { VNode, VNodeValue } from "./types";

interface NodeRegistry {
  effects: Set<() => void>;
  handlers: Map<string, EventListener>;
}

const nodeRegistry = new Map<Node, NodeRegistry>();

export function getNodeRegistry(node: Node): NodeRegistry {
  let registry = nodeRegistry.get(node);

  if (!registry) {
    nodeRegistry.set(node, {
      effects: new Set(),
      handlers: new Map(),
    });

    return getNodeRegistry(node);
  }

  return registry;
}

function cleanNodeRegistry(node?: Node) {
  if (node) {
    const { effects, handlers } = getNodeRegistry(node);
    if (effects) {
      effects.forEach(fn => fn());
      effects.clear();
      handlers.clear();
    }
    nodeRegistry.delete(node);
  }

  let isRunning = false;
  if (isRunning) return;

  queueMicrotask(() => {
    isRunning = true;

    nodeRegistry.forEach((_, node) => {
      if (!document.body.contains(node)) {
        cleanNodeRegistry(node);
      }
    });

    isRunning = false;
  })
}

// Context for tracking the current element being rendered
let currentElement: HTMLElement | null = null;
export function getCurrentElement() {
  return currentElement;
}

// Wrapped effect that registers cleanup to the current element's nodeRegistry
export function elementEffect(fn: () => void): () => void {
  const el = getCurrentElement();
  const cleanup = rawEffect(fn);
  if (el) {
    getNodeRegistry(el).effects.add(cleanup);
  }
  return cleanup;
}

export function mount(vNode: VNode | (() => VNode)) {
  if (typeof vNode === "function") {
    vNode = vNode();
  }

  const root = document.querySelector("#app");
  const element = renderVNode(vNode as VNode);
  root?.appendChild(element);

  setTimeout(() => {
    root?.replaceChildren("");
  }, 5000)
}

function renderVNode(vNode: VNode): HTMLElement {
  // Unwrap functions that return functions or objects
  while (isFunction(vNode)) {
    vNode = vNode() as VNode;
  }
  const { tag, props, children } = vNode;
  const element = document.createElement(tag as string);

  // Set context for child components/effects
  const prevElement = currentElement;
  currentElement = element;

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        registerDelegatedEvent(event);
        setNodeHandler(element, event, value as EventListener);
        return;
      }

      if (isFunction(value)) {
        const propCleanup = elementEffect(() => {
          renderProps(element, key, value());
          cleanNodeRegistry();
        });
        // Already registered in elementEffect
        return;
      }

      renderProps(element, key, value);
    });
  }

  children?.forEach((child) => handleChild(element, element, child));

  currentElement = prevElement; // Restore context

  return element;
}

// Recursively resolve functions until a non-function value is reached
function resolveValue(value: any): any {
  while (isFunction(value)) {
    value = value();
  }
  return value;
}

function handleChild(root: HTMLElement, element: HTMLElement | DocumentFragment, child: VNodeValue) {
  if (isFunction(child)) {
    const placeholder = document.createComment("dynamic");
    element.appendChild(placeholder);
    let currentNode: Node | null = null;

    const cleanup = elementEffect(() => {
      const value = resolveValue(child);
      let newNode: Node;

      if (isText(value)) {
        newNode = document.createTextNode(String(value));
      } else if (value && typeof value === "object" && "tag" in value) {
        newNode = renderVNode(value as VNode);
      } else {
        newNode = document.createComment("empty");
      }

      if (currentNode) {
        element.replaceChild(newNode, currentNode);
      } else {
        element.replaceChild(newNode, placeholder);
      }
      currentNode = newNode;
      cleanNodeRegistry();
    });

    getNodeRegistry(root).effects.add(cleanup);
    return;
  }

  const resolved = resolveValue(child);

  if (isText(resolved)) {
    renderText(element, resolved);
    return;
  }

  if (resolved && typeof resolved === "object" && "tag" in resolved) {
    element.appendChild(renderVNode(resolved as VNode));
  }
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key in element) {
    // @ts-ignore
    element[key] = value();
  } else {
    element.setAttribute(key, value as string);
  }
}

function isText(vNode: unknown): vNode is string | number {
  return typeof vNode === "string" || typeof vNode === "number";
}

function isFunction(vNode: unknown): vNode is () => unknown {
  return typeof vNode === "function";
}

function renderText(element: HTMLElement | DocumentFragment, text: VNodeValue) {
  const textNode = document.createTextNode(text as string);
  element.appendChild(textNode);
}