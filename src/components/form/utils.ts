import { Form, FormInstance } from 'antd';
import { NamePath } from 'antd/lib/form/interface';
import { FieldContext } from 'rc-field-form';
import { useCallback, useContext, useEffect, useMemo } from 'react';

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
      const r = await api.query(s.substring(0, i));
      if (r.recordType !== RecordType.Account) {
        return false;
      }
      return resolveAuthorities(api, r.account);

    case AccountType.LiteTokenAccount:
      return [new AuthorityEntry({ url: account.url.authority })];
    case AccountType.LiteIdentity:
      return [new AuthorityEntry({ url: account.url })];
    default:
      return false;
  }
}

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

type FieldData = Omit<Parameters<FormInstance['setFields']>[0][0], 'name'>;

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

    // Workaround for https://github.com/ant-design/ant-design/issues/23782
    if ('value' in data) {
      (form as any).getInternalHooks('RC_FORM_INTERNAL_HOOKS').dispatch({
        type: 'updateValue',
        namePath: [name],
        value: data.value,
      });
    }
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
  dependencies?: any[],
  debounceTime?: number,
);
export function useFormWatchEffect<F, K extends Array<keyof F>>(
  form: FormInstance<F>,
  key: K,
  effect: (
    value: Pick<F, K[number]>,
    mounted: () => boolean,
  ) => void | Promise<void>,
  dependencies?: any[],
  debounceTime?: number,
);
export function useFormWatchEffect<F, K extends keyof F | Array<keyof F>>(
  form: FormInstance<F>,
  key: K,
  effect: (value: unknown, mounted: () => boolean) => void | Promise<void>,
  dependencies: any[] = [],
  debounceTime = 200,
) {
  effect = debounce(effect, debounceTime);
  const value =
    key instanceof Array
      ? Object.fromEntries(key.map((x) => [x, Form.useWatch(x, form)]))
      : Form.useWatch(key, form);
  useEffect(() => {
    let mounted = true;
    effect(value, () => mounted); // May be async
    return () => {
      mounted = false;
    };
  }, [value, ...dependencies]);
}

export function useFormWatchMemo<F, K extends keyof F, V>(
  form: FormInstance<F>,
  key: K,
  factory: (value: F[K]) => V,
  dependencies: any[] = [],
) {
  const value = Form.useWatch(key, form);
  return useMemo(() => factory(value), [value, ...dependencies]);
}
