import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiKey2Line, RiAccountCircleLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

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
                                <Link to={'/chain/' + keypage.data.keyBook}>{keypage.data.keyBook}</Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {(keypage.data.creditBalance || keypage.data.creditBalance === 0) ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditBalance}><RiQuestionLine /></Tooltip></IconContext.Provider>Credit Balance</nobr></span>}>
                                {keypage.data.creditBalance} credits
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiKey2Line />
                        </IconContext.Provider>
                        Public Keys
                    </Title>

                    {keypage.data.keys ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keypage.data.keys}
                            renderItem={item => <List.Item>{item.publicKey}</List.Item>}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No keys</Text></Paragraph>
                    }

                </div>
            ) :
                null
            }
        </div>
    );
}

export default KeyPage;
