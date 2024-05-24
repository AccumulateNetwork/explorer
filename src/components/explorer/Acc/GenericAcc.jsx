import { Alert, Descriptions, Switch, Tooltip, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine, RiQuestionLine } from 'react-icons/ri';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const GenericAcc = (props) => {
  const account = props.data;
  const [rawDataDisplay, setRawDataDisplay] = useState('none');

  const toggleRawData = (checked) => {
    checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
  };

  return (
    <div>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Account Type
      </Title>
      <Descriptions bordered column={1} size="middle">
        {account.type ? (
          <Descriptions.Item label="Type">{account.type}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {account.data ? (
        <div>
          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Account Data
          </Title>
          <Descriptions bordered column={1} size="middle">
            {account.data.url ? (
              <Descriptions.Item
                label={
                  <span>
                    <nobr>
                      <IconContext.Provider
                        value={{ className: 'react-icons' }}
                      >
                        <Tooltip
                          overlayClassName="explorer-tooltip"
                          title={tooltipDescs.acctUrl}
                        >
                          <RiQuestionLine />
                        </Tooltip>
                      </IconContext.Provider>
                      Account URL
                    </nobr>
                  </span>
                }
              >
                <span>{account.data.url}</span>
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Title level={4}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <Switch
              checkedChildren="ON"
              unCheckedChildren="OFF"
              style={{ marginTop: -5, marginLeft: 10 }}
              disabled={account ? false : true}
              onChange={toggleRawData}
            />
          </Title>

          {account ? (
            <div
              className="entry-content"
              style={{ marginTop: 0, display: rawDataDisplay }}
            >
              <SyntaxHighlighter style={colorBrewer} language="json">
                {JSON.stringify(account, null, 4)}
              </SyntaxHighlighter>
            </div>
          ) : (
            <Alert message="No account data" type="warning" showIcon />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GenericAcc;
