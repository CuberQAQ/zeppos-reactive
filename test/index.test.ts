import { describe, expect, it, test } from "bun:test";
import { reactive, effect, merge, mergeProps, memo, ReactiveEffect } from "../src";

describe("reactive", () => {
  it("can be changed and read directly", () => {
    const obj = reactive({ a: 1 });
    expect(obj.a).toBe(1);
    obj.a = 2;
    expect(obj.a).toBe(2);
  });

  it("can be traced by effect", () => {
    let target = 1;
    const obj = reactive({ a: 1 });
    effect(() => {
      expect(obj.a).toBe(target);
    });
    target = 2;
    obj.a = 2;
  });

  it("can accept func prop in reactive obj", () => {
    const obj = reactive({ a: () => 1 });
    expect(obj.a()).toBe(1);
  });
});

describe("merge", () => {
  it("can be changed and read directly", () => {
    const obj = merge({ a: 1 }, { b: 2 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
  });

  it("can merge reactive 1", () => {
    const obj = merge(reactive({ a: 1 }), { b: 2 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    obj.a = 3;
    expect(obj.a).toBe(3);
  });

  it("can merge reactive 2", () => {
    const obj = merge({ a: 1 }, reactive({ b: 2 }));
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    obj.b = 3;
    expect(obj.b).toBe(3);
  });

  it("can merge reactive 3", () => {
    const obj = merge(reactive({ a: 1 }), reactive({ b: 2 }));
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    obj.a = 3;
    expect(obj.a).toBe(3);
  });

  it("can accept func prop in normal obj", () => {
    const obj = merge({ a: () => 1 }, { b: 2 });
    expect(obj.a()).toBe(1);
    expect(obj.b).toBe(2);
  });

  it("can accept func prop in reactive obj", () => {
    const obj = merge(reactive({ a: () => 1 }), { b: 2 });
    expect(obj.a()).toBe(1);
    expect(obj.b).toBe(2);
  });

  it("can define new prop", () => {
    const obj = merge({ a: 1 }, { b: 2 });
    (obj as any).c = 3;
    expect((obj as any).c).toBe(3);
  });

  it("can merge another merge", () => {
    const obj = merge(merge({ a: 1 }, { b: 2 }), { c: 3 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });

  it("can merge another reactive", () => {
    const obj = merge(merge({ a: 1 }, { b: 2 }), reactive({ c: 3 }));
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });
});

describe("mergeProps(multiple merge)", () => {
  it("can be changed and read directly", () => {
    const obj = mergeProps({ a: 1 }, { b: 2 }, { c: 3 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
  });
  it("can accept func prop in normal obj", () => {
    const obj = mergeProps({ a: () => 1 }, { b: 2 }, { c: 3 });
    expect(obj.a()).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
  });
  it("can accept func prop in reactive obj", () => {
    const obj = mergeProps(reactive({ a: () => 1 }), { b: 2 }, { c: 3 });
    expect(obj.a()).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
  });
  it("can define new prop", () => {
    const obj = mergeProps({ a: 1 }, { b: 2 }, { c: 3 });
    (obj as any).d = 4;
    expect((obj as any).d).toBe(4);
  });
  it("can merge another merge", () => {
    const obj = mergeProps(merge({ a: 1 }, { b: 2 }), { c: 3 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });
  it("can merge another reactive", () => {
    const obj = mergeProps(merge({ a: 1 }, { b: 2 }), reactive({ c: 3 }));
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });
  it("can merge another mergeProps", () => {
    const obj = mergeProps(mergeProps({ a: 1 }, { b: 2 }), { c: 3 });
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });

  it("can merge another mergeProps", () => {
    const obj = mergeProps(mergeProps({ a: 1 }, { b: 2 }), reactive({ c: 3 }));
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
    obj.a = 4;
    expect(obj.a).toBe(4);
    obj.c = 5;
    expect(obj.c).toBe(5);
  });
});

describe("memo", () => {
  it("can memo", () => {
    const fn = () => 1;
    const memoFn = memo(fn);
    expect(memoFn()).toBe(1);
    expect(memoFn()).toBe(1);
  });
  it("can trace reactive source and restart", () => {
    const obj = reactive({ a: 1 });
    let runCount = 0;
    const fn = () => {
      runCount++;
      return obj.a;
    };
    const memoFn = memo(fn);
    expect(memoFn()).toBe(1);
    obj.a = 2;
    obj.a = 3;
    obj.a = 4;
    expect(runCount).toBe();
  });
});


describe('ReactiveEffect', () => {
  it('should stop the effect', () => {
    const eff = effect(() => {
      // Effect logic
    });
    eff.run();
    expect(eff.active).toBe(true);

    eff.stop();
    expect(eff.active).toBe(false);
  });

  it('should stop the effect and still be reactive', () => {
    const obj = reactive({ count: 0 });
    let called = 0;
    const eff = effect(() => {
      obj.count;
      called++;
    });

    expect(called).toBe(1);

    obj.count += 1;

    expect(called).toBe(2);

    eff.stop();

    obj.count += 1;

    expect(called).toBe(2);
  });
});