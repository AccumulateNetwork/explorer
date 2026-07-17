import React from 'react';
import { createRoot } from 'react-dom/client';
// Something depends on rxjs. I don't know what it is, but the explorer doesn't
// work without it even though nothing explicitly depends on it. So I'm adding
// an explicit dependency here.
import 'rxjs';
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
