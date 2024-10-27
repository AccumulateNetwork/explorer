import { useEffect, useState } from 'react';

export function useAsyncEffect<V>(
  effect: (
    isMounted: () => boolean,
    onDismount: (_: () => void) => void,
  ) => V | Promise<V>,
  inputs: any[],
) {
  let resolve: () => void;
  let reject: (_?: any) => void;
  let promise = new Promise<void>((r, j) => ((resolve = r), (reject = j)));

  useEffect(function () {
    let mounted = true;
    const onDismount: (() => void)[] = [];

    (async () => {
      try {
        await effect(
          () => mounted,
          (fn) => onDismount.push(fn),
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    })();

    return function () {
      mounted = false;
      onDismount.forEach((x) => x());
    };
  }, inputs);

  return promise;
}

export function useAsyncState<V>(
  effect: () => Promise<V>,
  dependencies: any[],
  initial?: V,
) {
  const [value, setValue] = useState<V>(initial);

  useAsyncEffect(async (mounted) => {
    const v = await effect();
    if (!mounted()) {
      return;
    }
    setValue(v);
  }, dependencies);

  return [value];
}
