import React, { useEffect } from 'react';

import { Link } from 'react-router-dom';

import { useQuery } from "@apollo/client";
import gql from "graphql-tag";

import {
  Table, Alert, Typography, Skeleton, Avatar
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiCoinLine, RiExternalLinkLine
} from 'react-icons/ri';

const { Title, Paragraph, Text } = Typography;

const Tokens = () => {

    const GET_TOKENS = gql`
        query {
            tokens (limit: 100) {
                _id
                name
                symbol
                logo
                url
            }
        }
    `;

    const { loading, error, data } = useQuery(GET_TOKENS);

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
    }, []);
  
    return (
        <div>
            <Title level={2}>Tokens</Title>
            
            <div class="featured" style={{ marginBottom: 20 }}>
                Learn how to launch your own token on Accumulate in 5 minutes: <a href="https://docs.accumulatenetwork.io" target="_blank" rel="noopener noreferrer">
                    <strong>docs.accumulatenetwork.io<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong>
                </a>
            </div>

            {data && data.tokens ? (
                <Table
                    dataSource={data.tokens}
                    columns={columns}
                    pagination={false}
                    showHeader={false}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                />
            ) :
                <div>
                    {error ? (
                        <div className="skeleton-holder">
                            <Alert message="Can not connect the database" type="error" showIcon />
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
};

export default Tokens;
