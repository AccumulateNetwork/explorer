import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Modal, Spin } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { SignOptions, TxID } from 'accumulate.js';
import {
  JsonRpcClient,
  MessageRecord,
  Submission,
} from 'accumulate.js/lib/api_v3';
import { Transaction, TransactionArgs } from 'accumulate.js/lib/core';
import { Status } from 'accumulate.js/lib/errors';

import { Link } from '../common/Link';
import { Network } from '../common/Network';
import { ShowError } from '../common/ShowError';
import { NetworkConfig } from '../common/networks';
import { isClientError } from '../common/query';
import { useAsyncEffect } from '../common/useAsync';
import { useIsMounted } from '../common/useIsMounted';
import * as web3 from '../web3/Context';
import { useWeb3 } from '../web3/Context';

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

export declare namespace Sign {
  type Signer = SignOptions & {
    key: web3.Context.Account;
  };

  interface Request {
    args: TransactionArgs;
    signer?: Signer;
    key: web3.Context.Account;
    onFinish(): any;
    onCancel(): any;
    initiated?: boolean;
  }

  interface WaitForRequest<T> {
    submit: () => Promise<T | T[]>;
    onFinish(_: T[]): any;
    onCancel(): any;
    initiated?: boolean;
  }
}

Sign.submit = (
  set: (_: Sign.Request) => void,
  args: TransactionArgs,
  key: web3.Context.Account,
  signer?: Sign.Signer,
) => {
  return new Promise<boolean>((resolve) => {
    set({
      args,
      signer,
      key,
      onFinish() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
    });
  });
};

Sign.waitFor = function <T>(
  set: (_: Sign.WaitForRequest<T>) => void,
  submit: () => Promise<T | T[]>,
) {
  return new Promise<T[] | null>((r) => {
    set({
      submit,
      onFinish: r,
      onCancel: () => r(null),
    });
  });
};

export function Sign({
  request,
  title = 'Signing',
}: {
  request?: Sign.Request;
  title?: React.ReactNode;
}) {
  const web3 = useWeb3();
  const { api, network } = useContext(Network);
  const [open, setOpen] = useState(false);
  const [closable, setClosable] = useState(false);
  const [children, setChildren, pushChild] = useMutableChildren();

  useAsyncEffect(async () => {
    if (!request || !web3 || request.initiated) {
      return;
    }

    const { args, signer, key, onCancel, onFinish } = request;
    setOpen(true);
    setClosable(false);
    setChildren([]);
    try {
      request.initiated = true;
      if (
        await sign({ push: pushChild, api, web3, args, signer, key, network })
      ) {
        onFinish();
        return;
      }
    } catch (error) {
      pushChild(<ShowError error={error} />);
    } finally {
      setClosable(true);
      onCancel();
    }
  }, [request, web3]);

  useEffect(() => {
    console.log('create Sign');
    return () => {
      console.log('destroy Sign');
    };
  }, []);

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
      closable={true} // Always allow manually closing
      maskClosable={closable}
      children={reverse}
      onCancel={() => setOpen(false)}
    />
  );
}

