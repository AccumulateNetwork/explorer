import { Descriptions, Skeleton, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiCoinLine,
  RiInformationLine,
} from 'react-icons/ri';

import { core } from 'accumulate.js';
import { AccountType, TokenRecipient } from 'accumulate.js/lib/core';

import { TxnRecord, isRecordOfAccount } from '../../utils/types';
import { AccTitle } from '../common/AccTitle';
import { TokenAmount } from '../common/Amount';
import { Link } from '../common/Link';
import { Shared } from '../common/Shared';
import { useAsyncEffect } from '../common/useAsync';
import { Outputs } from './Outputs';
import { TxnHeader } from './TxnHeader';
import { TxnInfo } from './TxnInfo';
import { TxnMetadata } from './TxnMetadata';

const { Title } = Typography;

export function SendTokens({
  record,
}: {
  record: TxnRecord<core.SendTokens | core.IssueTokens>;
}) {
  // Load the token issuer
  const { api } = useContext(Shared);
  const txn = record.message.transaction;
  const [issuer, setIssuer] = useState<core.TokenIssuer>();
  useAsyncEffect(
    async (mounted) => {
      let r = await api.query(txn.header.principal);
      if (!mounted()) {
        return;
      }
      if (isRecordOfAccount(r, AccountType.TokenIssuer)) {
        setIssuer(r.account);
        return;
      }

      if (
        !isRecordOfAccount(r, AccountType.TokenAccount) &&
        !isRecordOfAccount(r, AccountType.LiteTokenAccount)
      ) {
        return;
      }

      r = await api.query(r.account.tokenUrl);
      if (mounted() && isRecordOfAccount(r, AccountType.TokenIssuer)) {
        setIssuer(r.account);
      }
    },
    [`${txn.header.principal}`],
  );

  const outputs = [
    ...(txn.body instanceof core.IssueTokens && txn.body.recipient
      ? [
          new TokenRecipient({
            url: txn.body.recipient,
            amount: txn.body.amount,
          }),
        ]
      : []),
    ...(txn.body.to || []),
  ];

  return (
    <>
      <AccTitle title="Transaction" url={record.id} />
      <TxnHeader record={record} />
      <TxnInfo record={record} />
      <TxnMetadata record={record} />

      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Token Transaction
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
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

        {issuer && outputs?.length > 1 && (
          <Descriptions.Item label="Amount">
            <TokenAmount
              issuer={issuer}
              amount={outputs.reduce((v, x) => x.amount + v, 0n)}
            />
            <br />
            <TokenAmount
              issuer={issuer}
              amount={outputs.reduce((v, x) => x.amount + v, 0n)}
              digits={{ min: 2, max: 2, group: true }}
              className="formatted-balance"
            />
          </Descriptions.Item>
        )}

        <Descriptions.Item label="From">
          <Link to={txn.header.principal}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {txn.header.principal.toString()}
          </Link>
        </Descriptions.Item>

        <Descriptions.Item label="To" className="align-top">
          <Outputs outputs={outputs} issuer={issuer} />
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
