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
import { EthPublicKey } from '../web3/Driver';
import { MissingLiteID } from '../web3/MissingLiteID';
import Error404 from './Error404';
import { Settings } from './Settings';

const { Title } = Typography;
const unknown = URL.parse('acc://unknown');

function tryParseURL(s: string) {
  try {
    return URL.parse(s);
  } catch (error) {
    return null;
  }
}

function tryParseTxID(s: string) {
  try {
    return unknown.withTxID(s).asUrl();
  } catch (error) {
    return null;
  }
}

function tryParseAddress(s: string) {
  // TODO: Add AIP-001 parsing
  return EthPublicKey.liteFromHash(s);
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

  // Determine the URL
  const params = useParams() as {
    hash?: string;
    url?: string;
    address?: string;
  };
  let url: URL;
  if (params.address) {
    url = tryParseAddress(params.address);
    if (!url) {
      return <Alert message={`"${params.address}" is not a valid address`} />;
    }
  } else if (params.hash) {
    url = tryParseTxID(params.hash);
    if (!url) {
      return <Alert message={`"${params.hash}" is not a valid hash`} />;
    }
  } else if (params.url) {
    url = tryParseURL(params.url);
    if (!url) {
      return (
        <Alert message={`"${params.url}" is not a valid Accumulate URL`} />
      );
    }
  } else {
    throw new Error('Routing error, missing params');
  }

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
