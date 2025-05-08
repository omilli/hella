import "./bench"

// import { html, signal, mount, type Signal, effect, For, Show } from "@hellajs/core";

// const { div, button, p, span } = html;

// const items = signal<number[]>([]);
// const showFoo = signal(true);

// function Foo({ label }: { label: string }) {
//   const foo = signal(label);
//   effect(() => {
//     console.log("Foo effect: ", foo());
//   });
//   setInterval(() => {
//     foo.set("Foo" + Math.random());
//   }, 1000)
//   return div(
//     p({ onclick: () => items.set([]) }, foo),
//   );
// }

// function Counter() {
//   const count = signal(0);
//   effect(() => {
//     console.log("Counter effect: ", count());
//     console.log("Items effect: ", items());
//   });
//   setInterval(() => {
//     count.set(count() + 1);
//     items.set([...items(), count()]);
//   }, 1000);
//   return div(
//     { class: count },
//     Show({
//       when: showFoo,
//       children: () => Foo({ label: "Foo" })
//     }),
//     button({ onclick: () => showFoo.set(!showFoo()) }, "Toggle Foo"),
//     div(
//       For({
//         each: items,
//         children: (item) => html.span(item)
//       })
//     ),
//     p("Count: ",
//       span(
//         count
//       )
//     ),
//     button({ onclick: () => count.set(count() + 1) },
//       "Increment"
//     ),
//     () => count() % 2 === 0
//       ? p("Even")
//       : div("Odd"),
//   )
// }

// // setTimeout(() => {
// //   root?.replaceChildren("");
// // }, 5000)


// mount(Counter);
