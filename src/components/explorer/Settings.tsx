import { Descriptions, Switch, Typography } from 'antd';
import React from 'react';

import { InfoTable } from '../common/InfoTable';

const { Title } = Typography;

function store<This, Value>(storage: Storage) {
  return (
    { get }: ClassAccessorDecoratorTarget<This, Value>,
    { name }: ClassAccessorDecoratorContext<This, Value> & { name: string },
  ): ClassAccessorDecoratorResult<This, Value> => {
    return {
      get() {
        const s = localStorage.getItem(name);
        if (!s) return get.call(this);

        try {
          return JSON.parse(s);
        } catch (_) {
          return get.call(this);
        }
      },

      set(v: Value) {
        localStorage.setItem(name, JSON.stringify(v));
      },
    };
  };
}

class SettingsClass {
  @store(localStorage)
  accessor enableDevMode: boolean = false;

  @store(localStorage)
  accessor networkName: string = 'mainnet';

  @store(localStorage)
  accessor favourites: string[] = [];

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

export const Settings = new SettingsClass();
