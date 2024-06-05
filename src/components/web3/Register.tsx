import { CheckCircleTwoTone, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React, { useState } from 'react';

import { URL } from 'accumulate.js';

import tooltip from '../../utils/lang';
import { WithIcon } from '../common/WithIcon';
import { Sign } from './Sign';
import { useWeb3 } from './useWeb3';

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

  const register = () =>
    account.store.add((txn) => Sign.submit(setToSign, txn), {
      type: 'registerBook',
      url: book.toString(),
    });

  if (!account) {
    return children;
  }

  if (account.registeredBooks?.some((x) => x.book.url.equals(book))) {
    return (
      <WithIcon
        after
        icon={<CheckCircleTwoTone twoToneColor="#6fd226" />}
        tooltip={tooltip.web3.registered}
        children={children}
      />
    );
  }

  return (
    <div className="web3-register-book">
      {children}

      <Tooltip
        overlayClassName="explorer-tooltip"
        title={tooltip.web3.register}
      >
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
