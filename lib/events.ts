type HandlerMap = Map<string, EventListener>;
const nodeHandlers = new Map<Node, HandlerMap>();
const globalListeners = new Set<string>();

export function registerDelegatedEvent(type: string) {
  if (globalListeners.has(type)) return;
  globalListeners.add(type);
  document.body.addEventListener(type, delegatedHandler, true);
}

function delegatedHandler(event: Event) {
  let node = event.target as Node | null;
  while (node) {
    const handlers = nodeHandlers.get(node);
    if (handlers && handlers.has(event.type)) {
      handlers.get(event.type)!.call(node, event);
      if ((event as any).cancelBubble) break;
    }
    node = (node as HTMLElement).parentElement;
  }
}

export function setNodeHandler(node: Node, type: string, handler: EventListener) {
  let map = nodeHandlers.get(node);
  if (!map) {
    map = new Map();
    nodeHandlers.set(node, map);
  }
  map.set(type, handler);
}

export function removeNodeHandler(node: Node, type: string) {
  const map = nodeHandlers.get(node);
  if (map) {
    map.delete(type);
    if (map.size === 0) nodeHandlers.delete(node);
  }
}

let removeHandlersQueued = false;

export function removeHandlers() {
  if (removeHandlersQueued) return;
  removeHandlersQueued = true;
  requestAnimationFrame(() => {
    nodeHandlers.forEach((_, node) => {
      if (!node.isConnected) {
        nodeHandlers.delete(node);
      }
    });
    removeHandlersQueued = false;
  });
}

export function cleanupNodeHandlers(node: Node) {
  nodeHandlers.delete(node);
}