import React from 'react';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiPriceTag3Line, RiFileList2Line
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';
import ExtId from '../../common/ExtId';
import Content from '../../common/Content';

const { Title } = Typography;

const DataEntry = props => {

    const entry = props.data;

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

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiPriceTag3Line />
                        </IconContext.Provider>
                        External IDs
                    </Title>

                    {entry.data.entry.extIds ? (
                        <div className="extids">
                            {entry.data.entry.extIds.map((item) => <ExtId>{item}</ExtId>)}
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

                    {entry.data.entry.data && entry.data.entry.data[0] ? (
                        <Content>{entry.data.entry.data[0]}</Content>
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
