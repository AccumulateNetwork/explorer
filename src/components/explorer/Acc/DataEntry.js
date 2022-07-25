import React from 'react';

import {
  Typography,
  Descriptions,
  Tooltip,
  Alert,
  List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFileList2Line
} from 'react-icons/ri';

import Data from '../../common/Data';
import tooltipDescs from '../../common/TooltipDescriptions';

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
                        <RiFileList2Line />
                    </IconContext.Provider>
                    Entry Data
                    </Title>

                    {entry.data.entry.data ? (
                        <List
                        size="small"
                        bordered
                        dataSource={entry.data.entry.data}
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
