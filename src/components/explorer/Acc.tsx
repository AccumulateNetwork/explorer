import { Alert, Skeleton, Typography } from 'antd';
import React, { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';

import { URL, errors } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  RecordType,
} from 'accumulate.js/lib/api_v3';

import { Account } from '../account/Account';
import { AccTitle } from '../common/AccTitle';
import { RawData } from '../common/RawData';
import { queryEffect } from '../common/query';
import { Message } from '../message/Message';
import { useWeb3 } from '../web3/Account';
import { MissingLiteID as Web3MissingLiteID } from '../web3/MissingLiteID';
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
  const [record, setRecord] = useState<AccountRecord | MessageRecord>(null);
  const [rawDataDisplay, setRawDataDisplay] = useState(false);
  const [error, setError] = useState(null);

  const params = useParams<{ hash: string; url: string }>();
  const url = URL.parse(
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

  if (error instanceof errors.Error && error.code === errors.Status.NotFound) {
    if (web3?.liteIdUrl?.equals(url)) {
      return <Web3MissingLiteID />;
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
