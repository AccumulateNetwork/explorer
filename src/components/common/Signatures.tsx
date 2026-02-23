import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleTwoTone,
} from '@ant-design/icons';
import {
  Alert,
  List,
  ListProps,
  Table,
  TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine, RiPenNibLine } from 'react-icons/ri';

import { URL, URLArgs, core, messaging } from 'accumulate.js';
import {
  AccountRecord,
  MessageRecord,
  SignatureSetRecord,
} from 'accumulate.js/lib/api_v3';
import {
  AccountAuthOperationType,
  AccountType,
  AuthorityEntry,
  KeyPageOperationType,
  TransactionType,
  VoteType,
} from 'accumulate.js/lib/core';
import { BlockAnchor, SequencedMessage } from 'accumulate.js/lib/messaging';

import { SigRecord, isRecordOf } from '../../utils/types';
import Key from './Key';
import { Link } from './Link';
import { Network } from './Network';
import { useAsyncEffect } from './useAsync';

const { Title, Text, Paragraph } = Typography;

export function Signatures(props: {
  transaction: core.Transaction;
  signatures: SignatureSetRecord[];
}) {
  const transaction = props.transaction;

  const [authorities, setAuthorities] = useState<URL[]>(null);

  const { api } = useContext(Network);
  const getAuthorities = async (scope: URLArgs) => {
    while (true) {
      const { account } = (await api.query(scope, {
        queryType: 'default',
      })) as AccountRecord;

      switch (account.type) {
        case AccountType.KeyPage:
          scope = account.url.toString().replace(/\/\d+$/, '');
          continue;
        case AccountType.LiteIdentity:
        case AccountType.LiteTokenAccount:
          return [new AuthorityEntry({ url: account.url.authority })];
        case AccountType.Unknown:
        case AccountType.UnknownSigner:
        case AccountType.LiteDataAccount:
        case AccountType.SystemLedger:
        case AccountType.AnchorLedger:
        case AccountType.SyntheticLedger:
        case AccountType.BlockLedger:
          return [];
        default:
          return account.authorities || [];
      }
    }
  };

  const getAllAuthorities = async () => {
    try {
      const authorities: URL[] = [];
      const addAuth = (url: URL) => {
        if (!authorities.find((x) => x.equals(url))) {
          authorities.push(url);
        }
      };

      for (const { url, disabled } of await getAuthorities(
        transaction.header.principal,
      )) {
        if (!disabled) addAuth(url);
      }

      switch (transaction.body.type) {
        case TransactionType.UpdateKeyPage:
          for (const op of transaction.body.operation) {
            switch (op.type) {
              case KeyPageOperationType.Add:
                if (op.entry.delegate) {
                  addAuth(op.entry.delegate);
                }
                break;
              default:
                break;
            }
          }
          break;
        case TransactionType.UpdateAccountAuth:
          for (const op of transaction.body.operations) {
            switch (op.type) {
              case AccountAuthOperationType.AddAuthority:
                addAuth(op.authority);
                break;
              default:
                break;
            }
          }
          break;
        default:
          break;
      }

      setAuthorities(authorities);
    } catch (error) {
      console.log(error);
    }
  };

  const signatures: SigRecord<core.UserSignature>[] = [];
  const blockAnchors: MessageRecord<BlockAnchor>[] = [];
  let principalSigs: MessageRecord[] = [];
  for (const set of props.signatures) {
    if (set.account.url.equals(transaction.header.principal)) {
      principalSigs = set.signatures?.records || [];
    }

    for (const sig of set.signatures?.records || []) {
      if (
        isRecordOf(sig, messaging.BlockAnchor) &&
        'publicKey' in sig.message.signature
      ) {
        blockAnchors.push(sig);
        continue;
      }
      if (!isRecordOf(sig, messaging.SignatureMessage)) {
        continue;
      }

      if (
        sig.message.signature instanceof core.DelegatedSignature ||
        'publicKey' in sig.message.signature
      ) {
        signatures.push(sig as SigRecord<core.UserSignature>);
      }
    }
  }

  useEffect(() => {
    getAllAuthorities(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginBottom: '20px' }}>
      <Title level={4} style={{ marginTop: 30 }}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiPenNibLine />
        </IconContext.Provider>
        Signatures
      </Title>
      {blockAnchors.length &&
      (transaction.body instanceof core.DirectoryAnchor ||
        transaction.body instanceof core.BlockValidatorAnchor) ? (
        <Validators signatures={blockAnchors} /> || (
          <Signature.List bordered dataSource={signatures} />
        )
      ) : !signatures.length ? (
        <Text disabled>N/A</Text>
      ) : !authorities?.length ? (
        <Signature.List bordered dataSource={signatures} />
      ) : (
        <Required
          authorities={authorities}
          signatures={signatures}
          principalSigs={principalSigs}
        />
      )}
    </div>
  );
}

