import React from 'react';

import { Link } from 'react-router-dom';

import {
    Tag, Typography, List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiPenNibLine, RiAccountCircleLine
} from 'react-icons/ri';

import Count from './Count';

const { Title, Text, Paragraph } = Typography;

const Signatures = props => {
    const sets = [];
    for (const set of props.data) {
        const signatures = [];
        for (const sig of set.signatures.records) {
            if (sig.message.type != 'signature') continue;
            signatures.push(sig.message.signature);
        }
        if (signatures.length > 0)
            sets.push({ account: set.account, signatures });
    }

    function Account(props) {
        const { account } = props;

        return (
            <strong>For {account.url}</strong>
        )
    }

    function SignatureSet(props) {
        const data = props.data;
        const level = props.level ? props.level : 0;

        const items = data.map((item) =>
            <Signature level={level} data={item} />
        );
        return (
            <div>{items}</div>
        );
    }

    function Signature(props) {
        const item = props.data;
        const level = props.level ? props.level : 0;

        if (item.type === 'authority') {
            return (
                <div>
                    <Paragraph>
                        <Tag color="yellow">Authority</Tag>&nbsp;
                        <Link to={'/acc/' + item.authority.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.authority}</Link>
                    </Paragraph>
                        {item.delegator?.map(delegator => 
                            <Paragraph key={delegator}>
                                <Tag color="green">Delegated</Tag>&nbsp;
                                <Link to={'/acc/' + delegator.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{delegator}</Link>
                            </Paragraph>
                        )}
                </div>
            )
        }

        return (
            <div className={level ? "subsignature" : null}>
                {item.signer ? (
                    <Paragraph style={{marginBottom: 5}}>
                        <Link to={'/acc/' + item.signer.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.signer}</Link>
                    </Paragraph>
                ) : null
                }
                {item.type && item.publicKey ? (
                    <Paragraph>
                        <Tag color="blue" style={{textTransform: "uppercase"}}>{item.type}</Tag>
                        <Text className="code" copyable>{item.publicKey}</Text>
                    </Paragraph>
                ) : null
                }
                {item.type && item.type === "delegated" && item.delegator && item.signature ? (
                    <div>
                        <Paragraph>
                            <Paragraph style={{marginBottom: 5}}>
                                <Link to={'/acc/' + item.delegator.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.delegator}</Link>
                            </Paragraph>
                            <Tag color="green">Delegated</Tag>
                            <Signature level={level+1} data={item.signature} />
                        </Paragraph>
                    </div>
                ) : null
                }
                {item.type && item.type === "set" && item.signatures ? (
                    <SignatureSet level={level+1} data={item.signatures} />
                ) : null
                }
            </div>
        );
    }
    
    return (
        <div style={{ marginBottom: "20px" }} >
            <Title level={4} style={{ marginTop: 30 }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiPenNibLine />
                </IconContext.Provider>
                Signatures
            </Title>
            {sets ? sets?.map(({ account, signatures }) =>
                <div key={account.url}>
                    <Title level={5}>For <Link to={'/acc/' + account.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{account.url}</Link></Title>

                    <List
                        size="small"
                        bordered
                        dataSource={signatures}
                        renderItem={signature =>
                            <List.Item>
                                <Signature data={signature} />
                            </List.Item>
                        }
                        style={{ marginBottom: "30px" }}
                />
                </div>
            ) :
                <Text disabled>N/A</Text>
            }
        </div>
    );
}

export default Signatures;