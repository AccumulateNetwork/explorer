import { Alert, Skeleton } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { URL } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { TransactionMessage } from 'accumulate.js/lib/messaging';

import RPC from '../../utils/RPC';
import { isRecordOf } from '../../utils/types';
import { Account } from '../account/Account';
import { AccTitle } from '../common/AccTitle';
import { queryEffect } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';
import GenericMsg from '../message/GenericMsg';
import { Transaction } from '../message/Transaction';

const Acc = ({ match, parentCallback }) => {
  const location = useLocation();

  const [acc, setAcc] = useState(null);
  const [acc2, setAcc2] = useState<AccountRecord | MessageRecord>(null);
  const [error, setError] = useState(null);
  const [isTx, setIsTx] = useState(false);

  let url = match.params.hash
    ? `${match.params.hash}@unknown`
    : `${match.params.url}`;

  queryEffect(url, { queryType: 'default' }).then((r) => {
    if (r.recordType === RecordType.Error) {
      setError(r.value.message);
      return;
    }
    setAcc2(r);
  });

  useAsyncEffect(
    async (mounted) => {
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
      }

      // Query API v3
      try {
        let params = { scope: url };
        const response = await RPC.request('query', params, 'v3');
        if (!mounted()) return;
        if (!response) {
          throw new Error('acc://' + url + ' not found');
        }
        setAcc({ ...response });
        parentCallback?.({ ...response });
      } catch (error) {
        if (!mounted()) return;
        setAcc(null);
        setError(error.message);
      }
    },
    [url],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  let accountURL = match.params.hash
    ? `acc://${match.params.hash}@unknown`
    : `acc://${match.params.url}${location.hash !== '' ? location.hash : ''}`;

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

  if (acc2?.recordType === RecordType.Account) {
    return <Account record={acc2} />;
  }
  if (acc2 && isRecordOf(acc2, TransactionMessage)) {
    return <Transaction record={acc2} />;
  }

  return (
    <div>
      <AccTitle title={title} url={URL.parse(accountURL)} />
      <GenericMsg data={acc} />
    </div>
  );
};

export default Acc;
