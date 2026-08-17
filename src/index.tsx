import React from 'react';
import { createRoot } from 'react-dom/client';
// Apply runtime patches to SDK before any API calls
import './sdk-patches';

import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('root element not found');
}
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
