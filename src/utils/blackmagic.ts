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