Sign.WaitFor = function <T>({
  request,
  title,
  canCloseEarly,
  closeWhenDone,
}: {
  request: Sign.WaitForRequest<T> | undefined;
  title: React.ReactNode;
  canCloseEarly?: boolean;
  closeWhenDone?: boolean;
}) {
  const { api } = useContext(Network);
  const [open, setOpen] = useState(false);
  const [closable, setClosable] = useState(canCloseEarly);
  const [children, setChildren, pushChild] = useMutableChildren();

  useAsyncEffect(async () => {
    if (!request || request.initiated) {
      return;
    }

    const { submit, onCancel, onFinish } = request;
    setOpen(true);
    setClosable(canCloseEarly);
    setChildren([]);
    try {
      request.initiated = true;
      let update = pushChild(<Pending>Submitting</Pending>);
      let results = await submit().catch((error) => {
        update(
          <Failure>
            <ShowError bare error={error} />
          </Failure>,
        );
      });
      if (!results) {
        return;
      }
      if (!(results instanceof Array)) {
        results = [results];
      }
      update(<Success>Submitted</Success>);

      let ok = true;
      for (const r of results) {
        if (!(r instanceof Submission) || r.success) {
          continue;
        }
        ok = false;
        if (r.status?.error) {
          pushChild(<ShowError error={r.status.error} />);
        } else {
          pushChild(<ShowError error={r.message} />);
        }
      }
      if (!ok) {
        return;
      }

      const seen = new Set<string>();
      await Promise.all(
        (results as any[])
          .filter(
            (r): r is TxID | Submission =>
              r instanceof TxID || r instanceof Submission,
          )
          .map((r) => {
            const txid = r instanceof TxID ? r : r.status!.txID!;
            return waitFor({ api, push: pushChild, seen, txid });
          }),
      );

      onFinish(results);
      if (closeWhenDone) {
        setOpen(false);
      }
    } catch (error) {
      pushChild(<ShowError error={error} />);
    } finally {
      setClosable(true);
      onCancel();
    }
  }, [request]);

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
};

function useMutableChildren(): [
  React.ReactNode[],
  (_: React.ReactNode[]) => void,
  (_: React.ReactNode) => (_: React.ReactNode) => void,
] {
  let [children, setChildren] = useState<React.ReactNode[]>([]);
  const isMounted = useIsMounted();

  const push = (n: React.ReactNode) => {
    if (!isMounted.current) {
      return (_: React.ReactNode) => {};
    }

    const i = children.length;
    children = [...children, <span key={`${i}`}>{n}</span>];
    setChildren(children);

    return (n: React.ReactNode) => {
      children = children.map((m, j) =>
        j === i ? <span key={`${i}`}>{n}</span> : m,
      );
      if (!isMounted.current) {
        return;
      }
      setChildren(children);
    };
  };

  return [children, (x) => (setChildren(x), (children = x)), push];
}

async function sign({
  push,
  api,
  args,
  web3,
  signer,
  key,
  network,
}: {
  push(n: React.ReactNode): (n: React.ReactNode) => void;
  api: JsonRpcClient;
  web3: web3.Context;
  args: TransactionArgs;
  network: NetworkConfig;
  key: web3.Context.Account;
  signer?: Sign.Signer;
}): Promise<boolean> {
  let update = push(<Pending>Signing</Pending>);
  if (!key.publicKey) {
    const ok = await web3
      .login(key)
      .then(() => true)
      .catch((error) => {
        update(
          <Failure>
            <ShowError bare error={error} />
          </Failure>,
        );
        return false;
      });
    if (!ok) return false;
    if (!key.publicKey) {
      update(
        <Failure>
          <ShowError bare error={new Error('Unable to login')} />
        </Failure>,
      );
      return false;
    }
  }

  const txn = new Transaction(args);
  const sig = await web3
    .driver!.signAccumulate(network, txn, {
      publicKey: key.publicKey.publicKey,
      timestamp: Date.now(),
      ...(signer || {
        signer: key.liteIdentity.url!,
        signerVersion: 1,
      }),
    })
    .catch((error) => {
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
    return false;
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
    return false;
  }

  const seen = new Set<string>();
  const ok = await Promise.all(
    results.map((r) => waitFor({ api, push, seen, txid: r.status!.txID! })),
  );
  return ok.every((x) => x);
}

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
      if (
        r.status === Status.NotAllowed &&
        r.error?.message?.endsWith('has not been initiated')
      ) {
        // This is a bug in the protocol - ignore it
        console.debug('Ignoring suspected bad status', r);
        return true;
      }
      if (r.status! >= 400) {
        replace(
          <Failure>
            <Link to={txid}>
              <ShowError bare error={r.error || 'An unknown error occurred'} />
            </Link>
          </Failure>,
        );
        return false;
      }
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
          waitFor({ push, api, seen, txid: r!.value! }),
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
          <Link to={txid}>
            <ShowError bare error={error} />
          </Link>
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
