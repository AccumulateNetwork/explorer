import { Input, Select, Typography } from 'antd';
import { Base64 } from 'js-base64';
import React, { useState } from 'react';

const { Option } = Select;
const { Text } = Typography;

const ExtId = (props) => {
  const textHex = props.children;
  const textRaw = Buffer.from(props.children, 'hex').toString('utf8');
  const textBase64 = Base64.encode(Buffer.from(props.children, 'hex'));

  const defaultType = 'ASCII';
  const [type, setType] = useState(defaultType);
  const [current, setCurrent] = useState(textRaw);
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

  const handleClick = (type, defaultType) => {
    if (defaultType === 'ASCII') {
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
    } else {
      switch (type) {
        case 'Base64':
          setType('Hex');
          setCurrentShort(
            textHex.length > 32 ? textHex.substring(0, 32) + '…' : textHex,
          );
          break;
        case 'Hex':
          setType('Base64');
          setCurrentShort(
            textBase64.length > 32
              ? textBase64.substring(0, 32) + '…'
              : textBase64,
          );
          break;
        default:
          break;
      }
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
        <Text
          className="extid-type"
          onClick={() => handleClick(type, defaultType)}
        >
          {type}
        </Text>
      )}
      {props.children.length > 0 ? (
        <Text
          className="extid-text"
          copyable={!props.compact ? 'copyable' : null}
        >
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
