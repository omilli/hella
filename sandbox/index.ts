import { html, signal, mount } from "@hellajs/core";
import type { VNode, VNodeValue } from "../lib/types";

const { div, span, button } = html;


// --- COMPONENTS ---
function Foo() {
  const foo = signal("foo");
  return () => div({ class: "foo" }, span({ class: "foo-text" }, foo));
}

function Counter() {
  const count = signal(1);
  const double = () => count() * 2;
  const increment = () => count.set(count() + 1);

  const hasFoo = signal(true);
  const toggleFoo = () => hasFoo.set(!hasFoo());
  const showFoo = () => hasFoo();
  const hideFoo = () => !hasFoo();

  return () =>
    div({ class: "counter" },
      span({ class: "count" }, count),
      button({ class: "increment", onclick: increment }, "Increment"),
      span({ class: "double" }, double),
      button({ class: "toggle", onclick: toggleFoo }, "Toggle Foo"),
      show([
        [showFoo, Foo],
        [hideFoo, div("Fallback")]
      ])
    );
}

function show(conditions: Array<[() => boolean, (() => unknown) | VNode]>) {
  return () => {
    for (const [when, children] of conditions) {
      if (when()) {
        return typeof children === 'function' ? children() : children;
      }
    }
    return null;
  };
}

// --- Mount root ---
mount(Counter(), document.body);