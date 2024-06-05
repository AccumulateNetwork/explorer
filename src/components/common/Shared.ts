import { useEffect, useState } from 'react';

import { bind } from '../../utils/typemagic';

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

interface AccessorMetadata {
  stored?: boolean;
  broadcast?: boolean;
}

function getAccessorMetadata({
  name,
  metadata,
}: {
  name: string;
  metadata: DecoratorMetadata;
}) {
  if (!(name in metadata)) {
    metadata[name] = {};
  }
  return metadata[name] as AccessorMetadata;
}

export function prefix<C extends Ctor>(prefix: string) {
  return (target: C, _: ClassDecoratorContext<C>) => {
    info(target).prefix = prefix;
  };
}

export function storage<C extends Ctor>(storage: Storage) {
  return (target: C, context: ClassDecoratorContext<C>) => {
    context.metadata.storage = storage;
    info(target).storage = storage;
  };
}

export function stored<T, V>(
  { get, set }: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V> & Named,
): ClassAccessorDecoratorResult<T, V> {
  const md = getAccessorMetadata(context);
  if (md.broadcast) {
    throw new Error(`@broadcast must come before @stored`);
  }
  md.stored = true;
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
  getAccessorMetadata(context).broadcast = true;
  return {
    set(value: Value) {
      const previous = get.call(this);
      set.call(this, value);
      if (previous === value) {
        return;
      }

      const { name } = info.resolve(this, context);
      bChannel.postMessage({ name, value });
      bLocal.forEach((fn) => {
        try {
          fn(name, value);
        } catch (error) {
          console.log(error);
        }
      });
    },
  };
}

type bCallback = (name: string, value: any) => any;
const bChannel = new BroadcastChannel('shared-values');
const bLocal = new Set<bCallback>();
bChannel.addEventListener('message', ({ data: { name, value } }) => {
  bLocal.forEach((fn) => {
    try {
      fn(name, value);
    } catch (error) {
      console.log(error);
    }
  });
});

export function useShared<V, K extends keyof V & string>(
  v: V,
  k: K,
): [V[K], (x: V[K]) => void] {
  const [value, setValue] = useState(v?.[k]);

  let cb: bCallback;
  useEffect(() => {
    if (cb) {
      bLocal.delete(cb);
    }
    if (!v) {
      return;
    }

    setValue(v[k]);

    const { name } = info.resolve(v, { name: k });
    cb = (n, v) => n === name && setValue(v);
    bLocal.add(cb);

    return () => {
      bLocal.delete(cb);
    };
  }, [v]);

  return [value, (x) => (v[k] = x)];
}
