import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiFileList2Line, RiPriceTag3Line
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';
import ExtId from '../../common/ExtId';
import Content from '../../common/Content';

const { Title } = Typography;

const WriteDataToTx = props => {

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

                    {(tx.data && tx.sponsor) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.sponsor}><RiQuestionLine /></Tooltip></IconContext.Provider>Sponsor</nobr></span>}>
                            <Link to={'/acc/' + tx.sponsor.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.sponsor}</Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>

                {tx.data.entry ? (
                    <div>
                        <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiPriceTag3Line />
                        </IconContext.Provider>
                        External IDs
                        </Title>

                        {tx.data.entry.extIds ? (
                            <div className="extids">
                                {tx.data.entry.extIds.map((item) => <ExtId>{item}</ExtId>)}
                            </div>
                        ) :
                            <div class="skeleton-holder">
                                <Alert message="No ExtIds" type="info" showIcon />
                            </div>
                        }

                        <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiFileList2Line />
                        </IconContext.Provider>
                        Data
                        </Title>

                        {tx.data.entry.data ? (
                            <Content>{tx.data.entry.data}</Content>
                        ) :
                            <div class="skeleton-holder">
                                <Alert message="No content" type="info" showIcon />
                            </div>
                        }
                    </div>
                ) :
                    null
                }

                </div>
            ) :
                null
            }
        </div>
    );
}

export default WriteDataToTx;
