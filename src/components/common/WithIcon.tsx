import { Tooltip } from 'antd';
import React from 'react';
import { IconContext, IconType } from 'react-icons';

export function WithIcon({
  icon: Icon,
  after,
  tooltip,
  children,
}: {
  icon: IconType;
  after?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const icon = (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      {tooltip ? (
        <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
          <Icon />
        </Tooltip>
      ) : (
        <Icon />
      )}
    </IconContext.Provider>
  );

  if (after) {
    return (
      <>
        {children}
        {icon}
      </>
    );
  }

  return (
    <>
      {icon}
      {children}
    </>
  );
}
