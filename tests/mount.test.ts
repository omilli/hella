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

  it("should mount text, vnode, and DOM node children", async () => {
    const el = document.createElement("span");
    const vnode = html.div({ id: "foo" }, "foo", html.span("bar"), el);
    mount(vnode);
    const div = document.querySelector("#foo");
    expect(div?.childNodes[0].textContent).toBe("foo");
    expect(div?.childNodes[1].nodeName).toBe("SPAN");
    expect(div?.childNodes[2]).toBe(el);
  });

  it("should mount function child that returns text", () => {
    mount(html.div(() => "dynamic text"));
    expect(document.querySelector("div")?.textContent).toBe("dynamic text");
  });

  it("should mount function child that returns vnode", () => {
    mount(html.div(() => html.span("dynamic vnode")));
    expect(document.querySelector("span")?.textContent).toBe("dynamic vnode");
  });

  it("should set DOM property and attribute", () => {
    mount(html.input({ value: "foo", type: "text", custom: "bar" }));
    const input = document.querySelector("input");
    expect(input?.value).toBe("foo");
    expect(input?.getAttribute("type")).toBe("text");
    expect(input?.getAttribute("custom")).toBe("bar");
  });
});
