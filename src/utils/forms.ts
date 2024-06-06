import { useCallback } from 'react';

export function debounce<I extends Array<any>>(
  cb: (..._: I) => void,
  time: number,
): (..._: I) => void {
  let id;
  return useCallback((...args) => {
    clearTimeout(id);
    id = setTimeout(() => cb(...args), time);
  }, []);
}
