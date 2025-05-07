import { html, signal, effect, component, render } from "@hellajs/core";

const { div, button } = html;

const Timer = component(() => {
  const count = signal(0);
  const interval = setInterval(() => count.set(count() + 1), 1000);

  effect(() => {
    console.log("Timer:", count());
  });

  const vnode = div(
    "Timer: ", count,
    button({ onclick: () => vnode.cleanup?.() }, "Stop Timer")
  );

  vnode.cleanup = () => clearInterval(interval);
  return vnode;
});

// Create an instance and mount it
const timerInstance = Timer();
render(timerInstance);

// Cleanup after 5 seconds
setTimeout(() => {
  timerInstance.cleanup?.();
}, 5000);