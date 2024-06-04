import { Alert } from 'antd';
import React from 'react';

export function unwrapError(error: any) {
  for (;;) {
    if (typeof error !== 'object') {
      return `${error}`;
    }
    if ('message' in error && error.message) {
      return `${error.message}`;
    }
    if ('cause' in error && error.cause) {
      error = error.cause;
      continue;
    }
    return `${error}`;
  }
}

export function ShowError({
  error,
  onClose,
  bare,
}: {
  error: any;
  bare?: boolean;
  onClose?: () => any;
}) {
  if (!error) {
    return false;
  }

  const message = unwrapError(error);
  if (bare) {
    return message;
  }

  return (
    <Alert
      type="error"
      showIcon
      message={message}
      closable={!!onClose}
      onClose={onClose}
    />
  );
}
