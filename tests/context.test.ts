import { describe, it, expect } from "bun:test";
import { context } from "../lib/reactive/context";

describe("context", () => {
  it("returns default value when not provided", () => {
    const numberCtx = context(42);
    expect(numberCtx.use()).toBe(42);
  });

  it("returns provided value inside provide", () => {
    const stringCtx = context("default");
    let value: string | undefined;
    stringCtx.provide({
      value: "provided",
      children: () => {
        value = stringCtx.use();
      }
    });
    expect(value).toBe("provided");
  });

  it("returns correct value with nested providers", () => {
    const ctx = context("root");
    let outer: string | undefined;
    let inner: string | undefined;
    ctx.provide({
      value: "outer",
      children: () => {
        outer = ctx.use();
        ctx.provide({
          value: "inner",
          children: () => {
            inner = ctx.use();
          }
        });
      }
    });
    expect(outer).toBe("outer");
    expect(inner).toBe("inner");
    expect(ctx.use()).toBe("root");
  });

  it("provide returns children()'s return value", () => {
    const ctx = context(0);
    const result = ctx.provide({
      value: 1,
      children: () => "child-result"
    });
    expect(result).toBe("child-result");
  });
});
