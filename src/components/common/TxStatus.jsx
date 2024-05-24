import React from 'react';

import { Tag, Tooltip } from 'antd';

import { IconContext } from 'react-icons';
import { RiCheckLine, RiLoader4Line, RiErrorWarningLine } from 'react-icons/ri';

const TxStatus = (props) => {
  const tx = props.data;

  let sigCount = 0;
  for (const set of tx?.signatures?.records || []) {
    for (const sig of set?.signatures?.records || []) {
      // Ignore non-signatures
      if (sig.message?.type !== 'signature') continue;

      // Don't count authority signatures
      if (sig.message.signature?.type === 'authority') continue;

      sigCount++;
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {tx && tx.status ? (
        <div>
          {tx.status === 'pending' && (
            <span>
              <Tag color="gold" style={{ textTransform: 'uppercase' }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiLoader4Line className={'anticon-spin'} />
                </IconContext.Provider>
                Pending
              </Tag>
              {tx?.message?.type === 'transaction' && (
                <Tag color="cyan" style={{ textTransform: 'uppercase' }}>
                  <IconContext.Provider
                    value={{ className: 'react-icons' }}
                  ></IconContext.Provider>
                  Multi-sig
                </Tag>
              )}
            </span>
          )}
          {tx.status === 'delivered' && (
            <Tag color="green" style={{ textTransform: 'uppercase' }}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiCheckLine />
              </IconContext.Provider>
              Success
            </Tag>
          )}
          {tx.statusNo >= 400 && (
            <Tooltip
              overlayClassName="explorer-tooltip"
              title={'Error ' + tx.statusNo + ': ' + tx.error?.message}
            >
              <Tag color="red" style={{ textTransform: 'uppercase' }}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiErrorWarningLine />
                </IconContext.Provider>
                Error
              </Tag>
            </Tooltip>
          )}
          {sigCount > 0 ? (
            <Tag style={{ textTransform: 'uppercase' }}>
              Signatures: <strong>{sigCount}</strong>
            </Tag>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TxStatus;
