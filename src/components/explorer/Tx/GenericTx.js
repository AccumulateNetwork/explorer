import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert,
  Switch,
  Tag,
  List,
  Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiRefund2Fill, RiFileList2Line
} from 'react-icons/ri';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import tooltipDescs from '../../common/TooltipDescriptions';
import Data from '../../common/Data';
import TxStatus from '../../common/TxStatus';
import TxSendTokens from '../../common/TxSendTokens';
import TxIssueTokens from '../../common/TxIssueTokens';
import TxUpdateKeyPage from '../../common/TxUpdateKeyPage';
import TxSyntheticDepositTokens from '../../common/TxSyntheticDepositTokens';
import TxAddCredits from '../../common/TxAddCredits';
import Signatures from '../../common/Signatures';
import getTs from '../../common/GetTS';

const { Title, Text, Paragraph } = Typography;

const GenericTx = props => {

    const tx = props.data;
    var content = [];
    if (tx && tx.data && tx.data.entry && tx.data.entry.data) {
        if (Array.isArray(tx.data.entry.data)) {
            content = Array.from(tx.data.entry.data, item => item || "")        
        } else {
            content.push(tx.data.entry.data);
        }
    }

    const [ts, setTs] = useState(null);
    const [block, setBlock] = useState(null);
    const [rawDataDisplay, setRawDataDisplay] = useState('none');

    let utcOffset = moment().utcOffset() / 60;

    const toggleRawData = (checked) => {
        checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
    };

    useEffect(() => {
        getTs(props.data.transactionHash, setTs, setBlock);
    }, [props.data]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    {tx.data && tx.data.isRefund &&
                        <Tag color="orange" style={{marginLeft: 10, textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiRefund2Fill/></IconContext.Provider>Refund</Tag>
                    }
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

                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.timestamp}><RiQuestionLine /></Tooltip></IconContext.Provider>Timestamp (UTC{utcOffset < 0 ? '-' : '+'}{utcOffset})</nobr></span>}>
                        {ts || ts===0 ? <Text>{ts ? <Text className="code">{moment(ts).format("YYYY-MM-DD HH:mm:ss")}</Text> : <Text disabled>N/A</Text> }</Text> : <Skeleton className={"skeleton-singleline"} active title={true} paragraph={false} /> }
                    </Descriptions.Item>

                    <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.block}><RiQuestionLine /></Tooltip></IconContext.Provider>Block</nobr></span>}>
                        {block || block===0 ? <Text>{block ? ( <Link className="code" to={'/block/' + block}>{block}</Link> ) : <Text disabled>N/A</Text> }</Text> : <Skeleton className={"skeleton-singleline"} active title={true} paragraph={false} /> }
                    </Descriptions.Item>

                    {tx.txid ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txId}><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                            <Text copyable>{tx.txid}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.transactionHash ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txHash}><RiQuestionLine /></Tooltip></IconContext.Provider>TxHash</nobr></span>}>
                            <Text copyable className={"code"}>{tx.transactionHash}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.sponsor ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.sponsor}><RiQuestionLine /></Tooltip></IconContext.Provider>Principal</nobr></span>}>
                            <Link to={'/acc/' + tx.sponsor.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.sponsor}</Link>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiFileList2Line />
                        </IconContext.Provider>
                        Entry Data
                    </Title>

                    {content && content.length > 0 ? (
                        <List
                            size="small"
                            bordered
                            dataSource={content}
                            renderItem={item => <List.Item><Data>{item}</Data></List.Item>}
                            style={{ marginBottom: "30px" }}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No entry data</Text></Paragraph>
                    }

                <Title level={4}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                  </IconContext.Provider>
                  Transaction Metadata
                </Title>

                {tx.transaction && tx.transaction.header && (tx.transaction.header.memo || tx.transaction.header.metadata) ? (

                    <Descriptions bordered column={1} size="middle" layout="vertical">
                        {tx.transaction && tx.transaction.header && tx.transaction.header.memo ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.memo}><RiQuestionLine /></Tooltip></IconContext.Provider>Memo</nobr></span>}>
                                <Text copyable>{tx.transaction.header.memo}</Text>
                            </Descriptions.Item>
                        ) :
                            null
                        }
                        {tx.transaction && tx.transaction.header && tx.transaction.header.metadata ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.metadata}><RiQuestionLine /></Tooltip></IconContext.Provider>Metadata</nobr></span>}>
                                <Data>{tx.transaction.header.metadata}</Data>
                            </Descriptions.Item>
                        ) :
                            null
                        }
                    </Descriptions>
                
                ) :
                    <Paragraph><Text type="secondary">No metadata</Text></Paragraph>
                }

                {(tx.type && tx.type === "sendTokens") &&
                    <TxSendTokens data={tx} />
                }

                {(tx.type && tx.type === "issueTokens") &&
                    <TxIssueTokens data={tx} />
                }

                {(tx.type && tx.type === "updateKeyPage") &&
                    <TxUpdateKeyPage data={tx} />
                }

                {(tx.type && tx.type === "syntheticDepositTokens") &&
                    <TxSyntheticDepositTokens data={tx} />
                }

                {(tx.type && tx.type === "addCredits") &&
                    <TxAddCredits data={tx} />
                }

                <Signatures data={tx.signatures} />

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
