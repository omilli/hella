// import "./bench"

import { html, signal, mount, type Signal } from "@hellajs/core";

const { div, button, p, span } = html;

function Foo() {
  const foo = signal("Foo");
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
    // () => count() < 10 ? Foo() : null,
    p("Count: ",
      span(
        count
      )
    ),
    // button({ onclick: () => count.set(count() + 1) },
    //   "Increment"
    // ),
    // () => count() % 2 === 0
    //   ? p("Even")
    //   : div("Odd"),
  )
}



mount(Counter);
