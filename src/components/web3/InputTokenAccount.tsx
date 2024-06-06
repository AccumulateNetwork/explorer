import { Form, FormItemProps, Input } from 'antd';
import React, { useState } from 'react';

import { URL, URLArgs, errors } from 'accumulate.js';
import { RecordType } from 'accumulate.js/lib/api_v3';
import { LiteTokenAccount, TokenAccount } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { debounce } from '../../utils/forms';
import { isRecordOf } from '../../utils/types';
import { isLite } from '../../utils/url';
import { unwrapError } from '../common/ShowError';
import { queryEffect } from '../common/query';

export function InputTokenAccount({
  name,
  allowMissingLite,
  initialValue,
  readOnly,
  ...props
}: Omit<FormItemProps, 'children' | 'onChange'> & {
  allowMissingLite?: boolean;
  readOnly?: boolean;
  initialValue?: URLArgs;
}) {
  const form = Form.useFormInstance();
  const [url, setURL] = useState<string>(initialValue && `${initialValue}`);

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

    const u = URL.parse(url);
    const tokenUrl = u.path.replace(/^\//, '');
    const value = new LiteTokenAccount({ url, tokenUrl });
    form.setFields([{ name, value, errors: [] }]);
  };

  queryEffect(url).then((r) => {
    if (r.recordType == RecordType.Error) {
      handleError(r.value);
      return;
    }

    if (!isRecordOf(r, TokenAccount, LiteTokenAccount)) {
      setError(`${url} is not a token account`);
      return;
    }

    const value = r.account;
    form.setFields([{ name, value, errors: [] }]);
  });

  const onValueChange = debounce(setURL, 300);

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
        <Input
          readOnly={readOnly}
          onChange={(e) => onValueChange(e.target.value)}
        />
      </Form.Item>
    </>
  );
}
