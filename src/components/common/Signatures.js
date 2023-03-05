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
    const signatures = props.data.filter(signature => signature.signer || signature.delegator);

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
                <Count count={signatures && signatures.length ? signatures.length : 0} />
            </Title>
            {(signatures && signatures.length>0) ? (
                <List
                    size="small"
                    bordered
                    dataSource={signatures}
                    renderItem={item =>
                        <List.Item>
                            <Signature data={item} />
                        </List.Item>
                    }
                    style={{ marginBottom: "30px" }}
                />
            ) :
                <Text disabled>N/A</Text>
            }
        </div>
    );
}

export default Signatures;