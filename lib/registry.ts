interface NodeRegistry {
  effects: Set<() => void>;
  handlers: Map<string, EventListener>;
}

const registry = new Map<Node, NodeRegistry>();

export function nodeRegistry(node: Node): NodeRegistry {
  let nodeRef = registry.get(node);

  if (!nodeRef) {
    registry.set(node, {
      effects: new Set(),
      handlers: new Map(),
    });

    return nodeRegistry(node);
  }

  return nodeRef;
}

let isRunning = false;

export function cleanNodeRegistry(node?: Node) {
  if (node) {
    const { effects, handlers } = nodeRegistry(node);
    if (effects) {
      effects.forEach(fn => fn());
      effects.clear();
      handlers.clear();
    }
    registry.delete(node);
  }


  if (isRunning) return;
  isRunning = true;

  queueMicrotask(() => {
    registry.forEach((_, node) => {
      if (!node.isConnected) {
        cleanNodeRegistry(node);
      }
    });

    isRunning = false;
  })
}