function Validators({
  signatures,
}: {
  signatures: MessageRecord<BlockAnchor>[];
}) {
  debugger;
  const { api } = useContext(Network);
  const [validators, setValidators] = useState<core.ValidatorInfo[]>(null);

  if (!signatures.length) {
    return false;
  }

  const source =
    signatures[0].message.anchor instanceof SequencedMessage &&
    signatures[0].message.anchor.source;
  const m = source.authority.match(/^(?:bvn-)(\w+)\.acme$/i);
  const partition = m
    ? m[1]
    : source.authority === 'dn.acme'
      ? 'Directory'
      : null;

  useAsyncEffect(
    async (mounted) => {
      if (!partition) {
        return;
      }

      const { network } = await api.networkStatus({ partition: 'Directory' });
      if (!mounted()) {
        return;
      }

      setValidators(
        network?.validators.filter((x) =>
          x?.partitions?.some(
            (y) => y.active && y.id.toLowerCase() == partition.toLowerCase(),
          ),
        ),
      );
    },
    [partition],
  );

  if (!validators) {
    return false;
  }

  const didSign = Object.fromEntries(
    signatures
      .filter(
        (
          x,
        ): x is MessageRecord<BlockAnchor & { signature: core.KeySignature }> =>
          'publicKey' in x.message.signature,
      )
      .map((x) => [
        Buffer.from(x.message.signature.publicKey).toString('hex'),
        x,
      ]),
  );

  const columns: TableProps<core.ValidatorInfo>['columns'] = [
    {
      title: 'Operator',
      render(r: core.ValidatorInfo) {
        return `${r.operator}`;
      },
    },
    {
      title: 'Signature',
      render(r: core.ValidatorInfo) {
        const key = Buffer.from(r.publicKey).toString('hex');
        const anchor = didSign[key];
        if (!anchor) {
          return (
            <Tag color="orange">
              <CloseOutlined />
            </Tag>
          );
        }
        return (
          <span>
            <Tag color="green">
              <CheckOutlined />
            </Tag>
            <Link to={anchor.id}>{`${anchor.id}`}</Link>
          </span>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={validators}
      columns={columns}
      rowKey={(r) => `${r.operator}`}
      pagination={false}
    />
  );
}

function Required({
  authorities,
  signatures,
  principalSigs,
}: {
  authorities: URL[];
  signatures: SigRecord[];
  principalSigs: MessageRecord[];
}) {
  const signatureAuthority = (signature: core.Signature) => {
    if (signature instanceof core.DelegatedSignature) {
      return URL.parse(signature.delegator.toString().replace(/\/\d+$/, ''));
    }
    if (signature instanceof core.AuthoritySignature) {
      return signature.authority;
    }
    if ('publicKey' in signature) {
      return URL.parse(signature.signer.toString().replace(/\/\d+$/, ''));
    }
  };

  const signaturesForAuthority = (authority: URL) => {
    return signatures.filter((x) =>
      signatureAuthority(x.message.signature).equals(authority),
    );
  };

  const creditPayments = principalSigs.filter(
    (x): x is MessageRecord<messaging.CreditPayment> =>
      isRecordOf(x, messaging.CreditPayment),
  );
  const otherSigs = signatures.filter(
    (x) =>
      !authorities.some((y) =>
        signatureAuthority(x.message.signature).equals(y),
      ),
  );

  type Item = 'credits' | 'other' | URL;
  const columns = [
    {
      key: 'type',
      render(_, authority: Item) {
        if (authority === 'credits') {
          return <span>Credits</span>;
        }
        if (authority === 'other') {
          return <span>Other</span>;
        }
        return <span>Authority</span>;
      },
    },
    {
      key: 'info',
      render(_, authority: Item) {
        if (authority === 'credits') {
          const paid = creditPayments.reduce(
            (sum, x) => sum + x.message.paid,
            0,
          );
          return <span>{paid * 1e-2} paid</span>;
        }
        if (authority === 'other') {
          return <span>{otherSigs.length} signature(s)</span>;
        }
        return (
          <Link to={authority}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {`${authority}`}
          </Link>
        );
      },
    },
    {
      key: 'status',
      render(_, authority: Item) {
        if (authority === 'other') {
          return;
        }
        if (authority === 'credits') {
          if (creditPayments.length > 0) {
            return <Tag color="green">Received</Tag>;
          }
          return <Tag color="yellow">Pending</Tag>;
        }
        const status = principalSigs.some(
          (x) =>
            isRecordOf(x, core.AuthoritySignature) &&
            x.message.signature.authority.equals(authority),
        );

        const votes = Array.from(
          new Set(
            principalSigs
              .filter((x): x is SigRecord<core.AuthoritySignature> =>
                isRecordOf(x, core.AuthoritySignature),
              )
              .map((x) => x.message.signature)
              .filter((x) => x.authority.equals(authority))
              .map((x) => x.vote?.toString() || 'accept'),
          ),
        );

        if (!votes.length) {
          return <Tag color="yellow">Pending</Tag>;
        }
        if (votes.length > 1) {
          return <Tag color="default">Unknown</Tag>;
        }
        switch (votes[0]) {
          case 'accept':
            return <Tag color="green">Received</Tag>;
          case 'reject':
            return <Tag color="red">Rejected</Tag>;
          case 'abstain':
            return <Tag color="orange">Abstained</Tag>;
          default:
            return <Tag color="default">Unknown</Tag>;
        }
      },
    },
  ];

  const rowExpandable = (authority) => {
    if (authority === 'credits') {
      return creditPayments.length > 0;
    }
    if (authority === 'other') {
      return otherSigs.length > 0;
    }
    return signaturesForAuthority(authority).length > 0;
  };

  const expandedRowRender = (authority) => {
    if (authority === 'credits') {
      return (
        <div>
          {creditPayments.map((x) => (
            <div key={`${x.id}`}>
              {x.message.paid * 1e-2} paid by{' '}
              <Link to={x.message.payer}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {`${x.message.payer}`}
              </Link>
            </div>
          ))}
        </div>
      );
    }
    if (authority === 'other') {
      return <Signature.List dataSource={otherSigs} />;
    }
    return <Signature.List dataSource={signaturesForAuthority(authority)} />;
  };

  return (
    <Table
      showHeader={false}
      dataSource={[
        'credits',
        ...authorities,
        ...(otherSigs.length > 0 ? ['other'] : []),
      ]}
      columns={columns}
      rowKey={(authority) => authority}
      pagination={false}
      expandable={{ expandedRowRender, rowExpandable }}
    />
  );
}

function Signature({
  level = 0,
  signature,
  delegator,
}: {
  level?: number;
  signature: core.Signature;
  delegator?: URL;
}) {
  if (signature instanceof core.DelegatedSignature) {
    return <Signature.Delegated level={level} signature={signature} />;
  }
  if ('publicKey' in signature) {
    return <Signature.Key level={level} signature={signature} delegator={delegator} />;
  }
  return (
    <Alert type="error" message={`Unknown signature type ${signature.type}`} />
  );
}

Signature.List = function (props: ListProps<SigRecord>) {
  return (
    <List
      {...props}
      size="small"
      renderItem={(r) => (
        <List.Item
          actions={[
            <Link to={r.id} target="_blank">
              <Tooltip
                overlayClassName="explorer-tooltip"
                title={'Inspect signature'}
              >
                <InfoCircleTwoTone />
              </Tooltip>
            </Link>,
          ]}
        >
          <Signature signature={r.message.signature} />
        </List.Item>
      )}
    />
  );
};

Signature.Key = function ({
  level = 0,
  signature,
  delegator,
}: {
  level?: number;
  signature: core.KeySignature;
  delegator?: URL;
}) {
  const { api } = useContext(Network);
  const [delegate, setDelegate] = useState<URL | null>(null);
  const [loading, setLoading] = useState(false);

  // Look up the delegate for this public key
  useAsyncEffect(async () => {
    // Use delegator if provided (for delegated signatures), otherwise use signer
    const keyPageUrl = delegator || signature.signer;

    if (!keyPageUrl || !signature.publicKey) {
      return;
    }

    try {
      setLoading(true);
      const { account } = (await api.query(keyPageUrl, {
        queryType: 'default',
      })) as AccountRecord;

      if (account.type === AccountType.KeyPage) {
        // Convert signature public key to hex for comparison
        const sigPubKeyHex = signature.publicKey instanceof Uint8Array || Buffer.isBuffer(signature.publicKey)
          ? Buffer.from(signature.publicKey).toString('hex')
          : signature.publicKey.toString();

        console.log('Looking for key:', sigPubKeyHex, 'in', keyPageUrl.toString());

        // Find the key entry that matches this public key
        const keyEntry = account.keys?.find((entry) => {
          if (!entry.publicKeyHash) return false;

          // Convert entry key hash to hex string for comparison
          const entryKeyHex = entry.publicKeyHash instanceof Uint8Array || Buffer.isBuffer(entry.publicKeyHash)
            ? Buffer.from(entry.publicKeyHash).toString('hex')
            : entry.publicKeyHash.toString();

          console.log('Comparing with entry key:', entryKeyHex, 'delegate:', entry.delegate?.toString());

          return entryKeyHex === sigPubKeyHex;
        });

        console.log('Found key entry:', keyEntry);

        if (keyEntry && keyEntry.delegate) {
          console.log('Setting delegate:', keyEntry.delegate.toString());
          setDelegate(keyEntry.delegate);
        }
      }
    } catch (error) {
      console.log('Error looking up delegate for key:', error);
    } finally {
      setLoading(false);
    }
  }, [delegator, signature.signer, signature.publicKey]);

  return (
    <div className={level ? 'subsignature' : null}>
      {signature.signer ? (
        <Paragraph style={{ marginBottom: 5 }}>
          <Link to={signature.signer}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {`${signature.signer}`}
          </Link>
        </Paragraph>
      ) : null}
      {delegate && (
        <Paragraph style={{ marginBottom: 5 }}>
          <Link to={delegate}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiPenNibLine />
            </IconContext.Provider>
            {`${delegate}`}
          </Link>
          <Tag color="blue" style={{ marginLeft: 8 }}>Delegated</Tag>
        </Paragraph>
      )}
      {signature.publicKey ? (
        <Paragraph>
          {signature.vote === VoteType.Reject && <Tag color="red">Reject</Tag>}
          {signature.vote === VoteType.Abstain && (
            <Tag color="yellow">Abstain</Tag>
          )}
          <Key type={signature.type} publicKey={signature.publicKey} />
        </Paragraph>
      ) : null}
    </div>
  );
};

Signature.Delegated = function ({
  level = 0,
  signature,
}: {
  level?: number;
  signature: core.DelegatedSignature;
}) {
  return (
    <div className={level ? 'subsignature' : null}>
      {signature.delegator && signature.signature ? (
        <div>
          <Paragraph>
            <Paragraph style={{ marginBottom: 5 }}>
              <Link to={signature.delegator}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiAccountCircleLine />
                </IconContext.Provider>
                {`${signature.delegator}`}
              </Link>
            </Paragraph>
            <Tag color="green">Delegated</Tag>
            <Signature level={level + 1} signature={signature.signature} delegator={signature.delegator} />
          </Paragraph>
        </div>
      ) : null}
    </div>
  );
};
