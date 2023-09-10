import React, { useState } from 'react';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert,
  Switch
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const GenericMsg = (props) => {
    const { message } = props.data;
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
                Message Type
            </Title>
            <Descriptions bordered column={1} size="middle">

            {message.type ? (
                <Descriptions.Item label="Type">
                    {message.type}
                </Descriptions.Item>
            ) :
                null
            }

            </Descriptions>
            
            {props.data ? (
                <div>
                <Title level={4}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                  </IconContext.Provider>
                  Message Data
                </Title>
                <Descriptions bordered column={1} size="middle">

                    {props.data.id ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.acctUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Message ID</nobr></span>}>
                            <span>{props.data.id}</span>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>

                <Title level={4}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                  </IconContext.Provider>
                  Raw Data
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" style={{ marginTop: -5, marginLeft: 10 }} disabled={message ? false : true} onChange={toggleRawData} />
                </Title>

                {message ? (
                    <div className="entry-content" style={{marginTop: 0, display: rawDataDisplay}}>
                        <SyntaxHighlighter style={colorBrewer} language="json">{JSON.stringify(message, null, 4)}</SyntaxHighlighter>
                    </div>
                ) : 
                    <Alert message="No message data" type="warning" showIcon />
                }

                </div>
            ) :
                null
            }
        </div>
    );
}

export default GenericMsg;
