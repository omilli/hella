import { html } from "../lib/html";
import { describe, it, expect } from "bun:test";

describe("html", () => {
  it("should create vnode with tag, props, children", () => {
    const vnode = html.div({ id: "foo" }, "bar");
    expect(vnode.tag).toBe("div");
    expect(vnode.props.id).toBe("foo");
    expect(vnode.children[0]).toBe("bar");
  });

  it("should create fragment", () => {
    const frag = html.$("a", "b");
    expect(frag.tag).toBe("$");
    expect(frag.children).toEqual(["a", "b"]);
  });
});
