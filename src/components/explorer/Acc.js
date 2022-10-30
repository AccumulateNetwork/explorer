import React, { useState, useEffect } from 'react';

import {
  Typography,
  Skeleton,
  Alert
} from 'antd';

import { useLocation } from 'react-router-dom';

import RPC from './../common/RPC';

import TokenAccount from './Acc/TokenAccount';
import Token from './Acc/Token';
import ADI from './Acc/ADI';
import KeyBook from './Acc/KeyBook';
import KeyPage from './Acc/KeyPage';
import DataAccount from './Acc/DataAccount';
import DataEntry from './Acc/DataEntry';

import GenericAcc from './Acc/GenericAcc';
import GenericTx from './Tx/GenericTx';

import ParseADI from '../common/ParseADI';

const { Title } = Typography;

const Acc = ({ match }) => {

    const location = useLocation();
    
    const [acc, setAcc] = useState(null);
    const [error, setError] = useState(null);
    const [isTx, setIsTx] = useState(false);

    const getAcc = async (url) => {
        document.title = url + " | Accumulate Explorer";
        setAcc(null);
        setError(null);
        setIsTx(false);

        // if hash params found, parse them
        if (location.hash !== '') {
            url += location.hash;
        }

        if (url.includes("@")) {
            setIsTx(true);
        }

        try {
            let params = {url: url};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                setAcc(response);
            } else {
                throw new Error("acc://" + url + " not found"); 
            }
        }
        catch(error) {
            setAcc(null);
            setError(error.message);
        }
    }

    function Render(props) {
        if (props.data) {
            if (isTx) {
                return <GenericTx data={props.data} />;
            }
            switch(props.data.type) {
                case 'liteTokenAccount':
                    props.data.lightIdentity = ParseADI(props.data.data.url);
                    return <TokenAccount data={props.data} />;
                case 'tokenAccount':
                    props.data.adi = ParseADI(props.data.data.url);
                    return <TokenAccount data={props.data} />;
                case 'token':
                    return <Token data={props.data} />;
                case 'tokenIssuer':
                    return <Token data={props.data} />;
                case 'identity':
                    return <ADI data={props.data} />;
                case 'liteIdentity':
                    return <ADI data={props.data} type="Lite Identity" />;
                case 'keyBook':
                    props.data.adi = ParseADI(props.data.data.url);
                    return <KeyBook data={props.data} />;
                case 'keyPage':
                    props.data.adi = ParseADI(props.data.data.url);
                    return <KeyPage data={props.data} />;
                case 'dataAccount':
                    props.data.adi = ParseADI(props.data.data.url);
                    return <DataAccount data={props.data} />;
                case 'liteDataAccount':
                    return <DataAccount data={props.data} />;
                case 'dataEntry':
                    return <DataEntry data={props.data} />;
                default:
                    return <GenericAcc data={props.data} />;
            }
        }
        return <Alert message="Chain does not exist" type="error" showIcon />
    }

    useEffect(() => {
        getAcc(match.params.url);
    }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

    let accountURL = "acc://" + match.params.url + (location.hash !== '' ? location.hash : "")

    return (
        <div>
            <Title level={2} className="break-all">{isTx ? "Transaction" : "Account"}</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{accountURL}</Title>
                {acc ? (
                    <Render data={acc} />
                ) :
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
                }
        </div>
    );
}

export default Acc;
