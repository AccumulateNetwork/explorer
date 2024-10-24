import { Typography } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { useWeb3 } from './Context';

const { Title } = Typography;

export function Wallet() {
  const web3 = useWeb3();
  const history = useHistory();

  if (web3.accounts.length === 1) {
    history.replace(`/acc/${web3.accounts[0].liteIdentity.url.authority}`);
  }

  return (
    <>
      <Title>Wallet</Title>

      {web3.accounts.map((x) => (
        <span key={x.address}>{`${x.liteIdentity.url}`}</span>
      ))}
    </>
  );
}
