import { Form, FormItemProps, Input, Select, Space } from 'antd';
import { BaseOptionType } from 'antd/lib/select';
import React, { useEffect, useState } from 'react';

import { URL, URLArgs, errors } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import {
  ADI,
  Account,
  KeyBook,
  KeyPage,
  LiteDataAccount,
  LiteIdentity,
  LiteTokenAccount,
  TokenAccount,
} from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { omit } from '../../utils/typemagic';
import { Ctor, isRecordOf } from '../../utils/types';
import { isLite } from '../../utils/url';
import { queryEffect } from '../common/query';
import { useWeb3 } from '../web3/Context';
import { debounce, formUtils } from './utils';

interface InputAccountProps
  extends Omit<FormItemProps, 'children' | 'onChange'> {
  allowMissingLite?: boolean;
  readOnly?: boolean;
  initialValue?: URLArgs;
  after?: React.ReactNode;
  placeholder?: string;
}

export const InputIdentity = newFor(ADI);
export const InputTokenAccount = newFor(LiteTokenAccount, TokenAccount);
export const InputCreditRecipient = newFor(LiteIdentity, KeyPage);
export const InputAuthority = newFor(KeyBook);

function newFor<C extends Array<Ctor<Account>>>(...types: C) {
  return ({
    allowMissingLite,
    initialValue,
    readOnly,
    after,
    placeholder,
    ...props
  }: InputAccountProps) => {
    const web3 = useWeb3();
    const form = Form.useFormInstance();
    const [url, setURL] = useState<string>();
    const { set, setError } = formUtils(form, props.name);

    useEffect(() => {
      setURL(initialValue && `${initialValue}`);
    }, [initialValue]);

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
        set({ value, errors: [] });
        return;
      }

      if (types.includes(LiteTokenAccount)) {
        const tokenUrl = URL.parse(url).path.replace(/^\//, '');
        const value = new LiteTokenAccount({ url, tokenUrl });
        set({ value, errors: [] });
        return;
      }

      if (types.includes(LiteDataAccount)) {
        const value = new LiteDataAccount({ url });
        set({ value, errors: [] });
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
        // TODO: Fix this error message
        setError(`${url} is not a token account`);
        return;
      }

      const value = r.account;
      set({ value, errors: [] });
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

    const input = readOnly ? (
      <Input
        value={initialValue && `${initialValue}`}
        readOnly={readOnly}
        onChange={(e) => slowValueChange(e.target.value)}
        placeholder={placeholder}
        style={after ? null : props.style}
      />
    ) : !baseOpts?.length ? (
      <Input
        readOnly={readOnly}
        onChange={(e) => slowValueChange(e.target.value)}
        placeholder={placeholder}
        style={after ? null : props.style}
      />
    ) : (
      <Select
        showSearch
        options={allOpts}
        filterOption={(s, opt) => opt.value.toString().includes(s)}
        placeholder={placeholder}
        onSearch={(s) => setAllOpts([{ label: s, value: s }, ...baseOpts])}
        onSelect={setURL}
        style={after ? null : props.style}
      />
    );

    const slowValueChange = debounce(setURL, 200);
    return (
      <Form.Item
        {...omit(props, 'style')}
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
        {after ? (
          <Space.Compact block style={props.style}>
            {input}
            {after}
          </Space.Compact>
        ) : (
          input
        )}
      </Form.Item>
    );
  };
}
