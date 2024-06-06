import { Form, FormItemProps, Input, Select, SelectProps } from 'antd';
import { BaseOptionType } from 'antd/lib/select';
import React, { useEffect, useState } from 'react';

import { URL, URLArgs, errors } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  Account,
  KeyPage,
  LiteDataAccount,
  LiteIdentity,
  LiteTokenAccount,
  TokenAccount,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { debounce } from '../../utils/forms';
import { Ctor, isRecordOf } from '../../utils/types';
import { isLite } from '../../utils/url';
import { unwrapError } from '../common/ShowError';
import { queryEffect } from '../common/query';
import { useWeb3 } from './useWeb3';

interface InputAccountProps
  extends Omit<FormItemProps, 'children' | 'onChange'> {
  allowMissingLite?: boolean;
  readOnly?: boolean;
  initialValue?: URLArgs;
}

export const InputTokenAccount = newFor(LiteTokenAccount, TokenAccount);
export const InputCreditRecipient = newFor(LiteIdentity, KeyPage);

function newFor<C extends Array<Ctor<Account>>>(...types: C) {
  return ({
    name,
    allowMissingLite,
    initialValue,
    readOnly,
    ...props
  }: InputAccountProps) => {
    const web3 = useWeb3();
    const form = Form.useFormInstance();
    const [url, setURL] = useState<string>();

    useEffect(() => {
      setURL(initialValue && `${initialValue}`);
    }, [initialValue]);

    const setError = (error: any) => {
      error = unwrapError(error) || `An unknown error occurred`;
      form.setFields([{ name, errors: [error] }]);
    };

    const handleError = (e: errors.Error) => {
      if (e.code !== Status.NotFound) {
        setError(e);
        return;
      }

      if (!allowMissingLite || !isLite(url)) {
        setError(`${url} does not exist`);
        return;
      }

      if (types.includes(LiteIdentity)) {
        const value = new LiteIdentity({ url });
        form.setFields([{ name, value, errors: [] }]);
        return;
      }

      if (types.includes(LiteTokenAccount)) {
        const tokenUrl = URL.parse(url).path.replace(/^\//, '');
        const value = new LiteTokenAccount({ url, tokenUrl });
        form.setFields([{ name, value, errors: [] }]);
        return;
      }

      if (types.includes(LiteDataAccount)) {
        const value = new LiteDataAccount({ url });
        form.setFields([{ name, value, errors: [] }]);
        return;
      }

      setError(`${url} does not exist`);
      return;
    };

    queryEffect(url).then((r) => {
      if (r.recordType == RecordType.Error) {
        handleError(r.value);
        return;
      }

      if (!isRecordOf(r, ...(types as any))) {
        setError(`${url} is not a token account`);
        return;
      }

      const value = r.account;
      form.setFields([{ name, value, errors: [] }]);
    });

    const [baseOpts, setBaseOpts] = useState<BaseOptionType[]>();
    const [allOpts, setAllOpts] = useState<BaseOptionType[]>();
    useEffect(() => {
      const opts = (web3?.linked?.all || [])
        .filter((x) => types.some((y) => x instanceof y))
        .map((x) => ({ label: `${x.url}`, value: `${x.url}` }));
      setBaseOpts(opts);
      setAllOpts(opts);
    }, [web3?.linked?.all]);

    const slowValueChange = debounce(setURL, 300);
    return (
      <>
        <Form.Item
          {...props}
          name={name}
          initialValue={initialValue && `${initialValue}`}
          normalize={(value) => {
            if (typeof value === 'string') {
              return { url: value };
            }
            return value;
          }}
          getValueProps={(value) => {
            if (value && typeof value === 'object') {
              value = `${value.url}`;
            }
            return { value };
          }}
        >
          {readOnly ? (
            <Input
              value={initialValue && `${initialValue}`}
              readOnly={readOnly}
              style={{
                backgroundColor: 'hsla(0, 0%, 0%, 0.04)',
                cursor: 'not-allowed',
              }}
              onChange={(e) => slowValueChange(e.target.value)}
            />
          ) : !baseOpts?.length ? (
            <Input
              readOnly={readOnly}
              onChange={(e) => slowValueChange(e.target.value)}
            />
          ) : (
            <Select
              showSearch
              options={allOpts}
              filterOption={(s, opt) => opt.value.toString().includes(s)}
              onSearch={(s) =>
                setAllOpts([{ label: s, value: s }, ...baseOpts])
              }
              onSelect={setURL}
            />
          )}
        </Form.Item>
      </>
    );
  };
}
