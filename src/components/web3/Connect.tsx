import { Button, List, Modal } from 'antd';
import React from 'react';

import { Ethereum } from './utils';

export function Connect({
  open,
  onClick,
  onCancel,
}: {
  open: boolean;
  onClick: () => any;
  onCancel: () => any;
}) {
  return (
    <Modal
      title="Connect Wallet"
      open={open}
      onCancel={onCancel}
      footer={false}
    >
      <List>
        <List.Item>
          <Button
            block
            shape="round"
            size="large"
            onClick={onClick}
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
    </Modal>
  );
}
