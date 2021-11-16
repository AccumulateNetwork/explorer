import React, { useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography, Descriptions, Tooltip
  } from 'antd';

import { IconContext } from "react-icons";
import {
      RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine
} from 'react-icons/ri';

import FaucetAddress from './../../common/Faucet';
import tooltipDescs from './../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;
  
const TokenTransaction = props => {

    const render = (tx, token, isSynth) => {
        if (tx) {
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
                            {isSynth ? (
                                <div>
                                <span className="code">{tx.hash}</span>
                                <Paragraph className="inline-tip">Synthetic token deposit</Paragraph>
                                <Link to={'/tx/' + tx.txid} className="code"><IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{tx.txid}</Link>
                                <Paragraph className="inline-tip">Parent txid</Paragraph>
                                </div>
                            ) : 
                                <span className="code">{tx.txid}</span>
                            }
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.from ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txFrom}><RiQuestionLine /></Tooltip></IconContext.Provider>Input</nobr></span>}>
                            <Link to={'/account/' + tx.from.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.from}
                            </Link>
                            {tx.from === FaucetAddress ? (
                                <Paragraph className="inline-tip">Faucet address</Paragraph>
                            ) : 
                                null
                            }
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.to ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txTo}><RiQuestionLine /></Tooltip></IconContext.Provider>Output(s)</nobr></span>}>
                            {tx.to && Array.isArray(tx.to) && tx.to[0] ? (
                                <TxOutputs tx={tx.to} token={token} />
                            ) :
                                <Text disabled>N/A</Text>
                            }
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>
            </div>
        } else {
            return <div></div>;
        }
    }

    useEffect(() => {
        render(props.tx);
    }, [props.tx]);

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {(item.amount/(10**props.token.precision)).toFixed(props.token.precision).replace(/\.?0+$/, "")} {props.token.symbol}
            <Text type="secondary">  →  </Text>
            <Link to={'/account/' + item.url.replace("acc://", "")}>
                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
            </Link>
          </Paragraph>
      );
      return (
        <span className="break-all">{items}</span>
      );
    }

    return render(props.tx, props.token, props.isSynth);

};

export default TokenTransaction;