import { Form, FormInstance } from 'antd';
import { NamePath } from 'antd/lib/form/interface';
import { FieldContext } from 'rc-field-form';
import { useCallback, useContext, useEffect, useMemo } from 'react';

import { SplitFirst, curryFirst } from '../../utils/typemagic';
import { unwrapError } from '../common/ShowError';

type FieldData = Omit<Parameters<FormInstance['setFields']>[0][0], 'name'>;

export function debounce<I extends Array<any>>(
  cb: (..._: I) => void | Promise<void>,
  time: number,
): (..._: I) => void | Promise<void> {
  let id;
  return useCallback((...args) => {
    clearTimeout(id);
    id = setTimeout(() => cb(...args), time);
  }, []);
}

interface FormUtils<Fields> {
  set(name: NamePath<Fields>, data: FieldData): void;
  setError(field: NamePath<Fields>, error: any): void;
  clearError(field: NamePath<Fields>): void;
  setValidating(field: NamePath<Fields>, validating: boolean): void;
}

export function formUtils<Fields>(
  form: FormInstance<Fields>,
): FormUtils<Fields>;

export function formUtils<Fields>(
  form: FormInstance<Fields>,
  field: keyof Fields | NamePath<Fields>,
): {
  [P in keyof FormUtils<Fields>]: ReturnType<SplitFirst<FormUtils<Fields>[P]>>;
};

export function formUtils<Fields>(
  form: FormInstance<Fields>,
  name?: NamePath<Fields>,
) {
  const { prefixName } = useContext(FieldContext);
  const set = (name: NamePath<Fields>, data: FieldData) => {
    if (prefixName) {
      name = [...prefixName, name] as NamePath<Fields>;
    }
    form.setFields([{ name, ...data }]);
  };

  const setError = (name: NamePath<Fields>, error: any) => {
    set(name, { errors: [unwrapError(error) || `An unknown error occurred`] });
  };

  const clearError = (name: NamePath<Fields>) => {
    set(name, { errors: [] });
  };

  const setValidating = (name: NamePath<Fields>, validating: boolean) => {
    set(name, { validating });
  };

  if (arguments.length == 1) {
    return { set, setError, clearError, setValidating };
  }
  return {
    set: curryFirst(set)(name),
    setError: curryFirst(setError)(name),
    clearError: curryFirst(clearError)(name),
    setValidating: curryFirst(setValidating)(name),
  };
}

export function useFormWatchEffect<F, K extends keyof F>(
  form: FormInstance<F>,
  key: K,
  effect: (value: F[K], mounted: () => boolean) => void | Promise<void>,
  debounceTime = 200,
) {
  effect = debounce(effect, debounceTime);
  const value = Form.useWatch(key, form);
  useEffect(() => {
    let mounted = true;
    effect(value, () => mounted); // May be async
    return () => {
      mounted = false;
    };
  }, [value]);
}

export function useFormWatchMemo<F, K extends keyof F, V>(
  form: FormInstance<F>,
  key: K,
  factory: (value: F[K]) => V,
) {
  const value = Form.useWatch(key, form);
  return useMemo(() => factory(value), [value]);
}
