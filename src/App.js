import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import Explorer from './components/Explorer';
import './App.css';

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
