import { Descriptions, Switch, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

export const Settings = new (class Settings {
  get enableDevMode(): boolean {
    return this.#get('enable-dev-mode', false);
  }
  set enableDevMode(v: boolean) {
    this.#set('enable-dev-mode', v);
  }

  get networkName(): string {
    return this.#get('network', '');
  }
  set networkName(v: string) {
    this.#set('network', v);
  }

  #get(name, def) {
    const s = localStorage.getItem(name);
    if (!s) return def;

    try {
      return JSON.parse(s);
    } catch (_) {
      return def;
    }
  }

  #set(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
  }
})();

export default function () {
  return (
    <div>
      <Title level={2}>Settings</Title>

      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item key="dev-mode" label="Developer mode">
          <Switch
            defaultChecked={Settings.enableDevMode}
            onChange={(v) => (Settings.enableDevMode = v)}
          />
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}
