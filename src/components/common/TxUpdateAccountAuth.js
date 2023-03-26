import React from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Skeleton,
    Descriptions,
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiCoinLine
} from 'react-icons/ri';

import TxOperation from './TxOperations';

const { Title, Text } = Typography;

const TxUpdateAccountAuth = props => {

    const tx = props.data;

    return (
        <div>

            <Title level={4} style={{ marginTop: 30 }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiInformationLine />
                </IconContext.Provider>
                Transaction Data!
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
                            <Text>{tx.data.type}</Text>
                        </Descriptions.Item>
                    ) :
                        null
                    }

                    {tx.data.operations ? (
                        <Descriptions.Item label={"To"} className={"align-top"}>
                            <TxOperation data={tx.data.operations} />
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

export default TxUpdateAccountAuth;