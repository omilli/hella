// import "./bench"

import { html, signal, mount, type Signal, effect } from "@hellajs/core";

const { div, button, p, span } = html;

function Foo() {
  const foo = signal("Foo");
  effect(() => {
    console.log("Foo effect: ", foo());
  });
  return div(
    p({ onclick: () => foo.set("Bar") }, foo),
  );
}

function Counter() {
  const count = signal(0);
  setInterval(() => {
    count.set(count() + 1);
  }, 1000);
  return div(
    { class: count },
    Foo(),
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
