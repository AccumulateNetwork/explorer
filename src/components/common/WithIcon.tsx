import { Tooltip } from 'antd';
import React from 'react';
import { IconContext, IconType } from 'react-icons';

import { Nobr } from './Nobr';

export function WithIcon({
  icon,
  after,
  tooltip,
  children,
  style,
}: {
  icon: IconType | React.ReactNode;
  after?: boolean;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (typeof icon === 'function') {
    const Icon = icon;
    icon = <Icon />;
  }
  if (tooltip) {
    icon = (
      <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
        {icon}
      </Tooltip>
    );
  }
  icon = (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      {icon}
    </IconContext.Provider>
  );

  if (after) {
    return (
      <Nobr style={style}>
        {children} {icon}
      </Nobr>
    );
  }

  return (
    <Nobr style={style}>
      {icon} {children}
    </Nobr>
  );
}
