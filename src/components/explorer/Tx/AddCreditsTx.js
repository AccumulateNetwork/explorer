import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Skeleton,
  Tooltip,
  Alert
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import FaucetAddress from '../../common/Faucet';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const AddCreditsTx = props => {

    const tx = props.data;
    const [tokenAccount, setTokenAccount] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    function TxOutputs(props) {
        const data = props.tx;
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {(item.amount/(10**props.token.precision)).toFixed(props.token.precision).replace(/\.?0+$/, "")} {props.token.symbol}
            <Text type="secondary">  →  </Text>
            <Link to={'/acc/' + item.url.replace("acc://", "")}>
                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
            </Link>
          </Paragraph>
      );
      return (
        <span className="break-all">{items}</span>
      );
    }

    return (
        <div>
            <Descriptions bordered column={1} size="middle">

                {tx.type ? (
                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Type</nobr></span>}>
                        {tx.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {(tx) ? (
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

                    {(tx.data && tx.sponsor) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.sponsor}><RiQuestionLine /></Tooltip></IconContext.Provider>Sponsor</nobr></span>}>
                            <Link to={'/acc/' + tx.sponsor.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.sponsor}</Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {(tx.data && tx.data.recipient) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.recipient}><RiQuestionLine /></Tooltip></IconContext.Provider>Recipient</nobr></span>}>
                            <Link to={'/acc/' + tx.data.recipient.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.recipient}</Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {(tx.data.amount) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditsAddes}><RiQuestionLine /></Tooltip></IconContext.Provider>Amount</nobr></span>}>
                            {(tx.data.amount)} Credits
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>
                </div>
            ) :
                <div>
                    {error ? (
                        <div className="skeleton-holder">
                            <Alert message={error} type="error" showIcon />
                        </div>
                    ) :
                        <div>
                            <Title level={4}>
                                <IconContext.Provider value={{ className: 'react-icons' }}>
                                <RiInformationLine />
                                </IconContext.Provider>
                                Transaction Info
                            </Title>
                            <div className="skeleton-holder">
                                <Skeleton active />
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    );
}

export default AddCreditsTx;
