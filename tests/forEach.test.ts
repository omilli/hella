import { forEach } from "../lib/forEach";
import { html } from "../lib/html";
import { signal } from "../lib/reactive/signal";
import { mount } from "../lib/mount";
import { describe, it, expect, beforeEach } from "bun:test";
import { flushEffects } from "../lib/reactive";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("forEach", () => {
  it("should render list and update", async () => {
    const items = signal([1, 2, 3]);
    const vnode = html.ul(forEach(items, (item) => html.li({ key: item }, `Item ${item}`)));
    mount(vnode);
    expect(document.querySelectorAll("li").length).toBe(3);
    items.set([2, 3, 4]);
    await flushEffects();
    const texts = Array.from(document.querySelectorAll("li")).map(li => li.textContent);
    expect(texts).toEqual(["Item 2", "Item 3", "Item 4"]);
  });
});
