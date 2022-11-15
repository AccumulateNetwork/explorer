import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert,
  List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFileList2Line, RiAccountCircleLine, RiExchangeLine
} from 'react-icons/ri';

import Data from '../../common/Data';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const DataEntry = props => {

    const entry = props.data;

    var content = [];
    if (props.data && props.data.data && props.data.data.entry && props.data.data.entry.data) {
        content = Array.from(props.data.data.entry.data, item => item || "")        
    }

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {entry.type ? (
                    <Descriptions.Item label="Type">
                        {entry.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {entry.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Entry Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {entry.data.entryHash ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.entryHash}><RiQuestionLine /></Tooltip></IconContext.Provider>Entry Hash</nobr></span>}>
                                {entry.data.entryHash}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {entry.account ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.dataAccount}><RiQuestionLine /></Tooltip></IconContext.Provider>Data Account</nobr></span>}>
                                <Link to={'/acc/' + entry.account.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{entry.account}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {entry.data.txId ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txId}><RiQuestionLine /></Tooltip></IconContext.Provider>Txid</nobr></span>}>
                                <Link to={'/acc/' + entry.data.txId.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{entry.data.txId}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {entry.data.causeTxId ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.causeTxId}><RiQuestionLine /></Tooltip></IconContext.Provider>Cause</nobr></span>}>
                                <Link to={'/acc/' + entry.data.causeTxId.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{entry.data.causeTxId}
                                </Link>
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

                    {content ? (
                        <List
                        size="small"
                        bordered
                        dataSource={content}
                        renderItem={item => <List.Item><Data>{item}</Data></List.Item>}
                        style={{ marginBottom: "30px" }}
                        />
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
    );
}

export default DataEntry;
