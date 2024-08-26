import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';

import './App.css';
import Explorer from './components/Explorer';

const App = () => {
  const [loaded, setLoaded] = useState(false);

  const renderApp = () => {
    if (loaded) {
      return <Explorer />;
    } else {
      return <Spin size="large" className="loader" />;
    }
  };

  useEffect(() => {
    setLoaded(true);
  }, []);

  return <div>{renderApp()}</div>;
};

export default App;
