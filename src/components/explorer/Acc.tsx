import { Alert, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';
import { useHistory, useParams } from 'react-router-dom';

import { URL, errors } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { TransactionType } from 'accumulate.js/lib/core';
import { MessageType, SequencedMessage } from 'accumulate.js/lib/messaging';

import { isRecordOf } from '../../utils/types';
import { Account } from '../account/Account';
import { AccTitle } from '../common/AccTitle';
import { RawData } from '../common/RawData';
import { queryEffect } from '../common/query';
import { Message } from '../message/Message';
import { useWeb3 } from '../web3/Context';
import { MissingLiteID } from '../web3/MissingLiteID';
import Error404 from './Error404';
import { Settings } from './Settings';

const { Title } = Typography;

function tryParseURL(s: string) {
  try {
    return URL.parse(s);
  } catch (error) {
    return new URL({
      scheme: 'acc',
      hostname: s,
    } as any);
  }
}

export function Acc({
  parentCallback,
  didLoad,
}: {
  parentCallback?: any;
  didLoad?: (_: any) => void;
}) {
  const web3 = useWeb3();
  const history = useHistory();
  const [record, setRecord] = useState<AccountRecord | MessageRecord>(null);
  const [rawDataDisplay, setRawDataDisplay] = useState(false);
  const [error, setError] = useState(null);

  const params = useParams<{ hash: string; url: string }>();
  const url = tryParseURL(
    params.hash ? `${params.hash}@unknown` : `${params.url}`,
  );
  document.title = `${url.username || url.toString().replace(/^acc:\/\//, '')} | Accumulate Explorer`;

  queryEffect(url, { queryType: 'default' })
    .then((r) => {
      if (r.recordType === RecordType.Error) {
        setError(r.value);
        return;
      }
      setError(null);
      setRecord(r);
      parentCallback?.(r.asObject());
      return r;
    })
    .finally((x) => didLoad?.(x));

  // If the record is Sequenced(Transaction(Anchor)), redirect to the
  // transaction
  useEffect(() => {
    if (
      record &&
      isRecordOf(record, SequencedMessage) &&
      record.message.message.type === MessageType.Transaction &&
      (record.message.message.transaction.body.type ===
        TransactionType.DirectoryAnchor ||
        record.message.message.transaction.body.type ===
          TransactionType.BlockValidatorAnchor) &&
      record.produced?.records?.length == 1
    ) {
      history.replace(
        `/acc/${record.produced.records[0].value.toString().replace(/^acc:\/\//, '')}`,
      );
    }
  }, [record]);

  if (error instanceof errors.Error && error.code === errors.Status.NotFound) {
    const account = web3.accounts.find((x) => x.liteIdentity.url.equals(url));
    if (account) {
      return <MissingLiteID account={account} />;
    }
    return <Error404 />;
  }

  if (!record) {
    return (
      <div>
        <AccTitle
          title={url.username ? 'Transaction' : 'Account'}
          url={URL.parse(url)}
        />
        <div>
          {error ? (
            <div className="skeleton-holder">
              <Alert message={`${error}`} type="error" showIcon />
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

  return (
    <>
      {record instanceof AccountRecord ? (
        <Account record={record} />
      ) : (
        <Message record={record} />
      )}

      {Settings.enableDevMode && (
        <div>
          <Title level={4} style={{ marginTop: 30 }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiInformationLine />
            </IconContext.Provider>
            Raw Data
            <RawData.Toggle
              value={rawDataDisplay}
              onChange={setRawDataDisplay}
            />
          </Title>

          <RawData
            data={record.asObject()}
            style={{ marginTop: 0, display: rawDataDisplay ? 'block' : 'none' }}
          />
        </div>
      )}
    </>
  );
}
