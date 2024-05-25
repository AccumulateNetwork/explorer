import { Alert, Descriptions, Skeleton, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiCoinLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

import RPC from '../common/RPC';
import getToken from './GetToken';
import TxTo from './TxTo';

const { Title } = Typography;

const TxSendTokens = (props) => {
  const tx = props.data;
  const [tokenAccount, setTokenAccount] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  const getTokenAccount = async () => {
    setTokenAccount(null);
    setError(null);
    try {
      const response = await RPC.request(
        'query',
        { scope: tx.message.transaction.header.principal },
        'v3',
      );
      if (response && response.account) {
        setTokenAccount(response.account);
      } else {
        throw new Error(
          'Token account ' +
            tx.message.transaction.header.principal +
            ' not found',
        );
      }
    } catch (error) {
      setTokenAccount(null);
      setError(error.message);
    }
  };

  useEffect(() => {
    if (tokenAccount?.tokenUrl)
      getToken(tokenAccount.tokenUrl, setToken, setError);
  }, [tokenAccount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getTokenAccount();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Token Transaction
      </Title>

      {tx?.message?.transaction ? (
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label={'Token'}>
            {tokenAccount && tokenAccount.tokenUrl ? (
              <Link to={'/acc/' + tokenAccount.tokenUrl.replace('acc://', '')}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiCoinLine />
                </IconContext.Provider>
                {tokenAccount.tokenUrl}
              </Link>
            ) : (
              <Skeleton active paragraph={false} />
            )}
          </Descriptions.Item>

          {tx.message.transaction.header.principal ? (
            <Descriptions.Item label={'From'}>
              <Link
                to={
                  '/acc/' +
                  tx.message.transaction.header.principal.replace('acc://', '')
                }
              >
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {tx.message.transaction.header.principal}
              </Link>
            </Descriptions.Item>
          ) : null}

          {tx.message.transaction.body?.to ? (
            <Descriptions.Item label={'To'} className={'align-top'}>
              {tokenAccount && token && (
                <TxTo data={tx.message.transaction.body.to} token={token} />
              )}
              {error && <Alert message={error} type="error" showIcon />}
              {!error && !(tokenAccount && token) && (
                <Skeleton active title={false} />
              )}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      ) : (
        <div className="skeleton-holder">
          <Skeleton active />
        </div>
      )}
    </div>
  );
};

export default TxSendTokens;
