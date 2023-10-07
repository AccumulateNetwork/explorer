import React, { useState } from 'react';
import { Select, Input, Typography } from 'antd';
import { Base64 } from 'js-base64';
import wrapLinksInHtml from '../common/LinksRenderer';

const { Option } = Select;
const { Text } = Typography;

const Data = props => {
  
  const textHex = props.children;
  const textRaw = wrapLinksInHtml(Buffer.from(props.children, 'hex').toString('utf8'));
  const textBase64 = Base64.encode(Buffer.from(props.children, 'hex'));

  const defaultType = "ASCII";
  const [type, setType] = useState(defaultType);
  const [current, setCurrent] = useState(textRaw);

  const handleChange = event => {
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

  return (
    <Input.Group compact className={"extid extid-"+type}>
      <Select defaultValue={defaultType} className="extid-type" onChange={handleChange}>
        <Option value="ASCII">ASCII</Option>
        <Option value="Base64">Base64</Option>
        <Option value="Hex">Hex</Option>
      </Select>
      {current ?
        <div className="span ant-typography" dangerouslySetInnerHTML={{ __html: current }} />
      : 
        <Text className="extid-empty" disabled>Empty</Text>
      }
    </Input.Group>
  );

};

export default Data;