import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography, Skeleton, Descriptions, Table, Tag, Tabs, Tooltip, Row, Col, Card, Progress, message
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiFileList2Line, RiExchangeLine, RiQuestionLine, RiExternalLinkLine, RiHandCoinLine, RiShieldCheckLine, RiStackLine, RiPercentLine, RiAccountCircleLine, RiFlashlightLine, RiWaterFlashLine
} from 'react-icons/ri';

import Count from '../common/Count';
import tooltipDescs from '../common/TooltipDescriptions';
import axios from 'axios';

const { Title, Text } = Typography;

const Staking = () => {

    const [stakers, setStakers] = useState(null);
    const [supply, setSupply] = useState(null);
    const [staking, setStaking] = useState(null);
    const [apr, setAPR] = useState(null);

    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalStakers, setTotalStakers] = useState(-1);

    const columns = [
        {
            title: 'Identity',
            dataIndex: 'identity',
            render: (identity) => {
                if (identity) {
                    return (
                        <div>
                            <Link to={'/acc/' + identity.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{identity}
                            </Link>
                            {identity === "acc://accumulate.acme" ? (
                                <div className="name-tag"><Tag color="orange">Accumulate Foundation</Tag></div>
                            ) : null}
                            {identity === "acc://accumulated.acme" ? (
                                <div className="name-tag"><Tag color="orange">ACME Liquid Staking</Tag></div>
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
                            <Tag color="green">{row.type}</Tag>
                            {row.delegate &&
                                <div>
                                    <Link to={'/acc/' + row.delegate.replace("acc://", "")}>
                                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{row.delegate}
                                    </Link>
                                </div>}
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
            title: 'Status',
            dataIndex: 'status',
            render: (status) => {
                if (status) {
                    return (
                        <Tag color={status === 'registered' ? 'green' : 'orange'}>{status}</Tag>
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
            dataIndex: 'balance',
            render: (balance) => {
                if (balance || balance===0) {
                    return (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.balance}><RiQuestionLine /></Tooltip></IconContext.Provider>Balance</nobr></span>}>
                            {(balance / (10**8)).toLocaleString('en-US', {maximumFractionDigits: 0})} ACME
                        </Descriptions.Item>
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
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{rewards}
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

    const getSupply = async () => {

        setSupply(null);

        try {
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/supply");
            if (response && response.data) {
                setSupply(response.data);
            } else {
                throw new Error("Can not get ACME supply metrics"); 
            }
            const unissued = (Number(response.data.max) - Number(response.data.total))/(10**8);
            const rewards = unissued * 0.16 / 365 * 7;
            const rate = rewards / (response.data.staked/(10**8));
            const apr = (1+rate) ** 52 - 1;
            setAPR(apr);
        }
        catch(error) {
            setSupply(null);
            message.error(error.message);
        }

    }

    const getStaking = async () => {

        setStaking(null);

        try {
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/staking");
            if (response && response.data) {
                setStaking(response.data);
            } else {
                throw new Error("Can not get staking stats metrics"); 
            }
        }
        catch(error) {
            setStaking(null);
            message.error(error.message);
        }

    }

    const getStakers = async (params = pagination) => {
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
          const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/staking/stakers?start=" + start + "&count=" + count + "&sort=balance&order=desc");
          if (response && response.data) {

            // workaround API bug response
            if (response.data.start === null || response.data.start === undefined) {
                response.data.start = 0;
            }

            setStakers(response.data.result);
            setPagination({...pagination, current: (response.data.start/response.data.count)+1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}`});
            setTotalStakers(response.data.total);
          } else {
            throw new Error("Stakers not found"); 
          }
        }
        catch(error) {
          setStaking(null);
          message.error(error.message);
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        document.title = "Staking | Accumulate Explorer";
        getSupply();
        getStaking();
        getStakers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={2}>Staking</Title>

            <div className="stats" style={{ marginTop: 5, marginBottom: 20 }}>
                <Row gutter={[16,16]}>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiPercentLine /></IconContext.Provider>
                            <br />
                            Staking APR
                        </span>
                        <Title level={4}>{apr ? <Text>{(apr*(10**2)).toFixed(2)}%</Text> : <Skeleton active title={true} paragraph={false} /> }</Title>
                    </Card>
                </Col>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiShieldCheckLine /></IconContext.Provider>
                            <br />
                            Operators
                        </span>
                        <Title level={4}>{staking ? <Text>{staking.coreValidator + staking.coreFollower + staking.stakingValidator}</Text> : <Skeleton active title={true} paragraph={false} /> }</Title>
                    </Card>
                </Col>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiHandCoinLine /></IconContext.Provider>
                            <br />
                            Delegates
                        </span>
                        <Title level={4}>{staking ? <Text>{staking.delegated}</Text> : <Skeleton active title={true} paragraph={false} /> }</Title>
                    </Card>
                </Col>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>
                            <br />
                            Pure Stakers
                        </span>
                        <Title level={4}>{staking ? <Text>{staking.pure}</Text> : <Skeleton active title={true} paragraph={false} /> }</Title>
                    </Card>
                </Col>
                </Row>
            </div>

            <Card className="staking-card" style={{ marginBottom: 20 }}>
                <Tabs defaultActiveKey="TabStaking">
                    <Tabs.TabPane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiFlashlightLine /></IconContext.Provider>ACME Staking</span>} key="TabStaking">
                        You can stake ACME following <a href="https://docs.accumulatenetwork.io/accumulate/staking/how-to-stake-your-tokens" target="_blank" rel="noopener noreferrer">
                            <strong>this guide<IconContext.Provider value={{ className: 'react-icons' }}><RiExternalLinkLine /></IconContext.Provider></strong></a>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiWaterFlashLine /></IconContext.Provider>WACME Liquid Staking</span>} key="TabLiquidStaking">
                        You can stake WACME in the liquid staking on <a href="https://accumulated.finance/" target="_blank" rel="noopener noreferrer">
                            <strong>Accumulated Finance<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong></a>
                    </Tabs.TabPane>
                </Tabs>
            </Card>


            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
                </IconContext.Provider>
                ACME Supply
            </Title>
            
            {supply ? (
                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Max supply">
                        {supply.maxTokens.toLocaleString('en-US')} ACME
                    </Descriptions.Item>
                    <Descriptions.Item label="Total supply">
                        {supply.totalTokens.toLocaleString('en-US')} ACME
                        <Progress percent={Math.round(supply.total/supply.max*100)} strokeColor={"#1677ff"} showInfo={false} />
                        <Text type="secondary">{Math.round(supply.total/supply.max*100)}% of max supply is issued</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Circulating supply">
                        {supply.circulatingTokens.toLocaleString('en-US')} ACME
                        <Progress percent={Math.round(supply.total/supply.max*100)} success={{ percent: Math.round(supply.circulating/supply.max*100), strokeColor: "#1677ff" }} strokeColor={"#d6e4ff"} showInfo={false} />
                        <Text type="secondary">{Math.round(supply.circulating/supply.total*100)}% of total supply is circulating</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Staked">
                        {supply.stakedTokens.toLocaleString('en-US')} ACME
                        <Progress percent={Math.round(supply.total/supply.max*100)} success={{ percent: Math.round(supply.staked/supply.max*100), strokeColor: "#1677ff" }} strokeColor={"#d6e4ff"} showInfo={false} />
                        <Text type="secondary">{Math.round(supply.staked/supply.total*100)}% of total supply is staked</Text>
                    </Descriptions.Item>
                </Descriptions>
            ) :
                <div className="skeleton-holder">
                    <Skeleton active />
                </div>
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
                rowKey="entryHash"
                loading={tableIsLoading}
                onChange={getStakers}
                scroll={{ x: 'max-content' }}
            />

        </div>
    );
}

export default Staking;
