import { getNodeRegistry } from "./mount";

const globalListeners = new Set<string>();

export function registerDelegatedEvent(type: string) {
  if (globalListeners.has(type)) return;
  globalListeners.add(type);
  document.body.addEventListener(type, delegatedHandler, true);
}

export function setNodeHandler(node: Node, type: string, handler: EventListener) {
  let { handlers } = getNodeRegistry(node);
  handlers?.set(type, handler);
}

function delegatedHandler(event: Event) {
  let node = event.target as Node | null;
  while (node) {
    let { handlers } = getNodeRegistry(node);
    console.log(node, handlers);
    if (handlers && handlers.has(event.type)) {
      handlers.get(event.type)!.call(node, event);
      if ((event as any).cancelBubble) break;
    }
    node = node.parentNode;
  }
}