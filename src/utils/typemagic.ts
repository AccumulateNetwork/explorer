/**
 * Bind is JavaScript and TypeScript magic that creates something like a
 * callable class.
 * @param self `this` for the function and properties.
 * @param fn The function.
 * @param props Properties of the returned value.
 */
export function bind<Self, In extends Array<unknown>, Out, Props extends any>(
  self: Self,
  fn: (this: Self, ..._: In) => Out,
  props?: Props,
): ((..._: In) => Out) & Props {
  const bound = fn.bind(self);
  if (!props) {
    return bound;
  }
  return Object.assign(
    bound,
    Object.fromEntries(
      Object.entries(props).map(([key, value]) => {
        if (typeof value !== 'function') {
          return [key, value];
        }
        return [key, value.bind(self)];
      }),
    ),
  );
}

export function pick<V, K extends keyof V & string>(
  value: V,
  ...keys: K[]
): Pick<V, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => keys.includes(key as any)),
  ) as any;
}

export function omit<V, K extends keyof V & string>(
  value: V,
  ...keys: K[]
): Omit<V, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as any)),
  ) as any;
}

type Func = (..._: any[]) => any;

type FirstArg<Fn extends Func> =
  Parameters<Fn> extends [infer FirstArg, ...infer _] ? FirstArg : never;

type OmitFirst<Fn extends Func> =
  Parameters<Fn> extends [infer _, ...infer Rest] ? Rest : never;

export type SplitFirst<Fn extends Func> = (
  arg: FirstArg<Fn>,
) => (...args: OmitFirst<Fn>) => ReturnType<Fn>;

export function curryFirst<Fn extends Func>(fn: Fn): SplitFirst<Fn> {
  return ((first: any) =>
    (...rest: any[]) =>
      fn(first, ...rest)) as SplitFirst<Fn>;
}
