import { Descriptions, Skeleton, Tag, Typography } from 'antd';
import { useState } from 'react';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiCoinLine,
  RiInformationLine,
} from 'react-icons/ri';

import {
  SyntheticBurnTokens,
  SyntheticDepositCredits,
  SyntheticDepositTokens,
  TokenIssuer,
  TransactionType,
} from 'accumulate.js/lib/core';

import { TxnRecord, isRecordOf } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { Link } from '../common/Link';
import { queryEffect } from '../common/query';
import { Outputs } from './Outputs';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title } = Typography;

export function Deposit({
  record,
}: {
  record: TxnRecord<
    SyntheticDepositTokens | SyntheticDepositCredits | SyntheticBurnTokens
  >;
}) {
  // Load the token issuer. This serves no purpose for SyntheticDepositCredits,
  // but React does not like conditional effects.
  const txn = record.message.transaction;
  const [issuer, setIssuer] = useState<TokenIssuer>();
  queryEffect('token' in txn.body ? txn.body.token : txn.header.principal, {
    queryType: 'default',
  }).then((r) => {
    if (isRecordOf(r, TokenIssuer)) {
      setIssuer(r.account);
    }
  });

  let title = 'Deposit';
  switch (txn.body.type) {
    case TransactionType.SyntheticDepositTokens:
      title = 'Token Deposit';
      break;
    case TransactionType.SyntheticDepositCredits:
      title = 'Credit Deposit';
      break;
    case TransactionType.SyntheticBurnTokens:
      title = 'Token Burn';
      break;
  }

  return (
    <>
      <AccTitle title="Transaction" url={record.id} />
      <TxnHeader
        record={record}
        tags={txn.body.isRefund && <Tag color="orange">Refund</Tag>}
      />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        {title}
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        {!(txn.body instanceof SyntheticDepositCredits) && (
          <Descriptions.Item label="Token">
            {issuer ? (
              <Link to={issuer.url}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiCoinLine />
                </IconContext.Provider>
                {issuer.url.toString()}
              </Link>
            ) : (
              <Skeleton
                className="skeleton-singleline"
                active
                title={true}
                paragraph={false}
              />
            )}
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Amount">
          <Outputs.Amount
            issuer={issuer}
            credits={txn.body instanceof SyntheticDepositCredits}
            amount={txn.body.amount}
          />
          <br />
          <Outputs.Amount
            issuer={issuer}
            credits={txn.body instanceof SyntheticDepositCredits}
            amount={txn.body.amount}
            digits={{ min: 2, max: 2, group: true }}
            className="formatted-balance"
          />
        </Descriptions.Item>

        {txn.body.cause && (
          <Descriptions.Item label="Cause">
            <Link to={txn.body.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {txn.body.cause.toString()}
            </Link>
          </Descriptions.Item>
        )}

        {/* {txn.body.initiator && (
          <Descriptions.Item label="Initiator">
            <Link to={txn.body.initiator}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {txn.body.initiator.toString()}
            </Link>
          </Descriptions.Item>
        )} */}
      </Descriptions>
    </>
  );
}
