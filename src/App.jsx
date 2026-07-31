import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';

import './App.css';
import Explorer from './components/Explorer';
import { ThemeProvider } from './components/common/ThemeProvider';

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

  return (
    <ThemeProvider>
      <div>{renderApp()}</div>
    </ThemeProvider>
  );
};

export default App;
