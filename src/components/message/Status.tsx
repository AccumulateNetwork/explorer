import { Tag, Tooltip } from 'antd';
import React, { useContext, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiQuestionMark,
} from 'react-icons/ri';

import { TxIDArgs, errors } from 'accumulate.js';
import {
  Record as AnyRecord,
  JsonRpcClient,
  MessageRecord,
  Record,
  RecordType,
} from 'accumulate.js/lib/api_v3';
import { MessageType } from 'accumulate.js/lib/messaging';

import { EnumValue } from '../common/EnumValue';
import { Network } from '../common/Network';
import { isErrorRecord, queryEffect } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';

export function Status(props: { record: MessageRecord }): React.ReactNode;
export function Status(props: { id: TxIDArgs }): React.ReactNode;

export function Status(props: { record?: MessageRecord; id?: TxIDArgs }) {
  const { api, onApiError } = useContext(Network);
  const [record, setRecord] = useState(props.record);
  const [producedStatus, setProducedStatus] = useState<errors.Status>();

  queryEffect(props.id).then((r) => {
    if (props.record) {
      return;
    }
    if (r.recordType === RecordType.Message) {
      setRecord(r);
      return;
    }
    if (r.recordType !== RecordType.Error) {
      return;
    }
    if (r.value.code === errors.Status.NotFound) {
      setRecord(new MessageRecord({ status: errors.Status.Pending }));
    } else {
      setRecord(
        new MessageRecord({
          status: errors.Status.InternalError,
          error: { message: 'Unable to retrieve the status of this message' },
        }),
      );
    }
  });

  useAsyncEffect(
    async (mounted) => {
      if (!record) {
        return;
      }
      const status = await getProducedStatus(api, record);
      if (mounted()) {
        setProducedStatus(status);
      }
    },
    [record],
  ).catch(onApiError);

  if (!record && !props.id) {
    console.error(`Invalid call to Status: must provide record or id`);
    return null;
  }

  if (!record) {
    return (
      <Tag color="default" style={{ textTransform: 'uppercase' }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiLoader4Line className={'anticon-spin'} />
        </IconContext.Provider>
      </Tag>
    );
  }

  if (record.status === errors.Status.Pending) {
    return (
      <span>
        <Tag color="gold" style={{ textTransform: 'uppercase' }}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiLoader4Line className={'anticon-spin'} />
          </IconContext.Provider>
          Pending
        </Tag>
        {props?.record?.message?.type === MessageType.Transaction && (
          <Tag color="cyan" style={{ textTransform: 'uppercase' }}>
            <IconContext.Provider
              value={{ className: 'react-icons' }}
            ></IconContext.Provider>
            Multi-sig
          </Tag>
        )}
      </span>
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

  if (record.status !== errors.Status.Delivered) {
    return (
      <Tag color="default" style={{ textTransform: 'uppercase' }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiQuestionMark />
        </IconContext.Provider>
        Unknown
      </Tag>
    );
  }

  if (producedStatus === errors.Status.Delivered) {
    return (
      <Tag color="green" style={{ textTransform: 'uppercase' }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiCheckLine />
        </IconContext.Provider>
        Success
      </Tag>
    );
  }

  if (producedStatus === errors.Status.Pending) {
    return (
      <Tooltip
        overlayClassName="explorer-tooltip"
        title="A message produced by this message is pending"
      >
        <Tag color="processing" style={{ textTransform: 'uppercase' }}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiLoader4Line className={'anticon-spin'} />
          </IconContext.Provider>
          Incomplete
        </Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      overlayClassName="explorer-tooltip"
      title="A message produced by this message failed"
    >
      <Tag color="red" style={{ textTransform: 'uppercase' }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiErrorWarningLine />
        </IconContext.Provider>
        Error
      </Tag>
    </Tooltip>
  );
}

/**
 * Runaway guard, not a correctness limit. Reporting a transaction's own
 * status once the chain is this deep could mask a failure below it — the
 * defect #35 fixed — so it is set far beyond any real synthetic chain and
 * exists only so a cycle the visited set somehow misses cannot spin.
 */
const MAX_PRODUCED_DEPTH = 10;

function hydrate(x: unknown): Record | null {
  if (!x || typeof x !== 'object') {
    return null;
  }
  if (typeof (x as Record).recordType === 'number') {
    return x as Record;
  }
  try {
    return AnyRecord.fromObject(x as never);
  } catch {
    return null;
  }
}

export async function getProducedStatus(
  api: JsonRpcClient,
  r: MessageRecord,
  seen: Set<string> = new Set(),
  depth = 0,
) {
  if (!r.produced?.records?.length) return r.status;
  if (r.status !== errors.Status.Delivered) return r.status;
  if (depth >= MAX_PRODUCED_DEPTH) return r.status;

  // One request per branch, not one per produced message, and never the same
  // id twice: this recursion ran a query per record with no memory of what it
  // had already fetched, and every Status on the page started its own (#50).
  const ids: string[] = [];
  for (const x of r.produced.records) {
    const id = `${x.value}`;
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  if (!ids.length) return r.status;

  const produced = await api
    .call(
      ids.map((scope) => ({
        method: 'query',
        params: { scope, query: { queryType: 'default' } },
      })),
    )
    // The batch returns plain JSON, where recordType is 'message' and error
    // codes are strings; hydrate those so the comparisons below see the same
    // enums api.query would have given. Anything already shaped passes
    // through.
    .then((rs) => rs.map(hydrate))
    .catch(() => [] as (Record | null)[]);

  // Each branch must be awaited before the comparisons below. Recursing without
  // awaiting leaves Promises in `results`, and `Promise >= 400` is false, so
  // every transaction with produced messages reported Delivered.
  const results = await Promise.all(
    produced.map(async (r: Record | null) => {
      if (!r) {
        return 0;
      }
      if (r.recordType === RecordType.Message) {
        return getProducedStatus(api, r, seen, depth + 1);
      }
      if (r.recordType !== RecordType.Error) {
        // Ignore unexpected record types
        return 0;
      }
      if (r.value.code !== errors.Status.NotFound) {
        // Ignore unexpected error codes
        return 0;
      }
      // Treat missing produced messages as pending
      return errors.Status.Pending;
    }),
  );

  for (const status of results) {
    if (status >= 400) {
      return status;
    }
  }

  for (const status of results) {
    if (status === errors.Status.Pending) {
      return status;
    }
  }

  return errors.Status.Delivered;
}
