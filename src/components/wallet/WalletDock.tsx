/**
 * WalletDock — mounts the wallet integration in one place.
 *
 * The wallet module is loaded lazily and only in the local-wallet build
 * (VITE_WALLET=local). Because isLocalWallet is a build-time constant, the
 * production bundle tree-shakes the dynamic import away entirely: no wallet
 * UI ships and the API is never touched. Drop a single <WalletDock /> into
 * the app shell.
 */
import { FloatButton } from 'antd';
import React, { Suspense, lazy, useState } from 'react';
import { RiWallet3Line } from 'react-icons/ri';

import { isLocalWallet } from '../../walletMode';

const WalletProvider = lazy(() =>
  import('./Context').then((m) => ({ default: m.WalletProvider })),
);
const WalletPanel = lazy(() =>
  import('./WalletPanel').then((m) => ({ default: m.WalletPanel })),
);

export function WalletDock() {
  if (!isLocalWallet) return null;
  return (
    <Suspense fallback={null}>
      <WalletProvider>
        <DockControls />
      </WalletProvider>
    </Suspense>
  );
}

function DockControls() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FloatButton
        icon={<RiWallet3Line />}
        tooltip="Wallet"
        onClick={() => setOpen(true)}
      />
      <Suspense fallback={null}>
        <WalletPanel visible={open} onClose={() => setOpen(false)} />
      </Suspense>
    </>
  );
}
