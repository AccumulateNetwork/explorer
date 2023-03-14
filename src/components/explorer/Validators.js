import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography, Descriptions, Table, Tag, Tooltip, message
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiQuestionLine, RiAccountCircleLine
} from 'react-icons/ri';

import Count from '../common/Count';
import tooltipDescs from '../common/TooltipDescriptions';
import axios from 'axios';

const { Title, Text } = Typography;

const Validators = () => {

    const [validators, setValidators] = useState(null);
    const [totalValidators, setTotalValidators] = useState(-1);

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
            dataIndex: 'type',
            render: (type) => {
                if (type) {
                    return (
                        <Tag color="green">{type}</Tag>
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
            dataIndex: 'totalStaked',
            render: (totalStaked) => {
                if (totalStaked || totalStaked === 0) {
                    return (
                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.balance}><RiQuestionLine /></Tooltip></IconContext.Provider>Total staked</nobr></span>}>
                            {(totalStaked / (10 ** 8)).toLocaleString('en-US', { maximumFractionDigits: 0 })} ACME
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
            const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/validators?start=" + start + "&count=" + count + "&sort=" + field + "&order=" + sort);
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
            message.error(error.message);
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        document.title = "Validators | Accumulate Explorer";
        getValidators();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Title level={3}>
                Validators
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
