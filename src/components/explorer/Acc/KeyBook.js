import React from 'react';

import {
  Typography,
  Descriptions,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

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
                        KeyBook Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                    </Descriptions>
                </div>
            ) :
                null
            }
        </div>
    );
}

export default KeyBook;
