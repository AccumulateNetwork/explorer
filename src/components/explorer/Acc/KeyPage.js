import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  List,
  Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiKey2Line, RiAccountCircleLine, RiAccountBoxLine, RiCloseCircleLine
} from 'react-icons/ri';

import Count from '../../common/Count';
import tooltipDescs from '../../common/TooltipDescriptions';
import TxChain from '../../common/TxChain';
import Key from '../../common/Key';

const { Title, Paragraph, Text } = Typography;

const KeyPage = props => {

    const keypage = props.data;

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {keypage.type ? (
                    <Descriptions.Item label="Type">
                        {keypage.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {keypage.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Key Page Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {keypage.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyPageUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Page URL</nobr></span>}>
                                {keypage.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {keypage.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + keypage.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{keypage.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {keypage.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/acc/' + keypage.data.keyBook.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>{keypage.data.keyBook}</Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {keypage.data.threshold ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.threshold}><RiQuestionLine /></Tooltip></IconContext.Provider>Threshold</nobr></span>}>
                                {keypage.data.threshold}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditBalance}><RiQuestionLine /></Tooltip></IconContext.Provider>Credit Balance</nobr></span>}>
                            {keypage.data.creditBalance ? keypage.data.creditBalance / 100 : 0} credits
                        </Descriptions.Item>

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiKey2Line />
                        </IconContext.Provider>
                        Keys
                        <Count count={keypage.data.keys && (keypage.data.keys[0].publicKey || keypage.data.keys[0].delegate) ? keypage.data.keys.length : 0} />
                    </Title>

                    {keypage.data.keys && (keypage.data.keys[0].publicKey || keypage.data.keys[0].delegate) ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keypage.data.keys}
                            renderItem={item =>
                                <List.Item>
                                    <span>
                                    {item.delegate ? <span><Tag color="green">Delegate</Tag><Link to={'/acc/' + item.delegate.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>{item.delegate}</Link></span> : null }
                                    {item.delegate && item.publicKey ? <p></p> : null}
                                    {item.publicKey ? <Key keyHash={item.publicKey} /> : null}
                                    </span>
                                </List.Item>
                            }
                            style={{ marginBottom: "30px" }}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No keys</Text></Paragraph>
                    }

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiCloseCircleLine />
                        </IconContext.Provider>
                        Transaction Blacklist
                        <Count count={keypage.data.transactionBlacklist ? keypage.data.transactionBlacklist.length : 0} />
                    </Title>

                    {keypage.data.transactionBlacklist && keypage.data.transactionBlacklist[0] ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keypage.data.transactionBlacklist}
                            renderItem={item =>
                                <List.Item>
                                    <Tag color="volcano">{item}</Tag>
                                </List.Item>
                            }
                            style={{ marginBottom: "30px" }}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No transaction blacklist</Text></Paragraph>
                    }

                    <TxChain url={keypage.data.url} type='transaction' />
                    <TxChain url={keypage.data.url} type='pending' />
                    <TxChain url={keypage.data.url} type='signature' />

                </div>
            ) :
                null
            }
        </div>
    );
}

export default KeyPage;
