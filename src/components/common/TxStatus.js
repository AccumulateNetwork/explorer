import React from 'react';

import {
    Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiCheckLine,
    RiLoader4Line
} from 'react-icons/ri';

const TxStatus = props => {
    const tx = props.data;
    
    return (
        <div style={{ marginBottom: "20px" }} >
            {(tx && tx.status) ? (
                <div>
                    {tx.status.pending &&
                        <span>
                        <Tag color="gold" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiLoader4Line className={'anticon-spin'} /></IconContext.Provider>Pending</Tag>
                        <Tag color="cyan" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Multi-sig</Tag>
                        </span>
                    }
                    {tx.status.delivered &&
                        <Tag color="green" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}><RiCheckLine/></IconContext.Provider>Delivered</Tag>
                    }
                    {tx.signatures && tx.signatures.length > 0 ? (
                        <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Signatures: <strong>{tx.signatures.filter(signature => signature.signer || signature.delegator).length}</strong></Tag>
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