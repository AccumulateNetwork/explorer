import { Address } from "accumulate.js";
import { SignatureType } from "accumulate.js/lib/core";
import { Alert, Input, Select, Skeleton, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { Settings } from "../explorer/Settings";

const { Text } = Typography;

const Key = props => {

    const [address, setAddress] = useState(null);
    const [error, setError] = useState(null);

    const getAddress = async (type) => {
        try {
            let hash;
            if (props.publicKey) {
                const keyRaw = Buffer.from(props.publicKey, 'hex');
                hash = Buffer.from(await crypto.subtle.digest('SHA-256', keyRaw));
            } else {
                hash = Buffer.from(props.keyHash, 'hex');
            }

            if (type === 'hex') {
                setAddress(hash.toString('hex'));
                return;
            }

            if (type)
                ; // Ok
            else if (props.type)
                type = SignatureType.byName(props.type);
            else
                type = SignatureType.Unknown;

            const addr = await Address.fromKeyHash(type, hash);
            setAddress(await addr.format());
        } catch (error) {
            setError(error.message);
        }
    }

    const handleChange = async event => {
        try {
            getAddress(event === 'hex' ? event : SignatureType.byName(event));
        } catch (error) {
            setError(error.message);
        }
    }

    useEffect(() => {
        getAddress();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {error ?
                <Alert message={error} type="error" showIcon />
            : !address ?
                <Skeleton active title={true} paragraph={false} />
            : props.type ?
                <span><Tag color="blue" style={{textTransform: "uppercase"}}>{props.type}</Tag><Text className="code" copyable>{address}</Text></span>
            :
                <Input.Group compact className={"key"}>
                    <Select defaultValue="unknown" size="small" className="key-type" onChange={handleChange}>
                        <Select.Option value="unknown">Address</Select.Option>
                        <Select.Option value="hex">Hash</Select.Option>
                        {Settings.enableDevMode && <Select.Option value="ed25519">ED25519</Select.Option>}
                        {Settings.enableDevMode && <Select.Option value="rcd1">RCD1</Select.Option>}
                        {Settings.enableDevMode && <Select.Option value="btc">BTC</Select.Option>}
                        {Settings.enableDevMode && <Select.Option value="eth">ETH</Select.Option>}
                    </Select>
                    <Text className="key-text" copyable>{address}</Text>
                </Input.Group>
            }
        </div>
    );
}

export default Key;