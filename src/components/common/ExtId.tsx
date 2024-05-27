import { Input, Select, Typography } from 'antd';
import { Base64 } from 'js-base64';
import React, { useState } from 'react';

const { Option } = Select;
const { Text } = Typography;

function isWhitespace(x: number) {
  switch (x) {
    case 0x9:
    case 0xa:
    case 0xd:
    case 0x20:
      return true;
  }
  return false;
}

function isPrintable(x: number) {
  // Non-ASCII
  if (x > 0x7e) return false;

  // Regular characters
  if (x > 0x20) return true;

  // Whitespace
  return isWhitespace(x);
}

const ExtId = (props) => {
  const bytes = Buffer.from(props.children, 'hex');
  const textHex = props.children;
  const textRaw = bytes.toString('utf8');
  const textBase64 = Base64.fromUint8Array(bytes);

  // TODO: check for valid utf-8 strings
  let human = true;
  if (bytes.every(isWhitespace)) {
    human = false; // All whitespace
  } else if (!bytes.every(isPrintable)) {
    human = false; // Has non-printable characters
  }

  const defaultType = human ? 'ASCII' : 'Hex';
  const [type, setType] = useState(defaultType);
  const [current, setCurrent] = useState(human ? textRaw : textHex);
  const [currentShort, setCurrentShort] = useState(
    current.length > 32 ? current.substring(0, 32) + '…' : current,
  );

  let cssClass = props.compact ? 'extid-compact' : '';

  const handleChange = (event) => {
    setType(event);
    switch (event) {
      case 'Base64':
        setCurrent(textBase64);
        break;
      case 'ASCII':
        setCurrent(textRaw);
        break;
      case 'Hex':
        setCurrent(textHex);
        break;
      default:
        break;
    }
  };

  const handleClick = (type) => {
    switch (type) {
      case 'ASCII':
        setType('Base64');
        setCurrentShort(
          textBase64.length > 32
            ? textBase64.substring(0, 32) + '…'
            : textBase64,
        );
        break;
      case 'Base64':
        setType('Hex');
        setCurrentShort(
          textHex.length > 32 ? textHex.substring(0, 32) + '…' : textHex,
        );
        break;
      case 'Hex':
        setType('ASCII');
        setCurrentShort(
          textRaw.length > 32 ? textRaw.substring(0, 32) + '…' : textRaw,
        );
        break;
      default:
        break;
    }
  };

  return (
    <Input.Group compact className={'extid extid-' + type + ' ' + cssClass}>
      {!props.compact ? (
        <Select
          defaultValue={defaultType}
          className="extid-type"
          onChange={handleChange}
        >
          <Option value="ASCII">ASCII</Option>
          <Option value="Base64">Base64</Option>
          <Option value="Hex">Hex</Option>
        </Select>
      ) : (
        <Text className="extid-type" onClick={() => handleClick(type)}>
          {type}
        </Text>
      )}
      {props.children.length > 0 ? (
        <Text className="extid-text" copyable={!props.compact}>
          {!props.compact ? current : currentShort}
        </Text>
      ) : (
        <Text className="extid-text extid-empty" disabled>
          Empty
        </Text>
      )}
    </Input.Group>
  );
};

export default ExtId;
