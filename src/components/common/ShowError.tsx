import { Alert } from 'antd';
import React, { useEffect, useState } from 'react';

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

  const [message, setMessage] = useState<React.ReactNode>(null);
  useEffect(() => {
    for (;;) {
      if (typeof error !== 'object') {
        setMessage(`${error}`);
        return;
      }
      if ('message' in error && error.message) {
        setMessage(`${error.message}`);
        return;
      }
      if ('cause' in error && error.cause) {
        error = error.cause;
        continue;
      }
      setMessage(`${error}`);
      return;
    }
  }, [error]);

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
