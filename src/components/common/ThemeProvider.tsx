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
          // Antd's default dark link color is muted against our near-black
          // background. Bump it in dark mode for legibility.
          ...(effective === 'dark'
            ? { colorLink: '#69b1ff', colorLinkHover: '#91caff' }
            : {}),
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
