import React, { useState } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert,
  Switch
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine
} from 'react-icons/ri';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import tooltipDescs from '../../common/TooltipDescriptions';
import TxStatus from '../../common/TxStatus';
import TxSendTokens from '../../common/TxSendTokens';

const { Title, Text } = Typography;

const GenericTx = props => {

    const tx = props.data;
    const [rawDataDisplay, setRawDataDisplay] = useState('none');

    const toggleRawData = (checked) => {
        checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
    };

    return (
        <div>

            <TxStatus data={tx} />

            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
                </IconContext.Provider>
                Transaction Type
            </Title>
            <Descriptions bordered column={1} size="middle">

            {tx.type ? (
                <Descriptions.Item label="Type">
                    {tx.type}
                </Descriptions.Item>
            ) :
                null
            }

            </Descriptions>
            
            {tx ? (
                <div>
                <Title level={4}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                  </IconContext.Provider>
                  Transaction Info
                </Title>
                <Descriptions bordered column={1} size="middle">

                    {tx.txid ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txId}><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                            <Text copyable>{tx.txid}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.transactionHash ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txHash}><RiQuestionLine /></Tooltip></IconContext.Provider>TxHash</nobr></span>}>
                            <Text copyable>{tx.transactionHash}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.sponsor ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.sponsor}><RiQuestionLine /></Tooltip></IconContext.Provider>Sponsor</nobr></span>}>
                            <Link to={'/acc/' + tx.sponsor.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.sponsor}</Link>
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
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" style={{ marginTop: -5, marginLeft: 10 }} disabled={tx ? false : true} onChange={toggleRawData} />
                </Title>

                {tx ? (
                    <div className="entry-content" style={{marginTop: 0, display: rawDataDisplay}}>
                        <SyntaxHighlighter style={colorBrewer} language="json">{JSON.stringify(tx, null, 4)}</SyntaxHighlighter>
                    </div>
                ) : 
                    <Alert message="No tx data" type="warning" showIcon />
                }

                </div>
            ) :
                null
            }
        </div>
    );
}

export default GenericTx;
