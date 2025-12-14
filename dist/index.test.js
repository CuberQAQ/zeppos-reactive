// // class ZeppReactive {
// //   private activeEffect: (() => void) | null;
// //   private targetMap: WeakMap<object, Map<string, Set<() => void>>>;
// //   constructor() {
// //     this.activeEffect = null;
// //     this.targetMap = new WeakMap<
// //       NonNullable<object>,
// //       Map<string, Set<() => void>>
// //     >();
// //   }
// //   public track<T extends NonNullable<object>>(target: T, key: string): void {
// //     if (this.activeEffect) {
// //       let depsMap = this.targetMap.get(target);
// //       if (!depsMap) {
// //         depsMap = new Map<string, Set<() => void>>();
// //         this.targetMap.set(target, depsMap);
// //       }
// //       let deps = depsMap.get(key);
// //       if (!deps) {
// //         deps = new Set<() => void>();
// //         depsMap.set(key, deps);
// //       }
// //       deps.add(this.activeEffect);
// //     }
// //   }
// //   public trigger<T extends NonNullable<object>>(target: T, key: string): void {
// //     const depsMap = this.targetMap.get(target);
// //     if (!depsMap) return;
// //     const deps = depsMap.get(key);
// //     if (deps) {
// //       deps.forEach((effect) => {
// //         effect();
// //       });
// //     }
// //   }
// //   public reactive<T extends NonNullable<object>>(target: T): T {
// //     if (typeof target !== "object" || target === null) {
// //       return target;
// //     }
// //     if ((target as any).__isReactive) {
// //       return target;
// //     }
// //     const system = this;
// //     const proxy = new Proxy(target, {
// //       get(
// //         obj: T,
// //         key: string,
// //         receiver: any
// //       ): string extends keyof T ? T[keyof T & string] : any {
// //         if (key !== "__isReactive") {
// //           system.track(obj, key);
// //         }
// //         const result = Reflect.get(obj, key, receiver);
// //         if (result && typeof result === "object") {
// //           return system.reactive(result as object & T) as string extends keyof T
// //             ? T[keyof T & string]
// //             : any;
// //         }
// //         return result as string extends keyof T ? T[keyof T & string] : any;
// //       },
// //       set(
// //         obj: T,
// //         key: string | number | symbol,
// //         value: any,
// //         receiver: any
// //       ): boolean {
// //         const oldValue = obj[key as keyof T];
// //         const result = Reflect.set(obj, key, value, receiver);
// //         if (!Object.is(oldValue, value)) {
// //           system.trigger(obj, key as string);
// //         }
// //         return result;
// //       },
// //     });
// //     (proxy as any).__isReactive = true;
// //     return proxy;
// //   }
// //   public memo<T>(
// //     fn: () => T,
// //     options?: { equals?: (a: T, b: T) => boolean }
// //   ): () => T {
// //     const system = this;
// //     let value: T;
// //     let initialized = false;
// //     const equal = options?.equals ?? Object.is;
// //     const runner = () => {
// //       const newValue = fn();
// //       if (!initialized || !equal(newValue, value)) {
// //         value = newValue;
// //         initialized = true;
// //         system.trigger(getter, "value");
// //       }
// //     };
// //     this.effect(runner);
// //     function getter() {
// //       if (system.activeEffect) {
// //         system.track(getter, "value");
// //       }
// //       return value;
// //     }
// //     return getter;
// //   }
// //   public effect(
// //     fn: () => void,
// //     options?: { scheduler?: () => void }
// //   ): () => void {
// //     const system = this;
// //     let setup = false;
// //     const effectFn = () => {
// //       // 保存原 effect，总而允许多层嵌套 effect
// //       const activeEffect = system.activeEffect;
// //       try {
// //         system.activeEffect = effectFn;
// //         if (setup) {
// //           options?.scheduler ? options.scheduler() : fn();
// //         } else {
// //           setup = true;
// //           fn();
// //         }
// //       } finally {
// //         system.activeEffect = activeEffect;
// //       }
// //     };
// //     effectFn();
// //     return effectFn;
// //   }
// //   public watch<T>(
// //     source: () => T,
// //     cb: (newValue: T, oldValue: T | undefined) => void
// //   ) {
// //     let setup = false;
// //     let oldValue: T | undefined;
// //     this.effect(() => {
// //       if (!setup) {
// //         oldValue = source();
// //         setup = true;
// //       } else {
// //         const newValue = source();
// //         if (newValue !== oldValue) {
// //           // 浅层比较，未来可能需要深层
// //           cb(newValue, oldValue);
// //           oldValue = newValue;
// //         }
// //       }
// //     });
// //   }
// //   public computed<T>(getter: () => T): { get value(): T } {
// //     let system = this;
// //     let value: T;
// //     let dirty = true;
// //     let setup = false;
// //     let beDepended = false;
// //     return {
// //       get value() {
// //         if (!setup) {
// //           system.effect(() => {
// //             if (!setup) {
// //               value = getter();
// //               dirty = false;
// //               setup = true;
// //             } else {
// //               if (beDepended) {
// //                 value = getter();
// //                 system.trigger(this, "value");
// //               } else {
// //                 dirty = true;
// //               }
// //             }
// //           });
// //         }
// //         if (dirty) {
// //           value = getter();
// //           dirty = false;
// //         }
// //         if (system.activeEffect) {
// //           system.track(this, "value");
// //           beDepended = true;
// //         }
// //         return value;
// //       },
// //     };
// //   }
// //   // simple and high performance
// //   public merge<T1 extends object, T2 extends object>(
// //     obj1: T1,
// //     obj2: T2
// //   ): T1 & T2 {
// //     return new Proxy({} as Record<string | symbol, any>, {
// //       has(_, key) {
// //         return key in obj1 || key in obj2 || key in _;
// //       },
// //       get(_, key) {
// //         return key in obj1
// //           ? obj1[key as keyof T1]
// //           : key in obj2
// //           ? obj2[key as keyof T2]
// //           : _[key];
// //       },
// //       set(_, key, value) {
// //         if (key in obj1) {
// //           obj1[key as keyof T1] = value;
// //         } else if (key in obj2) {
// //           obj2[key as keyof T2] = value;
// //         } else {
// //           _[key] = value;
// //           console.log(
// //             `[ZeppReactive] setting an undefined field directly to a reactive object may cause reactivity lose. key: ${String(
// //               key
// //             )}.`
// //           );
// //         }
// //         return true;
// //       },
// //       ownKeys(_) {
// //         return Reflect.ownKeys(obj1).concat(
// //           Reflect.ownKeys(obj2),
// //           Reflect.ownKeys(_)
// //         );
// //       },
// //     }) as T1 & T2;
// //   }
// //   // solid js compatible
// //   public mergeProps<T extends object[]>(...sources: T): T[number] {
// //   const system = this;
// //   // 如果传入的是函数（accessor），用 memo 包装成响应式 getter
// //   const normalized = sources.map((s) => {
// //     if (typeof s === "function") {
// //       return system.memo(s as () => any);
// //     }
// //     return s;
// //   });
// //   return new Proxy({} as Record<string | symbol, any>, {
// //     get(_, key) {
// //       // 从最后一个对象开始查找，后面的覆盖前面的
// //       for (let i = normalized.length - 1; i >= 0; i--) {
// //         const source = normalized[i];
// //         if (source && key in source) {
// //           const value = (source as any)[key];
// //           // 如果是 accessor（函数），调用它
// //           return typeof value === "function" ? value() : value;
// //         }
// //       }
// //       return undefined;
// //     },
// //     set(_, key, value) {
// //       // 写回到最后一个拥有该属性的对象
// //       for (let i = normalized.length - 1; i >= 0; i--) {
// //         const source = normalized[i];
// //         if (source && key in source) {
// //           (source as any)[key] = value;
// //           return true;
// //         }
// //       }
// //       // 如果所有源对象都没有这个 key，就直接写到代理对象上
// //       _[key] = value;
// //       return true;
// //     },
// //     has(_, key) {
// //       return normalized.some((s) => s && key in s) || key in _;
// //     },
// //     ownKeys(_) {
// //       const keys: (string | symbol)[] = [];
// //       for (let i = 0; i < normalized.length; i++) {
// //         keys.push(...Reflect.ownKeys(normalized[i]));
// //       }
// //       return [...new Set(keys.concat(Reflect.ownKeys(_)))];
// //     }
// //   }) as T[number];
// // }
// // }
// // const zeppReactive = new ZeppReactive();
// // export const reactive = zeppReactive.reactive.bind(zeppReactive);
// // export const effect = zeppReactive.effect.bind(zeppReactive);
// // export const computed = zeppReactive.computed.bind(zeppReactive);
// // export const merge = zeppReactive.merge.bind(zeppReactive);
// // export const watch = zeppReactive.watch.bind(zeppReactive);
// // export const memo = zeppReactive.memo.bind(zeppReactive);
// // export const mergeProps = zeppReactive.mergeProps.bind(zeppReactive);
// // export { ZeppReactive };
// // 完整修订版 ZeppReactive
// class ZeppReactive {
//   private activeEffect: (() => void) | null;
//   private targetMap: WeakMap<object, Map<string | symbol, Set<() => void>>>;
//   // 调度队列与标记位（去重批处理）
//   private jobQueue: Set<() => void> = new Set();
//   private flushing = false;
//   constructor() {
//     this.activeEffect = null;
//     this.targetMap = new WeakMap();
//   }
//   public track<T extends object>(target: T, key: string | symbol): void {
//     if (!this.activeEffect) return;
//     let depsMap = this.targetMap.get(target);
//     if (!depsMap) {
//       depsMap = new Map();
//       this.targetMap.set(target, depsMap);
//     }
//     let deps = depsMap.get(key);
//     if (!deps) {
//       deps = new Set();
//       depsMap.set(key, deps);
//     }
//     deps.add(this.activeEffect);
//   }
//   public trigger<T extends object>(
//     target: T,
//     key: string | symbol,
//   ): void {
//     const depsMap = this.targetMap.get(target);
//     if (!depsMap) return;
//     const effects = depsMap.get(key);
//     if (!effects || effects.size === 0) return;
//     // 跳过当前活动 effect，避免重入
//     for (const eff of effects) {
//       if (eff === this.activeEffect) continue;
//       // this.jobQueue.add(eff);
//       eff(); // 默认同步执行，除非手动写 scheduler
//     }
//     this.flushJobs();
//   }
//   private flushJobs() {
//     if (this.flushing) return;
//     this.flushing = true;
//     Promise.resolve().then(() => {
//       try {
//         for (const job of this.jobQueue) job();
//       } finally {
//         this.jobQueue.clear();
//         this.flushing = false;
//       }
//     });
//   }
//   public reactive<T extends NonNullable<object>>(target: T): T {
//     if (typeof target !== "object" || target === null) {
//       return target;
//     }
//     if ((target as any).__isReactive) {
//       return target;
//     }
//     const system = this;
//     const proxy = new Proxy(target, {
//       get(obj: T, key: string | symbol, receiver: any) {
//         if (key !== "__isReactive") {
//           system.track(obj, key);
//         }
//         const result = Reflect.get(obj, key, receiver);
//         if (result && typeof result === "object") {
//           return system.reactive(result as object & T);
//         }
//         return result;
//       },
//       set(obj: T, key: string | number | symbol, value: any, receiver: any) {
//         const oldValue = (obj as any)[key];
//         const ok = Reflect.set(obj, key, value, receiver);
//         if (!Object.is(oldValue, value)) {
//           system.trigger(obj, key as string | symbol);
//         }
//         return ok;
//       },
//     });
//     (proxy as any).__isReactive = true;
//     return proxy;
//   }
//   public memo<T>(
//     fn: () => T,
//     options?: { equals?: (a: T, b: T) => boolean }
//   ): () => T {
//     const system = this;
//     let value!: T;
//     let initialized = false;
//     const equal = options?.equals ?? Object.is;
//     const KEY: unique symbol = Symbol("memo:value");
//     const runner = () => {
//       const newValue = fn();
//       if (!initialized) {
//         value = newValue;
//         initialized = true;
//         // 初始化阶段不触发订阅者，避免建立依赖时的重入
//         return;
//       }
//       if (!equal(newValue, value)) {
//         value = newValue;
//         system.trigger(getter, KEY);
//       }
//     };
//     this.effect(runner);
//     function getter() {
//       if (system.activeEffect) {
//         system.track(getter, KEY);
//       }
//       return value;
//     }
//     return getter;
//   }
//   public effect<T extends () => void>(
//     fn: T,
//     options?: { scheduler?: (fn: T) => void }
//   ): () => void {
//     const system = this;
//     let setup = false;
//     const effectFn = () => {
//       const prev = system.activeEffect;
//       system.activeEffect = effectFn;
//       try {
//         if (!setup) {
//           setup = true;
//           fn();
//         } else {
//           options?.scheduler ? options.scheduler(fn) : fn();
//         }
//       } finally {
//         system.activeEffect = prev;
//       }
//     };
//     effectFn();
//     return effectFn;
//   }
//   public watch<T>(
//     source: () => T,
//     cb: (newValue: T, oldValue: T | undefined) => void
//   ) {
//     let setup = false;
//     let oldValue: T | undefined;
//     this.effect(() => {
//       if (!setup) {
//         oldValue = source();
//         setup = true;
//       } else {
//         const newValue = source();
//         if (newValue !== oldValue) {
//           cb(newValue, oldValue);
//           oldValue = newValue;
//         }
//       }
//     });
//   }
//   public computed<T>(getter: () => T): { get value(): T } {
//     const system = this;
//     let value!: T;
//     let dirty = true;
//     let setup = false;
//     let beDepended = false;
//     const KEY: unique symbol = Symbol("computed:value");
//     return {
//       get value() {
//         if (!setup) {
//           system.effect(() => {
//             if (!setup) {
//               value = getter();
//               dirty = false;
//               setup = true;
//             } else {
//               if (beDepended) {
//                 value = getter();
//                 system.trigger(this, KEY);
//               } else {
//                 dirty = true;
//               }
//             }
//           });
//         }
//         if (dirty) {
//           value = getter();
//           dirty = false;
//         }
//         if (system.activeEffect) {
//           system.track(this, KEY);
//           beDepended = true;
//         }
//         return value;
//       },
//     };
//   }
//   // simple and high performance
//   public merge<T1 extends object, T2 extends object>(
//     obj1: T1,
//     obj2: T2
//   ): T1 & T2 {
//     return new Proxy({} as Record<string | symbol, any>, {
//       has(_, key) {
//         return key in obj1 || key in obj2 || key in _;
//       },
//       get(_, key) {
//         return key in obj1
//           ? (obj1 as any)[key]
//           : key in obj2
//           ? (obj2 as any)[key]
//           : (_ as any)[key];
//       },
//       set(_, key, value) {
//         if (key in obj1) {
//           (obj1 as any)[key] = value;
//         } else if (key in obj2) {
//           (obj2 as any)[key] = value;
//         } else {
//           (_ as any)[key] = value;
//           console.log(
//             `[ZeppReactive] setting an undefined field directly to a reactive object may cause reactivity lose. key: ${String(
//               key
//             )}.`
//           );
//         }
//         return true;
//       },
//       ownKeys(_) {
//         return Reflect.ownKeys(obj1).concat(
//           Reflect.ownKeys(obj2),
//           Reflect.ownKeys(_)
//         );
//       },
//     }) as T1 & T2;
//   }
//   // solid js compatible
//   public mergeProps<T extends object[]>(...sources: T): T[number] {
//     const system = this;
//     // 将函数源包装为 memo，以便惰性访问时能订阅变化
//     const normalized = sources.map((s) =>
//       typeof s === "function" ? system.memo(s as () => any) : s
//     );
//     return new Proxy({} as Record<string | symbol, any>, {
//       get(_, key) {
//         for (let i = normalized.length - 1; i >= 0; i--) {
//           const source = normalized[i] as any;
//           if (source && key in source) {
//             const value = source[key];
//             return typeof value === "function" ? value() : value;
//           }
//         }
//         return undefined;
//       },
//       set(_, key, value) {
//         for (let i = normalized.length - 1; i >= 0; i--) {
//           const source = normalized[i] as any;
//           if (source && key in source) {
//             source[key] = value;
//             return true;
//           }
//         }
//         (_ as any)[key] = value;
//         return true;
//       },
//       has(_, key) {
//         if (key in _) return true;
//         for (let i = 0; i < normalized.length; i++) {
//           const s = normalized[i] as any;
//           if (s && key in s) return true;
//         }
//         return false;
//       },
//       ownKeys(_) {
//         const keys: (string | symbol)[] = [];
//         for (let i = 0; i < normalized.length; i++) {
//           keys.push(...Reflect.ownKeys(normalized[i]));
//         }
//         return [...new Set(keys.concat(Reflect.ownKeys(_)))];
//       },
//     }) as T[number];
//   }
// }
// // 绑定导出
// const zeppReactive = new ZeppReactive();
// export const reactive = zeppReactive.reactive.bind(zeppReactive);
// export const effect = zeppReactive.effect.bind(zeppReactive);
// export const computed = zeppReactive.computed.bind(zeppReactive);
// export const merge = zeppReactive.merge.bind(zeppReactive);
// export const watch = zeppReactive.watch.bind(zeppReactive);
// export const memo = zeppReactive.memo.bind(zeppReactive);
// export const mergeProps = zeppReactive.mergeProps.bind(zeppReactive);
// export { ZeppReactive };
const STALE = 1;
const CLEAN = 0;
class ZeppReactive {
    activeEffect = null;
    targetMap = new WeakMap();
    Updates = null;
    effect(fn) {
        const eff = new ReactiveEffect(fn, this);
        eff.run();
        return eff;
    }
    memo(fn) {
        const eff = new ReactiveEffect(fn, this, true);
        eff.run();
        return () => eff.value;
    }
    reactive(obj) {
        const system = this;
        return new Proxy(obj, {
            get(target, key, receiver) {
                const res = Reflect.get(target, key, receiver);
                if (system.activeEffect) {
                    system.track(target, key, system.activeEffect);
                }
                return res;
            },
            set(target, key, value, receiver) {
                const old = target[key];
                const ok = Reflect.set(target, key, value, receiver);
                if (!Object.is(old, value)) {
                    system.trigger(target, key);
                }
                return ok;
            },
        });
    }
    track(target, key, eff) {
        let depsMap = this.targetMap.get(target);
        if (!depsMap) {
            depsMap = new Map();
            this.targetMap.set(target, depsMap);
        }
        let dep = depsMap.get(key);
        if (!dep) {
            dep = new Set();
            depsMap.set(key, dep);
        }
        dep.add(eff);
    }
    trigger(target, key) {
        const depsMap = this.targetMap.get(target);
        if (!depsMap)
            return;
        const dep = depsMap.get(key);
        if (!dep)
            return;
        for (const eff of dep) {
            if (eff.state !== STALE) {
                eff.state = STALE;
                this.queueUpdate(eff);
            }
        }
        this.flushUpdates();
    }
    queueUpdate(eff) {
        if (!this.Updates)
            this.Updates = [];
        this.Updates.push(eff);
    }
    flushUpdates() {
        if (!this.Updates)
            return;
        const queue = this.Updates;
        this.Updates = null;
        for (const eff of queue) {
            if (eff.state === STALE)
                eff.run();
        }
    }
    watch(source, cb) {
        let oldValue;
        let initialized = false;
        // 用 effect 包裹 source
        this.effect(() => {
            const newValue = source();
            if (!initialized) {
                oldValue = newValue;
                initialized = true;
            }
            else {
                if (!Object.is(newValue, oldValue)) {
                    cb(newValue, oldValue);
                    oldValue = newValue;
                }
            }
        });
    }
    computed(getter) {
        const system = this;
        let value;
        let dirty = true;
        let initialized = false;
        const KEY = Symbol("computed:value");
        // runner 用来更新缓存值
        const runner = new ReactiveEffect(() => {
            const newVal = getter();
            if (!initialized || !Object.is(newVal, value)) {
                value = newVal;
                initialized = true;
                dirty = false;
                system.trigger(wrapper, KEY);
            }
        }, this, true);
        // 初次运行
        runner.run();
        // 包装对象，外部通过 .value 访问
        const wrapper = {
            get value() {
                if (dirty) {
                    runner.run();
                    dirty = false;
                }
                if (system.activeEffect) {
                    system.track(wrapper, KEY, system.activeEffect);
                }
                return value;
            },
        };
        return wrapper;
    }
    // simple and high performance
    merge(obj1, obj2) {
        return new Proxy({}, {
            has(_, key) {
                return key in obj1 || key in obj2 || key in _;
            },
            get(_, key) {
                return key in obj1
                    ? obj1[key]
                    : key in obj2
                        ? obj2[key]
                        : _[key];
            },
            set(_, key, value) {
                if (key in obj1) {
                    obj1[key] = value;
                }
                else if (key in obj2) {
                    obj2[key] = value;
                }
                else {
                    _[key] = value;
                    console.log(`[ZeppReactive] setting an undefined field directly to a reactive object may cause reactivity lose. key: ${String(key)}.`);
                }
                return true;
            },
            ownKeys(_) {
                return Reflect.ownKeys(obj1).concat(Reflect.ownKeys(obj2), Reflect.ownKeys(_));
            },
        });
    }
    // solid js compatible
    mergeProps(...sources) {
        const system = this;
        // 将函数源包装为 memo，以便惰性访问时能订阅变化
        const normalized = sources.map((s) => typeof s === "function" ? system.memo(s) : s);
        return new Proxy({}, {
            get(_, key) {
                for (let i = normalized.length - 1; i >= 0; i--) {
                    const source = normalized[i];
                    if (source && key in source) {
                        const value = source[key];
                        return typeof value === "function" ? value() : value;
                    }
                }
                return undefined;
            },
            set(_, key, value) {
                for (let i = normalized.length - 1; i >= 0; i--) {
                    const source = normalized[i];
                    if (source && key in source) {
                        source[key] = value;
                        return true;
                    }
                }
                _[key] = value;
                return true;
            },
            has(_, key) {
                if (key in _)
                    return true;
                for (let i = 0; i < normalized.length; i++) {
                    const s = normalized[i];
                    if (s && key in s)
                        return true;
                }
                return false;
            },
            ownKeys(_) {
                const keys = [];
                for (let i = 0; i < normalized.length; i++) {
                    keys.push(...Reflect.ownKeys(normalized[i]));
                }
                return [...new Set(keys.concat(Reflect.ownKeys(_)))];
            },
        });
    }
}
class ReactiveEffect {
    fn;
    system;
    pure;
    value;
    state = CLEAN;
    constructor(fn, system, pure = false) {
        this.fn = fn;
        this.system = system;
        this.pure = pure;
    }
    run() {
        const prev = this.system.activeEffect;
        this.system.activeEffect = this;
        try {
            this.value = this.fn();
            this.state = CLEAN;
        }
        finally {
            this.system.activeEffect = prev;
        }
    }
}
// 绑定导出
const zeppReactive = new ZeppReactive();
export const reactive = zeppReactive.reactive.bind(zeppReactive);
export const effect = zeppReactive.effect.bind(zeppReactive);
export const computed = zeppReactive.computed.bind(zeppReactive);
export const merge = zeppReactive.merge.bind(zeppReactive);
export const watch = zeppReactive.watch.bind(zeppReactive);
export const memo = zeppReactive.memo.bind(zeppReactive);
export const mergeProps = zeppReactive.mergeProps.bind(zeppReactive);
export { ZeppReactive };
