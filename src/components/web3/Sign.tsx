import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Modal, Spin } from 'antd';
import React, { useContext, useState } from 'react';

import { SignOptions, TxID } from 'accumulate.js';
import { JsonRpcClient, MessageRecord } from 'accumulate.js/lib/api_v3';
import { Transaction, TransactionArgs } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { Link } from '../common/Link';
import { Shared } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { isClientError } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { Account, useWeb3 } from './Account';
import { Wallet } from './Wallet';

export declare namespace Sign {
  type Signer = SignOptions;
  interface Request {
    args: TransactionArgs;
    signer?: Signer;
    onFinish(): any;
    onCancel(): any;
    initiated?: boolean;
  }
}

Sign.submit = (
  set: (_: Sign.Request) => void,
  args: TransactionArgs,
  signer?: Sign.Signer,
) => {
  let resolve: (_: boolean) => void;
  const promise = new Promise<boolean>((r) => {
    resolve = r;
  });

  set({
    args,
    signer,
    onFinish() {
      resolve(true);
    },
    onCancel() {
      resolve(false);
    },
  });
  return promise;
};

export function Sign({
  request,
  title = 'Signing',
}: {
  request: Sign.Request;
  title?: React.ReactNode;
}) {
  const account = useWeb3();
  const { api } = useContext(Shared);
  const [open, setOpen] = useState(false);
  const [closable, setClosable] = useState(false);
  const [children, setChildren] = useState<React.ReactNode[]>();

  useAsyncEffect(
    async (mounted) => {
      if (!request || !account || request.initiated) {
        return;
      }

      let children: React.ReactNode[] = [];
      setChildren([]);
      const push = (n: React.ReactNode) => {
        if (!mounted) {
          return (_: React.ReactNode) => {};
        }

        const i = children.length;
        children = [...children, <span key={`${i}`}>{n}</span>];
        setChildren(children);

        return (n: React.ReactNode) => {
          children = children.map((m, j) =>
            j === i ? <span key={`${i}`}>{n}</span> : m,
          );
          setChildren(children);
        };
      };

      const { args, signer, onCancel, onFinish } = request;
      setOpen(true);
      setClosable(false);
      try {
        request.initiated = true;
        if (await sign({ push, api, account, args, signer })) {
          onFinish();
          return true;
        }
      } catch (error) {
        push(<ShowError error={error} />);
      } finally {
        setClosable(true);
      }
      onCancel();
      return false;
    },
    [request, account],
  );

  const reverse = [];
  if (children?.length) {
    for (let i = children.length - 1; i >= 0; i--) {
      reverse.push(children[i]);
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      footer={false}
      closable={closable}
      maskClosable={closable}
      children={reverse}
      onCancel={() => setOpen(false)}
    />
  );
}

async function sign({
  push,
  api,
  args,
  account,
  signer,
}: {
  push(n: React.ReactNode): (n: React.ReactNode) => void;
  api: JsonRpcClient;
  account: Account;
  args: TransactionArgs;
  signer: Sign.Signer;
}): Promise<boolean> {
  let update = push(<Pending>Signing</Pending>);
  const txn = new Transaction(args);
  const sig = await Wallet.signAccumulate(txn, {
    publicKey: account.publicKey,
    timestamp: Date.now(),
    ...(signer || {
      signer: account.liteIdUrl,
      signerVersion: 1,
    }),
  }).catch((error) => {
    update(
      <Failure>
        <ShowError bare error={error} />
      </Failure>,
    );
  });
  if (!sig || !sig.signature) {
    return false;
  }
  update(<Success>Signed</Success>);

  update = push(<Pending>Submitting</Pending>);
  const results = await api
    .submit({
      transaction: [txn],
      signatures: [sig],
    })
    .catch((error) => {
      update(
        <Failure>
          <ShowError bare error={error} />
        </Failure>,
      );
    });
  if (!results) {
    return;
  }
  update(<Success>Submitted</Success>);

  for (const r of results) {
    if (r.success) {
      continue;
    }
    if (r.status?.error) {
      push(<ShowError error={r.status.error} />);
    } else {
      push(<ShowError error={r.message} />);
    }
  }
  if (!results.every((x) => x.success)) {
    return;
  }

  const seen = new Set<string>();
  const ok = await Promise.all(
    results.map((r) => waitFor({ api, push, seen, txid: r.status.txID })),
  );
  return ok.every((x) => x);
}

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

async function waitFor({
  push,
  api,
  txid,
  seen,
}: {
  push(n: React.ReactNode): (n: React.ReactNode) => void;
  api: JsonRpcClient;
  txid: TxID;
  seen: Set<string>;
}): Promise<boolean> {
  if (seen.has(txid.toString())) {
    return true;
  }
  seen.add(txid.toString());

  const replace = push(
    <Pending>
      <Link to={txid}>{txstr(txid)}</Link>
    </Pending>,
  );

  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await api.query(txid)) as MessageRecord;
      if (r.status !== Status.Delivered) {
        // Status is pending or unknown
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      replace(
        <Success>
          <Link to={txid}>{txstr(txid)}</Link>
        </Success>,
      );
      if (!r.produced?.records?.length) {
        return true;
      }

      const ok = await Promise.all(
        r.produced.records.map((r) =>
          waitFor({ push, api, seen, txid: r.value }),
        ),
      );
      return ok.every((x) => x);
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
        // Not found
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      replace(
        <Failure>
          <Link to={txid}>{<ShowError bare error={error} />}</Link>
        </Failure>,
      );
      return false;
    }
  }

  replace(
    <Failure>
      <Link to={txid}>
        Transaction still missing or pending after{' '}
        {(waitTime * waitLimit) / 1000} seconds
      </Link>
    </Failure>,
  );
  return false;
}

function Pending({ children }: { children: React.ReactNode }) {
  return (
    <Alert
      type="info"
      message={
        <>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          {children}
        </>
      }
    />
  );
}

function Success({ children }: { children: React.ReactNode }) {
  return <Alert type="success" showIcon message={children} />;
}

function Failure({ children }: { children: React.ReactNode }) {
  return <Alert type="error" showIcon message={children} />;
}

function txstr(txid: TxID) {
  let account = txid.account.toString().replace(/^acc:\/\//, '');
  if (account.length > 16) {
    account = account.slice(0, 16) + '…';
  }
  return `${Buffer.from(txid.hash.slice(0, 8)).toString('hex')}…@${account}`;
}
