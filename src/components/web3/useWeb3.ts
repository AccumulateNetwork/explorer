import { useWeb3React } from '@web3-react/core';
import { useContext, useState } from 'react';

import { Shared } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';
import { Account } from './Account';
import { Settings } from './Settings';
import { Wallet } from './Wallet';

export function useWeb3(
  predicate?: (_: Account) => boolean,
  dependencies: any[] = [],
) {
  const { api } = useContext(Shared);
  const { account: eth, deactivate } = useWeb3React();
  const [value, setValue] = useState<Account>();

  useAsyncEffect(
    async (mounted) => {
      if (!eth) {
        setValue(null);
        return;
      }

      const publicKey = Settings.getKey(eth);
      if (!publicKey) {
        setValue(null);
        Wallet.disconnect();
        deactivate();
        return;
      }

      const account = await Account.for(publicKey);
      await account.load(api);
      if (!mounted()) {
        return;
      }
      if (predicate && !predicate(account)) {
        setValue(null);
        return;
      }

      setValue(account);
    },
    [eth, ...dependencies],
  );

  return value;
}
