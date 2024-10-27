import { Alert, Button, Descriptions, Typography } from 'antd';
import React, { MouseEventHandler, useContext, useState } from 'react';
import { RiExternalLinkLine, RiQuestionLine } from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { Submission } from 'accumulate.js/lib/api_v3';

import tooltip from '../../utils/lang';
import { AccTitle } from '../common/AccTitle';
import { InfoTable } from '../common/InfoTable';
import { Network } from '../common/Network';
import { WithIcon } from '../common/WithIcon';
import { Sign } from '../form/Sign';
import { Context } from './Context';

const { Paragraph, Text } = Typography;

export function MissingLiteID({ account }: { account: Context.Account }) {
  return (
    <div>
      <AccTitle title="Web3 Wallet" url={account.liteIdentity.url!} />

      <InfoTable>
        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              tooltip={tooltip.web3.ethereumAddress}
              children="Ethereum Address"
            />
          }
        >
          <Text copyable>{account.address}</Text>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <WithIcon
              icon={RiQuestionLine}
              tooltip={tooltip.web3.liteIdentity}
              children="Lite Identity"
            />
          }
        >
          <Text copyable={{ text: `${account.liteIdentity.url!}` }}>
            {`${account.liteIdentity.url!}`}
          </Text>
        </Descriptions.Item>
      </InfoTable>

      <Paragraph>
        <Alert
          type="warning"
          message={
            <MissingLiteID.Create
              eth={account.address}
              lite={account.liteIdentity.url!}
            />
          }
        />
      </Paragraph>
    </div>
  );
}

MissingLiteID.Create = function ({
  lite,
  eth,
  message,
}: {
  lite: URL;
  eth: string;
  message?: string;
}) {
  const { api, network } = useContext(Network);
  const [faucetRq, setFaucetRq] = useState<Sign.WaitForRequest<Submission>>();

  const clickFaucet: MouseEventHandler = (e) => {
    e.preventDefault();
    setFaucetRq({
      submit: () => api.faucet(`${lite}/ACME`),
      onCancel() {},
      onFinish() {},
    });
  };

  return (
    <>
      {message !== undefined ? (
        <span>{message} </span>
      ) : (
        <>
          <span>This is the lite identity associated with </span>
          <Text className="code">{eth}</Text>
          <span>. </span>
          <strong>It does not exist yet. </strong>
        </>
      )}
      <span>To create a lite identity send ACME to </span>
      <Text
        className="code"
        copyable={{ text: `${lite}/ACME` }}
      >{`${lite}/ACME`}</Text>
      {network.mainnet ? (
        <>
          <span>. </span>
          <span>
            You can also <BridgeLink text="bridge WACME" /> from Ethereum or
            Arbitrum, using the above address as the destination.
          </span>
        </>
      ) : (
        <span>
          {' '}
          or use the{' '}
          <Button
            shape="round"
            size="small"
            onClick={clickFaucet}
            children="ACME faucet"
          />
        </span>
      )}
      <Sign.WaitFor title="Faucet" canCloseEarly request={faucetRq} />
    </>
  );
};

function BridgeLink({ text }: { text: string }) {
  return (
    <a
      href="https://bridge.accumulatenetwork.io/release"
      target="_blank"
      rel="noreferrer"
    >
      <strong>
        <WithIcon after icon={RiExternalLinkLine}>
          {text}
        </WithIcon>
      </strong>
    </a>
  );
}
