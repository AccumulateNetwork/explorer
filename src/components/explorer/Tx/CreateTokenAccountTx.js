import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiStackLine, RiCoinLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';
import TxStatus from './TxStatus';

const { Title } = Typography;

const CreateTokenAccountTx = props => {

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

                    {tx.status ? (
                        <TxStatus data={tx}/>
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

                    {(tx.data && tx.data.url) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenAcctUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Token Account</nobr></span>}>
                            <Link to={'/acc/' + tx.data.url.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.data.url}
                            </Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {(tx.data && tx.data.token) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.tokenUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Token</nobr></span>}>
                            <Link to={'/acc/' + tx.data.token.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{tx.data.token}
                            </Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {(tx.data && tx.data.keyBookUrl) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBookUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                            <Link to={'/acc/' + tx.data.keyBookUrl.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{tx.data.keyBookUrl}
                            </Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>
                </div>
            ) :
                null
            }
        </div>
    );
}

export default CreateTokenAccountTx;
