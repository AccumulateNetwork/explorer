import { DependencyList, useEffect, useState } from 'react';

export function useAsyncEffect<V>(
  effect: (isMounted: () => boolean) => V | Promise<V>,
  inputs: DependencyList,
) {
  let resolve: () => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<void>((r, j) => ((resolve = r), (reject = j)));

  useEffect(function () {
    let mounted = true;

    (async () => {
      try {
        await effect(() => mounted);
        resolve();
      } catch (error) {
        reject(error);
      }
    })();

    return function () {
      mounted = false;
    };
    // This is a useEffect wrapper: `inputs` is the caller's dependency list and
    // plays exactly the role useEffect's does. `effect` is an inline function
    // (new every render) and resolve/reject belong to this render's promise, so
    // listing them would re-run the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied dependency list
  }, inputs);

  return promise;
}

export function useAsyncState<V>(
  effect: () => Promise<V>,
  dependencies: DependencyList,
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
