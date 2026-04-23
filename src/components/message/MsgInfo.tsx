import { Descriptions, Tooltip, Typography } from 'antd';
import React, { useContext } from 'react';
import { IconContext } from 'react-icons';
import {
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { MessageRecord, TxIDRecord } from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import tooltipDescs from '../../utils/lang';
import { EnumValue } from '../common/EnumValue';
import {
  InfiniteList,
  extractTxType,
  useInfiniteListEnrichment,
} from '../common/InfiniteList';
import { InfoTable } from '../common/InfoTable';
import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { Nobr } from '../common/Nobr';
import { Status } from './Status';
import { describeTimestamp } from './timestamp';

type TxEnrichment = { type?: string; principal?: string };

function txidKey(record: TxIDRecord): string {
  return record.value.toString();
}

async function enrichTxIdRecords(
  api: { query: (id: any) => Promise<any> },
  items: TxIDRecord[],
): Promise<ReadonlyMap<string, TxEnrichment>> {
  const map = new Map<string, TxEnrichment>();
  await Promise.all(
    items.map(async (it) => {
      const key = txidKey(it);
      try {
        const r = (await api.query(it.value)) as MessageRecord | undefined;
        const type = extractTxType(r);
        const principal =
          r?.message && 'transaction' in r.message
            ? r.message.transaction?.header?.principal?.toString()
            : undefined;
        map.set(key, { type, principal });
      } catch {
        map.set(key, {});
      }
    }),
  );
  return map;
}

const { Title } = Typography;

export function MsgInfo({ record }: { record: MessageRecord }) {
  const labelID = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.msgId}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        ID
      </Nobr>
    </span>
  );

  const labelTxn = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.txHash}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Transaction
      </Nobr>
    </span>
  );

  const labelCause = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.cause}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Cause
      </Nobr>
    </span>
  );

  const labelProduced = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.produced}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Produced
      </Nobr>
    </span>
  );

  const { api } = useContext(Network);
  const cause = record.cause?.records || [];
  const produced = record.produced?.records || [];
  const enrich = (items: TxIDRecord[]) => enrichTxIdRecords(api, items);

  return (
    <>
      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Message Info
      </Title>

      <InfoTable>
        {describeTimestamp(record.id)}

        <Descriptions.Item key="id" label={labelID}>
          {record.id.toString()}
        </Descriptions.Item>

        {'txID' in record.message && (
          <Descriptions.Item label={labelTxn}>
            <Link to={record.message.txID}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {record.message.txID.toString()}
            </Link>
          </Descriptions.Item>
        )}

        {cause.length && (
          <Descriptions.Item label={labelCause}>
            <InfiniteList<TxIDRecord>
              dataSource={cause}
              rowKey={(item) => txidKey(item)}
              enrichPage={enrich}
              renderItem={(item) => <MsgInfo.Related record={item} />}
            />
          </Descriptions.Item>
        )}

        {produced.length && (
          <Descriptions.Item label={labelProduced}>
            <InfiniteList<TxIDRecord>
              dataSource={produced}
              rowKey={(item) => txidKey(item)}
              enrichPage={enrich}
              renderItem={(item) => (
                <>
                  <MsgInfo.Related record={item} />
                  <Status id={item.value} />
                </>
              )}
            />
          </Descriptions.Item>
        )}
      </InfoTable>
    </>
  );
}

MsgInfo.Related = function ({ record }: { record: TxIDRecord }) {
  const enrichment = useInfiniteListEnrichment<string, TxEnrichment>();
  const data = enrichment?.get(txidKey(record));
  const hashHex = Buffer.from(record.value.hash).toString('hex');
  const shortHash = hashHex.slice(0, 8);
  const type = data?.type || 'unknown';
  const principal = data?.principal;
  return (
    <Link to={record.value}>
      <IconContext.Provider value={{ className: 'react-icons' }}>
        <RiExchangeLine />
      </IconContext.Provider>
      <span>
        {type} · {principal || shortHash}
      </span>
    </Link>
  );
};
