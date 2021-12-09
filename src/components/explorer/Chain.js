import React, { useState, useEffect } from 'react';

import {
  Typography, Alert, Skeleton
} from 'antd';

import RPC from './../common/RPC';

const { Title } = Typography;

const Chain = ({ match }) => {

    const [chain, setChain] = useState(null);
    const [error, setError] = useState(null);

    const getChain = async (chainid) => {
        document.title = "Chain " + chainid + " | Accumulate Explorer";
        setError(null);
        try {
            let params = {chainId: chainid};
            const response = await RPC.request("query-chain", params);
            if (response && response.data) {
                setChain(response.data);
            } else {
                throw new Error("Chain " + chainid + " not found"); 
            }

        }
        catch(error) {
            setError(error.message);
        }
    }

    function Render(props) {
        if (props.data && props.data.url) {
            window.location.href = '/acc/' + props.data.url.replace("acc://", "");
        }
        return null;
    }

    useEffect(() => {
        getChain(match.params.chainid);
    }, [match.params.chainid]);

    return (
        <div>
            <Title level={2}>Chain</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.chainid}</Title>
                {chain ? (
                    <Render data={chain} />
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

export default Chain;
