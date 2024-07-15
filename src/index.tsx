import React from 'react';
import ReactDOM from 'react-dom';
// Something depends on rxjs. I don't know what it is, but the explorer doesn't
// work without it even though nothing explicitly depends on it. So I'm adding
// an explicit dependency here.
import 'rxjs';

import App from './App';
import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
