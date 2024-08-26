import { Descriptions, Switch, Typography } from 'antd';
import React from 'react';

import { InfoTable } from '../common/InfoTable';
import { storage, stored } from '../common/Shared';

const { Title } = Typography;

export const Settings = new (
  @storage(localStorage)
  class Settings {
    @stored accessor enableDevMode: boolean = false;
    @stored accessor networkName: string = 'mainnet';
    @stored accessor favourites: string[] = [];

    readonly Edit = function () {
      return (
        <div>
          <Title level={2}>Settings</Title>

          <InfoTable>
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
