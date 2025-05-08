// import "./bench"

import { html, signal, mount, type Signal, effect, For } from "@hellajs/core";

const { div, button, p, span } = html;

const items = signal([signal(1), signal(2), signal(3)]);


function Foo({ label }: { label: string }) {
  const foo = signal(label);
  effect(() => {
    console.log("Foo effect: ", foo());
  });
  setInterval(() => {
    foo.set("Foo" + Math.random());
  }, 1000)
  return div(
    p({ onclick: () => items.set([]) }, foo),
  );
}

function Counter() {
  const count = signal(0);
  effect(() => {
    console.log("Counter effect: ", count());
  });
  setInterval(() => {
    count.set(count() + 1);
  }, 1000);
  return div(
    { class: count },
    () => Foo({ label: "Foo" }),
    For({
      each: items,
      children: (item) => html.span(item)
    }),
    p("Count: ",
      span(
        count
      )
    ),
    button({ onclick: () => count.set(count() + 1) },
      "Increment"
    ),
    () => count() % 2 === 0
      ? p("Even")
      : div("Odd"),
  )
}

// setTimeout(() => {
//   root?.replaceChildren("");
// }, 5000)


mount(Counter);
