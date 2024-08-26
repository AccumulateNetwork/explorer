import { Descriptions, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { IconContext } from 'react-icons';
import {
  RiAccountCircleLine,
  RiExchangeLine,
  RiInformationLine,
  RiQuestionLine,
} from 'react-icons/ri';

import { URL, core } from 'accumulate.js';
import { MessageRecord } from 'accumulate.js/lib/api_v3';
import { VoteType } from 'accumulate.js/lib/core';
import { SignatureMessage } from 'accumulate.js/lib/messaging';

import tooltipDescs from '../../utils/lang';
import { AccTitle } from '../common/AccTitle';
import { Content } from '../common/Content';
import { EnumValue } from '../common/EnumValue';
import { InfoTable } from '../common/InfoTable';
import Key from '../common/Key';
import { Link } from '../common/Link';
import { Nobr } from '../common/Nobr';
import { MsgInfo } from './MsgInfo';
import { SigHeader } from './SigHeader';

const { Title } = Typography;

export function Signature({
  record,
}: {
  record: MessageRecord<SignatureMessage>;
}) {
  // Unpack the signature and delegators
  let { signature } = record.message;
  let delegators: URL[] = [];
  while (signature instanceof core.DelegatedSignature) {
    delegators.push(signature.delegator);
    signature = signature.signature;
  }
  delegators.reverse();

  if (signature instanceof core.AuthoritySignature) {
    delegators = signature.delegator;
  }

  let signer =
    signature instanceof core.AuthoritySignature
      ? signature.origin
      : 'signer' in signature
        ? signature.signer
        : null;

  const labelSigner = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.sigSignerUrl}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Signer
      </Nobr>
    </span>
  );

  const labelKey = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.publicKey}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Public Key
      </Nobr>
    </span>
  );

  const labelMemo = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.memo}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Memo
      </Nobr>
    </span>
  );

  const labelMetadata = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.metadata}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Metadata
      </Nobr>
    </span>
  );

  const labelDelegators = (
    <span>
      <Nobr>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <Tooltip
            overlayClassName="explorer-tooltip"
            title={tooltipDescs.sigDelegators}
          >
            <RiQuestionLine />
          </Tooltip>
        </IconContext.Provider>
        Delegators
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

  return (
    <>
      <AccTitle title="Signature" url={record.id} />
      <SigHeader record={record} />
      <MsgInfo record={record} />

      <Title level={4}>
        <IconContext.Provider value={{ className: 'react-icons' }}>
          <RiInformationLine />
        </IconContext.Provider>
        Signature Info
      </Title>

      <InfoTable>
        {signer && (
          <Descriptions.Item label={labelSigner}>
            <Signature.Type signature={signature} />

            <Link to={signer}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiAccountCircleLine />
              </IconContext.Provider>
              {signer.toString()}
            </Link>
          </Descriptions.Item>
        )}

        {'publicKey' in signature && (
          <Descriptions.Item label={labelKey}>
            <Key publicKey={signature.publicKey} type={signature.type} />
          </Descriptions.Item>
        )}

        {'memo' in signature && signature.memo && (
          <Descriptions.Item label={labelMemo}>
            <Content type="ASCII">{signature.memo}</Content>
          </Descriptions.Item>
        )}

        {'data' in signature && signature.data && (
          <Descriptions.Item label={labelMetadata}>
            <Content>{signature.data}</Content>
          </Descriptions.Item>
        )}

        {delegators?.length && (
          <Descriptions.Item label={labelDelegators}>
            {delegators.map((delegator) => (
              <div key={delegator.toString()}>
                <Link to={delegator}>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountCircleLine />
                  </IconContext.Provider>
                  {delegator.toString()}
                </Link>
              </div>
            ))}
          </Descriptions.Item>
        )}

        {signature instanceof core.AuthoritySignature && signature.cause && (
          <Descriptions.Item label={labelCause}>
            <Link to={signature.cause}>
              <IconContext.Provider value={{ className: 'react-icons' }}>
                <RiExchangeLine />
              </IconContext.Provider>
              {signature.cause.toString()}
            </Link>
          </Descriptions.Item>
        )}
      </InfoTable>
    </>
  );
}

Signature.Type = function ({
  signature,
}: {
  signature: core.Signature & { vote?: VoteType };
}) {
  const isAuth = signature instanceof core.AuthoritySignature && (
    <Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.authSig}>
      <Tag color="gray">Authority</Tag>
    </Tooltip>
  );

  let vote: React.ReactNode;
  switch (signature.vote) {
    case VoteType.Accept:
      vote = (
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={tooltipDescs.sigAccept}
        >
          <Tag color="green">Acceptance</Tag>
        </Tooltip>
      );
      break;
    case VoteType.Reject:
      vote = (
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={tooltipDescs.sigReject}
        >
          <Tag color="red">Rejection</Tag>
        </Tooltip>
      );
      break;
    case VoteType.Abstain:
      vote = (
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={tooltipDescs.sigAbstain}
        >
          <Tag color="orange">Abstention</Tag>
        </Tooltip>
      );
      break;
    case VoteType.Suggest:
      vote = (
        <Tooltip
          overlayClassName="explorer-tooltip"
          title={tooltipDescs.sigAbstain}
        >
          <Tag color="blue">Suggest</Tag>
        </Tooltip>
      );
      break;
    default:
      vote = (
        <Tag color="blue">
          <EnumValue type={VoteType} value={signature.vote} />
        </Tag>
      );
      break;
  }

  return (
    <>
      {isAuth}
      {vote}
    </>
  );
};
