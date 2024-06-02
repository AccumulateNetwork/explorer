import { useEffect, useState } from 'react';

import { bind } from '../../utils/blackmagic';

type Ctor = abstract new (...args: any) => any;
type Named = { name: string };

interface ClassInfo {
  storage?: Storage;
  prefix?: string;
}

const info = bind(
  {
    store: new WeakMap<WeakKey, ClassInfo>(),
  },
  function (v: any) {
    const ctor = typeof v === 'function' ? v : v.constructor;
    const info = this.store.get(ctor) || {};
    this.store.set(ctor, info);
    return info;
  },
  {
    resolve<T, V>(v: any, context: Named) {
      const { storage, prefix } = info(v);
      let { name } = context;
      if (prefix) {
        name = `${prefix}:${name}`;
      }
      return { storage, name };
    },
  },
);

export function prefix<C extends Ctor>(prefix: string) {
  return (target: C, _: ClassDecoratorContext<C>) => {
    info(target).prefix = prefix;
  };
}

export function storage<C extends Ctor>(storage: Storage) {
  return (target: C, _: ClassDecoratorContext<C>) => {
    info(target).storage = storage;
  };
}

export function stored<T, V>(
  { get, set }: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V> & Named,
): ClassAccessorDecoratorResult<T, V> {
  return {
    get() {
      const { storage, name } = info.resolve(this, context);
      if (!storage) {
        throw new Error('Class was not decorated with @storage');
      }
      const s = storage.getItem(name);
      if (!s) return get.call(this);

      try {
        return JSON.parse(s);
      } catch (_) {
        return get.call(this);
      }
    },

    set(v: V) {
      const { storage, name } = info.resolve(this, context);
      if (!storage) {
        throw new Error('Class was not decorated with @storage');
      }
      storage.setItem(name, JSON.stringify(v));
      set.call(this, v);
    },
  };
}

export function broadcast<This, Value>(
  { get, set }: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value> & Named,
): ClassAccessorDecoratorResult<This, Value> {
  return {
    set(value: Value) {
      const previous = get.call(this);
      set.call(this, value);
      if (JSON.stringify(previous) === JSON.stringify(value)) {
        return;
      }

      const { name } = info.resolve(this, context);
      bChannel.postMessage({ name, value });
      bLocal[name]?.forEach((fn) => {
        try {
          fn(value);
        } catch (error) {
          console.log(error);
        }
      });
    },
  };
}

const bChannel = new BroadcastChannel('shared-values');
const bLocal = {} as Record<string, ((_: any) => any)[]>;
bChannel.addEventListener('message', ({ data: { name, value } }) => {
  bLocal[name]?.forEach((fn) => {
    try {
      fn(value);
    } catch (error) {
      console.log(error);
    }
  });
});

export function useShared<V, K extends keyof V & string>(
  v: V,
  k: K,
): [V[K], (x: V[K]) => void] {
  const [value, setValue] = useState(v[k]);
  const { name } = info.resolve(v, { name: k });

  useEffect(() => {
    let mounted = true;

    if (!(name in bLocal)) {
      bLocal[name] = [];
    }
    bLocal[name].push((value) => mounted && setValue(value));

    return () => {
      mounted = false;
    };
  }, []);

  return [value, (x) => (v[k] = x)];
}
