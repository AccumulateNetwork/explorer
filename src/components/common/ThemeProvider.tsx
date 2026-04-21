import { App as AntApp, ConfigProvider, theme } from 'antd';
import React, { useEffect } from 'react';

import { useEffectiveTheme } from './theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const effective = useEffectiveTheme();

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
  }, [effective]);

  return (
    <ConfigProvider
      theme={{
        algorithm:
          effective === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          fontFamily:
            "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
