import { Alert, Input, Select, Skeleton, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { encode, encoding } from "multibase";

const { Text } = Typography;

async function doChecksum(...parts) {
    const c = await crypto.subtle.digest('SHA-256', Buffer.concat(parts));
    return Buffer.from(await crypto.subtle.digest('SHA-256', c));
}

async function formatMH(hash) {
    const checksum = (await doChecksum(Buffer.from('MH', 'utf-8'), hash)).slice(0, 4);
    const encoded = encode('base58btc', Buffer.concat([hash, checksum]));
    return 'MH' + Buffer.from(encoded).toString('utf-8');
}

async function formatAC1(hash) {
    const checksum = (await doChecksum(Buffer.from('AC1', 'utf-8'), hash)).slice(0, 4);
    const encoded = encoding('base58btc').encode(Buffer.concat([hash, checksum]));
    return 'AC1' + Buffer.from(encoded).toString('utf-8');
}

function formatFA(hash) {
    return formatWithPrefix(Buffer.from([0x5f, 0xb1]), hash);
}

async function formatBTC(hash) {
    return 'BT' + await formatWithPrefix(Buffer.from([0x00]), hash);
}

async function formatETH(hash) {
    if (hash.length > 20) {
        hash = hash.slice(0, 20);
    }
    return '0x' + hash.toString('hex');
}

async function formatWithPrefix(prefix, hash) {
    const checksum = (await doChecksum(prefix, hash)).slice(0, 4);
    const encoded = encoding('base58btc').encode(Buffer.concat([prefix, hash, checksum]))
    return Buffer.from(encoded).toString('utf-8');
}

const Key = props => {

    const [address, setAddress] = useState(null);
    const [error, setError] = useState(null);

    const getAddress = async () => {
        try {
            let hashRaw;
            if (props.publicKey) {
                const keyRaw = Buffer.from(props.publicKey, 'hex');
                hashRaw = Buffer.from(await crypto.subtle.digest('SHA-256', keyRaw));
            } else {
                hashRaw = Buffer.from(props.keyHash, 'hex');
            }

            switch (props.type) {
                case 'ed25519':
                case 'legacyED25519':
                    setAddress(await formatAC1(hashRaw));
                    break;
                case 'rcd1':
                    setAddress(await formatFA(hashRaw));
                    break;
                case 'btc':
                case 'btclegacy':
                    setAddress(await formatBTC(hashRaw));
                    break;
                case 'eth':
                    setAddress(await formatETH(hashRaw));
                    break;
                default:
                    setAddress(await formatMH(hashRaw));
                    break;
            }

        } catch (error) {
            setError(error.message);
        }
    }

    const handleChange = async event => {
        try {
            setError(null);
            let hashRaw;
            if (props.publicKey) {
                const keyRaw = Buffer.from(props.publicKey, 'hex');
                hashRaw = Buffer.from(await crypto.subtle.digest('SHA-256', keyRaw));
            } else {
                hashRaw = Buffer.from(props.keyHash, 'hex');
            }

            switch (event) {
                case 'ed25519':
                    setAddress(await formatAC1(hashRaw));
                    break;
                case 'rcd1':
                    setAddress(await formatFA(hashRaw));
                    break;
                case 'btc':
                    setAddress(await formatBTC(hashRaw));
                    break;
                case 'eth':
                    setAddress(await formatETH(hashRaw));
                    break;
                default:
                    setAddress(await formatMH(hashRaw));
                    break;
            }
        } catch (error) {
            setError(error.message);
        }
    }

    useEffect(() => {
        getAddress()
    }, []);

    return (
        <div>
            {error ?
                <div className="skeleton-holder">
                    <Alert message={error} type="error" showIcon />
                </div>
            : !address ?
                <div className="skeleton-holder">
                    <Skeleton active />
                </div>
            : props.type ?
                <span><Tag color="blue" style={{textTransform: "uppercase"}}>{props.type}</Tag><Text className="code" copyable>{address}</Text></span>
            :
                <Input.Group compact className={"key"}>
                    <Select defaultValue="raw" size="small" className="key-type" onChange={handleChange}>
                        <Select.Option value="raw">Raw</Select.Option>
                        <Select.Option value="ed25519">ED25519</Select.Option>
                        <Select.Option value="rcd1">RCD1</Select.Option>
                        <Select.Option value="btc">BTC</Select.Option>
                        <Select.Option value="eth">ETH</Select.Option>
                    </Select>
                    <Text className="key-text" copyable>{address}</Text>
                </Input.Group>
            }
        </div>
    );
}

export default Key;