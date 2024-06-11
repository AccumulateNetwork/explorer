import { useEffect } from 'react';

export function useAsyncEffect<V>(
  effect: (isMounted: () => boolean) => V | Promise<V>,
  inputs: any[],
) {
  let resolve: () => void;
  let reject: (_?: any) => void;
  let promise = new Promise<void>((r, j) => ((resolve = r), (reject = j)));

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
  }, inputs);

  return promise;
}
