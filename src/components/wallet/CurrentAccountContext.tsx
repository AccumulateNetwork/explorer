/**
 * CurrentAccountContext - Shares the currently viewed account/transaction across components
 *
 * This allows the WalletPanel to know what account or transaction is being viewed
 * and provide context-aware actions (sign, reject, etc.).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CurrentAccount {
  url: string;
  type: string;
  data?: any;
}

export interface CurrentTransaction {
  txid: string;
  hash: string;
  type: string;
  status: 'pending' | 'delivered' | 'failed' | 'unknown';
  isMultiSig: boolean;
  signatureCount: number;
  principal: string;
  signers?: string[];  // URLs of key pages that can sign
  data?: any;
}

export interface CurrentAccountContextValue {
  currentAccount: CurrentAccount | null;
  setCurrentAccount: (account: CurrentAccount | null) => void;
  currentTransaction: CurrentTransaction | null;
  setCurrentTransaction: (tx: CurrentTransaction | null) => void;
}

const CurrentAccountContext = createContext<CurrentAccountContextValue>({
  currentAccount: null,
  setCurrentAccount: () => {},
  currentTransaction: null,
  setCurrentTransaction: () => {},
});

export function useCurrentAccount() {
  return useContext(CurrentAccountContext);
}

interface CurrentAccountProviderProps {
  children: React.ReactNode;
}

export function CurrentAccountProvider({ children }: CurrentAccountProviderProps) {
  const [currentAccount, setCurrentAccountState] = useState<CurrentAccount | null>(null);
  const [currentTransaction, setCurrentTransactionState] = useState<CurrentTransaction | null>(null);

  const setCurrentAccount = useCallback((account: CurrentAccount | null) => {
    setCurrentAccountState(account);
    // Clear transaction when viewing an account
    if (account) {
      setCurrentTransactionState(null);
    }
  }, []);

  const setCurrentTransaction = useCallback((tx: CurrentTransaction | null) => {
    setCurrentTransactionState(tx);
    // Clear account when viewing a transaction
    if (tx) {
      setCurrentAccountState(null);
    }
  }, []);

  return (
    <CurrentAccountContext.Provider value={{
      currentAccount,
      setCurrentAccount,
      currentTransaction,
      setCurrentTransaction,
    }}>
      {children}
    </CurrentAccountContext.Provider>
  );
}
