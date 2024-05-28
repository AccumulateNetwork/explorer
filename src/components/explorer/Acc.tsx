import { Alert, Rate, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AccountRecord, Record, RecordType } from 'accumulate.js/lib/api_v3';
import { AccountType } from 'accumulate.js/lib/core';

import RPC from '../../utils/RPC';
import {
  addFavourite,
  isFavourite,
  removeFavourite,
} from '../common/Favourites';
import { queryEffect } from '../common/Shared';
import { DataAccount } from './Acc/DataAccount';
import { Identity } from './Acc/Identity';
import { KeyBook } from './Acc/KeyBook';
import { KeyPage } from './Acc/KeyPage';
import { TokenAccount } from './Acc/TokenAccount';
import { TokenIssuer } from './Acc/TokenIssuer';
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
        {titleEl}
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
    let Account: (_: { record: AccountRecord }) => React.ReactNode | undefined;

    switch (acc2.account.type) {
      case AccountType.LiteIdentity:
      case AccountType.Identity:
        Account = Identity;
        break;

      case AccountType.LiteTokenAccount:
      case AccountType.TokenAccount:
        Account = TokenAccount;
        break;

      case AccountType.LiteDataAccount:
      case AccountType.DataAccount:
        Account = DataAccount;
        break;

      case AccountType.TokenIssuer:
        Account = TokenIssuer;
        break;

      case AccountType.KeyPage:
        Account = KeyPage;
        break;

      case AccountType.KeyBook:
        Account = KeyBook;
        break;
    }
    if (Account) {
      return (
        <div>
          {titleEl}
          <Account record={acc2} />
        </div>
      );
    }
  }

  return (
    <div>
      {titleEl}
      <Render data={acc} data2={acc2} />
    </div>
  );
};

export default Acc;
