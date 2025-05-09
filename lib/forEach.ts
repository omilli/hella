import { effect } from "./reactive";
import { cleanNodeRegistry } from "./registry";
import { isFunction, resolveNode } from "./mount";
import type { VNodeValue } from "./types";

type ForEachKey<T> = (item: T, index: number) => any;
type ForEachUse<T> = (item: T, index: number) => VNodeValue;

interface ForEachOptions<T> {
  use: ForEachUse<T>;
  key?: ForEachKey<T>;
}

type ForEachArg<T> =
  | ForEachOptions<T>
  | ForEachUse<T>
  | string;

export function forEach<T>(
  each: T[] | (() => T[]),
  arg2?: ForEachArg<T>,
  arg3?: ForEachUse<T>
): any {
  const use = getForEachUse(arg2!, arg3);
  const key = getForEachKey(arg2!, arg3);

  return function (parent: Node) {
    let nodes: Node[] = [];
    let keys: any[] = [];

    effect(() => {
      const arr = isFunction(each) ? each() : each || [];
      const newKeys = arr.map((item, i) => key ? key(item, i) : i);

      const oldKeyToIdx = new Map<any, number>();
      for (let i = 0; i < keys.length; i++) {
        oldKeyToIdx.set(keys[i], i);
      }

      const newNodes = buildNewNodes(arr, newKeys, oldKeyToIdx, nodes, use, parent);

      removeUnusedNodes(nodes, keys, newKeys, parent);

      moveAndInsertNodes(newNodes, nodes, parent);

      nodes = newNodes;
      keys = newKeys;
    });
  };
}


function getForEachKey<T>(arg2: ForEachArg<T>, arg3?: ForEachUse<T>): ForEachKey<T> | undefined {
  if (typeof arg2 === "string") {
    const keyProp = arg2;
    return (item: any) => item && item[keyProp];
  } else if (typeof arg2 === "function" && !arg3) {
    return (item: any) => item && item.id;
  } else if (typeof arg2 === "object" && arg2.key) {
    return arg2.key;
  }
  return undefined;
}

function getForEachUse<T>(arg2: ForEachArg<T>, arg3?: ForEachUse<T>): ForEachUse<T> {
  if (typeof arg2 === "string") {
    return arg3!;
  } else if (typeof arg2 === "function") {
    return arg2;
  } else {
    return arg2.use;
  }
}

function createNode(child: VNodeValue, parent: Node): Node {
  if (typeof child === "function") {
    const placeholder = document.createComment("for-dynamic");
    let node: Node = placeholder;
    effect(() => {
      const value = child();
      const newNode = resolveNode(value as VNodeValue);
      if (node.parentNode === parent) {
        parent.replaceChild(newNode, node);
      }
      node = newNode;
      cleanNodeRegistry();
    });
    return node;
  }
  return resolveNode(child);
}

function removeUnusedNodes(nodes: Node[], keys: any[], newKeys: any[], parent: Node) {
  for (let i = 0; i < nodes.length; i++) {
    const k = keys[i];
    if (!newKeys.includes(k)) {
      const node = nodes[i];
      if (node.parentNode === parent) parent.removeChild(node);
      cleanNodeRegistry(node);
    }
  }
}

function computeLIS(a: number[]) {
  const p = a.slice();
  const result: number[] = [];
  let u: number, v: number;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === -1) continue;
    if (result.length === 0 || a[result[result.length - 1]] < a[i]) {
      p[i] = result.length ? result[result.length - 1] : -1;
      result.push(i);
      continue;
    }
    u = 0;
    v = result.length - 1;
    while (u < v) {
      const c = ((u + v) / 2) | 0;
      if (a[result[c]] < a[i]) u = c + 1;
      else v = c;
    }
    if (a[i] < a[result[u]]) {
      if (u > 0) p[i] = result[u - 1];
      result[u] = i;
    }
  }
  u = result.length;
  v = result[result.length - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

function buildNewNodes<T>(
  arr: T[],
  newKeys: any[],
  oldKeyToIdx: Map<any, number>,
  nodes: Node[],
  use: ForEachUse<T>,
  parent: Node
): Node[] {
  const newNodes: Node[] = [];
  for (let i = 0; i < arr.length; i++) {
    const k = newKeys[i];
    let node: Node | undefined;
    if (oldKeyToIdx.has(k)) {
      node = nodes[oldKeyToIdx.get(k)!];
    } else {
      node = createNode(use(arr[i], i), parent);
    }
    newNodes.push(node!);
  }
  return newNodes;
}

function moveAndInsertNodes(newNodes: Node[], nodes: Node[], parent: Node) {
  const newIdxToOldIdx = newNodes.map(n => nodes.indexOf(n));
  const lisIdx = computeLIS(newIdxToOldIdx);

  let lisPos = lisIdx.length - 1;
  let ref = null;
  for (let i = newNodes.length - 1; i >= 0; i--) {
    const node = newNodes[i];
    if (newIdxToOldIdx[i] === -1 || lisIdx[lisPos] !== i) {
      if (node.nextSibling !== ref || node.parentNode !== parent) {
        parent.insertBefore(node, ref);
      }
    } else {
      lisPos--;
    }
    ref = node;
  }
}
