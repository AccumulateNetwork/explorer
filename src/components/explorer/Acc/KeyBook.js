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
    RiInformationLine, RiQuestionLine, RiStackLine, RiAccountCircleLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const KeyBook = props => {

    const keybook = props.data;

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {keybook.type ? (
                    <Descriptions.Item label="Type">
                        {keybook.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {keybook.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Key Book Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {keybook.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBookUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book URL</nobr></span>}>
                                {keybook.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {keybook.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + keybook.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{keybook.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiStackLine />
                        </IconContext.Provider>
                        Key Pages
                    </Title>

                    {keybook.data.pages ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keybook.data.pages}
                            renderItem={item => <List.Item><Link to={'/chain/' + item}>{item}</Link></List.Item>}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No pages</Text></Paragraph>
                    }

                </div>
            ) :
                null
            }
        </div>
    );
}

export default KeyBook;
