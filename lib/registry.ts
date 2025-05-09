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

let isRunning = false;

export function cleanNodeRegistry(node?: Node) {
  if (node) {
    const { effects, handlers } = getNodeRegistry(node);
    if (effects) {
      effects.forEach(fn => fn());
      effects.clear();
      handlers.clear();
    }
    nodeRegistry.delete(node);
  }


  if (isRunning) return;
  isRunning = true;

  queueMicrotask(() => {
    nodeRegistry.forEach((_, node) => {
      if (!node.isConnected) {
        cleanNodeRegistry(node);
      }
    });

    isRunning = false;
  })
}