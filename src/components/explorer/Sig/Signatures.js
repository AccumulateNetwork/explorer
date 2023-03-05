/* eslint-disable default-case */
import React, { useEffect, useState } from 'react';
import { Alert, Collapse, List, Skeleton, Tag, Typography } from "antd";
import RPC from '../../common/RPC';
import { Link } from 'react-router-dom';
import { IconContext } from 'react-icons';
import { RiAccountBoxLine } from 'react-icons/ri';
import { FaFileSignature } from 'react-icons/fa';

const { Title, Text } = Typography;

async function getAccountAuthorities(url) {
    const { data: account } = await RPC.request("query", {url});

    switch (account.type) {
        case 'keyPage':
            return await getAccountAuthorities(account.keyBook);
        case 'liteTokenAccount':
            const [,id] = url.match(/^(acc:\/\/\w+)\/.*/)
            return [{url: id}]
        default:
            return account.authorities || [];
    }
}

const Signatures = props => {

    const [signatures, setSignatures] = useState(null);
    const [authorities, setAuthorities] = useState(null);
    const [error, setError] = useState(null);
    const [isLite, setIsLite] = useState(false);

    const getSignatures = async () => {
        try {
            const signatures = {};
            for (const book of props.tx.signatureBooks) {
                signatures[book.authority.toLowerCase()] = book.pages;
                for (const page of book.pages) {
                    const signatures = [];
                    for (const sig of (page.signatures || [])) {
                        if (sig.type === 'set')
                            signatures.push(...sig.signatures);
                        else
                            signatures.push(sig);
                    }
                    page.signatures = signatures;
                }
            }
            setSignatures(signatures);
        } catch (error) {
            setError(error.message);
        }
    }

    const getAuthorities = async () => {
        try {
            const { header, body } = props.tx.transaction;
            const authorities = [];

            const { data: account } = await RPC.request("query", {url: props.tx.transaction.header.principal});
            const isLite = account.type.indexOf('lite') === 0;
            setIsLite(isLite);

            const addAuth = (url, type, reason = null) => {
                url = url.toLowerCase();
                const entry = authorities.find((x) => x.url === url);
                if (entry) {
                    entry.type = type;
                    entry.reason = reason;
                } else {
                    authorities.push({ url, type, reason });
                }
            };

            for (const { url, disabled } of await getAccountAuthorities(header.principal)) {
                addAuth(url, disabled ? 'disabled' : 'account');
            }

            switch (body.type) {
            case 'updateKeyPage':
                for (const op of body.operation) {
                    switch (op.type) {
                        case 'add':
                            if (op.entry.delegate) {
                                addAuth(op.entry.delegate, 'additional', 'new delegate');
                            }
                            break;
                    }
                }
                break;
            case 'updateAccountAuth':
                for (const op of body.operations) {
                    switch (op.type) {
                        case 'addAuthority':
                            addAuth(op.authority, 'additional', 'new authority');
                            break;
                    }
                }
                break;
            }

            setAuthorities(authorities);
        }
        catch (error) {
            setError(error.message);
        }
    };

    const getSigners = async () => {
        try {
            await Promise.all(props.tx.signatureBooks.flatMap(async (book) =>
                book.pages.map(async (page) => {
                    const { data: account } = await RPC.request("query", {url: page.signer.url});
                    page.signer = account;
                })
            ))
        } catch (error) {
            setError(error.message);
        }
    };

    useEffect(() => {
        getSignatures();
    }, []);

    useEffect(() => {
        getAuthorities();
    }, []);

    useEffect(() => {
        getSigners();
    }, []);

    const renderSignature = (item) => {
        while (item.type === 'set') {
            item = item.signatures[0];
        }
        switch (item.type) {
            case 'delegated':
                return (
                    <span><Tag color="green">Delegate</Tag><Link to={'/acc/' + item.signature.signer.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>{item.signature.signer}</Link></span>
                )
            case 'ed25519':
            case 'legacyED25519':
                return (
                    <span><Tag color="blue">ED25519</Tag><Text className="code" copyable>{item.publicKey}</Text></span>
                )
            case 'rcd1':
                return (
                    <span><Tag color="blue">RCD1</Tag><Text className="code" copyable>{item.publicKey}</Text></span>
                )
            case 'btc':
            case 'btclegacy':
                return (
                    <span><Tag color="blue">BTC</Tag><Text className="code" copyable>{item.publicKey}</Text></span>
                )
            case 'eth':
                return (
                    <span><Tag color="blue">ETH</Tag><Text className="code" copyable>{item.publicKey}</Text></span>
                )
            default:
                return (
                    <span><Tag color="gray">{item.type}</Tag>{JSON.stringify(item)}</span>
                )
        }
    }

    return (
        <div>
            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                <FaFileSignature />
                </IconContext.Provider>
                Signatures
            </Title>

            {!authorities ?
                <div>
                    {error ? (
                        <div className="skeleton-holder">
                            <Alert message={error} type="error" showIcon />
                        </div>
                    ) :
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                    }
                </div>
            : isLite ?
                <List
                    size="small"
                    bordered
                    dataSource={signatures[authorities[0].url][0].signatures}
                    renderItem={item =>
                        <List.Item>{renderSignature(item)}</List.Item>
                    }
                />
            :
                <List
                    size="large"
                    bordered
                    dataSource={authorities}
                    renderItem={item =>
                        <List.Item key={item.url}>
                            <div>
                                <span>
                                    {item.type === 'account'    ? <Tag color="green">Authority</Tag>
                                    :item.type === 'disabled'   ? <Tag color="gray">Disabled</Tag>
                                    :item.type === 'additional' ? <Tag color="blue">Additional</Tag>
                                    :                             <Tag color="gray">{item.type}</Tag>}
                                    <Link to={'/acc/' + item.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>{item.url}</Link>
                                </span>

                                {item.url in signatures ?
                                    <Collapse ghost defaultActiveKey={[]}>
                                        {signatures[item.url].map((page) =>
                                            <Collapse.Panel header={
                                                    <span>
                                                        <Link to={'/acc/' + page.signer.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>Page {page.signer.url.match(/\/(\d+)/)[1]}</Link>
                                                        {page.signer.acceptThreshold > 1 ? (
                                                            <span>
                                                                <Tag color="cyan" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Multi-sig</Tag>
                                                                <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Sig Threshold: <strong>{page.signer.acceptThreshold}</strong></Tag>
                                                            </span>
                                                        ) : null}
                                                        <Tag style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>Signatures: <strong>{page.signatures.length}</strong></Tag>
                                                    </span>
                                                } key={page.signer.url}>
                                                <List
                                                    size="small"
                                                    bordered
                                                    dataSource={page.signatures}
                                                    renderItem={item =>
                                                        <List.Item>{renderSignature(item)}</List.Item>
                                                    }
                                                />
                                            </Collapse.Panel>
                                        )}
                                    </Collapse>
                                :
                                    <Tag color="orange" style={{textTransform: "uppercase"}}><IconContext.Provider value={{ className: 'react-icons' }}></IconContext.Provider>No signatures</Tag>
                                }
                            </div>
                        </List.Item>
                    }
                />
            }
        </div>
    )
};

export default Signatures