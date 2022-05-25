import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Skeleton,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const AddCreditsTx = props => {

    const tx = props.data;
    //const [error, setError] = useState(null);

    return (
        <div>
            <Descriptions bordered column={1} size="middle">

                {tx.type ? (
                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txType}><RiQuestionLine /></Tooltip></IconContext.Provider>Type</nobr></span>}>
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

                    {(tx.data.amount && tx.data.oracle) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditsAdded}><RiQuestionLine /></Tooltip></IconContext.Provider>Amount</nobr></span>}>
                            {tx.data.amount * tx.data.oracle / 1e10} credits
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>
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
    );
}

export default AddCreditsTx;
