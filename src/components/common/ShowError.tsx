import { Alert } from 'antd';
import React from 'react';

export function ShowError({
  error,
  onClose,
}: {
  error: any;
  onClose?: () => any;
}) {
  if (!error) {
    return false;
  }

  return (
    <Alert
      type="error"
      showIcon
      message={
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : `${error}`
      }
      closable={!!onClose}
      onClose={onClose}
    />
  );
}
