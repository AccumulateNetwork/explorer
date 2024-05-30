import React from 'react';

import { api_v3 } from 'accumulate.js';

interface Context {
  api?: api_v3.JsonRpcClient;
  onApiError: (_: any) => void;
}

export const Shared = React.createContext<Context>({
  onApiError(error) {
    console.error(error);
  },
});
