import React, { useState, useEffect } from 'react';

import {
  Typography,
  Skeleton,
  Alert,
  Rate
} from 'antd';

import { useLocation } from 'react-router-dom';

import RPC from './../common/RPC';

import TokenAccount from './Acc/TokenAccount';
import Token from './Acc/Token';
import ADI from './Acc/ADI';
import { isFavourite, addFavourite, removeFavourite } from '../common/Favourites';
import KeyBook from './Acc/KeyBook';
import KeyPage from './Acc/KeyPage';
import DataAccount from './Acc/DataAccount';
import DataEntry from './Acc/DataEntry';

import GenericAcc from './Acc/GenericAcc';
import GenericTx from './Tx/GenericTx';

import ParseADI from '../common/ParseADI';
import ParseDataAccount from '../common/ParseDataAccount';
import GenericMsg from './Tx/GenericMsg';

const { Title } = Typography;

const Acc = ({ match, parentCallback }) => {

    const location = useLocation();
    
    const [acc, setAcc] = useState(null);
    const [error, setError] = useState(null);
    const [isTx, setIsTx] = useState(false);
    const [isFav, setIsFav] = useState(-1);

    const sendToWeb3Module = e => {
        parentCallback(e);
    }

    const getAcc = async (url) => {
        document.title = url + " | Accumulate Explorer";
        setAcc(null);
        setError(null);
        setIsTx(false);

        // if hash params found, parse them
        if (location.hash !== '') {
            url += location.hash;
        }

        let v3;
        if (url.includes("@")) {
            setIsTx(true);

            // Using @unknown for transactions ensures the query fetches
            // signatures from all network partitions
            url = url.replace(/@.*/, '@unknown');

            // Query API v3
            try {
                let params = { scope: url };
                v3 = await RPC.request("query", params, 'v3');
                if (!v3) {
                    throw new Error("acc://" + url + " not found"); 
                }

                // Only query API v2 if the message is a transaction
                if (v3.message.type !== 'transaction') {
                    setAcc({ v3 });
                    return;
                }
            }
            catch(error) {
                setAcc(null);
                setError(error.message);
                return;
            }
        }

        try {
            let params = {url: url};
            const response = await RPC.request("query", params);
            if (response && response.data) {
                setAcc({ ...response, v3 });
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
            setTimeout(() => sendToWeb3Module(props.data), 0);
            
            if (isTx) {
                switch (props.data.v3.message.type) {
                    case 'transaction':
                        return <GenericTx data={props.data} />;
                    default:
                        return <GenericMsg data={props.data.v3} />;
                }
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
                    props.data.account = ParseDataAccount(props.data.data.txId);
                    return <DataEntry data={props.data} />;
                default:
                    return <GenericAcc data={props.data} />;
            }
        }
        return <Alert message="Chain does not exist" type="error" showIcon />
    }

    useEffect(() => {
        let url = "acc://" + match.params.url + (location.hash !== '' ? location.hash : "");
        isFavourite(url) ? setIsFav(1) : setIsFav(0);
        getAcc(match.params.url);
    }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

    let accountURL = "acc://" + match.params.url + (location.hash !== '' ? location.hash : "")

    const handleFavChange = (e) => {
        if (e === 0) {
            removeFavourite(accountURL);
        } else {
            addFavourite(accountURL);
        }
    }

    let title = "Account";
    if (isTx) {
        title = "Message"
    }
    if (isTx && acc?.v3?.message) {
        /* eslint-disable default-case */
        switch (acc.v3.message.type) {
            case 'transaction':
                title = "Transaction";
                break;
            case 'signature':
                title = "Signature";
                break;
            case 'creditPayment':
                title = "Credit Payment";
                break;
            case 'signatureRequest':
                title = "Signature Request";
                break;
        }
        /* eslint-enable default-case */
    }

    return (
        <div>
            <Title level={2} className="break-all">{title}</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable={{text: accountURL}}>
                {!isTx && acc && isFav !== -1 ? (
                    <Rate className={"acc-fav"} count={1} defaultValue={isFav} onChange={(e) => { handleFavChange(e) }} />
                ) : null}
                
                {accountURL}
            </Title>
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
