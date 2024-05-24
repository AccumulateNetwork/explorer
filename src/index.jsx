import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import { Web3ReactProvider } from '@web3-react/core';
import { Web3 } from 'web3';

// Something depends on rxjs. I don't know what it is, but the explorer doesn't
// work without it even though nothing explicitly depends on it. So I'm adding
// an explicit dependency here.
import 'rxjs';

const getLibrary = (provider) => {
  const library = new Web3(provider);
  return library;
};

ReactDOM.render(
  <React.StrictMode>
    <Web3ReactProvider getLibrary={getLibrary}>
      <App />
    </Web3ReactProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
