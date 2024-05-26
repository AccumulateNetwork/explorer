import React from 'react';

export function useAsyncEffect<V>(
  effect: (isMounted: () => boolean) => V | Promise<V>,
  inputs?: any[],
) {
  React.useEffect(function () {
    var mounted = true;
    var maybePromise = effect(function () {
      return mounted;
    });

    Promise.resolve(maybePromise).catch((error) => console.error(error));

    return function () {
      mounted = false;
    };
  }, inputs);
}
