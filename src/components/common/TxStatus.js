import React from 'react';

import {
    Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiLoader4Line
} from 'react-icons/ri';

const TxStatus = props => {
    const tx = props.data;

    return (
        <div>
            {(tx && tx.status) ? (
                <div>
                    <Tag color="blue" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiLoader4Line className={'anticon-spin'} /></IconContext.Provider>Pending</Tag>
                    <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Multi-sig 1 of 2 </Tag>
                </div>
            ) :
                null
            }
        </div>
    );
}

export default TxStatus;