import { CheckCircleTwoTone, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React, { useState } from 'react';

import { URL } from 'accumulate.js';

import tooltip from '../../utils/lang';
import { WithIcon } from '../common/WithIcon';
import { useWeb3 } from './Account';
import { Sign } from './Sign';

export function Register({
  children,
  book,
  kind,
}: {
  children: React.ReactNode;
  book: URL;
  kind: 'book' | 'page';
}) {
  const account = useWeb3();
  const [toSign, setToSign] = useState<Sign.Request>();

  const ttRegister =
    kind === 'book'
      ? tooltip.web3.registerKeyBook
      : tooltip.web3.registerKeyPage;
  const ttRegistered =
    kind === 'book'
      ? tooltip.web3.registeredKeyBook
      : tooltip.web3.registeredKeyPage;

  const register = () =>
    account.addEntry((txn) => Sign.submit(setToSign, txn), {
      type: 'registerBook',
      url: book.toString(),
    });

  if (!account?.backupAccount) {
    return children;
  }

  if (account.registeredBooks?.some((x) => book.equals(x))) {
    return (
      <WithIcon
        after
        icon={<CheckCircleTwoTone twoToneColor="#6fd226" />}
        tooltip={ttRegistered}
        children={children}
      />
    );
  }

  return (
    <div className="web3-register-book">
      {children}

      <Tooltip overlayClassName="explorer-tooltip" title={ttRegister}>
        <Button
          icon={<PlusCircleOutlined />}
          shape="circle"
          size="large"
          type="link"
          onClick={register}
        />
      </Tooltip>

      <Sign title={'Registering'} request={toSign} />
    </div>
  );
}
