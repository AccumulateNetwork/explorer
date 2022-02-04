import React from 'react';

import {
    Descriptions,
    Tag,
    Tooltip
  } from 'antd';
  
  
import { IconContext } from "react-icons";
import {
    RiQuestionLine, RiLoader4Line
} from 'react-icons/ri';

import tooltipDescs from '../../common/TooltipDescriptions';

const TxStatus = props => {
    const tx = props.data;

    return (
        <div>
            {(tx && tx.status && tx.status.pending !== undefined) ? (
                <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.txStatus}><RiQuestionLine /></Tooltip></IconContext.Provider>Status</nobr></span>}>
                    <Tag color="blue" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiLoader4Line className={'anticon-spin'} /></IconContext.Provider>Pending</Tag>
                    <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Multi-sig 1 of 2 </Tag>
                </Descriptions.Item>
            ) :
                null
            }
        </div>
    );
}

export default TxStatus;