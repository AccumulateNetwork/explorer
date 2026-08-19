import { Switch } from 'antd';
import React from 'react';

import { Json } from './Json';

export function RawData({
  data,
  style,
}: {
  data: any;
  style?: React.CSSProperties;
}) {
  return (
    <div className="entry-content" style={style}>
      <Json>{JSON.stringify(data, null, 4)}</Json>
    </div>
  );
}

RawData.Toggle = function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      checkedChildren="ON"
      unCheckedChildren="OFF"
      checked={value}
      style={{ marginTop: -5, marginLeft: 10 }}
      disabled={disabled}
      onChange={(v) => onChange(v)}
    />
  );
};
