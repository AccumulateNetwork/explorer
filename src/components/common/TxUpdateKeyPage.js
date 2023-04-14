import React from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Skeleton,
    Descriptions,
    Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiCoinLine
} from 'react-icons/ri';

import TxOperations from './TxOperations';

const { Title } = Typography;

const TxUpdateKeyPage = props => {

    const tx = props.data;

    return (
        <div>

            <Title level={4} style={{ marginTop: 30 }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                </IconContext.Provider>
                Transaction Data
            </Title>

            {tx && tx.data ? (
                <Descriptions bordered column={1} size="middle">

                    <Descriptions.Item label={"Token"}>
                        {tx.origin ? (
                            <Link to={'/acc/' + tx.origin.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiCoinLine /></IconContext.Provider>{tx.origin}</Link>
                        ) :
                            <Skeleton active paragraph={false} />
                        }
                    </Descriptions.Item>

                    {tx.data.type ? (
                        <Descriptions.Item label={"Type"}>
                            <Tag color="green">{tx.data.type}</Tag>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.operation ? (
                        <Descriptions.Item label={"Operations"} className={"align-top"}>
                            <TxOperations data={tx.data.operation} showAll={true}/>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                </Descriptions>
            ) :
                <div className="skeleton-holder">
                    <Skeleton active />
                </div>
            }

        </div>
    );
}

export default TxUpdateKeyPage;