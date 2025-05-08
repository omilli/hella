// import "./bench"

import { html, signal, mount, type Signal, effect } from "@hellajs/core";

const { div, button, p, span } = html;


function Foo({ label }: { label: string }) {
  const foo = signal(label);
  effect(() => {
    console.log("Foo effect: ", foo());
  });
  setInterval(() => {
    foo.set("Foo" + Math.random());
  }, 1000)
  return div(
    p({ onclick: () => foo.set("Bar") }, foo),
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

mount(Counter);
