import React from 'react';

import { Link } from 'react-router-dom';

import { Typography, Skeleton, Descriptions, Tag } from 'antd';

import { IconContext } from 'react-icons';
import { RiInformationLine, RiAccountCircleLine } from 'react-icons/ri';

import TxOperations from './TxOperations';

const { Title } = Typography;

const TxUpdateAccountAuth = (props) => {
  const tx = props.data;

  return (
    <div>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Transaction Data
      </Title>

      {tx?.message?.transaction ? (
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label={'Origin'}>
            {tx.message.transaction?.header?.principal ? (
              <Link
                to={
                  '/acc/' +
                  tx.message.transaction.header.principal.replace('acc://', '')
                }
              >
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {tx.message.transaction.header.principal}
              </Link>
            ) : (
              <Skeleton active paragraph={false} />
            )}
          </Descriptions.Item>

          {tx.message.transaction.body?.type ? (
            <Descriptions.Item label={'Type'}>
              <Tag color="green">{tx.message.transaction.body.type}</Tag>
            </Descriptions.Item>
          ) : null}

          {tx?.message?.transaction?.body?.operations ? (
            <Descriptions.Item
              label={'Operations'}
              className={'align-top has-list'}
            >
              <TxOperations data={tx.message.transaction.body.operations} />
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      ) : (
        <div className="skeleton-holder">
          <Skeleton active />
        </div>
      )}
    </div>
  );
};

export default TxUpdateAccountAuth;
