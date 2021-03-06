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
    
    //genesis txs workaround
    if (tx.signatures === undefined)
        tx.signatures = []

    return (
        <div style={{ marginBottom: "20px" }} >
            {(tx && tx.status) ? (
                <div>
                    {tx.status.pending &&
                        <Tag color="blue" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiLoader4Line className={'anticon-spin'} /></IconContext.Provider> Pending</Tag>
                    }
                    {tx.status.delivered &&
                        <Tag color="green" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Delivered</Tag>
                    }
                    {tx.signatureThreshold > 1 || tx.signatures.length > 1 ? (
                        <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>{tx.signatures.length} signatures</Tag>
                    ) : null
                    }
                    {tx.signatureThreshold && tx.signatures.length > 0 ? (
                        <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>{tx.signatures.length} of {tx.signatureThreshold} signatures</Tag>
                    ) : null
                    }
                </div>
            ) :
                null
            }
        </div>
    );
}

export default TxStatus;