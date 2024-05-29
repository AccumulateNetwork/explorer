import { Tag, Tooltip } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import { RiCheckLine, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri';

import { errors } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import { EnumValue } from '../common/EnumValue';

export function Status({ record }: { record: MessageRecord }) {
  switch (record.status) {
    case errors.Status.Pending:
      return (
        <span>
          <Tag color="gold" style={{ textTransform: 'uppercase' }}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiLoader4Line className={'anticon-spin'} />
            </IconContext.Provider>
            Pending
          </Tag>
          {record.message.type === MessageType.Transaction && (
            <Tag color="cyan" style={{ textTransform: 'uppercase' }}>
              <IconContext.Provider
                value={{ className: 'react-icons' }}
              ></IconContext.Provider>
              Multi-sig
            </Tag>
          )}
        </span>
      );

    case errors.Status.Delivered:
      return (
        <Tag color="green" style={{ textTransform: 'uppercase' }}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiCheckLine />
          </IconContext.Provider>
          Success
        </Tag>
      );
  }

  if (record.status >= 400) {
    const tooltip = (
      <span>
        Error <EnumValue type={errors.Status} value={record.status} />
        {record.error && `: ${record.error.message}`}
      </span>
    );
    return (
      <Tooltip overlayClassName="explorer-tooltip" title={tooltip}>
        <Tag color="red" style={{ textTransform: 'uppercase' }}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiErrorWarningLine />
          </IconContext.Provider>
          Error
        </Tag>
      </Tooltip>
    );
  }

  return null;
}
