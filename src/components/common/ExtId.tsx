import { Input, Select, Typography } from 'antd';
import { Base64 } from 'js-base64';
import React, { useEffect, useState } from 'react';

import wrapLinksInHtml from './LinksRenderer';

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

const ExtId = (props: { children: string | Uint8Array; compact?: boolean }) => {
  const bytes =
    props.children instanceof Uint8Array
      ? props.children
      : Buffer.from(props.children, 'hex');
  const textHex = bytes.toString('hex');
  const textRaw = wrapLinksInHtml(bytes.toString('utf8'));
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
  const [current, setCurrent] = useState('');
  const [currentShort, setCurrentShort] = useState('');

  useEffect(() => {
    switch (type) {
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
  }, [type]);

  const shortLimit = 32;
  useEffect(() => {
    setCurrentShort(
      current.length > shortLimit
        ? current.substring(0, shortLimit) + '…'
        : current,
    );
  }, [current]);

  let cssClass = props.compact ? 'extid-compact' : '';

  const handleChange = (event) => {
    setType(event);
  };

  const handleClick = (type) => {
    switch (type) {
      case 'ASCII':
        setType('Base64');
        break;
      case 'Base64':
        setType('Hex');
        break;
      case 'Hex':
        setType('ASCII');
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
