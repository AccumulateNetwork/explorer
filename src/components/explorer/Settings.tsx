import { Descriptions, Radio, Switch, Typography } from 'antd';
import React from 'react';

import { InfoTable } from '../common/InfoTable';
import { broadcast, storage, stored, useShared } from '../common/Shared';
import { ThemeMode } from '../common/theme';

const { Title } = Typography;

// One-time cleanup of the retired key (#73); harmless once it is gone.
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('networkName');
}

export const Settings = new (
  @storage(localStorage)
  class Settings {
    @stored accessor enableDevMode: boolean = false;
    // Empty means "the user has not chosen a network", which is distinct
    // from having chosen mainnet. While the default was 'mainnet' the two
    // were indistinguishable, and the hostname defaults in Network.tsx could
    // never run (#73).
    //
    // Deliberately not named networkName: every browser that ever loaded a
    // network-specific host carries networkName="mainnet", written by the
    // old code on each Context construction rather than by any choice. Those
    // values cannot be told apart from real selections, so the key is retired
    // and everyone starts from the hostname default once.
    @stored accessor selectedNetwork: string = '';
    @stored accessor favourites: string[] = [];
    @broadcast @stored accessor themeMode: ThemeMode = 'light';

    readonly Edit = function () {
      const ThemeRow = () => {
        const [mode, setMode] = useShared(this, 'themeMode');
        return (
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio.Button value="light">Light</Radio.Button>
            <Radio.Button value="dark">Dark</Radio.Button>
          </Radio.Group>
        );
      };

      return (
        <div>
          <Title level={2}>Settings</Title>

          <InfoTable>
            <Descriptions.Item key="theme" label="Theme">
              <ThemeRow />
            </Descriptions.Item>
            <Descriptions.Item key="dev-mode" label="Developer mode">
              <Switch
                defaultChecked={this.enableDevMode}
                onChange={(v) => (this.enableDevMode = v)}
              />
            </Descriptions.Item>
          </InfoTable>
        </div>
      );
    }.bind(this);
  }
)();
