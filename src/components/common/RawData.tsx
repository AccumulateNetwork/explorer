import { Switch } from 'antd';
import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export function RawData({
  data,
  style,
}: {
  data: any;
  style?: React.CSSProperties;
}) {
  return (
    <div className="entry-content" style={style}>
      <SyntaxHighlighter style={colorBrewer} language="json">
        {JSON.stringify(data, null, 4)}
      </SyntaxHighlighter>
    </div>
  );
}

RawData.Toggle = function ({
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
