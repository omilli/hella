import { registerDelegatedEvent, setNodeHandler } from "./events";
import { effect } from "./reactive";
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
    const { effects } = getNodeRegistry(node);
    if (effects) {
      effects.forEach(fn => fn());
      effects.clear();
    }
    nodeRegistry.delete(node);
  }

  let isRunning = false;
  if (isRunning) return;

  queueMicrotask(() => {
    isRunning = true;

    nodeRegistry.forEach((registry, node) => {
      if (!document.body.contains(node)) {
        const { effects } = registry;
        effects.forEach(fn => fn());
        effects.clear();
        nodeRegistry.delete(node);
      }
    });

    isRunning = false;
  })
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
  const { tag, props, children } = vNode;
  const element = document.createElement(tag as string);

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

  return element;
}

function handleChild(root: HTMLElement, element: HTMLElement | DocumentFragment, child: VNodeValue) {
  if (isFunction(child)) {
    const result = child();
    if (isText(result)) {
      const textCleanup = effect(() => {
        element.textContent = child() as string;
        cleanNodeRegistry();
      })
      getNodeRegistry(root).effects.add(textCleanup);
      renderText(element, result);
    }
  } else {
    if (isText(child)) {
      renderText(element, child);
    } else {
      element.appendChild(renderVNode(child as VNode));
    }
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