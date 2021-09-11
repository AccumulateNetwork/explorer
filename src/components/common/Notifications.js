import React from 'react';
import { message } from 'antd';

export function NotifyNetworkError() {
  message.error('Accumulate API is unavailable');

  return <NotifyNetworkError />;
}