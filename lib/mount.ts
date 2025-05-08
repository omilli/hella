import { registerDelegatedEvent, setNodeHandler } from "./events";
import { effect, pushContext, popContext } from "./reactive";
import type { VNode, VNodeValue } from "./types";
import { getNodeRegistry, cleanNodeRegistry } from "./registry";

export function mount(vNode: VNode | (() => VNode)) {
  if (typeof vNode === "function") {
    vNode = vNode();
  }

  const root = document.querySelector("#app");
  const element = renderVNode(vNode as VNode);
  root?.replaceChildren(element); // <-- use replaceChildren
}

export function renderVNode(vNode: VNode): HTMLElement {
  // Unwrap functions that return functions or objects
  while (isFunction(vNode)) {
    vNode = vNode() as VNode;
  }
  const { tag, props, children } = vNode;
  const element = document.createElement(tag as string);

  // Set up context for this element
  const registry = getNodeRegistry(element);
  pushContext({
    registerEffect: (cleanup: () => void) => {
      registry.effects.add(cleanup);
    }
  });


  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        registerDelegatedEvent(event);
        setNodeHandler(element, event, value as EventListener);
        return;
      }

      if (isFunction(value)) {
        const propCleanup = effect(() => {
          renderProps(element, key, value());
          cleanNodeRegistry();
        });
        getNodeRegistry(element).effects.add(propCleanup);
        return;
      }

      renderProps(element, key, value);
    });
  }

  children?.forEach((child) => handleChild(element, element, child));

  popContext();

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
  if (typeof child === "function" && child.length === 1) {
    child(element);
    return;
  }

  if (isFunction(child)) {
    const placeholder = document.createComment("dynamic");
    element.appendChild(placeholder);
    let currentNode: Node | null = null;

    const cleanup = effect(() => {
      const value = resolveValue(child);
      let newNode: Node;

      if (isText(value)) {
        newNode = document.createTextNode(String(value));
      } else if (value && typeof value === "object" && "tag" in value) {
        newNode = renderVNode(value as VNode);
      } else {
        newNode = document.createComment("empty");
      }

      // Fix: Only replace if the node is still a child of element
      if (currentNode && currentNode.parentNode === element) {
        cleanNodeRegistry(currentNode);
        element.replaceChild(newNode, currentNode);
      } else if (placeholder.parentNode === element) {
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

  if (resolved instanceof Node) {
    element.appendChild(resolved);
    return;
  }

  if (resolved && typeof resolved === "object" && "tag" in resolved) {
    element.appendChild(renderVNode(resolved as VNode));
  }
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key in element) {
    // @ts-ignore
    element[key] = value;
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