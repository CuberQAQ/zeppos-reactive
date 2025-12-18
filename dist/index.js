const STALE = 1;
const CLEAN = 0;
class ZeppReactive {
    activeEffect = null;
    globalScope = [];
    activeScope = this.globalScope;
    targetMap = new WeakMap();
    Updates = null;
    reactiveMap = new WeakMap();
    effect(fn, initialValue) {
        const eff = new ReactiveEffect(fn, this);
        eff.value = initialValue;
        eff.run();
        return eff;
    }
    memo(fn) {
        const system = this;
        let value;
        let initialized = false;
        // computation runner
        const eff = new ReactiveEffect(() => {
            const newVal = fn();
            if (!initialized) {
                value = newVal;
                initialized = true;
            }
            else if (!Object.is(newVal, value)) {
                value = newVal;
                // 通知依赖这个 memo 的 effect
                system.trigger(wrapper, "value");
            }
            return value;
        }, this, true);
        eff.run();
        const wrapper = () => {
            // 如果当前有活跃 effect，就 track 这个 memo
            if (system.activeEffect) {
                system.track(wrapper, "value", system.activeEffect);
            }
            return value;
        };
        return wrapper;
    }
    reactive(obj, options) {
        if (this.reactiveMap.has(obj)) {
            return this.reactiveMap.get(obj);
        }
        const system = this;
        return new Proxy(obj, {
            get(target, key, receiver) {
                const res = Reflect.get(target, key, receiver);
                if (system.activeEffect) {
                    system.track(target, key, system.activeEffect);
                }
                if (options?.deep && typeof res === "object" && res !== null) {
                    return system.reactive(res, options);
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
        if (!dep.has(eff)) {
            dep.add(eff);
            eff.deps.push(dep); // 反向记录
        }
    }
    untrack(fn) {
        const prev = this.activeEffect;
        this.activeEffect = null;
        try {
            return fn();
        }
        finally {
            this.activeEffect = prev;
        }
    }
    scoped(fn, scoped) {
        let prev = this.activeScope;
        this.activeScope = scoped;
        try {
            return fn();
        }
        finally {
            this.activeScope = prev;
        }
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
        const eff = this.effect(() => {
            const newValue = source();
            if (!initialized) {
                oldValue = newValue;
                initialized = true;
            }
            else {
                if (!Object.is(newValue, oldValue)) {
                    this.untrack(() => cb(newValue, oldValue));
                    oldValue = newValue;
                }
            }
        });
        return () => {
            eff.stop();
        };
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
                return key in obj2 || key in obj1 || key in _;
            },
            get(_, key) {
                return key in obj2
                    ? obj2[key]
                    : key in obj1
                        ? obj1[key]
                        : _[key];
            },
            set(_, key, value) {
                if (key in obj2) {
                    obj2[key] = value;
                }
                else if (key in obj1) {
                    obj1[key] = value;
                }
                else {
                    _[key] = value;
                    console.log(`[ZeppReactive] setting an undefined field directly to a reactive object may cause reactivity lose. key: ${String(key)}.`);
                }
                return true;
            },
            ownKeys(_) {
                return Reflect.ownKeys(obj2).concat(Reflect.ownKeys(obj1), Reflect.ownKeys(_));
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
                        // return typeof value === "function" ? value() : value; // TODO
                        return value;
                    }
                }
                return _[key];
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
    static instance;
    clear() {
        this.activeEffect = null;
        this.globalScope.forEach((e) => e.stop());
        this.activeScope = null;
        this.reactiveMap = null;
        this.targetMap = null;
    }
}
export class ReactiveEffect {
    fn;
    system;
    pure;
    value;
    state = CLEAN;
    deps = []; // 记录自己所在的依赖集合
    active = true;
    scope;
    static __cnt = 0;
    static __nextTickTimer = null;
    static __nextUnscopedCnt = 1;
    constructor(fn, system, pure = false) {
        this.fn = fn;
        this.system = system;
        this.pure = pure;
        ReactiveEffect.__cnt++;
        if (!ReactiveEffect.__nextTickTimer) {
            ReactiveEffect.__nextTickTimer = setTimeout(() => {
                ReactiveEffect.__nextTickTimer = null;
                console.log(`[Reactive] active effect count: ${ReactiveEffect.__cnt}`);
            }, 300);
        }
        this.scope = system.activeScope;
        if (this.scope === system.globalScope) {
            console.log(`[ZeppReactive] WARN: effect created outside of scope (${ReactiveEffect.__nextUnscopedCnt++}). This is not recommended. Please use scoped effect: ${fn.name || "[anonymous]"}.`);
        }
        this.scope.push(this);
    }
    run() {
        if (!this.active)
            return; // 已 stop 的 effect 不再运行
        const prev = this.system.activeEffect;
        this.system.activeEffect = this;
        try {
            this.value = this.system.scoped(() => this.fn(this.value), this.scope);
            this.state = CLEAN;
        }
        finally {
            this.system.activeEffect = prev;
        }
    }
    stop() {
        if (this.active) {
            // 从所有依赖集合中移除自己
            for (const dep of this.deps) {
                dep.delete(this);
            }
            this.deps.length = 0;
            this.active = false;
            ReactiveEffect.__cnt--;
        }
        if (!ReactiveEffect.__nextTickTimer) {
            ReactiveEffect.__nextTickTimer = setTimeout(() => {
                ReactiveEffect.__nextTickTimer = null;
                console.log(`[Reactive] active effect count: ${ReactiveEffect.__cnt}`);
            }, 300);
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
export const untrack = zeppReactive.untrack.bind(zeppReactive);
export const scoped = zeppReactive.scoped.bind(zeppReactive);
ZeppReactive.instance = zeppReactive;
export { ZeppReactive };
