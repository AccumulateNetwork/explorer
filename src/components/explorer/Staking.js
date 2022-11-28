import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

import { Link } from 'react-router-dom';

import {
  Typography, Alert, Skeleton, Descriptions, Table, Tag, Switch, Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiExchangeLine, RiQuestionLine
} from 'react-icons/ri';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import RPC from '../common/RPC';
import Count from '../common/Count';
import tooltipDescs from '../common/TooltipDescriptions';

const { Title, Text } = Typography;

const Staking = () => {

    const pagination = {showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1};
    const [stakers, setStakers] = useState(null);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [rawDataDisplay, setRawDataDisplay] = useState('none');

    const toggleRawData = (checked) => {
        checked === true ? setRawDataDisplay('block') : setRawDataDisplay('none');
    };

    const columns = [
        {
            title: 'Identity',
            render: (row) => {
                if (row) {
                    return (
                        <div>
                            <Link to={'/acc/' + row.identity.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{row.identity}
                            </Link>
                        </div>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Type',
            render: (row) => {
                if (row) {
                    return (
                        <Tag color="green">{row.type}</Tag>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Status',
            render: (row) => {
                if (row) {
                    return (
                        <Tag color={row.status === 'registered' ? 'green' : 'yellow'}>{row.status}</Tag>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Balance',
            render: (row) => {
                if (row) {
                    return (row.balance) ? (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.balance}><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                            {(row.balance/(10**8)).toFixed(8).replace(/\.?0+$/, "")} ACME
                        </Descriptions.Item>
                    ) : null
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Delegation',
            render: (row) => {
                if (!row) {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
                if (row.delegate) {
                    return (
                        <div>
                            <Link to={'/acc/' + row.delegate.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{row.delegate}
                            </Link>
                        </div>
                    )
                }
                switch (row.acceptingDelegates) {
                case 'yes':
                    return (
                        <Tag color="green">accepted</Tag>
                    )
                case 'no':
                    return (
                        <Text>not accepted</Text>
                    )
                default:
                    return null
                }
            }
        },
        {
            title: 'Latest Entry',
            render: (row) => {
                if (row) {
                    return (
                        <div>
                            <Link to={'/acc/staking.acme/registered#data/' + row.entryHash }>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>staking.acme/registered#data/{row.entryHash}
                            </Link>
                        </div>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
    ];

    const getStakers = async () => {
        document.title = "Stakers | Accumulate Explorer";
        setError(null);
        try {
            const params = {url: "acc://staking.acme/registered", expand: true};

            // Get the total number of entries
            params.count = 1;
            const response = await RPC.request("query-data-set", params);

            // Track accounts that have been seen
            const seen = new Map();

            // Scan entries in reverse order
            const accounts = [];
            params.count = 10;
            let x = response.total;
            while (x > 0) {
                if (x < params.count) {
                    params.start = 0;
                    params.count = x;
                    x = 0;
                } else {
                    params.start = x - params.count;
                    x -= params.count;
                }

                const response = await RPC.request("query-data-set", params);

                for (let i = response.items.length - 1; i >= 0; i--) {
                    const { entry, entryHash } = response.items[i];
                    const account = JSON.parse(Buffer.from(entry.data[0], 'hex'));

                    // Ignore older records for the same account
                    if (seen.has(account.identity.toLowerCase())) {
                        continue;
                    }
                    seen.set(account.identity.toLowerCase(), true);

                    account.entryHash = entryHash
                    accounts.push(account);
                }
            }

            // Get balances
            await Promise.all(accounts.map(async account => {
                try {
                    const params = {url: account.stake}
                    const response = await RPC.request("query", params);
                    account.balance = response.data.balance;
                }
                catch (error) {
                    // Entry is invalid
                    console.log(error);
                }
            }));

            setStakers(accounts);

            const summary = {
                balance: 0,
                coreValidator: 0,
                coreFollower: 0,
                stakingValidator: 0,
                delegated: 0,
                pure: 0,
            };
            for (const account of accounts) {
                summary[account.type]++;
                if (account.balance) {
                    summary.balance += Number(account.balance);
                }
            }

            setSummary(summary);
        }
        catch(error) {
            setError(error.message);
        }
    }

    useEffect(() => {
        getStakers();
    }, []);

    return (
        <div>
            <Title level={2}>Summary</Title>

            {summary ? (
                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Staked">
                        {(summary.balance/(10**8)).toFixed(8).replace(/\.?0+$/, "")} ACME
                    </Descriptions.Item>
                    <Descriptions.Item label="Operators">
                        {summary.coreValidator + summary.coreFollower + summary.stakingValidator}
                    </Descriptions.Item>
                    <Descriptions.Item label="Pure Stakers">
                        {summary.pure}
                    </Descriptions.Item>
                    <Descriptions.Item label="Delegates">
                        {summary.delegated}
                    </Descriptions.Item>
                </Descriptions>
            ) :
                <div className="skeleton-holder">
                    <Skeleton active />
                </div>
            }

            <Title level={2}>Stakers</Title>
                {stakers ? (
                    <div>
                        <Title level={4} style={{ marginTop: 30 }}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                                <RiExchangeLine />
                            </IconContext.Provider>
                            Stakers
                            <Count count={stakers ? stakers.length : 0} />
                        </Title>

                        {stakers ? (
                        <Table
                            dataSource={stakers}
                            columns={columns}
                            pagination={pagination}
                            rowKey="entryHash"
                            scroll={{ x: 'max-content' }}
                        />
                        ) :
                            <Alert message="No stakers" type="info" showIcon style={{marginBottom: 30}} />
                        }

                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                                <RiInformationLine />
                            </IconContext.Provider>
                            Raw Data
                            <Switch checkedChildren="ON" unCheckedChildren="OFF" style={{ marginTop: -5, marginLeft: 10 }} disabled={stakers ? false : true} onChange={toggleRawData} />
                        </Title>

                        <div className="entry-content" style={{marginTop: 0, display: rawDataDisplay}}>
                            <SyntaxHighlighter style={colorBrewer} language="json">{JSON.stringify(summary, null, 4)}</SyntaxHighlighter>
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

export default Staking;
