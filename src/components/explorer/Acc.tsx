import { Record, RecordType } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';
import { Alert, Rate, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  addFavourite,
  isFavourite,
  removeFavourite,
} from '../common/Favourites';
import ParseADI from '../common/ParseADI';
import ParseDataAccount from '../common/ParseDataAccount';
import RPC from '../common/RPC';
import { queryEffect } from '../common/Shared';
import ADI from './Acc/ADI';
import DataAccount from './Acc/DataAccount';
import DataEntry from './Acc/DataEntry';
import GenericAcc from './Acc/GenericAcc';
import KeyBook from './Acc/KeyBook';
import KeyPage from './Acc/KeyPage';
import Token from './Acc/Token';
import TokenAccount from './Acc/TokenAccount';
import GenericMsg from './Tx/GenericMsg';
import GenericTx from './Tx/GenericTx';

const { Title } = Typography;

const Acc = ({ match, parentCallback }) => {
  const location = useLocation();

  const [acc, setAcc] = useState(null);
  const [acc2, setAcc2] = useState<Record>(null);
  const [error, setError] = useState(null);
  const [isTx, setIsTx] = useState(false);
  const [isFav, setIsFav] = useState(-1);

  const sendToWeb3Module = (e) => {
    parentCallback(e);
  };

  const getAcc = async (url) => {
    document.title = url + ' | Accumulate Explorer';
    setAcc(null);
    setError(null);
    setIsTx(false);

    // if hash params found, parse them
    if (location.hash !== '') {
      url += location.hash;
    }

    if (url.includes('@')) {
      setIsTx(true);

      // Using @unknown for transactions ensures the query fetches
      // signatures from all network partitions
      url = url.replace(/@.*/, '@unknown');
    }
    // Query API v3
    try {
      let params = { scope: url };
      const response = await RPC.request('query', params, 'v3');
      if (!response) {
        throw new Error('acc://' + url + ' not found');
      }
      setAcc({ ...response });
    } catch (error) {
      setAcc(null);
      setError(error.message);
    }
  };

  function extractTxHash(txID) {
    const regex = /acc:\/\/([^@]+)/;
    const match = txID.match(regex);

    if (match && match[1]) {
      return match[1];
    } else {
      return null; // or handle the case when the hash is not found
    }
  }

  function Render(props) {
    if (props.data) {
      setTimeout(() => sendToWeb3Module(props.data), 0);

      if (isTx) {
        props.data.transactionHash = extractTxHash(props.data.id);
        switch (props.data.message.type) {
          case 'transaction':
            return <GenericTx data={props.data} />;
          default:
            return <GenericMsg data={props.data} />;
        }
      }
      switch (props.data.account.type) {
        case 'token':
          return <Token data={props.data} />;
        case 'tokenIssuer':
          return <Token data={props.data} />;
        case 'identity':
          return <ADI data={props.data} />;
        case 'liteIdentity':
          return <ADI data={props.data} type="Lite Identity" />;
        case 'keyBook':
          props.data.adi = ParseADI(props.data.account.url);
          return <KeyBook data={props.data} />;
        case 'keyPage':
          props.data.adi = ParseADI(props.data.account.url);
          return <KeyPage data={props.data} />;
        case 'dataAccount':
          props.data.adi = ParseADI(props.data.account.url);
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
    return <Alert message="Chain does not exist" type="error" showIcon />;
  }

  useEffect(() => {
    let url =
      'acc://' + match.params.url + (location.hash !== '' ? location.hash : '');
    isFavourite(url) ? setIsFav(1) : setIsFav(0);
    getAcc(match.params.url);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  let accountURL =
    'acc://' + match.params.url + (location.hash !== '' ? location.hash : '');

  queryEffect(accountURL, { queryType: 'default' }).then((r) => setAcc2(r));

  const handleFavChange = (e) => {
    if (e === 0) {
      removeFavourite(accountURL);
    } else {
      addFavourite(accountURL);
    }
  };

  let title = 'Account';
  if (isTx) {
    title = 'Message';
  }
  if (isTx && acc?.message) {
    /* eslint-disable default-case */
    switch (acc.message.type) {
      case 'transaction':
        title = 'Transaction';
        break;
      case 'signature':
        title = 'Signature';
        break;
      case 'creditPayment':
        title = 'Credit Payment';
        break;
      case 'signatureRequest':
        title = 'Signature Request';
        break;
    }
    /* eslint-enable default-case */
  }

  const titleEl = [
    <Title level={2} className="break-all" key="main">
      {title}
    </Title>,
    <Title
      level={4}
      key="sub"
      type="secondary"
      style={{ marginTop: '-10px' }}
      className="break-all"
      copyable={{ text: accountURL }}
    >
      {!isTx && acc && isFav !== -1 ? (
        <Rate
          className={'acc-fav'}
          count={1}
          defaultValue={isFav}
          onChange={(e) => {
            handleFavChange(e);
          }}
        />
      ) : null}

      {accountURL}
    </Title>,
  ];

  if (!acc) {
    return (
      <div>
        {title}
        <div>
          {error ? (
            <div className="skeleton-holder">
              <Alert message={error} type="error" showIcon />
            </div>
          ) : (
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (acc2?.recordType === RecordType.Account) {
    switch (acc2.account.type) {
      case AccountType.TokenAccount:
      case AccountType.LiteTokenAccount:
        return (
          <div>
            {titleEl}
            <TokenAccount record={acc2} />
          </div>
        );
    }
  }

  return (
    <div>
      {titleEl}
      {acc ? (
        <Render data={acc} data2={acc2} />
      ) : (
        <div>
          {error ? (
            <div className="skeleton-holder">
              <Alert message={error} type="error" showIcon />
            </div>
          ) : (
            <div className="skeleton-holder">
              <Skeleton active />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Acc;
