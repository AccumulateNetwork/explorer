import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography, Skeleton, Descriptions, Table, Tag, Tabs, Card, Progress, message
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiFileList2Line, RiExternalLinkLine, RiAccountCircleLine
} from 'react-icons/ri';

import Count from '../common/Count';
import { tokenAmountToLocaleString } from '../common/TokenAmount'
import axios from 'axios';
import getSupply from '../common/GetSupply';

const { Title, Text } = Typography;

const Staking = () => {

    const [stakers, setStakers] = useState(null);
    const [supply, setSupply] = useState(null);
    const [apr, setAPR] = useState(null);
    const [stakingRewardRate, setStakingRewardRate] = useState(0);

    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalStakers, setTotalStakers] = useState(-1);

    const columns = [
        {
            title: 'Identity',
            sorter: true,
            render: (row) => {
                if (row.identity && row.stake) {
                    return (
                        <div>
                            <Link to={'/acc/' + row.stake.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{row.identity}<br />
                                <Text type="secondary">{row.stake.replace(row.identity, "")}</Text>
                            </Link>
                            {row.identity === "acc://accumulate.acme" ? (
                                <div className="name-tag"><Tag>Accumulate Foundation</Tag></div>
                            ) : null}
                            {row.identity === "acc://accumulated.acme" ? (
                                <div className="name-tag"><Tag>Liquid Staking</Tag></div>
                            ) : null}
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
                if (row.type) {
                    return (
                        <div>
                            <Tag color={row.delegate ? "green" : "cyan"}>{row.type}</Tag>
                            {row.delegate &&
                                <div>
                                    <Link to={'/acc/' + row.delegate.replace("acc://", "")}>
                                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{row.delegate}
                                    </Link>
                                </div>
                            }
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
            title: 'Balance',
            sorter: true,
            defaultSortOrder: 'descend',
            dataIndex: 'balance',
            render: (balance) => {
                if ((balance || balance===0) && supply?.staked) {
                    const pt = (balance / supply.staked * 100).toFixed(2)
                    return (
                        <span>
                            <Text>{tokenAmountToLocaleString(balance, 8, "ACME", 0, 0)}</Text>
                            <br/>
                            <Progress percent={pt} strokeColor={"#1677ff"} showInfo={true} className="staking-progress" />
                        </span>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Rewards',
            dataIndex: 'rewards',
            render: (rewards) => {
                return (
                    <div>
                        <Link to={'/acc/' + rewards.replace("acc://", "")}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{rewards}
                        </Link>
                    </div>
                )
            }
        },
        {
            title: 'Latest Entry',
            dataIndex: 'entryHash',
            render: (entryHash) => {
                if (entryHash) {
                    return (
                        <div>
                            <Link to={'/acc/staking.acme/registered#data/' + entryHash }>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiFileList2Line /></IconContext.Provider>{entryHash}
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

    const getStakers = async (params = pagination, filters, sorter) => {
        setTableIsLoading(true);
    
        let start = 0;
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
        let sort = "desc";
        let field = (sorter && sorter.field) || 'balance';
    
        if (params) {
            start = (params.current-1)*params.pageSize;
            count = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }

        if (sorter) {
            switch (sorter.order) {
                case 'ascend':
                    sort = "asc";
                    break;
                case 'descend':
                default:
                    sort = "desc";
                    break;
            }
        }

        try {
            if (!process.env.REACT_APP_METRICS_API_PATH)
                throw new Error();
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/staking/stakers?start=" + start + "&count=" + count + "&sort=" + field + "&order=" + sort);
            if (response && response.data) {

                // workaround API bug response
                if (response.data.start === null || response.data.start === undefined) {
                    response.data.start = 0;
                }

                setStakers(response.data.result);
                setPagination({ ...pagination, current: (response.data.start / response.data.count) + 1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}` });
                setTotalStakers(response.data.total);
            } else {
                throw new Error("Stakers not found");
            }
        }
        catch (error) {
            setStakers(null);
            setTotalStakers(-1);
            if (error.message)
                message.error(error.message);
        }
        setTableIsLoading(false);
    }

    const fetchLiquidStakingInfo = async () => {
        try {
            // Fetch data from the API using Axios
            const response = await axios.get('https://api.accumulated.finance/v1/lsd/wacme');
            setStakingRewardRate(Math.max(Number(response.data[0]?.apr), Number(response.data[1]?.apr)));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };  

    useEffect(() => {
        document.title = "Staking | Accumulate Explorer";
        getSupply(setSupply, setAPR);
        getStakers();
        fetchLiquidStakingInfo();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={2}>Staking</Title>

            <Card className="staking-card" style={{ marginBottom: 20 }}>
                <Tabs defaultActiveKey="TabStaking">
                    <Tabs.TabPane tab={<span>ACME Staking
                        {apr && false ?
                            <Tag color="green" style={{marginLeft: 10, marginRight: 0}}>APR: {(apr*(10**2)).toFixed(2)}%</Tag>
                        : null}
                    </span>} key="TabStaking">
                        You can stake ACME following <a href="https://docs.accumulatenetwork.io/accumulate/staking/how-to-stake-your-tokens" target="_blank" rel="noopener noreferrer">
                            <strong>this guide<IconContext.Provider value={{ className: 'react-icons' }}><RiExternalLinkLine /></IconContext.Provider></strong></a>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<span>WACME Liquid Staking
                        {stakingRewardRate > 0 ?
                            <Tag color="green" style={{marginLeft: 10, marginRight: 0}}>APR: {stakingRewardRate.toFixed(2)}%</Tag>
                            : null
                        }
                    </span>} key="TabLiquidStaking">
                        You can stake WACME in the liquid staking on <a href="https://accumulated.finance/" target="_blank" rel="noopener noreferrer">
                            <strong>Accumulated Finance<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong></a>
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            {process.env.REACT_APP_METRICS_API_PATH &&
                <>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                        </IconContext.Provider>
                        ACME Supply
                    </Title>

                    {supply ? (
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="Max supply">
                                {supply.maxTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
                            </Descriptions.Item>
                            <Descriptions.Item label="Total supply">
                                {supply.totalTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
                                <Progress percent={Math.round(supply.total / supply.max * 100)} strokeColor={"#1677ff"} showInfo={false} />
                                <Text type="secondary">{Math.round(supply.total / supply.max * 100)}% of max supply is issued</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Circulating supply">
                                {supply.circulatingTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
                                <Progress percent={Math.round(supply.total / supply.max * 100)} success={{ percent: Math.round(supply.circulating / supply.max * 100), strokeColor: "#1677ff" }} strokeColor={"#d6e4ff"} showInfo={false} />
                                <Text type="secondary">{Math.round(supply.circulating / supply.total * 100)}% of total supply is circulating</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Staked">
                                {supply.stakedTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
                                <Progress percent={Math.round(supply.total / supply.max * 100)} success={{ percent: Math.round(supply.staked / supply.max * 100), strokeColor: "#1677ff" }} strokeColor={"#d6e4ff"} showInfo={false} />
                                <Text type="secondary">{Math.round(supply.staked / supply.total * 100)}% of total supply is staked</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    ) :
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                    }
                </>
            }
        
            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
                </IconContext.Provider>
                Stakers
                {totalStakers ? <Count count={totalStakers} /> : null }
            </Title>

            <Table
                dataSource={stakers}
                columns={columns}
                pagination={pagination}
                loading={tableIsLoading}
                onChange={getStakers}
                sortDirections={["ascend", "descend", "ascend"]}
                scroll={{ x: 'max-content' }}
            />

        </div>
    );
}

export default Staking;
