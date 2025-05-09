import { mount, resolveNode } from "../lib/mount";
import { html } from "../lib/html";
import { signal } from "../lib/reactive/signal";
import { describe, it, expect, beforeEach } from "bun:test";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount", () => {
  it("should mount vnode to #app", () => {
    mount(html.div({ id: "test" }, "hello"));
    expect(document.querySelector("#test")?.textContent).toBe("hello");
  });

  it("should update on signal change", async () => {
    const count = signal(0);
    mount(() => html.div(count));
    expect(document.querySelector("#app")?.textContent).toBe("0");
    count.set(5);
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector("#app")?.textContent).toBe("5");
  });

  it("should resolveNode for text, vnode, node", () => {
    expect(resolveNode("foo").textContent).toBe("foo");
    const vnode = html.div("bar");
    expect((resolveNode(vnode) as HTMLElement).textContent).toBe("bar");
    const el = document.createElement("span");
    expect(resolveNode(el)).toBe(el);
  });
});
