import { Alert, Skeleton } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { URL } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { TransactionType } from 'accumulate.js/lib/core';
import { MessageType } from 'accumulate.js/lib/messaging';

import RPC from '../../utils/RPC';
import { TxnRecord } from '../../utils/types';
import { Account } from '../account/Account';
import { AccTitle } from '../common/AccTitle';
import { queryEffect } from '../common/Shared';
import GenericMsg from '../message/GenericMsg';
import GenericTx from '../message/GenericTx';
import { Transaction } from '../message/Transaction';

const Acc = ({ match, parentCallback }) => {
  const location = useLocation();

  const [acc, setAcc] = useState(null);
  const [acc2, setAcc2] = useState<AccountRecord | MessageRecord>(null);
  const [error, setError] = useState(null);
  const [isTx, setIsTx] = useState(false);

  queryEffect(match.params.url, { queryType: 'default' }).then((r) => {
    if (r.recordType === RecordType.Error) {
      setError(r.value.message);
      return;
    }
    setAcc2(r);
  });

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
    getAcc(match.params.url);
  }, [`${match.params.url}`]); // eslint-disable-line react-hooks/exhaustive-deps

  let accountURL =
    'acc://' + match.params.url + (location.hash !== '' ? location.hash : '');

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

  if (!acc || !acc2) {
    return (
      <div>
        <AccTitle title={title} url={URL.parse(accountURL)} />
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

  switch (acc2?.recordType) {
    case RecordType.Account:
      return <Account record={acc2} />;
    case RecordType.Message:
      if (acc2.message.type === MessageType.Transaction) {
        switch (acc2.message.transaction.body.type) {
          case TransactionType.AddCredits:
          case TransactionType.SendTokens:
          case TransactionType.IssueTokens:

          case TransactionType.WriteData:
          case TransactionType.WriteDataTo:
          case TransactionType.SyntheticWriteData:
          case TransactionType.SystemWriteData:

          case TransactionType.SyntheticDepositTokens:
          case TransactionType.SyntheticDepositCredits:
          case TransactionType.SyntheticBurnTokens:
            return <Transaction record={acc2 as TxnRecord} />;
        }
      }
  }

  return (
    <div>
      <AccTitle title={title} url={URL.parse(accountURL)} />
      <Render data={acc} data2={acc2} />
    </div>
  );
};

export default Acc;
