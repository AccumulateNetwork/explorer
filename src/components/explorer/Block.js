import React, { useState, useEffect } from 'react';

import {
  Typography, Alert, Skeleton
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine
} from 'react-icons/ri';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import RPC from '../common/RPC';

const { Title } = Typography;

const Block = ({ match }) => {

    const [block, setBlock] = useState(null);
    const [error, setError] = useState(null);

    const getMinorBlock = async (index) => {
        document.title = "Minor block #" + index + " | Accumulate Explorer";
        setError(null);
        try {
            let params = {url: "acc://dn.acme", start: parseInt(index), count: 1};
            const response = await RPC.request("query-minor-blocks", params);
            if (response && response.items && response.items[0]) {
                setBlock(response.items[0]);
                
            } else {
                throw new Error("Minor block #" + index + " not found"); 
            }

        }
        catch(error) {
            setError(error.message);
        }
    }

    useEffect(() => {
        getMinorBlock(match.params.index);
    }, [match.params.index]);

    return (
        <div>
            <Title level={2}>Block #{match.params.index}</Title>
                {block ? (
                    <div>
                        <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                        </IconContext.Provider>
                        Raw Data
                        </Title>
                        <div className="entry-content" style={{marginTop: 0}}>
                            <SyntaxHighlighter style={colorBrewer} language="json">{JSON.stringify(block, null, 4)}</SyntaxHighlighter>
                        </div>
                    </div>
                ) :
                    <div>
                        {error ? (
                            <div className="skeleton-holder">
                                <Alert message={error} type="error" showIcon />
                            </div>
                        ) :
                            <div className="skeleton-holder">
                                <Skeleton active />
                            </div>
                        }
                    </div>
                }
        </div>
    );
}

export default Block;
