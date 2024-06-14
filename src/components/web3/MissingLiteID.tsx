import { Skeleton, Typography } from 'antd';
import React, { MouseEventHandler, useContext, useState } from 'react';
import { RiExternalLinkLine } from 'react-icons/ri';

import { URL } from 'accumulate.js';
import { Submission } from 'accumulate.js/lib/api_v3';

import { AccTitle } from '../common/AccTitle';
import { Network } from '../common/Network';
import { WithIcon } from '../common/WithIcon';
import { Sign } from '../form/Sign';
import { useWeb3 } from './Connect';

const { Paragraph, Text, Title } = Typography;

export function MissingLiteID() {
  const web3 = useWeb3();

  const title = 'Web3 Lite Identity';
  if (!web3.publicKey?.lite) {
    return (
      <>
        <Title level={2}>{title}</Title>
        <Skeleton />
      </>
    );
  }

  return (
    <div>
      <AccTitle title={title} url={web3.publicKey.lite} />

      <Paragraph>
        <MissingLiteID.Create
          eth={web3.publicKey.ethereum}
          lite={web3.publicKey.lite}
        />
      </Paragraph>
    </div>
  );
}

MissingLiteID.Create = function ({ lite, eth }: { lite: URL; eth: string }) {
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
      <span>This is the lite identity associated with </span>
      <Text className="code">{eth}</Text>
      <span>. </span>
      <strong>It does not exist yet. </strong>
      <span>To create a lite identity send ACME to </span>
      <Text
        className="code"
        copyable={{ text: `${lite}/ACME` }}
      >{`${lite}/ACME`}</Text>
      <span>. </span>
      {network.mainnet ? (
        <span>
          You can also <BridgeLink text="bridge WACME" /> from Ethereum or
          Arbitrum, using the above address as the destination.
        </span>
      ) : (
        <span>
          You can also use the <a onClick={clickFaucet}>ACME faucet</a>.
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
