import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {
  Table, Typography, Avatar, message
} from 'antd';

import { IconContext } from "react-icons";
import { RiCoinLine, RiExternalLinkLine } from 'react-icons/ri';

import axios from 'axios';
import Count from '../common/Count';

const { Title, Paragraph, Text } = Typography;

const Tokens = () => {

    const [tokens, setTokens] = useState(null);
    const [totalTokens, setTotalTokens] = useState(-1);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});

    //const { loading, error, data } = useQuery(GET_TOKENS);

    const getTokens = async (params = pagination, filters) => {
        setTableIsLoading(true);
    
        let start = 0;
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
    
        if (params) {
            start = (params.current-1)*params.pageSize;
            count = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }

        try {
            if (!process.env.REACT_APP_METRICS_API_PATH)
                throw new Error();
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/tokens?start=" + start + "&count=" + count);
            if (response && response.data) {

                /* workaround API bug response
                if (response.data.start === null || response.data.start === undefined) {
                    response.data.start = 0;
                } */

                setTokens(response.data.result);
                setPagination({ ...pagination, current: (response.data.start / response.data.count) + 1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}` });
                setTotalTokens(response.data.total);
            } else {
                throw new Error("Tokens not found");
            }
        }
        catch (error) {
            setTokens(null);
            setTotalTokens(-1);
            if (error.message)
                message.error(error.message);
        }
        setTableIsLoading(false);
    }

    const columns = [
        {
            title: 'Logo',
            width: 30,
            render: (row) => (
                <Link to={'/acc/' + row.url.replace("acc://", "")}>
                    <Avatar size={40} src={row.logo}>{row.symbol}</Avatar>
                </Link>
            )
        },
        {
            title: 'Token',
            render: (row) => (
                <Paragraph>
                    <Link to={'/acc/' + row.url.replace("acc://", "")}>
                        {row.symbol}
                    </Link>
                    <br />
                    <Text type="secondary">{row.name}</Text>
                </Paragraph>
            )
        },
        {
            title: 'URL',
            render: (row) => (
                <Link to={'/acc/' + row.url.replace("acc://", "")}>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>acc://{row.url}
                </Link>
            )
        }
    ];

    useEffect(() => {
        document.title = "Tokens | Accumulate Explorer";
        getTokens();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
    return (
        <div>
            <Title level={2}>
                Tokens
                {totalTokens ? <Count count={totalTokens} /> : null }
            </Title>
            
            <div class="featured" style={{ marginBottom: 20 }}>
                Learn how to launch your own token on Accumulate in 5 minutes: <a href="https://docs.accumulatenetwork.io" target="_blank" rel="noopener noreferrer">
                    <strong>docs.accumulatenetwork.io<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong>
                </a>
            </div>

            {tokens &&
                <Table
                    dataSource={tokens}
                    columns={columns}
                    pagination={pagination}
                    showHeader={false}
                    loading={tableIsLoading}
                    scroll={{ x: 'max-content' }}
                />
            }
        </div>
    );
};

export default Tokens;
