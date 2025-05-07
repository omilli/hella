import "./bench"

// import { html, signal, mount, effect, For, show } from "@hellajs/core";
// import type { VNode, VNodeValue } from "../lib/types";

// const { div, span, button } = html;


// // --- COMPONENTS ---
// function Foo() {
//   const foo = signal(0);
//   setInterval(() => {
//     foo.set(foo() + 1);
//   }, 1000);
//   return div({ class: "foo" }, span({ class: "foo-text" }, foo));
// }

// function Counter() {
//   const count = signal(1);
//   const double = () => count() * 2;
//   const increment = () => count.set(count() + 1);

//   const hasFoo = signal(true);
//   const toggleFoo = () => hasFoo.set(!hasFoo());
//   const showFoo = () => hasFoo();
//   const hideFoo = () => !hasFoo();

//   const rows = () => Array.from({ length: count() }, (_, i) => ({
//     id: i,
//     label: `Row ${i + 1}`
//   }));

//   return div({ class: "counter" },
//     span({ class: "count" }, count),
//     button({ class: "increment", onclick: increment }, "Increment"),
//     span({ class: "double" }, double),
//     button({ class: "toggle", onclick: toggleFoo }, "Toggle Foo"),
//     Foo(),
//     show([
//       [showFoo, Foo()],
//       [hideFoo, div("Fallback")]
//     ]),
//     div(
//       For({
//         each: rows,
//         key: (row) => row.id,
//         children: (row, i) => div({ key: row.id }, row.label)
//       })
//     )
//   );
// }
// // --- Mount root ---
// mount(Counter, document.body);