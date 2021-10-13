import React, { useState, useEffect } from 'react';

import {
  Typography,
} from 'antd';

import axios from 'axios';

import { NotifyNetworkError } from './../common/Notifications';

const { Title } = Typography;

const Block = ({ match }) => {

    const [block, setBlock] = useState(null);
    const [error, setError] = useState(null);

    const getBlock = async (id) => {
        document.title = "Block #" + id + " | Accumulate Explorer";
        setBlock(null);
        setError(null);
        try {
            const response = await axios.get('/'+id);
            if (response.data.result.type === "block") {
                setBlock(response.data.result.data);
            } else {
                setError("Block #" + id + " not found");
            }
        }
        catch(error) {
            setBlock(null);
            if (error.response) {
                setError(error.response.data.error);
            } else {
                NotifyNetworkError();
            }
        }
    }

    useEffect(() => {
        getBlock(match.params.id);
    }, [match.params.id]);

    return (
        <div>
            <Title level={2}>Block #{match.params.id}</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.id}</Title>
        </div>
    );
}

export default Block;
