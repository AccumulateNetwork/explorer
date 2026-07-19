/**
 * WalletDock — mounts the wallet integration in one place.
 *
 * The wallet module is loaded lazily and only in the local-wallet build
 * (VITE_WALLET=local). Because isLocalWallet is a build-time constant, the
 * production bundle tree-shakes the dynamic import away entirely: no wallet
 * UI ships and the API is never touched.
 *
 * Wrap the app shell in <WalletShell> so the whole app (the dock AND pages
 * like the faucet) shares one wallet context, then drop <WalletDock /> in for
 * the floating button and panel.
 */
import { FloatButton } from 'antd';
import React, { Suspense, lazy, useState } from 'react';
import { RiWallet3Line } from 'react-icons/ri';

import { isLocalWallet } from '../../walletMode';

const importContext = () => import('./Context');
// Warm the chunk at import time (local build only) so the provider is ready by
// first render and WalletShell doesn't briefly fall back to an unwrapped tree.
if (isLocalWallet) void importContext();

const WalletProvider = lazy(() =>
  importContext().then((m) => ({ default: m.WalletProvider })),
);
const WalletPanel = lazy(() =>
  import('./WalletPanel').then((m) => ({ default: m.WalletPanel })),
);

/**
 * WalletShell provides the wallet context to everything it wraps. In non-local
 * builds it is a passthrough (no provider mounts, useWallet() returns null and
 * consumers degrade gracefully). While the lazy provider loads it renders the
 * children unwrapped so the layout never blanks.
 */
export function WalletShell({ children }: { children: React.ReactNode }) {
  if (!isLocalWallet) return <>{children}</>;
  return (
    <Suspense fallback={<>{children}</>}>
      <WalletProvider>{children}</WalletProvider>
    </Suspense>
  );
}

export function WalletDock() {
  if (!isLocalWallet) return null;
  return <DockControls />;
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
