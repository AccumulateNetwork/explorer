import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Radio } from 'antd';
import { Base64 } from 'js-base64';
import SyntaxHighlighter from 'react-syntax-highlighter';

const { Text } = Typography;
const { TabPane } = Tabs;

const Content = (props) => {
  const textHex = props.children;
  const textRaw = Buffer.from(props.children, 'hex').toString('utf8');
  const textBase64 = Base64.encode(Buffer.from(props.children, 'hex'));

  const defaultType = 'ASCII';
  const [type, setType] = useState('defaultType');
  const [jsonDisabled, setJSONDisabled] = useState(true);

  function IsJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  const handleChange = (event) => {
    setType(event.target.value);
  };

  const init = () => {
    if (IsJsonString(textRaw)) {
      setJSONDisabled(false);
      setType('JSON');
    } else {
      setType('ASCII');
    }
  };

  const renderTabBar = () => {
    return null;
  };

  useEffect(() => init(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Radio.Group
        defaultValue={defaultType}
        value={type}
        buttonStyle="solid"
        className="type-radio"
        onChange={handleChange}
      >
        <Radio.Button value="ASCII" className="type-ASCII">
          ASCII
        </Radio.Button>
        <Radio.Button
          value="JSON"
          className="type-JSON"
          disabled={jsonDisabled}
        >
          JSON
        </Radio.Button>
        <Radio.Button value="Base64" className="type-Base64">
          Base64
        </Radio.Button>
        <Radio.Button value="Hex" className="type-Hex">
          Hex
        </Radio.Button>
      </Radio.Group>

      <Tabs
        defaultActiveKey={defaultType}
        activeKey={type}
        className="entry-content"
        renderTabBar={renderTabBar}
        style={{ marginTop: 15 }}
      >
        <TabPane key="ASCII">
          <div className="content break-all">
            <Text copyable>{textRaw}</Text>
          </div>
        </TabPane>
        <TabPane key="JSON">
          {!jsonDisabled ? (
            <SyntaxHighlighter language="json">
              {JSON.stringify(JSON.parse(textRaw), null, 4)}
            </SyntaxHighlighter>
          ) : null}
        </TabPane>
        <TabPane key="Base64">
          <div className="content code break-all">
            <Text copyable>{textBase64}</Text>
          </div>
        </TabPane>
        <TabPane key="Hex">
          <div className="content code break-all">
            <Text copyable>{textHex}</Text>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Content;
