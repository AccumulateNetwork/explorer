import React from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiLinksLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const DataAccount = props => {

    const account = props.data;

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {account.type ? (
                    <Descriptions.Item label="Type">
                        {account.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {account.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Data Account Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {account.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.dataAccountUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Data Account URL</nobr></span>}>
                                {account.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {account.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + account.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{account.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {account.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/chain/' + account.data.keyBook}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiLinksLine /></IconContext.Provider>{account.data.keyBook}
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

export default DataAccount;
