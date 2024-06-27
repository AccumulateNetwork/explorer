import { ComponentType, LazyExoticComponent, lazy } from 'react';

export function lazy2<
  Component extends ComponentType<any>,
  Keys extends string,
  Module extends { [Key in Keys]: Component },
>(load: () => Promise<Module>, name: Keys): LazyExoticComponent<Component> {
  return lazy(async () => {
    const m = await load();
    return { default: m[name] };
  });
}
