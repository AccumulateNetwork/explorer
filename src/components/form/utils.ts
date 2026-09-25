import { Form, FormInstance } from 'antd';
import { NamePath } from 'antd/lib/form/interface';
import { FieldContext } from 'rc-field-form';
import type {
  InternalFormInstance,
  InternalNamePath,
} from 'rc-field-form/lib/interface';
import {
  DependencyList,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { JsonRpcClient, RecordType } from 'accumulate.js/lib/api_v3';
import {
  Account,
  AccountType,
  AuthorityEntry,
  KeyPage,
  KeySpec,
  LiteIdentity,
} from 'accumulate.js/lib/core';

import { SplitFirst, curryFirst } from '../../utils/typemagic';
import { unwrapError } from '../common/ShowError';
import { Context } from '../web3/Context';

export interface SignerSpec {
  signer: KeyPage | LiteIdentity;
  entry: KeySpec;
}

export async function getSigners(
  api: JsonRpcClient,
  web3: Context,
  account: Account,
): Promise<SignerSpec[]> {
  const authorities = await resolveAuthorities(api, account);
  if (!authorities) {
    return;
  }

  const ethKeyHash = web3.publicKey.ethereum.replace(/^0x/, '').toLowerCase();
  return [
    ...(authorities.some(({ url }) => web3?.liteIdentity?.url.equals(url))
      ? [
          {
            signer: web3.liteIdentity,
            entry: new KeySpec({ publicKeyHash: ethKeyHash }),
          },
        ]
      : []),
    ...(web3?.linked?.books || [])
      .filter(({ book }) => authorities.some(({ url }) => book.url.equals(url)))
      .flatMap(({ pages }) => pages)
      .flatMap((page) =>
        page.keys.flatMap((entry) => ({ signer: page, entry })),
      )
      .filter(
        ({ entry }) =>
          Buffer.from(entry.publicKeyHash).toString('hex') === ethKeyHash,
      ),
  ];
}

async function resolveAuthorities(api: JsonRpcClient, account: Account) {
  const s = account.url.toString().replace(/^acc:\/\//, '');
  const i = s.lastIndexOf('/');
  switch (account.type) {
    case AccountType.KeyPage:
      return [
        new AuthorityEntry({
          url: s.substring(0, i),
        }),
      ];

    case AccountType.Identity:
    case AccountType.TokenIssuer:
    case AccountType.TokenAccount:
    case AccountType.KeyBook:
    case AccountType.DataAccount:
      if (account.authorities?.length) {
        return account.authorities;
      }
      if (i < 0) {
        return false;
      }
      {
        const r = await api.query(s.substring(0, i));
        if (r.recordType !== RecordType.Account) {
          return false;
        }
        return resolveAuthorities(api, r.account);
      }

    case AccountType.LiteTokenAccount:
      return [new AuthorityEntry({ url: account.url.authority })];
    case AccountType.LiteIdentity:
      return [new AuthorityEntry({ url: account.url })];
    default:
      return false;
  }
}

/**
 * Returns a stable function that calls the latest `cb` once calls have stopped
 * for `time` ms. The timer and the callback live in refs: the returned
 * function's identity never changes (callers pass it to effects and inputs),
 * but when the timer fires it calls the callback from the most recent render,
 * not the first one — otherwise a debounced effect would act on the state it
 * saw at mount.
 */
export function useDebounce<I extends unknown[]>(
  cb: (..._: I) => void | Promise<void>,
  time: number,
): (..._: I) => void | Promise<void> {
  const id = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(cb);
  latest.current = cb;
  return useCallback(
    (...args: I) => {
      clearTimeout(id.current);
      id.current = setTimeout(() => latest.current(...args), time);
    },
    [time],
  );
}

type FieldData = Omit<Parameters<FormInstance['setFields']>[0][0], 'name'>;

interface FormUtils<Fields> {
  set(name: NamePath<Fields>, data: FieldData): void;
  setError(field: NamePath<Fields>, error: unknown): void;
  clearError(field: NamePath<Fields>): void;
  setValidating(field: NamePath<Fields>, validating: boolean): void;
}

export function useFormUtils<Fields>(
  form: FormInstance<Fields>,
): FormUtils<Fields>;

export function useFormUtils<Fields>(
  form: FormInstance<Fields>,
  field: keyof Fields | NamePath<Fields>,
): {
  [P in keyof FormUtils<Fields>]: ReturnType<SplitFirst<FormUtils<Fields>[P]>>;
};

export function useFormUtils<Fields>(
  form: FormInstance<Fields>,
  name?: NamePath<Fields>,
) {
  const { prefixName } = useContext(FieldContext);
  const set = (name: NamePath<Fields>, data: FieldData) => {
    if (prefixName) {
      name = [...prefixName, name] as NamePath<Fields>;
    }
    form.setFields([{ name, ...data }]);

    // Workaround for https://github.com/ant-design/ant-design/issues/23782
    if ('value' in data) {
      // antd's FormInstance type hides rc-field-form's internal hooks, but the
      // object is an rc-field-form instance at runtime.
      (form as unknown as InternalFormInstance)
        .getInternalHooks('RC_FORM_INTERNAL_HOOKS')
        .dispatch({
          type: 'updateValue',
          namePath: [name] as InternalNamePath,
          value: data.value,
        });
    }
  };

  const setError = (name: NamePath<Fields>, error: unknown) => {
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
  key: K | K[],
  effect: (value: F[K], mounted: () => boolean) => void | Promise<void>,
  dependencies: DependencyList = [],
  debounceTime = 200,
) {
  const debounced = useDebounce(effect, debounceTime);
  const value = Form.useWatch(key, form);
  useEffect(
    () => {
      let mounted = true;
      debounced(value, () => mounted); // May be async
      return () => {
        mounted = false;
      };
    },
    // `debounced` is stable and always calls the latest `effect`. The
    // caller's `dependencies` are spread in exactly as useEffect's own deps
    // would be — this hook forwards them, so they cannot be listed statically.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied dependency list
    [value, debounced, ...dependencies],
  );
}

export function useFormWatchMemo<F, K extends keyof F, V>(
  form: FormInstance<F>,
  key: K,
  factory: (value: F[K]) => V,
  dependencies: DependencyList = [],
) {
  const value = Form.useWatch(key, form);
  return useMemo(
    () => factory(value),
    // `factory` is an inline function (new every render); like useMemo, this
    // hook recomputes only when `value` or the caller's `dependencies` change,
    // and the caller is responsible for listing what `factory` closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied dependency list
    [value, ...dependencies],
  );
}
