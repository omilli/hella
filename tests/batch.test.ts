import { batch } from "../lib/reactive/batch";
import { signal } from "../lib/reactive/signal";
import { effect, flushEffects } from "../lib/reactive/effect";
import { describe, it, expect } from "bun:test";

describe("batch", () => {
  it("should batch updates and run effect once", async () => {
    const a = signal(1);
    const b = signal(2);
    let called = 0;
    effect(() => { a(); b(); called++; });
    batch(() => {
      a.set(10);
      b.set(20);
    });
    await flushEffects();
    expect(called).toBe(2); // initial + batch
  });
});
