import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography, Table, Tag, Tooltip, message, Card, Tabs, Progress
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiAccountCircleLine, RiExternalLinkLine, RiShieldCheckLine, RiTrophyLine
} from 'react-icons/ri';

import Count from '../common/Count';
import { tokenAmountToLocaleString } from '../common/TokenAmount'
import getSupply from '../common/GetSupply';
import axios from 'axios';

const { Title, Text } = Typography;

const Validators = () => {

    const [validators, setValidators] = useState(null);
    const [totalValidators, setTotalValidators] = useState(-1);
    const [supply, setSupply] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1 });

    const columns = [
        {
            title: 'Identity',
            sorter: true,
            dataIndex: 'identity',
            render: (identity) => {
                if (identity) {
                    return (
                        <div>
                            <Link to={'/acc/' + identity.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{identity}
                            </Link>
                            {identity === "acc://accumulate.acme" ? (
                                <div className="name-tag"><Tag>Accumulate Foundation</Tag></div>
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
            dataIndex: 'type',
            render: (type) => {
                if (type) {
                    return (
                        <Tag color="cyan">{type}</Tag>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Self-stake',
            sorter: true,
            render: (row) => {
                return (
                    <Tooltip overlayClassName="explorer-tooltip" title={row.stake}>
                        <Link to={'/acc/' + row.stake.replace("acc://", "")}>
                            {(row.balance / (10 ** 8)).toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
                        </Link>
                    </Tooltip>
                )
            }
        },
        {
            title: 'Total staked',
            sorter: true,
            defaultSortOrder: 'descend',
            dataIndex: 'totalStaked',
            render: (totalStaked) => {
                if ((totalStaked || totalStaked === 0) && supply?.staked ) {
                    const pt = (totalStaked / supply.staked * 100).toFixed(2)
                    return (
                        <Text>
                            <Text>{tokenAmountToLocaleString(totalStaked, 8, "ACME", 0, 0)}</Text>
                            <br/>
                            <Progress percent={pt} strokeColor={"#1677ff"} showInfo={true} className="staking-progress" />
                        </Text>
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
    ];

    const getValidators = async (params = pagination, filters, sorter) => {
        setTableIsLoading(true);

        let start = 0;
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
        let sort = "desc";
        let field = (sorter && sorter.field) || 'totalStaked';

        if (params) {
            start = (params.current - 1) * params.pageSize;
            count = params.pageSize;
            showTotalStart = (params.current - 1) * params.pageSize + 1;
            showTotalFinish = params.current * params.pageSize;
        }

        if (sorter) {
            if (sorter?.column?.title === 'Self-stake')
                field = 'balance'

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
            if (!import.meta.env.VITE_APP_METRICS_API_PATH)
                throw new Error();
            const response = await axios.get(import.meta.env.VITE_APP_METRICS_API_PATH + "/validators?start=" + start + "&count=" + count + "&sort=" + field + "&order=" + sort);
            if (response && response.data) {

                // workaround API bug response
                if (response.data.start === null || response.data.start === undefined) {
                    response.data.start = 0;
                }

                setValidators(response.data.result);
                setPagination({ ...pagination, current: (response.data.start / response.data.count) + 1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}` });
                setTotalValidators(response.data.total);
            } else {
                throw new Error("Validators not found");
            }
        }
        catch (error) {
            if (error.message)
                message.error(error.message);
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        document.title = "Validators | Accumulate Explorer";
        getSupply(setSupply);
        getValidators();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={2}>Validators</Title>

            <Card className="staking-card" style={{ marginBottom: 20 }}>
                <Tabs defaultActiveKey="TabValidators">
                    <Tabs.TabPane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiShieldCheckLine /></IconContext.Provider>About Validators</span>} key="TabValidators">
                        Validators are nodes that are responsible for verifying and validating transactions and adding them to the blockchain.<br />
                        In Accumulate validators earn <strong>10%</strong> of staking rewards.
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiTrophyLine /></IconContext.Provider>Become Validator</span>} key="TabBecomeValidator">
                        Anyone with a minimum stake of <strong>50,000 ACME</strong> can become a validator.<br />
                        <a href="https://docs.accumulatenetwork.io/accumulate/setup/validator-node-setup-with-accman" target="_blank" rel="noopener noreferrer">
                            <strong>Validator node setup<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong></a>
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                </IconContext.Provider>
                Validators List
                {totalValidators ? <Count count={totalValidators} /> : null}
            </Title>

            <Table
                dataSource={validators}
                columns={columns}
                pagination={pagination}
                rowKey="entryHash"
                loading={tableIsLoading}
                onChange={getValidators}
                sortDirections={["ascend", "descend", "ascend"]}
                scroll={{ x: 'max-content' }}
            />

        </div>
    );
}

export default Validators;
