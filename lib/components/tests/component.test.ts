import { describe, it, expect, beforeEach, mock } from "bun:test";
import { component } from "../component";
import { html } from "../html";
import { signal, effect, getCurrentScope, Scope } from "../../reactive";
import { render, rootRegistry } from "../../render";

describe("component", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="app"></div>`;
    rootRegistry.clear();
  });

  it("returns a vnode from the factory", () => {
    const MyComp = component(() => html.div("hi"));
    const vnode = MyComp();
    expect(vnode.tag).toBe("div");
    expect(vnode.children[0]).toBe("hi");
  });

  it("calls user cleanup and scope cleanup", () => {
    let cleaned = false;
    const MyComp = component(() => {
      const vnode = html.div("hi");
      vnode.cleanup = () => { cleaned = true; };
      return vnode;
    });
    const vnode = MyComp();
    const scope = getCurrentScope();
    // Simulate effect registration
    scope?.effects.add(() => { cleaned = true; });
    vnode.cleanup?.();
    expect(cleaned).toBe(true);
  });

  it("passes props to the factory", () => {
    const MyComp = component((props: { msg: string }) => html.div(props.msg));
    const vnode = MyComp({ msg: "hello" });
    expect(vnode.children[0]).toBe("hello");
  });

  it("cleans up event handlers on cleanup", () => {
    const { div } = html;
    const MyComp = component(() => {
      const vnode = div({ onclick: () => { } }, "hi");
      return vnode;
    });
    const vnode = MyComp();
    // Simulate event element registration
    const el = document.createElement("div");
    (vnode._scope as Scope).eventElements?.add(el);
    // Simulate delegator in registry
    const removeHandlersForElement = mock(() => { });
    rootRegistry.set("test", { removeHandlersForElement } as any);
    (vnode._scope as Scope).rootSelector = "test";
    vnode.cleanup?.();
    expect(removeHandlersForElement).toHaveBeenCalledWith(el);
  });

  it("component cleanup does not throw if no eventElements", () => {
    const MyComp = component(() => html.div("hi"));
    const vnode = MyComp();
    // Remove eventElements set
    delete (vnode._scope as Scope).eventElements;
    expect(() => vnode.cleanup?.()).not.toThrow();
  });

  it("component cleanup does not throw if no rootSelector", () => {
    const MyComp = component(() => html.div("hi"));
    const vnode = MyComp();
    delete (vnode._scope as Scope).rootSelector;
    expect(() => vnode.cleanup?.()).not.toThrow();
  });

  it("component cleanup does not throw if no delegator", () => {
    const MyComp = component(() => html.div("hi"));
    const vnode = MyComp();
    (vnode._scope as Scope).rootSelector = "notfound";
    expect(() => vnode.cleanup?.()).not.toThrow();
  });

  it("component cleanup can be called multiple times safely", () => {
    const MyComp = component(() => html.div("hi"));
    const vnode = MyComp();
    expect(() => {
      vnode.cleanup?.();
      vnode.cleanup?.();
    }).not.toThrow();
  });

  it("component is cleaned up by render's cleanup (top-down)", () => {
    const MyComp = component(() => html.div("hi"));
    const { cleanup } = render(MyComp(), "#app");
    expect(document.querySelector("#app")!.textContent).toBe("hi");
    cleanup();
    expect(document.querySelector("#app")!.textContent).toBe("");
  });
});