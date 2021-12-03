import React from 'react';

import {
  Typography,
  Descriptions,
  Tooltip,
  List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiLinksLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const SynthCreateChainTx = props => {

    const tx = props.data;

    return (
        <div>

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
                            <span className="code">{tx.txid}</span>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {(tx.data && tx.data.cause) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txCause}><RiQuestionLine /></Tooltip></IconContext.Provider>Cause</nobr></span>}>
                            {tx.data.cause}
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>

                <Title level={4}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiLinksLine />
                    </IconContext.Provider>
                    Chains
                </Title>

                {(tx.data && tx.data.chains) ? (
                    <List
                        size="small"
                        bordered
                        dataSource={tx.data.chains}
                        renderItem={item => <List.Item>{item.data}</List.Item>}
                    />
                ) :
                    <Paragraph><Text type="secondary">No chains</Text></Paragraph>
                }
                
            </div>
            ) :
                null
            }
        </div>
    );
}

export default SynthCreateChainTx;
