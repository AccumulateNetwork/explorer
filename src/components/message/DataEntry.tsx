import { Descriptions, List, Skeleton, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiFileList2Line,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';
import { Link as DomLink } from 'react-router-dom';

import { URL } from 'accumulate.js';
import { TransactionType } from 'accumulate.js/lib/core';

import { DataTxnRecord, dataEntryParts, isData } from '../../utils/data';
import getTs from '../../utils/getTS';
import { EnumValue } from '../common/EnumValue';
import Data from '../common/ExtId';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import { queryEffect } from '../common/Shared';
import tooltipDescs from '../common/TooltipDescriptions';
import Error404 from '../explorer/Error404';

const { Text, Title } = Typography;

export function DataEntry(props: { url: string }) {
  // Return 404 if url is not a valid URL or transaction hash
  const [url, setUrl] = useState<URL>();
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (/^[0-9a-f]{64}$/i.test(props.url)) {
      setUrl(URL.parse(`acc://${props.url}@unknown`));
    } else {
      let url: URL;
      try {
        url = URL.parse(props.url);
      } catch (error) {
        setNotFound(true);
      }
      if (!/[0-9a-f]{64}/i.test(url.username)) {
        setNotFound(true);
      }
      setUrl(url);
    }
  }, [props.url]);

  const [record, setRecord] = useState<DataTxnRecord>(null);
  queryEffect(url, { queryType: 'default' }).then((r) => {
    if (!isData(r)) {
      setNotFound(true);
      return;
    }
    setRecord(r);
    setUrl(r.id.asUrl());
  });

  const [ts, setTs] = useState(null);
  const [block, setBlock] = useState(null);

  useEffect(() => {
    if (!url) return;
    let txId = url.toString().replace(/^acc:\/\/|@.*$/g, '');
    getTs(
      txId,
      setTs,
      setBlock,
      (x) => x.chain === 'main' || x.chain === 'scratch',
    );
  }, [`${url}`]);

  if (notFound) {
    return <Error404 />;
  }

  return (
    <div>
      <Title level={2} className="break-all" key="main">
        Data Entry
      </Title>
      <Title
        level={4}
        key="sub"
        type="secondary"
        style={{ marginTop: '-10px' }}
        className="break-all"
        copyable={{ text: url?.toString() }}
      >
        {url?.toString()}
      </Title>

      {record ? (
        <ShowDataEntry record={record} ts={ts} block={block} />
      ) : (
        <Skeleton active />
      )}
    </div>
  );
}

function ShowDataEntry({
  record,
  block,
  ts,
}: {
  record: DataTxnRecord;
  block;
  ts;
}) {
  const utcOffset = moment().utcOffset() / 60;
  return (
    <div>
      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item label="Type">
          <EnumValue
            type={TransactionType}
            value={record.message.transaction.body.type}
          />
        </Descriptions.Item>
      </Descriptions>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Entry Info
      </Title>

      <Descriptions bordered column={1} size="middle" className="info-table">
        <Descriptions.Item
          label={
            <span>
              <Nobr>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.timestamp}
                  >
                    <RiQuestionLine />
                  </Tooltip>
                </IconContext.Provider>
                Timestamp (UTC{utcOffset < 0 ? '-' : '+'}
                {utcOffset})
              </Nobr>
            </span>
          }
        >
          {ts || ts === 0 ? (
            <Text>
              {ts ? (
                <Text className="code">
                  {moment(ts).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              ) : (
                <Text disabled>N/A</Text>
              )}
            </Text>
          ) : (
            <Skeleton
              className={'skeleton-singleline'}
              active
              title={true}
              paragraph={false}
            />
          )}
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <span>
              <Nobr>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.block}
                  >
                    <RiQuestionLine />
                  </Tooltip>
                </IconContext.Provider>
                Block
              </Nobr>
            </span>
          }
        >
          {block || block === 0 ? (
            <Text>
              {block ? (
                <DomLink className="code" to={'/block/' + block}>
                  {block}
                </DomLink>
              ) : (
                <Text disabled>N/A</Text>
              )}
            </Text>
          ) : (
            <Skeleton
              className={'skeleton-singleline'}
              active
              title={true}
              paragraph={false}
            />
          )}
        </Descriptions.Item>

        {/* <Descriptions.Item
              label={
                <span>
                  <nobr>
                    <IconContext.Provider
                      value={{ className: 'react-icons' }}
                    >
                      <Tooltip
                        overlayClassName="explorer-tooltip"
                        title={tooltipDescs.entryHash}
                      >
                        <RiQuestionLine />
                      </Tooltip>
                    </IconContext.Provider>
                    Entry Hash
                  </nobr>
                </span>
              }
            >
              {entry.data.entryHash}
            </Descriptions.Item> */}

        <Descriptions.Item
          label={
            <span>
              <Nobr>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.dataAccount}
                  >
                    <RiQuestionLine />
                  </Tooltip>
                </IconContext.Provider>
                Data Account
              </Nobr>
            </span>
          }
        >
          <Link to={record.id.account}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {record.id.account.toString()}
          </Link>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <span>
              <Nobr>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <Tooltip
                    overlayClassName="explorer-tooltip"
                    title={tooltipDescs.txId}
                  >
                    <RiQuestionLine />
                  </Tooltip>
                </IconContext.Provider>
                Txid
              </Nobr>
            </span>
          }
        >
          <Link to={record.id}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiExchangeLine />
            </IconContext.Provider>
            {record.id.toString()}
          </Link>
        </Descriptions.Item>

        {record.message.transaction.body.type ===
          TransactionType.SyntheticWriteData && (
          <Descriptions.Item
            label={
              <span>
                <Nobr>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <Tooltip
                      overlayClassName="explorer-tooltip"
                      title={tooltipDescs.causeTxId}
                    >
                      <RiQuestionLine />
                    </Tooltip>
                  </IconContext.Provider>
                  Cause
                </Nobr>
              </span>
            }
          >
            <Link to={record.message.transaction.body.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {record.message.transaction.body.cause.toString()}
            </Link>
          </Descriptions.Item>
        )}
      </Descriptions>

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiFileList2Line />
        </IconContext.Provider>
        Entry Data
      </Title>

      <List
        size="small"
        bordered
        dataSource={dataEntryParts(record.message.transaction.body.entry)}
        renderItem={(item) => (
          <List.Item>
            <Data>{item}</Data>
          </List.Item>
        )}
        style={{ marginBottom: '30px' }}
      />
    </div>
  );
}
