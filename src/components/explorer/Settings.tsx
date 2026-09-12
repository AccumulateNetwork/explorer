import { Descriptions, Radio, Switch, Typography } from 'antd';
import React from 'react';

import { InfoTable } from '../common/InfoTable';
import { broadcast, storage, stored, useShared } from '../common/Shared';
import { ThemeMode } from '../common/theme';

const { Title } = Typography;

// One-time cleanup of retired keys; harmless once they are gone. networkName
// was written by code rather than chosen (#73); selectedNetwork was a real
// choice, but a stored preference cannot decide what a link means, so it no
// longer takes part in resolving one (#84).
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('networkName');
  localStorage.removeItem('selectedNetwork');
}

export const Settings = new (
  @storage(localStorage)
  class Settings {
    @stored accessor enableDevMode: boolean = false;
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
