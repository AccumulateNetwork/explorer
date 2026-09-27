import { ComponentType, LazyExoticComponent, lazy } from 'react';

export function lazy2<
  // Same constraint as React.lazy's own: the props type is whatever the module
  // exports, and ComponentType<unknown> would reject components with props.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  Component extends ComponentType<any>,
  Keys extends string,
  Module extends { [Key in Keys]: Component },
>(load: () => Promise<Module>, name: Keys): LazyExoticComponent<Component> {
  return lazy(async () => {
    const m = await load();
    return { default: m[name] };
  });
}
