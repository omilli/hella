import { flushEffects } from "../lib/reactive";
import { computed } from "../lib/reactive/computed";
import { signal } from "../lib/reactive/signal";
import { describe, it, expect } from "bun:test";

describe("computed", () => {
  it("should derive values and update reactively", async () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());
    expect(sum()).toBe(5);
    a.set(5);
    await flushEffects();
    expect(sum()).toBe(8);
  });

  it("should not update if value is unchanged", async () => {
    const a = signal(1);
    let called = 0;
    const c = computed(() => { called++; return a(); });
    c();
    a.set(1);
    expect(called).toBe(2);
    a.set(2);
    await flushEffects();
    expect(called).toBe(3);
  });
});
