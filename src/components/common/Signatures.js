import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    Tag, Typography, List, Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiPenNibLine, RiAccountCircleLine
} from 'react-icons/ri';

import RPC from './../common/RPC';

const { Title, Text, Paragraph } = Typography;

const Signatures = props => {
    const transaction = props.transaction;

    const [authorities, setAuthorities] = useState(null);

    const getAuthorities = async(scope) => {
        while (true) {
            const { account } = await RPC.request("query", { scope }, 'v3');
    
            switch (account.type) {
                case 'keyPage':
                    scope = account.keyBook;
                    continue;
                case 'liteTokenAccount':
                    const [,id] = scope.match(/^(acc:\/\/\w+)\/.*/);
                    return [{ url: id }];
                default:
                    return account.authorities || [];
            }
        }
    }

    const getAllAuthorities = async () => {
        try {
            const authorities = [];
            const addAuth = (url) => {
                url = url.toLowerCase();
                if (!authorities.find(x => x.toLowerCase() === url.toLowerCase())) {
                    authorities.push(url);
                }
            };

            for (const { url, disabled } of await getAuthorities(transaction.header.principal)) {
                if (!disabled) addAuth(url);
            }

            switch (transaction.body.type) {
                case 'updateKeyPage':
                    for (const op of transaction.body.operation) {
                        switch (op.type) {
                            case 'add':
                                if (op.entry.delegate) {
                                    addAuth(op.entry.delegate);
                                }
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                case 'updateAccountAuth':
                    for (const op of transaction.body.operations) {
                        switch (op.type) {
                            case 'addAuthority':
                                addAuth(op.authority);
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                default:
                    break;
            }

            setAuthorities(authorities);
        }
        catch (error) {
            console.log(error);
        }
    };

    const signatures = [];
    let principalSigs = [];
    for (const set of props?.data) {
        if (set.account.url.toLowerCase() === transaction.header.principal.toLowerCase()) {
            principalSigs = set.signatures.records;
        }

        for (const sig of set.signatures.records) {
            if (sig.message.type !== 'signature') continue;
            if (sig.message.signature.type === 'authority') continue;
            signatures.push(sig.message.signature);
        }
    }

    const signatureAuthority = (signature) => {
        if (signature.type === 'delegated')
            return signature?.delegator?.replace(/\/\d+$/, '') || '';
        return signature?.signer?.replace(/\/\d+$/, '') || '';
    }

    const signaturesForAuthority = (authority) => {
        return signatures.filter(x => signatureAuthority(x).toLowerCase() === authority.toLowerCase());
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
                        {item.vote === 'reject' && <Tag color="red">Reject</Tag>}
                        {item.vote === 'abstain' && <Tag color="yellow">Abstain</Tag>}
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

    function ListOfSignatures({ signatures, ...props }) {
        return (
            <List
                {...props}
                size="small"
                dataSource={signatures}
                renderItem={signature =>
                    <List.Item>
                        <Signature data={signature} />
                    </List.Item>
                }
            />
        )
    }

    function Required() {
        const creditPayments = principalSigs.filter(x => x.message.type === 'creditPayment');
        const otherSigs = signatures.filter(x => !authorities.some(y => signatureAuthority(x).toLowerCase() === y.toLowerCase()));
        const columns = [
            {
                key: 'type',
                render(_, authority) {
                    if (authority === 'credits') {
                        return <span>Credits</span>
                    }
                    if (authority === 'other') {
                        return <span>Other</span>
                    }
                    return <span>Authority</span>
                }
            },
            {
                key: 'info',
                render(_, authority) {
                    if (authority === 'credits') {
                        const paid = creditPayments.reduce((sum, x) => sum + x.message.paid, 0);
                        return <span>{paid * 1e-2} paid</span>
                    }
                    if (authority === 'other') {
                        return <span>{otherSigs.length} signature(s)</span>;
                    }
                    return <Link to={'/acc/' + authority.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{authority}</Link>
                }
            },
            {
                key: 'status',
                render(_, authority) {
                    if (authority === 'other') {
                        return;
                    }
                    const status = authority === 'credits'
                        ? creditPayments.length > 0
                        : principalSigs.some(x => x.message.type === 'signature' && x.message.signature.type === 'authority' && x.message.signature.authority.toLowerCase() === authority.toLowerCase());

                    if (status)
                        return <Tag color="green">Received</Tag>
                    return <Tag color="yellow">Pending</Tag>
                }
            }
        ]

        const rowExpandable = (authority) => {
            if (authority === 'credits') {
                return creditPayments.length > 0
            }
            if (authority === 'other') {
                return otherSigs.length > 0
            }
            return signaturesForAuthority(authority).length > 0
        }

        const expandedRowRender = (authority) => {
            if (authority === 'credits') {
                return (
                    <div>
                        {creditPayments.map(x =>
                            <div key={x.id}>
                                {x.message.paid * 1e-2} paid by <Link to={'/acc/' + x.message.payer.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{x.message.payer}</Link>
                            </div>
                        )}
                    </div>
                )
            }
            if (authority === 'other') {
                return <ListOfSignatures signatures={otherSigs} />
            }
            return <ListOfSignatures signatures={signaturesForAuthority(authority)} />
        }

        return (
            <Table
                showHeader={false}
                dataSource={[
                    'credits',
                    ...authorities,
                    ...(otherSigs.length > 0 ? ['other'] : []),
                ]}
                columns={columns}
                rowKey={(authority) => authority}
                pagination={false}
                expandable={{ expandedRowRender, rowExpandable }}
            />
        )
    }

    useEffect(() => {
        getAllAuthorities(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    
    return (
        <div style={{ marginBottom: "20px" }} >
            <Title level={4} style={{ marginTop: 30 }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiPenNibLine />
                </IconContext.Provider>
                Signatures
            </Title>
            {!signatures?.length ?
                <Text disabled>N/A</Text>
            : !authorities?.length ?
                <ListOfSignatures bordered signatures={signatures} />
            :
                <Required />
            }
        </div>
    );
}

export default Signatures;