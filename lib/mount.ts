import { effect } from "./reactive";
import type { VNode, VNodeValue } from "./types";

const nodeRegistry = new Map<HTMLElement, Set<() => void>>();

function getNodeRegistry(node: HTMLElement) {
  let registry = nodeRegistry.get(node);
  if (!registry) {
    registry = new Set();
    nodeRegistry.set(node, registry);
  }
  return registry;
}

function cleanNodeRegistry(node?: HTMLElement) {
  if (node) {
    const registry = nodeRegistry.get(node);
    if (registry) {
      registry.forEach(fn => fn());
      registry.clear();
    }
    nodeRegistry.delete(node);
  }
  let isRunning = false;
  if (isRunning) return;
  isRunning = true;
  queueMicrotask(() => {
    nodeRegistry.forEach((registry, node) => {
      if (!document.body.contains(node)) {
        registry.forEach(fn => fn());
        registry.clear();
        nodeRegistry.delete(node);
      }
    });
    isRunning = false;

    console.log(nodeRegistry)
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
      if (isFunction(value)) {
        const propCleanup = effect(() => {
          renderProps(element, key, value());
          cleanNodeRegistry();
        });
        getNodeRegistry(element).add(propCleanup);
      } else {
        renderProps(element, key, value);
      }
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
      getNodeRegistry(root).add(textCleanup);
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