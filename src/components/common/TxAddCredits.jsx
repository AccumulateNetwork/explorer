import React from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    Skeleton,
    Descriptions
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine
} from 'react-icons/ri';

const { Title, Text } = Typography;

const TxAddCredits = props => {

    const tx = props.data;

    return (
        <div>

        <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiInformationLine />
            </IconContext.Provider>
            Credits Transaction
        </Title>

        {tx?.message?.transaction ? (
            <Descriptions bordered column={1} size="middle">

                {tx.message.transaction.body.recipient &&
                    <Descriptions.Item label={"Recipient"}>
                        <Link to={'/acc/' + tx.message.transaction.body.recipient.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{tx.message.transaction.body.recipient}</Link>
                    </Descriptions.Item>
                }

                {(tx.message.transaction.body.amount && tx.message.transaction.body.oracle) &&
                    <>
                        <Descriptions.Item label={"Credits"}>
                            <Text>{tx.message.transaction.body.amount * tx.message.transaction.body.oracle * 1e-10} credits</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label={"ACME spent"}>
                            <Text>{tx.message.transaction.body.amount / (10**8)} ACME</Text>
                        </Descriptions.Item>
                    </>
            }

                {tx.message.transaction.body.oracle &&
                    <Descriptions.Item label={"Oracle"}>
                        <Text className={"code"}>{tx.message.transaction.body.oracle}</Text>
                    </Descriptions.Item>
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

export default TxAddCredits;