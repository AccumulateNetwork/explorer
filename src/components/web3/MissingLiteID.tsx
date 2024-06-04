import { Skeleton, Typography } from 'antd';
import React, { MouseEventHandler, useContext, useState } from 'react';
import { RiExternalLinkLine } from 'react-icons/ri';

import { AccTitle } from '../common/AccTitle';
import { Shared } from '../common/Network';
import { WithIcon } from '../common/WithIcon';
import { useWeb3 } from './Account';
import { Sign } from './Sign';

const { Paragraph, Text } = Typography;

export function MissingLiteID() {
  const { api, network } = useContext(Shared);
  const account = useWeb3();
  const [faucetRq, setFaucetRq] = useState<Sign.WaitForRequest>();
  if (!account?.liteIdUrl) {
    return <Skeleton />;
  }

  const BridgeLink = ({ text }: { text: string }) => (
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

  const clickFaucet: MouseEventHandler = (e) => {
    e.preventDefault();
    setFaucetRq({
      submit: () => api.faucet(`${account.liteIdUrl}/ACME`),
    });
  };

  return (
    <div>
      <AccTitle title="Web3 Lite Identity" url={account.liteIdUrl} />
      <Paragraph>
        This is the lite identity associated with{' '}
        <Text className="code">{account.ethereum}</Text>.{' '}
        <strong>It does not exist yet.</strong>
      </Paragraph>
      <Paragraph>
        To create a lite identity send ACME to{' '}
        <Text copyable={{ text: `${account.liteIdUrl.toString()}/ACME` }}>
          <Text mark>{`${account.liteIdUrl.toString()}/ACME`}</Text>
        </Text>
      </Paragraph>
      {network.mainnet ? (
        <Paragraph>
          You can also <BridgeLink text="bridge WACME" /> from Ethereum or
          Arbitrum, using the above address as the destination.
        </Paragraph>
      ) : (
        <>
          <Paragraph>
            You can also use the <a onClick={clickFaucet}>ACME faucet</a>, using
            the above address as the destination.
          </Paragraph>
          <Sign.WaitFor title="Faucet" canCloseEarly request={faucetRq} />
        </>
      )}
    </div>
  );
}
