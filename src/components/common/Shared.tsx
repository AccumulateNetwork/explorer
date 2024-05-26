import { JsonRpcClient } from 'accumulate.js/lib/api_v3';
import React from 'react';

interface Context {
  api?: JsonRpcClient;
}

export const Shared = React.createContext<Context>({});
