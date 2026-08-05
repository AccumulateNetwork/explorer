import { Alert, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { URL, errors } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { TransactionType } from 'accumulate.js/lib/core';
import { MessageType, SequencedMessage } from 'accumulate.js/lib/messaging';

import { isRecordOf } from '../../utils/types';
import {
  encodeURLSpaces,
  parseRouteRef,
  retryWithoutOuterSpaces,
  txIdFromRef,
} from '../../utils/url';
import { Account } from '../account/Account';
import { AccTitle } from '../common/AccTitle';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { RawData } from '../common/RawData';
import { queryEffect } from '../common/query';
import { Message } from '../message/Message';
import { useWeb3 } from '../web3/Context';
import { MissingLiteID } from '../web3/MissingLiteID';
import Error404 from './Error404';
import { Settings } from './Settings';

const { Title } = Typography;

export function Acc({
  parentCallback,
  didLoad,
}: {
  parentCallback?: any;
  didLoad?: (_: any) => void;
}) {
  const web3 = useWeb3();
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState<AccountRecord | MessageRecord>(null);
  const [rawDataDisplay, setRawDataDisplay] = useState(false);
  const [error, setError] = useState(null);

  // Splat routes /acc/* and /tx/* put the (slash-containing) account or tx
  // reference in the '*' param; /tx/ carries a bare hash or a full
  // <hash>@authority TxID, /acc/ a full URL.
  const params = useParams();
  const ref = params['*'] || '';
  const isTx = location.pathname.startsWith('/tx/');
  const url = parseRouteRef(isTx ? txIdFromRef(ref) : ref);
  document.title = url
    ? `${url.username || url.toString().replace(/^acc:\/\//, '')} | Accumulate Explorer`
    : 'Not Found | Accumulate Explorer';

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
      navigate(
        `/acc/${record.produced.records[0].value.toString().replace(/^acc:\/\//, '')}`,
        { replace: true },
      );
    }
  }, [record]);

  // The reference is queried exactly as typed, so an account whose name really
  // does begin or end with a space resolves on the first attempt. Only once
  // that has actually 404'd is whitespace on either end treated as a copy/paste
  // artifact and the trimmed reference retried. Replace the history entry so
  // Back skips the reference that failed. (Whitespace around an `acc://` scheme
  // never gets this far — it is unambiguously not part of the name, so the
  // search bar drops it up front.)
  // Retry on any query failure, not just NotFound: where the stray space lands
  // decides which error comes back. In the path the node reports NotFound (404,
  // `acc://foo.acme/tokens%20` simply does not exist), but in the authority it
  // reports an encoding error (502) instead, because a space is not a legal
  // host character and the URL never parses. Both mean the same thing here.
  const notFound =
    error instanceof errors.Error && error.code === errors.Status.NotFound;
  const retry = isTx ? null : retryWithoutOuterSpaces(ref);
  const retrying = !!error && !!retry;
  useEffect(() => {
    if (retrying) {
      navigate(`/acc/${encodeURLSpaces(retry)}`, { replace: true });
    }
  }, [retrying, retry]);

  // An empty reference (/acc/ or /tx/ with nothing after it) names nothing.
  // This must come after the hooks above so the hook count stays constant.
  if (!url) {
    return <Error404 />;
  }

  if (notFound && !retrying) {
    if (web3.publicKey?.lite?.equals(url)) {
      return <MissingLiteID />;
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
          {error && !retrying ? (
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
