import { Button, List, Modal } from 'antd';
import React from 'react';

import { Ethereum } from './utils';

export function Connect({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit(): any;
  onCancel(): any;
}) {
  return (
    <Modal
      title="Connect Wallet"
      open={open}
      onCancel={onCancel}
      footer={false}
      children={<Connect.Inner onSubmit={onSubmit} />}
    />
  );
}

Connect.Inner = function ({ onSubmit }: { onSubmit(): any }) {
  return (
    <>
      <List>
        <List.Item>
          <Button
            block
            shape="round"
            size="large"
            onClick={onSubmit}
            disabled={!Ethereum}
          >
            MetaMask
          </Button>
        </List.Item>
      </List>
      <List>
        <List.Item>
          <Button block shape="round" size="large" disabled>
            WalletConnect
          </Button>
        </List.Item>
      </List>
    </>
  );
};
