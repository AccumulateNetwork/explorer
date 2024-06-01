import { Descriptions, Switch, Typography } from 'antd';
import React, { useState } from 'react';

import { InfoTable } from '../common/InfoTable';
import { Shared } from '../common/Shared';

const { Title } = Typography;

export function useSetting<V, K extends keyof V & string>(
  v: V,
  k: K,
): [V[K], (x: V[K]) => void] {
  const [value, setValue] = useState(v[k]);
  const { name } = store.resolve(v, { name: k });
  Shared.Context.onBroadcast((msg) => {
    if (msg.type === 'didChangeSetting' && msg.name === name) {
      setValue(v[k]);
    }
  });
  return [value, (x) => (v[k] = x)];
}

type Ctor = abstract new (...args: any) => any;
type NamedClassAccessorDecoratorContext<T, V> = ClassAccessorDecoratorContext<
  T,
  V
> & {
  name: string;
};

interface StorageInfo {
  storage: Storage;
  prefix?: string;
}

export function store<C extends Ctor>(
  storage: Storage,
  prefix?: string,
): (target: C, context: ClassDecoratorContext<C>) => void;

export function store<T, V>(
  target: ClassAccessorDecoratorTarget<T, V>,
  context: NamedClassAccessorDecoratorContext<T, V>,
): ClassAccessorDecoratorResult<T, V>;

export function store<T, V, C extends Ctor>(
  targetOrStorage: ClassAccessorDecoratorTarget<T, V> | Storage,
  contextOrPrefix:
    | NamedClassAccessorDecoratorContext<T, V>
    | string
    | undefined,
):
  | ClassAccessorDecoratorResult<T, V>
  | ((target: C, context: ClassDecoratorContext<C>) => void) {
  if ('removeItem' in targetOrStorage) {
    return (target: C, _: ClassDecoratorContext<C>) => {
      store.info.set(target, {
        storage: targetOrStorage,
        prefix: contextOrPrefix as string,
      });
      return target;
    };
  }

  const { get, set } = targetOrStorage;
  const context = contextOrPrefix as NamedClassAccessorDecoratorContext<T, V>;

  return {
    get() {
      const { storage, name } = store.resolve(this, context);
      const s = storage.getItem(name);
      if (!s) return get.call(this);

      try {
        return JSON.parse(s);
      } catch (_) {
        return get.call(this);
      }
    },

    set(v: V) {
      const { storage, name } = store.resolve(this, context);
      storage.setItem(name, JSON.stringify(v));
      set.call(this, v);
    },
  };
}

store.info = new WeakMap<WeakKey, StorageInfo>();

store.resolve = <T, V>(self: any, context: { name: string }) => {
  const info = store.info.get(self.constructor);
  if (!info) {
    throw new Error('Class was not decorated with @store');
  }
  const { storage, prefix } = info;
  let { name } = context;
  if (prefix) {
    name = `${prefix}:${name}`;
  }
  return { storage, name };
};

export function broadcast<This, Value>(prefix?: string) {
  return (
    { set }: ClassAccessorDecoratorTarget<This, Value>,
    { name }: ClassAccessorDecoratorContext<This, Value> & { name: string },
  ): ClassAccessorDecoratorResult<This, Value> => {
    return {
      set(v: Value) {
        Shared.Context.postBroadcast({
          type: 'didChangeSetting',
          name: prefix ? `${prefix}:${name}` : name,
        });
        set.call(this, v);
      },
    };
  };
}

export const Settings = new (
  @store(localStorage)
  class Settings {
    @store accessor enableDevMode: boolean = false;
    @store accessor networkName: string = 'mainnet';
    @store accessor favourites: string[] = [];

    readonly Edit = function () {
      return (
        <div>
          <Title level={2}>Settings</Title>

          <InfoTable>
            <Descriptions.Item key="dev-mode" label="Developer mode">
              <Switch
                defaultChecked={this.enableDevMode}
                onChange={(v) => (this.enableDevMode = v)}
              />
            </Descriptions.Item>
          </InfoTable>
        </div>
      );
    }.bind(this);
  }
)();
