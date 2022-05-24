import React, { useEffect } from 'react';

import {
  Typography, Table, Row, Col, Card
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiExternalLinkLine, RiPercentFill, RiShieldCheckFill
} from 'react-icons/ri';


const { Title } = Typography;

const Validators = () => {

    const dataSource = [
        /*
        {
          position: '1',
          name: 'Inveniam',
          votingPower: 1000000,
          selfStake: 100000,
          fee: 1000,
          delegators: 150,
        },
        {
          position: '2',
          name: 'De Facto',
          votingPower: 500000,
          selfStake: 100000,
          fee: 1000,
          delegators: 120,
        },
        {
          position: '3',
          name: 'Kompendium',
          votingPower: 300000,
          selfStake: 100000,
          fee: 1000,
          delegators: 101,
        }
        */
    ];

    const columns = [
        {
            title: '#',
            width: 30,
            dataIndex: 'position',
            className: 'code',
        },
        {
            title: 'Validator',
            dataIndex: 'name',
        },
        {
            title: 'Voting Power',
            dataIndex: 'votingPower',
            className: 'code',
            render: (votingPower) => {
                return <span>{votingPower} ACME</span>
            }
        },
        {
            title: 'Self Stake',
            dataIndex: 'selfStake',
            className: 'code',
            render: (selfStake) => {
                return <span>{selfStake} ACME</span>
            }
        },
        {
            title: 'Fee',
            dataIndex: 'fee',
            className: 'code',
            render: (fee) => {
                return <span>{fee/100} %</span>
            }
        },
        {
            title: 'Delegators',
            dataIndex: 'delegators',
            className: 'code',
        }
    ];
    
    useEffect(() => {
      document.title = "Validators | Accumulate Explorer";
    }, []);

    return (
        <div>
            <Title level={2}>Validators</Title>
            <div className="stats" style={{ marginTop: 5, marginBottom: 20 }}>
                <Row gutter={[16,16]}>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiShieldCheckFill /></IconContext.Provider>
                            <br />
                            Validators
                        </span>
                        <Title level={4}>0</Title>
                    </Card>
                </Col>
                <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                    <Card>
                        <span>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiPercentFill /></IconContext.Provider>
                            <br />
                            Staking APY
                        </span>
                        <Title level={4}>0 %</Title>
                    </Card>
                </Col>
                </Row>
            </div>
            <div class="featured" style={{ marginBottom: 20 }}>
                Learn more about Accumulate validators and staking: <a href="https://accumulatenetwork.io/learn/#validators" target="_blank" rel="noopener noreferrer">
                    <strong>accumulatenetwork.io<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong>
                </a>
            </div>
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
};

export default Validators;
